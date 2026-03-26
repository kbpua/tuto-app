type LeaderboardRowProps = {
  rank: number
  name: string
  xp: number
}

export function LeaderboardRow({ rank, name, xp }: LeaderboardRowProps) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-edge bg-card px-4 py-3">
      <span className="text-sm font-bold text-brand-green">#{rank}</span>
      <div className="flex items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-violet/30 text-xs font-bold text-brand-violet">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <span className="text-sm font-medium text-heading">{name}</span>
      </div>
      <span className="text-sm font-bold text-brand-blue">{xp} XP</span>
    </div>
  )
}
