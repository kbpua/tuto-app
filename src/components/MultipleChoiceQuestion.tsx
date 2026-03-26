import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type MultipleChoiceQuestionProps = {
  prompt: string
  options: string[]
  correctAnswer: string
  explanation?: string
  onAnswered: (isCorrect: boolean) => void
  onNext: () => void
}

export function MultipleChoiceQuestion({
  prompt,
  options,
  correctAnswer,
  explanation,
  onAnswered,
  onNext,
}: MultipleChoiceQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const answered = selected !== null

  useEffect(() => {
    setSelected(null)
  }, [prompt])

  useEffect(() => {
    if (answered) return
    const onKeyDown = (e: KeyboardEvent) => {
      const idx = Number(e.key) - 1
      if (idx >= 0 && idx <= 3 && options[idx]) {
        setSelected(idx)
        onAnswered(options[idx] === correctAnswer)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answered, correctAnswer, onAnswered, options])

  const choose = (idx: number) => {
    if (answered) return
    setSelected(idx)
    onAnswered(options[idx] === correctAnswer)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-edge bg-card p-5">
      <p className="text-lg font-bold text-heading">{prompt}</p>
      <div className="grid gap-2">
        {options.map((opt, idx) => {
          const isCorrect = opt === correctAnswer
          const isSelected = selected === idx
          const stateClass = answered
            ? isCorrect
              ? 'border-brand-green bg-brand-green/15 text-brand-green'
              : isSelected
                ? 'border-red-500 bg-red-500/12 text-red-500'
                : 'border-edge bg-inset text-sub'
            : 'border-edge bg-inset text-sub hover:border-brand-blue/50'
          return (
            <motion.button
              key={`${opt}-${idx}`}
              type="button"
              onClick={() => choose(idx)}
              whileTap={{ scale: 0.98 }}
              className={`rounded-xl border px-4 py-3 text-left text-sm transition ${stateClass}`}
            >
              <span className="mr-2 font-semibold text-muted">{idx + 1}.</span>
              {opt}
            </motion.button>
          )
        })}
      </div>

      {answered && (
        <div className="space-y-3">
          <p className="text-sm text-sub">
            Correct answer: <span className="font-semibold text-brand-green">{correctAnswer}</span>
          </p>
          {explanation && <p className="text-xs text-muted">{explanation}</p>}
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-slate-950"
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}

