import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/useAuthStore'

export function AuthPage() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && user) {
    return <Navigate to="/" replace />
  }

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      setStatus('Please provide a valid email and a password with at least 6 characters.')
      return
    }

    setIsSubmitting(true)
    setStatus(mode === 'login' ? 'Signing in...' : 'Creating account...')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      setStatus(
        error
          ? `Signup error: ${error.message}`
          : 'Account created. Please confirm your email if verification is enabled.',
      )
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      setStatus(error ? `Login error: ${error.message}` : 'Login success.')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-neon">
        <h1 className="text-3xl font-black text-brand-green">tuto</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">Halina&apos;t maTuto!</p>

        <div className="mt-5 grid grid-cols-2 rounded-xl border border-white/10 bg-slate-950 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === 'login' ? 'bg-brand-blue/20 text-brand-blue' : 'text-slate-400'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === 'signup' ? 'bg-brand-violet/20 text-brand-violet' : 'text-slate-400'
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-blue"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-brand-blue"
          />
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-70"
          >
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
          <p className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
            {status || 'Use your Supabase account credentials to continue.'}
          </p>
        </div>
      </div>
    </div>
  )
}
