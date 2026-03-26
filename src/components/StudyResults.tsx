import { motion } from 'framer-motion'
import { RotateCcw, ArrowLeft, Eye } from 'lucide-react'

type StudyResultsProps = {
  total: number
  correct: number
  byType: {
    flashcard: number
    multipleChoice: number
    fillInBlank: number
  }
  onStudyAgain: () => void
  onBackToDeck: () => void
  onReviewMissed: () => void
  canReviewMissed: boolean
}

export function StudyResults({
  total,
  correct,
  byType,
  onStudyAgain,
  onBackToDeck,
  onReviewMissed,
  canReviewMissed,
}: StudyResultsProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const xpEarned = correct * 10
  const celebratory = accuracy > 80

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`mx-auto w-full max-w-2xl space-y-4 rounded-2xl border p-6 ${celebratory
        ? 'border-brand-green bg-brand-green/10 shadow-neon'
        : 'border-edge bg-card'
        }`}
    >
      <h2 className="text-2xl font-black text-heading">Session Results</h2>
      <p className="text-sm text-sub">
        Score: <span className="font-semibold text-heading">{correct}</span> / {total} ({accuracy}%)
      </p>
      <p className="text-sm text-brand-violet">XP earned: +{xpEarned}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-edge bg-inset p-3 text-sm text-sub">
          Flashcard: <span className="font-semibold text-heading">{byType.flashcard}</span>
        </div>
        <div className="rounded-xl border border-edge bg-inset p-3 text-sm text-sub">
          MCQ: <span className="font-semibold text-heading">{byType.multipleChoice}</span>
        </div>
        <div className="rounded-xl border border-edge bg-inset p-3 text-sm text-sub">
          Fill-in: <span className="font-semibold text-heading">{byType.fillInBlank}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStudyAgain}
          className="inline-flex items-center gap-2 rounded-xl border border-edge px-3 py-2 text-sm text-sub hover:bg-heading/5"
        >
          <RotateCcw className="h-4 w-4" />
          Study Again
        </button>
        <button
          type="button"
          onClick={onBackToDeck}
          className="inline-flex items-center gap-2 rounded-xl border border-edge px-3 py-2 text-sm text-sub hover:bg-heading/5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Deck
        </button>
        <button
          type="button"
          onClick={onReviewMissed}
          disabled={!canReviewMissed}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-3 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
        >
          <Eye className="h-4 w-4" />
          Review Missed Cards
        </button>
      </div>
    </motion.section>
  )
}

