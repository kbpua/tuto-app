import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { applyRateLimit, getClientKey } from './_rateLimit.js'

const InputSchema = z.object({
  sourceText: z.string().min(200, 'Please provide at least 200 characters of source text.').max(12000, 'Source text is too long (max: 12,000 characters).'),
  cardCount: z.number().int().min(3).max(30).optional(),
  quizCount: z.number().int().min(3).max(20).optional(),
})

const DifficultyEnum = z.enum(['easy', 'medium', 'hard'])
const QuizTypeEnum = z.enum(['mcq', 'written', 'matching'])

const OutputSchema = z.object({
  summary: z.string().min(1),
  flashcards: z.array(
    z.object({
      front: z.string().min(1),
      back: z.string().min(1),
      difficulty: DifficultyEnum,
      tags: z.array(z.string().min(1)).max(5),
    }),
  ).min(1),
  quiz: z.array(
    z.object({
      type: QuizTypeEnum,
      question: z.string().min(1),
      options: z.array(z.string().min(1)).optional(),
      answer: z.string().min(1),
      explanation: z.string().min(1),
    }),
  ).min(1),
})

type MagicImportOutput = z.infer<typeof OutputSchema>
type RawOutput = z.infer<typeof OutputSchema> & {
  flashcards: Array<{
    front: string
    back: string
    difficulty: 'easy' | 'medium' | 'hard'
    tags?: string[]
  }>
  quiz: Array<{
    type: 'mcq' | 'written' | 'matching'
    question: string
    options?: string[]
    answer: string
    explanation: string
  }>
}

const SYSTEM_RULES = [
  'You are an expert educational content generator for a spaced-repetition app.',
  'Return valid JSON only. No markdown. No code fences.',
  'Keep items concise, clear, and factually accurate.',
  'Avoid duplicates in flashcards and quiz questions.',
  'Balance difficulty across easy, medium, and hard.',
  'For MCQ questions, include exactly 4 options with one correct answer.',
  'For matching questions, format answer as "term1->definition1; term2->definition2".',
].join('\n')

function extractJsonBlock(raw: string): string {
  const firstCurly = raw.indexOf('{')
  const lastCurly = raw.lastIndexOf('}')
  if (firstCurly === -1 || lastCurly === -1 || lastCurly <= firstCurly) {
    throw new Error('No JSON object found in AI response.')
  }
  return raw.slice(firstCurly, lastCurly + 1)
}

function normalizeOutput(raw: RawOutput): MagicImportOutput {
  const flashcards = raw.flashcards.map((card) => ({
    ...card,
    tags: (card.tags ?? []).slice(0, 5),
  }))

  const quiz = raw.quiz.map((item) => {
    if (item.type === 'mcq') {
      const options = (item.options ?? []).filter(Boolean).slice(0, 4)
      if (!options.includes(item.answer) && item.answer) {
        options[0] = item.answer
      }
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`)
      }
      return { ...item, options }
    }
    return {
      ...item,
      options: undefined,
    }
  })

  return OutputSchema.parse({
    ...raw,
    flashcards,
    quiz,
  })
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

async function generateStructuredContent(params: {
  apiKey: string
  model: string
  sourceText: string
  cardCount: number
  quizCount: number
  strictRetry?: boolean
}): Promise<MagicImportOutput> {
  const genAI = new GoogleGenerativeAI(params.apiKey)
  const model = genAI.getGenerativeModel({
    model: params.model,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: params.strictRetry ? 0.2 : 0.5,
    },
  })

  const prompt = [
    SYSTEM_RULES,
    params.strictRetry ? 'Your previous output was invalid. Return only a strict JSON object that exactly matches the schema.' : '',
    'Output schema:',
    JSON.stringify({
      summary: 'string',
      flashcards: [
        {
          front: 'string',
          back: 'string',
          difficulty: 'easy | medium | hard',
          tags: ['string'],
        },
      ],
      quiz: [
        {
          type: 'mcq | written | matching',
          question: 'string',
          options: ['string', 'string', 'string', 'string'],
          answer: 'string',
          explanation: 'string',
        },
      ],
    }),
    `Create exactly ${params.cardCount} flashcards and ${params.quizCount} quiz items.`,
    'Source text:',
    params.sourceText,
  ].filter(Boolean).join('\n\n')

  const result = await model.generateContent(prompt)
  const rawText = result.response.text().trim()
  const parsedJson = JSON.parse(extractJsonBlock(rawText)) as unknown

  return normalizeOutput(parsedJson as RawOutput)
}

type ApiReq = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}
type ApiRes = { status: (code: number) => { json: (body: unknown) => void } }

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' })
    return
  }

  const limitResult = applyRateLimit({
    key: getClientKey(req, 'magic-import'),
    limit: 12,
    windowMs: 60_000, // 12 requests / minute / IP
  })
  if (!limitResult.allowed) {
    res.status(429).json({
      error: 'Too many requests. Please wait before generating again.',
      retryAfterSec: Math.ceil(limitResult.resetInMs / 1000),
    })
    return
  }

  const parsedInput = InputSchema.safeParse(req.body)
  if (!parsedInput.success) {
    res.status(400).json({
      error: 'Invalid request payload.',
      details: parsedInput.error.issues.map((i) => i.message),
    })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing GEMINI_API_KEY.' })
    return
  }

  const { sourceText, cardCount = 12, quizCount = 8 } = parsedInput.data

  try {
    const data = await generateStructuredContent({
      apiKey,
      model,
      sourceText,
      cardCount,
      quizCount,
    })
    res.status(200).json({ data })
    return
  } catch (firstError) {
    try {
      const data = await generateStructuredContent({
        apiKey,
        model,
        sourceText,
        cardCount,
        quizCount,
        strictRetry: true,
      })
      res.status(200).json({ data, retried: true })
      return
    } catch (secondError) {
      console.error('Magic import generation failed:', firstError, secondError)
      res.status(500).json({
        error: 'Failed to generate structured content. Please try again with cleaner or shorter source text.',
        details: process.env.NODE_ENV === 'production'
          ? undefined
          : {
            firstAttempt: errorMessage(firstError),
            secondAttempt: errorMessage(secondError),
            model,
          },
      })
      return
    }
  }
}
