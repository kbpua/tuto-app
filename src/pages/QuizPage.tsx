import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleX, Timer } from 'lucide-react'
import { QuizQuestion } from '../components/QuizQuestion'
import { quizQuestions } from '../data/mockData'
import { useQuizStore } from '../store/useQuizStore'
import { useLocation } from 'react-router-dom'
import { playSfx } from '../lib/sound'

type GeneratedQuizQuestion =
  | {
    id: string
    type: 'mcq'
    question: string
    options: string[]
    answer: string
    explanation: string
  }
  | {
    id: string
    type: 'written'
    question: string
    answer: string
    explanation: string
  }
  | {
    id: string
    type: 'matching'
    question: string
    pairs: [string, string][]
    explanation: string
  }

export function QuizPage() {
  const location = useLocation()
  const generated = (location.state as { generatedQuestions?: GeneratedQuizQuestion[] } | null)?.generatedQuestions
  const questions = generated && generated.length > 0 ? generated : quizQuestions

  const [index, setIndex] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [selfScores, setSelfScores] = useState<Record<string, boolean>>({})
  const [showResults, setShowResults] = useState(false)
  const recordAttempt = useQuizStore((s) => s.recordAttempt)
  const totalAttempts = useQuizStore((s) => s.totalAttempts)
  const bestAccuracy = useQuizStore((s) => s.bestAccuracy)
  const averageAccuracy = useQuizStore((s) => s.averageAccuracy)

  const question = questions[index]
  const answeredCount = Object.keys(selfScores).length
  const correctCount = useMemo(
    () => Object.values(selfScores).filter(Boolean).length,
    [selfScores],
  )
  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  useEffect(() => {
    if (showResults) return
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [showResults])

  const markCurrent = (isCorrect: boolean) => {
    playSfx(isCorrect ? 'answer_correct' : 'answer_wrong')
    setSelfScores((prev) => ({ ...prev, [question.id]: isCorrect }))
  }

  const finishQuiz = () => {
    playSfx('session_complete')
    recordAttempt({
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      durationSec: elapsedSeconds,
    })
    setShowResults(true)
  }

  const restartQuiz = () => {
    setIndex(0)
    setElapsedSeconds(0)
    setSelfScores({})
    setShowResults(false)
  }

  if (showResults) {
    const accuracy = Math.round((correctCount / questions.length) * 100)
    return (
      <div className="mx-auto max-w-xl space-y-4 py-6">
        <h1 className="text-2xl font-black text-heading">Quiz Complete</h1>
        <section className="rounded-2xl border border-brand-green/40 bg-brand-green/10 p-5">
          <p className="text-4xl font-black text-brand-green">{accuracy}%</p>
          <p className="mt-1 text-sm text-sub">
            {correctCount} / {questions.length} correct in {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
        </section>
        <div className="flex gap-3">
          <button onClick={restartQuiz} className="flex-1 rounded-xl border border-edge py-2.5 text-sm text-sub">
            Restart Quiz
          </button>
          <button onClick={() => setShowResults(false)} className="flex-1 rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-slate-950">
            Review Questions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-heading">Quiz Mode</h1>
        <p className="flex items-center gap-2 rounded-xl border border-edge bg-card px-3 py-2 text-sm text-heading">
          <Timer className="h-4 w-4 text-brand-green" /> {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-edge bg-card p-3">
          <p className="text-xs text-muted">Attempts</p>
          <p className="mt-1 text-xl font-black text-heading">{totalAttempts()}</p>
        </article>
        <article className="rounded-xl border border-edge bg-card p-3">
          <p className="text-xs text-muted">Best</p>
          <p className="mt-1 text-xl font-black text-brand-green">{bestAccuracy()}%</p>
        </article>
        <article className="rounded-xl border border-edge bg-card p-3">
          <p className="text-xs text-muted">Average</p>
          <p className="mt-1 text-xl font-black text-brand-blue">{averageAccuracy()}%</p>
        </article>
      </section>

      <div className="flex items-center justify-between text-sm text-sub">
        <span>Question {index + 1} of {questions.length}</span>
        <span className="rounded-full bg-brand-violet/20 px-3 py-1 text-brand-violet">{question.type.toUpperCase()}</span>
      </div>

      <QuizQuestion question={question} />

      <div className="rounded-2xl border border-edge bg-card p-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-muted">
          Self-check this answer
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => markCurrent(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-green/40 px-3 py-2 text-sm text-brand-green"
          >
            <CircleCheck className="h-4 w-4" /> Correct
          </button>
          <button
            type="button"
            onClick={() => markCurrent(false)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 px-3 py-2 text-sm text-red-500"
          >
            <CircleX className="h-4 w-4" /> Incorrect
          </button>
        </div>
      </div>

      <div className="flex justify-between">
        <button type="button" onClick={() => setIndex((prev) => (prev - 1 + questions.length) % questions.length)} className="rounded-lg border border-edge px-4 py-2 text-sm text-sub">Previous</button>
        {index < questions.length - 1 ? (
          <button type="button" onClick={() => setIndex((prev) => (prev + 1) % questions.length)} className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-slate-950">Next</button>
        ) : (
          <button type="button" onClick={finishQuiz} disabled={answeredCount === 0} className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">
            Finish Quiz
          </button>
        )}
      </div>
    </div>
  )
}
