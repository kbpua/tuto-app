import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Wand2, Save, Trash2, Plus, BrainCircuit, FileUp } from 'lucide-react'
import { useDecksStore } from '../store/useDecksStore'

type AICard = {
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
}

type AIQuizItem =
  | {
    type: 'mcq'
    question: string
    options: string[]
    answer: string
    explanation: string
  }
  | {
    type: 'written'
    question: string
    answer: string
    explanation: string
  }
  | {
    type: 'matching'
    question: string
    answer: string
    explanation: string
  }

type MagicImportResponse = {
  data: {
    summary: string
    flashcards: AICard[]
    quiz: AIQuizItem[]
  }
  retried?: boolean
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function suggestCountsFromText(sourceText: string): { suggestedCards: number; suggestedQuiz: number; rationale: string } {
  const text = sourceText.replace(/\r\n/g, '\n').trim()
  if (!text) return { suggestedCards: 12, suggestedQuiz: 8, rationale: 'No text yet.' }

  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const bulletLines = lines.filter((l) => /^(\-|\*|•|\d+\.)\s+/.test(l)).length
  const headingLines = lines.filter((l) => /^[A-Z0-9][A-Z0-9\s\-\(\):]{6,}$/.test(l)).length

  const sentenceCount = (text.match(/[.!?]+/g) ?? []).length

  // Heuristic: bullets/headings indicate "concept density" → more cards per word.
  const structureBoost = 1 + Math.min(0.6, (bulletLines + headingLines) / 25)
  const baseCards = (wordCount / 90) * structureBoost // ~1 card per 90 words, adjusted by structure
  const sentenceBoost = Math.min(0.4, sentenceCount / 80)

  const suggestedCards = clampInt(baseCards * (1 + sentenceBoost), 3, 30)
  const suggestedQuiz = clampInt(Math.max(3, suggestedCards * 0.6), 3, 20)

  const rationale = `Based on ~${wordCount.toLocaleString()} words, ${bulletLines} bullet lines, ${headingLines} headings.`
  return { suggestedCards, suggestedQuiz, rationale }
}

function parseMatchingPairs(answer: string): [string, string][] {
  // expected: "term->definition; term2->definition2"
  return answer
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [left, right] = pair.split('->').map((x) => (x ?? '').trim())
      return [left || 'Term', right || 'Definition'] as [string, string]
    })
}

