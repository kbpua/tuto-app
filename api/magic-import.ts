/// <reference types="node" />
import { GoogleGenerativeAI } from '@google/generative-ai'
import { z } from 'zod'
import { applyRateLimit, getClientKey } from './_rateLimit.js'

const InputSchema = z.object({
  sourceText: z.string().min(200, 'Please provide at least 200 characters of source text.').max(12000, 'Source text is too long (max: 12,000 characters).'),
  cardCount: z.number().int().min(3).max(120).optional(),
  quizCount: z.number().int().min(3).max(60).optional(),
  focusTopics: z.array(z.string().min(1)).max(10).optional(),
})

const DifficultyEnum = z.enum(['easy', 'medium', 'hard'])
const QuizTypeEnum = z.enum(['mcq', 'written', 'matching'])

const OutputSchema = z.object({
  summary: z.string().min(1),
  suggestedTopics: z.array(z.string().min(1)).max(20).default([]),
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
  suggestedTopics?: string[]
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

  const normalizedTopics = (raw.suggestedTopics ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20)
  const fallbackTopics = flashcards
    .flatMap((c) => c.tags ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t, idx, arr) => arr.indexOf(t) === idx)
    .slice(0, 20)

  return OutputSchema.parse({
    ...raw,
    suggestedTopics: normalizedTopics.length > 0 ? normalizedTopics : fallbackTopics,
    flashcards,
    quiz,
  })
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

function readBodySafely(req: { body?: unknown }): { ok: true; body: unknown } | { ok: false; message: string } {
  try {
    return { ok: true, body: req.body }
  } catch (err) {
    return { ok: false, message: errorMessage(err) }
  }
}

async function generateWithOpenRouter(params: {
  apiKey: string
  model: string
  sourceText: string
  cardCount: number
  quizCount: number
  focusTopics?: string[]
  strictRetry?: boolean
}): Promise<MagicImportOutput> {
  const prompt = [
    SYSTEM_RULES,
    params.strictRetry ? 'Your previous output was invalid. Return only a strict JSON object that exactly matches the schema.' : '',
    'Output schema:',
    JSON.stringify({
      summary: 'string',
      suggestedTopics: ['string'],
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
    params.focusTopics && params.focusTopics.length > 0
      ? `Focus topics (prioritize these): ${params.focusTopics.join(', ')}`
      : '',
    'Source text:',
    params.sourceText,
  ].filter(Boolean).join('\n\n')

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_ORIGIN ?? 'http://localhost:5173',
      'X-Title': 'Tuto App',
    },
    body: JSON.stringify({
      model: params.model,
      temperature: params.strictRetry ? 0.2 : 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_RULES },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenRouter failed (${response.status}): ${text.slice(0, 500)}`)
  }

  const json = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = json.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('OpenRouter returned empty content.')
  }

  const parsedJson = JSON.parse(extractJsonBlock(content)) as unknown
  return normalizeOutput(parsedJson as RawOutput)
}

async function generateStructuredContent(params: {
  apiKey: string
  model: string
  sourceText: string
  cardCount: number
  quizCount: number
  focusTopics?: string[]
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
      suggestedTopics: ['string'],
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
    params.focusTopics && params.focusTopics.length > 0
      ? `Focus topics (prioritize these): ${params.focusTopics.join(', ')}`
      : '',
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
const DAILY_LIMIT = 3
const DAY_MS = 24 * 60 * 60 * 1000
type DailyQuota = { dailyUsed: number; dailyRemaining: number; dailyLimit: number }

export default async function handler(req: ApiReq, res: ApiRes) {
  try {
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
    const dailyLimitResult = applyRateLimit({
      key: getClientKey(req, 'magic-import-daily'),
      limit: DAILY_LIMIT,
      windowMs: DAY_MS,
    })
    if (!dailyLimitResult.allowed) {
      res.status(429).json({
        error: 'Daily upload limit reached (3/day). Please try again tomorrow.',
        retryAfterSec: Math.ceil(dailyLimitResult.resetInMs / 1000),
        quota: {
          dailyUsed: DAILY_LIMIT,
          dailyRemaining: 0,
          dailyLimit: DAILY_LIMIT,
        } satisfies DailyQuota,
      })
      return
    }

    const bodyResult = readBodySafely(req)
    if (bodyResult.ok === false) {
      res.status(400).json({
        error: 'Invalid JSON body.',
        details: [bodyResult.message],
      })
      return
    }

    const parsedInput = InputSchema.safeParse(bodyResult.body)
    if (!parsedInput.success) {
      res.status(400).json({
        error: 'Invalid request payload.',
        details: parsedInput.error.issues.map((i) => i.message),
      })
      return
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    const openRouterModel = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.1-8b-instruct'
    const geminiApiKey = process.env.GEMINI_API_KEY
    const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'

    if (!openRouterApiKey && !geminiApiKey) {
      res.status(500).json({ error: 'Server is missing OPENROUTER_API_KEY and GEMINI_API_KEY.' })
      return
    }

    const { sourceText, cardCount = 12, quizCount = 8, focusTopics = [] } = parsedInput.data

    try {
      const data = openRouterApiKey
        ? await generateWithOpenRouter({
          apiKey: openRouterApiKey,
          model: openRouterModel,
          sourceText,
          cardCount,
          quizCount,
          focusTopics,
        })
        : await generateStructuredContent({
          apiKey: geminiApiKey as string,
          model: geminiModel,
          sourceText,
          cardCount,
          quizCount,
          focusTopics,
        })
      res.status(200).json({
        data,
        quota: {
          dailyUsed: DAILY_LIMIT - dailyLimitResult.remaining,
          dailyRemaining: dailyLimitResult.remaining,
          dailyLimit: DAILY_LIMIT,
        } satisfies DailyQuota,
      })
      return
    } catch (firstError) {
      try {
        const data = openRouterApiKey
          ? await generateWithOpenRouter({
            apiKey: openRouterApiKey,
            model: openRouterModel,
            sourceText,
            cardCount,
            quizCount,
            focusTopics,
            strictRetry: true,
          })
          : await generateStructuredContent({
            apiKey: geminiApiKey as string,
            model: geminiModel,
            sourceText,
            cardCount,
            quizCount,
            focusTopics,
            strictRetry: true,
          })
        res.status(200).json({
          data,
          retried: true,
          quota: {
            dailyUsed: DAILY_LIMIT - dailyLimitResult.remaining,
            dailyRemaining: dailyLimitResult.remaining,
            dailyLimit: DAILY_LIMIT,
          } satisfies DailyQuota,
        })
        return
      } catch (secondError) {
        if (openRouterApiKey && geminiApiKey) {
          try {
            const fallbackData = await generateStructuredContent({
              apiKey: geminiApiKey,
              model: geminiModel,
              sourceText,
              cardCount,
              quizCount,
              focusTopics,
              strictRetry: true,
            })
            res.status(200).json({
              data: fallbackData,
              retried: true,
              fallback: 'gemini',
              quota: {
                dailyUsed: DAILY_LIMIT - dailyLimitResult.remaining,
                dailyRemaining: dailyLimitResult.remaining,
                dailyLimit: DAILY_LIMIT,
              } satisfies DailyQuota,
            })
            return
          } catch (fallbackError) {
            console.error('Magic import generation failed:', firstError, secondError, fallbackError)
          }
        } else {
          console.error('Magic import generation failed:', firstError, secondError)
        }
        res.status(500).json({
          error: 'Failed to generate structured content. Please try again with cleaner or shorter source text.',
          details: process.env.NODE_ENV === 'production'
            ? undefined
            : {
              firstAttempt: errorMessage(firstError),
              secondAttempt: errorMessage(secondError),
              provider: openRouterApiKey ? 'openrouter' : 'gemini',
            },
        })
        return
      }
    }
  } catch (e) {
    console.error('Magic import API error:', e)
    res.status(500).json({
      error: 'Magic import failed unexpectedly. Please retry.',
      details: process.env.NODE_ENV === 'production' ? undefined : errorMessage(e),
    })
    return
  }
}
