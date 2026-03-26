import { Swords } from 'lucide-react'
import { LeaderboardRow } from '../components/LeaderboardRow'
import { leaderboardUsers } from '../data/mockData'

export function LeaderboardPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-slate-100">Weekly Leaderboard</h1>
        <button type="button" className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-slate-950">Challenge a Friend</button>
      </div>

      <div className="space-y-2">
        {leaderboardUsers.map((user) => (
          <LeaderboardRow key={user.rank} rank={user.rank} name={user.name} xp={user.xp} />
        ))}
      </div>

      <section className="rounded-2xl border border-dashed border-brand-violet/50 bg-brand-violet/10 p-5">
        <p className="flex items-center gap-2 text-brand-violet"><Swords className="h-4 w-4" />Multiplayer quiz battle</p>
        <p className="mt-2 text-sm text-slate-300">Coming soon: real-time 1v1 quizzes with XP wager mode.</p>
      </section>
    </div>
  )
}
