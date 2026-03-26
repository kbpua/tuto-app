import { Bot, BookOpen, House, Trophy, User, BrainCircuit, Settings, LogOut } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import tutoLogo from '../assets/brand/Tuto.webp'
import { useAuthStore } from '../store/useAuthStore'
import { useSettingsStore } from '../store/useSettingsStore'

const navItems = [
  { to: '/', label: 'Home', icon: House },
  { to: '/decks', label: 'Decks', icon: BookOpen },
  { to: '/study', label: 'Study', icon: BrainCircuit },
  { to: '/tutor', label: 'Tutor', icon: Bot },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  const theme = useSettingsStore((s) => s.theme)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="min-h-screen bg-app text-slate-100">
      <div className="mx-auto flex max-w-[1400px]">
        <aside
          aria-label="Primary"
          className="sticky top-0 hidden h-screen w-72 flex-col border-r border-white/10 bg-slate-950/80 px-5 py-6 lg:flex"
        >
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-neon">
                <img
                  src={tutoLogo}
                  alt="Tuto mascot"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-brand-green">tuto</h1>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">
                  Halina&apos;t maTuto!
                </p>
              </div>
            </div>
          </div>
          <nav aria-label="Main navigation" className="space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive
                    ? 'bg-brand-violet/25 text-brand-violet'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-h-screen flex-1 pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 px-4 py-3 backdrop-blur md:px-8">
            <div className="flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Halina&apos;t maTuto!</p>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-slate-400 sm:inline">{user?.email}</span>
                <button
                  type="button"
                  aria-label="Log out"
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-3 py-2 text-xs text-slate-300 transition hover:border-brand-blue/50 focus:outline-none focus:ring-2 focus:ring-brand-blue/60"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            </div>
          </header>
          <main className="px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>

      <nav
        aria-label="Bottom navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/90 p-2 backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-7 gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] ${isActive ? 'text-brand-blue' : 'text-slate-400'}`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
