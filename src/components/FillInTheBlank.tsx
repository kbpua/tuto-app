import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { checkSemanticMatch } from '../utils/semanticMatch'

type FillInTheBlankProps = {
  prompt: string
  correctAnswer: string
  onAnswered: (isCorrect: boolean) => void
  onNext: () => void
}

export function FillInTheBlank({
  prompt,
  correctAnswer,
  onAnswered,
  onNext,
}: FillInTheBlankProps) {
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  useEffect(() => {
    setValue('')
    setSubmitted(false)
    setIsCorrect(false)
  }, [prompt])

  const submit = () => {
    if (submitted) return
    const exact = value.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
    const semantic = checkSemanticMatch(value, correctAnswer)
    const ok = exact || semantic
    setSubmitted(true)
    setIsCorrect(ok)
    onAnswered(ok)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-edge bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold text-heading">{prompt}</p>
        <button
          type="button"
          aria-label="Text to speech (coming soon)"
          className="rounded-xl border border-edge bg-inset p-2 text-muted"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      </div>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
        disabled={submitted}
        placeholder="Type your answer and press Enter"
        className="w-full rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
      />

      {!submitted ? (
        <button
          type="button"
          onClick={submit}
          className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-slate-950"
        >
          Submit
        </button>
      ) : (
        <div className="space-y-3">
          {isCorrect ? (
            <p className="text-sm text-brand-green">Correct! Nice recall.</p>
          ) : (
            <p className="text-sm text-red-500">
              <span className="line-through">{value || 'No answer'}</span> {'->'}{' '}
              <span className="font-semibold">{correctAnswer}</span>
            </p>
          )}
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-slate-950"
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}

