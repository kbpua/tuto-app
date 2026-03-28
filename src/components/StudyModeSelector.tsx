import { BrainCircuit, CheckSquare, PencilLine, Shuffle, Timer } from 'lucide-react'
import { motion } from 'framer-motion'

export type StudyMode = 'flashcard' | 'multiple-choice' | 'fill-in-blank' | 'mixed' | 'quiz'

const MODES: Array<{
  id: StudyMode
  title: string
  description: string
  icon: typeof BrainCircuit
}> = [
  {
    id: 'flashcard',
    title: 'Flashcards',
    description: 'Classic front/back flips with confidence ratings.',
    icon: BrainCircuit,
  },
  {
    id: 'multiple-choice',
    title: 'Multiple Choice',
    description: 'Answer with A/B/C/D and get instant feedback.',
    icon: CheckSquare,
  },
  {
    id: 'fill-in-blank',
    title: 'Fill in the Blank',
    description: 'Type the answer; accepts close matches.',
    icon: PencilLine,
  },
  {
    id: 'mixed',
    title: 'Mixed',
    description: 'Randomly mixes all question types every session.',
    icon: Shuffle,
  },
  {
    id: 'quiz',
    title: 'Deck Quiz',
    description: 'Timed per-deck quiz with score tracking and retries.',
    icon: Timer,
  },
]

type StudyModeSelectorProps = {
  selectedMode: StudyMode | null
  onSelectMode: (mode: StudyMode) => void
  onStart: () => void
}

export function StudyModeSelector({
  selectedMode,
  onSelectMode,
  onStart,
}: StudyModeSelectorProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black text-heading">Choose Study Mode</h2>
        <p className="mt-1 text-sm text-muted">
          Pick how you want to train this deck.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((mode, idx) => {
          const Icon = mode.icon
          const selected = selectedMode === mode.id
          return (
            <motion.button
              key={mode.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.06 }}
              onClick={() => onSelectMode(mode.id)}
              className={`rounded-2xl border p-4 text-left transition ${selected
                ? 'border-brand-green bg-brand-green/10 shadow-neon'
                : 'border-edge bg-card hover:border-brand-blue/50'
                }`}
            >
              <div className="mb-2 inline-flex rounded-xl bg-inset p-2">
                <Icon className={`h-5 w-5 ${selected ? 'text-brand-green' : 'text-brand-blue'}`} />
              </div>
              <p className="text-base font-bold text-heading">{mode.title}</p>
              <p className="mt-1 text-sm text-sub">{mode.description}</p>
            </motion.button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!selectedMode}
        className="rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
      >
        Start Session
      </button>
    </section>
  )
}

