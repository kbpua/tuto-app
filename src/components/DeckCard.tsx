import { Gauge, Layers } from 'lucide-react'

type DeckCardProps = {
  title: string
  cards: number
  lastStudied: string
  mastery: number
}

export function DeckCard({ title, cards, lastStudied, mastery }: DeckCardProps) {
  return (
    <article className="group rounded-2xl border border-edge bg-card p-5 transition hover:-translate-y-1 hover:border-brand-blue/60">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 className="text-lg font-bold text-heading">{title}</h3>
        <div className="rounded-full border border-brand-green/50 px-2 py-1 text-xs font-semibold text-brand-green">
          {mastery}%
        </div>
      </div>
      <div className="space-y-2 text-sm text-sub">
        <p className="flex items-center gap-2"><Layers className="h-4 w-4 text-brand-blue" />{cards} cards</p>
        <p className="flex items-center gap-2"><Gauge className="h-4 w-4 text-brand-violet" />Last studied {lastStudied}</p>
      </div>
      <div className="mt-4 h-2 rounded-full bg-rail">
        <div className="h-full rounded-full bg-gradient-to-r from-brand-violet to-brand-green" style={{ width: `${mastery}%` }} />
      </div>
    </article>
  )
}
