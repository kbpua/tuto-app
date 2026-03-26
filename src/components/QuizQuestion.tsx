import { Volume2 } from 'lucide-react'

type MCQQuestion = {
  type: 'mcq'
  question: string
  options: readonly string[]
  answer: string
  explanation: string
}

type WrittenQuestion = {
  type: 'written'
  question: string
  answer: string
  explanation: string
}

type MatchingQuestion = {
  type: 'matching'
  question: string
  pairs: readonly [string, string][]
  explanation: string
}

type QuizQuestionProps = {
  question: MCQQuestion | WrittenQuestion | MatchingQuestion
}

export function QuizQuestion({ question }: QuizQuestionProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-100">{question.question}</h3>
        <button className="rounded-xl border border-white/15 p-2 text-slate-300 transition hover:border-brand-blue/50" type="button" aria-label="Text to speech">
          <Volume2 className="h-4 w-4" />
        </button>
      </div>

      {question.type === 'mcq' && (
        <div className="grid gap-3 md:grid-cols-2">
          {question.options.map((option) => (
            <button key={option} type="button" className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-left text-sm text-slate-200 transition hover:border-brand-violet/60">
              {option}
            </button>
          ))}
        </div>
      )}

      {question.type === 'written' && (
        <textarea className="h-32 w-full rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-200 focus:border-brand-blue focus:outline-none" placeholder="Type your answer..." />
      )}

      {question.type === 'matching' && (
        <div className="space-y-2">
          {question.pairs.map(([term, meaning]) => (
            <div key={term} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm">
              <span className="font-semibold text-slate-100">{term}</span>
              <span className="text-slate-400">{meaning}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-brand-green/40 bg-brand-green/10 p-3 text-sm text-brand-green">
        Explanation: {question.explanation}
      </div>
    </section>
  )
}
