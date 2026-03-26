import { useAuthStore } from '../store/useAuthStore'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-heading">Profile</h1>
      <section className="rounded-2xl border border-edge bg-card p-5">
        <p className="text-sm text-sub">
          Signed in as <span className="font-semibold text-heading">{user?.email}</span>
        </p>
        <p className="mt-2 text-sm text-sub">
          Profile and achievements customization will be added in the next phase.
        </p>
      </section>
    </div>
  )
}
