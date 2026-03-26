import { useAuthStore } from '../store/useAuthStore'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-slate-100">Profile</h1>
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <p className="text-sm text-slate-300">
          Signed in as <span className="font-semibold text-slate-100">{user?.email}</span>
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Profile and achievements customization will be added in the next phase.
        </p>
      </section>
    </div>
  )
}