export function MagicImportPage() {
  const navigate = useNavigate()
  const decks = useDecksStore((s) => s.decks)
  const createDeck = useDecksStore((s) => s.createDeck)
  const addCard = useDecksStore((s) => s.addCard)

  const [sourceText, setSourceText] = useState('')
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [cardCount, setCardCount] = useState(12)
  const [quizCount, setQuizCount] = useState(8)
  const [countsManuallyEdited, setCountsManuallyEdited] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const [cards, setCards] = useState<AICard[]>([])
  const [quiz, setQuiz] = useState<AIQuizItem[]>([])
  const [retried, setRetried] = useState(false)

  const [targetDeckId, setTargetDeckId] = useState<string>(decks[0]?.id ?? '')
  const [newDeckTitle, setNewDeckTitle] = useState('')
  const [newDeckFolder, setNewDeckFolder] = useState<'Custom' | 'Science' | 'Humanities' | 'Languages'>('Custom')

  const canGenerate = sourceText.trim().length >= 200 && !isGenerating
  const hasResults = summary.trim().length > 0 || cards.length > 0 || quiz.length > 0

  const deckOptions = useMemo(() => decks.map((d) => ({ id: d.id, title: d.title })), [decks])

  const suggestion = useMemo(() => suggestCountsFromText(sourceText), [sourceText])

  useEffect(() => {
    // Auto-fill suggestions when text changes (paste/PDF import), but do NOT override user edits.
    if (countsManuallyEdited) return
    setCardCount(suggestion.suggestedCards)
    setQuizCount(suggestion.suggestedQuiz)
  }, [countsManuallyEdited, suggestion.suggestedCards, suggestion.suggestedQuiz])

  const generate = async () => {
    setError('')
    setIsGenerating(true)
    setRetried(false)
    try {
      const res = await fetch('/api/magic-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceText: sourceText.trim(),
          cardCount,
          quizCount,
        }),
      })

      const rawText = await res.text()
      const parsed = tryParseJson(rawText)
      const json = (parsed ?? {}) as MagicImportResponse | { error?: string; details?: unknown }

      if (!res.ok) {
        const msgFromJson =
          (typeof json === 'object' &&
            json &&
            'error' in json &&
            typeof (json as any).error === 'string' &&
            (json as any).error) ||
          ''
        const msgFromBody = rawText.trim()
        const msg = msgFromJson || msgFromBody || `AI generation failed (HTTP ${res.status}).`
        const hint =
          res.status === 404
            ? 'Hint: are you running `npx vercel dev` and opening the app on that port? Vite dev does not serve /api routes.'
            : ''
        setError([msg, hint].filter(Boolean).join('\n'))
        return
      }

      if (!parsed || typeof (parsed as any)?.data !== 'object') {
        setError('AI generation returned an unexpected response. Please retry.')
        return
      }

      const ok = parsed as MagicImportResponse
      setSummary(ok.data.summary ?? '')
      setCards(ok.data.flashcards ?? [])
      setQuiz(ok.data.quiz ?? [])
      setRetried(Boolean(ok.retried))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }

  const extractPdfText = async (file: File) => {
    setError('')
    setIsExtractingPdf(true)
    try {
      // Lazy-load PDF parser only when needed to keep initial page bundle smaller.
      const [{ getDocument, GlobalWorkerOptions }, worker] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker?url'),
      ])
      GlobalWorkerOptions.workerSrc = worker.default

      const buf = await file.arrayBuffer()
      const pdf = await getDocument({ data: buf }).promise
      const maxPages = Math.min(pdf.numPages, 25)
      const parts: string[] = []

      for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
        const page = await pdf.getPage(pageNo)
        const content = await page.getTextContent()
        const pageText = content.items
          .map((it) => ('str' in it ? String(it.str) : ''))
          .filter(Boolean)
          .join(' ')
        if (pageText.trim()) parts.push(pageText.trim())
      }

      const text = parts.join('\n\n').replace(/\s+\n/g, '\n').trim()
      if (!text) {
        setError('No readable text found in that PDF. (If it’s scanned images, we’ll need OCR next.)')
        return
      }

      setSourceText(text.slice(0, 12000))
      // Allow auto-suggestion to run after new text is set
      setCountsManuallyEdited(false)
    } catch (e) {
      setError(`PDF extraction failed: ${(e as Error).message}`)
    } finally {
      setIsExtractingPdf(false)
    }
  }

  const clearResults = () => {
    setSummary('')
    setCards([])
    setQuiz([])
    setRetried(false)
  }

  const saveToDeck = async () => {
    setError('')
    if (cards.length === 0) {
      setError('No flashcards to save. Generate first.')
      return
    }

    setIsSaving(true)
    try {
      let deckId = targetDeckId
      if (!deckId || deckId === '__new__') {
        if (!newDeckTitle.trim()) {
          setError('Please provide a deck title.')
          return
        }
        deckId = createDeck(newDeckTitle.trim(), newDeckFolder, ['AI'])
        setTargetDeckId(deckId)
      }

      // Save all cards (this will also cloud-sync via queue)
      for (const c of cards) {
        addCard(deckId, c.front.trim(), c.back.trim())
      }

      navigate(`/study/${deckId}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const tryGeneratedQuiz = () => {
    if (quiz.length === 0) {
      setError('No quiz items available. Generate first.')
      return
    }
    // Convert matching items to the format used by mockData QuizQuestion union.
    const questions = quiz.map((q, idx) => {
      const id = `ai-q-${idx}-${crypto.randomUUID()}`
      if (q.type === 'mcq') {
        return {
          id,
          type: 'mcq' as const,
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
        }
      }
      if (q.type === 'written') {
        return {
          id,
          type: 'written' as const,
          question: q.question,
          answer: q.answer,
          explanation: q.explanation,
        }
      }
      return {
        id,
        type: 'matching' as const,
        question: q.question,
        pairs: parseMatchingPairs(q.answer),
        explanation: q.explanation,
      }
    })

    navigate('/quiz', { state: { generatedQuestions: questions, source: 'magic-import' } })
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Zap className="h-6 w-6 text-brand-green" />
          <div>
            <h1 className="text-2xl font-black text-heading">Flash Import</h1>
            <p className="text-sm text-muted">Paste notes → generate flashcards + quizzes → review → save.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={clearResults}
          disabled={!hasResults}
          className="inline-flex items-center gap-2 rounded-xl border border-edge bg-card px-3 py-2 text-sm font-semibold text-sub disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </header>

      <section className="rounded-2xl border border-edge bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-heading">Source Text</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-edge bg-inset px-3 py-2 text-xs font-semibold text-heading hover:border-brand-blue/50">
              <FileUp className="h-4 w-4 text-brand-blue" />
              {isExtractingPdf ? 'Extracting…' : 'Import PDF'}
              <input
                type="file"
                accept="application/pdf"
                disabled={isExtractingPdf || isGenerating}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void extractPdfText(f)
                  e.currentTarget.value = ''
                }}
              />
            </label>
            <label className="text-xs text-muted">
              Cards
              <input
                type="number"
                value={cardCount}
                onChange={(e) => {
                  setCountsManuallyEdited(true)
                  setCardCount(Math.max(3, Math.min(30, Number(e.target.value) || 12)))
                }}
                className="ml-2 w-20 rounded-lg border border-edge bg-inset px-2 py-1 text-xs text-heading"
              />
            </label>
            <label className="text-xs text-muted">
              Quiz
              <input
                type="number"
                value={quizCount}
                onChange={(e) => {
                  setCountsManuallyEdited(true)
                  setQuizCount(Math.max(3, Math.min(20, Number(e.target.value) || 8)))
                }}
                className="ml-2 w-20 rounded-lg border border-edge bg-inset px-2 py-1 text-xs text-heading"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setCountsManuallyEdited(false)
                setCardCount(suggestion.suggestedCards)
                setQuizCount(suggestion.suggestedQuiz)
              }}
              className="rounded-xl border border-edge bg-inset px-3 py-2 text-xs font-semibold text-heading hover:border-brand-blue/50"
              aria-label="Apply suggested counts"
              title={suggestion.rationale}
            >
              Suggested: {suggestion.suggestedCards} / {suggestion.suggestedQuiz}
            </button>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={!canGenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              {isGenerating ? 'Generating…' : 'Generate'}
            </button>
          </div>
        </div>

        <textarea
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Paste your notes here (200+ characters)…"
          className="mt-3 h-44 w-full rounded-2xl border border-edge bg-inset p-4 text-sm text-heading outline-none focus:border-brand-blue"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={`${sourceText.trim().length >= 200 ? 'text-brand-green' : 'text-muted'}`}>
            {sourceText.trim().length} / 200+ characters
          </span>
          {retried && <span className="text-brand-violet">AI auto-retried to fix formatting.</span>}
        </div>

        {error && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}
      </section>

      {hasResults && (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-edge bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted">Summary</p>
              <p className="mt-2 text-sm text-sub">{summary || '—'}</p>
            </article>

            <article className="rounded-2xl border border-edge bg-card p-5">
              <p className="text-xs uppercase tracking-widest text-muted">Save Flashcards</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <select
                  value={targetDeckId || ''}
                  onChange={(e) => setTargetDeckId(e.target.value)}
                  className="rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading"
                >
                  <option value="" disabled>
                    Select a deck…
                  </option>
                  {deckOptions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                  <option value="__new__">+ Create new deck…</option>
                </select>

                <button
                  type="button"
                  onClick={() => void saveToDeck()}
                  disabled={isSaving || cards.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving…' : `Save ${cards.length} cards`}
                </button>
              </div>

              {targetDeckId === '__new__' && (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input
                    value={newDeckTitle}
                    onChange={(e) => setNewDeckTitle(e.target.value)}
                    placeholder="New deck title"
                    className="sm:col-span-2 rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
                  />
                  <select
                    value={newDeckFolder}
                    onChange={(e) => setNewDeckFolder(e.target.value as typeof newDeckFolder)}
                    className="rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading"
                  >
                    <option value="Custom">Custom</option>
                    <option value="Science">Science</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Languages">Languages</option>
                  </select>
                </div>
              )}

              <p className="mt-2 text-xs text-muted">
                Saving uses your existing cloud sync queue, so it will persist to Supabase when online.
              </p>
            </article>
          </section>

          <section className="rounded-2xl border border-edge bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted">Flashcards</p>
                <p className="mt-1 text-sm text-sub">Edit anything before saving. Delete low-quality cards.</p>
              </div>
              <button
                type="button"
                onClick={() => setCards((prev) => [...prev, { front: '', back: '', difficulty: 'easy', tags: [] }])}
                className="inline-flex items-center gap-2 rounded-xl border border-edge bg-inset px-3 py-2 text-sm font-semibold text-heading"
              >
                <Plus className="h-4 w-4" />
                Add card
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {cards.map((c, idx) => (
                <div key={`${idx}-${c.front.slice(0, 10)}`} className="rounded-2xl border border-edge bg-inset p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted">
                      #{idx + 1} · <span className="capitalize text-sub">{c.difficulty}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCards((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-dim hover:text-red-500"
                      aria-label="Delete card"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <label className="mt-3 block text-xs text-muted">Front</label>
                  <input
                    value={c.front}
                    onChange={(e) =>
                      setCards((prev) => prev.map((x, i) => (i === idx ? { ...x, front: e.target.value } : x)))
                    }
                    className="mt-1 w-full rounded-xl border border-edge bg-card px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
                  />

                  <label className="mt-3 block text-xs text-muted">Back</label>
                  <textarea
                    value={c.back}
                    onChange={(e) =>
                      setCards((prev) => prev.map((x, i) => (i === idx ? { ...x, back: e.target.value } : x)))
                    }
                    className="mt-1 h-24 w-full resize-none rounded-xl border border-edge bg-card px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
                  />

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={c.difficulty}
                      onChange={(e) =>
                        setCards((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, difficulty: e.target.value as AICard['difficulty'] } : x)),
                        )
                      }
                      className="rounded-lg border border-edge bg-card px-2 py-1 text-xs text-heading"
                    >
                      <option value="easy">easy</option>
                      <option value="medium">medium</option>
                      <option value="hard">hard</option>
                    </select>
                    <span className="text-xs text-muted">
                      Tags: {(c.tags ?? []).slice(0, 5).join(', ') || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-edge bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted">Generated Quiz</p>
                <p className="mt-1 text-sm text-sub">Preview quiz items or run them instantly.</p>
              </div>
              <button
                type="button"
                onClick={tryGeneratedQuiz}
                disabled={quiz.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                <BrainCircuit className="h-4 w-4" />
                Try Quiz
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {quiz.map((q, idx) => (
                <div key={`${idx}-${q.type}`} className="rounded-2xl border border-edge bg-inset p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-heading">
                      {idx + 1}. {q.question}
                    </p>
                    <span className="rounded-full bg-brand-violet/20 px-3 py-1 text-xs text-brand-violet">
                      {q.type.toUpperCase()}
                    </span>
                  </div>
                  {'options' in q && q.type === 'mcq' && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-sub">
                      {q.options.map((opt) => (
                        <li key={opt}>{opt}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    Answer: <span className="text-sub">{q.type === 'matching' ? 'See pairs' : q.answer}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

