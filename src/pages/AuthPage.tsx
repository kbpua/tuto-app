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
  const emailRedirectTo = `${window.location.origin}/auth`
  const isVerified = Boolean(user?.email_confirmed_at)

  if (!isLoading && user && isVerified) {
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
        options: {
          emailRedirectTo,
        },
      })
      setStatus(
        error
          ? `Signup error: ${error.message}`
          : 'Account created. Please confirm your email if verification is enabled.',
      )
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        setStatus(`Login error: ${error.message}`)
      } else if (!data.user?.email_confirmed_at) {
        // Guardrail: do not keep sessions for accounts with unconfirmed email.
        await supabase.auth.signOut()
        setStatus('Please confirm your email before logging in. Check your inbox for the verification link.')
      } else {
        setStatus('Login success.')
      }
    }

    setIsSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-edge bg-card p-6 shadow-neon">
        <h1 className="text-3xl font-black text-brand-green">tuto</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">Halina&apos;t maTuto!</p>

        <div className="mt-5 grid grid-cols-2 rounded-xl border border-edge bg-inset p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'login' ? 'bg-brand-blue/20 text-brand-blue' : 'text-muted'
              }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'signup' ? 'bg-brand-violet/20 text-brand-violet' : 'text-muted'
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
            className="w-full rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-edge bg-inset px-3 py-2 text-sm text-heading outline-none focus:border-brand-blue"
          />
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-brand-green px-4 py-2 text-sm font-bold text-slate-950 transition hover:brightness-110 disabled:opacity-70"
          >
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
          <p className="rounded-lg border border-edge bg-inset px-3 py-2 text-xs text-sub">
            {status || 'Use your Supabase account credentials to continue.'}
          </p>
        </div>
      </div>
    </div>
  )
}
