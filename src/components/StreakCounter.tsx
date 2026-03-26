import { Flame } from 'lucide-react'

type StreakCounterProps = {
  streak: number
}

export function StreakCounter({ streak }: StreakCounterProps) {
  return (
    <section className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5">
      <p className="text-xs uppercase tracking-widest text-muted">Daily Streak</p>
      <div className="mt-2 flex items-center gap-3">
        <Flame className="h-7 w-7 text-orange-500" />
        <p className="text-3xl font-black text-orange-500">{streak} days</p>
      </div>
    </section>
  )
}
