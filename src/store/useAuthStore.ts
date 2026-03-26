import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  user: User | null
  isEmailVerified: boolean
  isLoading: boolean
  initialized: boolean
  initialize: () => Promise<() => void>
  signOut: () => Promise<string | null>
}

function isVerifiedUser(user: User | null | undefined): boolean {
  return Boolean(user?.email_confirmed_at)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isEmailVerified: false,
  isLoading: true,
  initialized: false,

  async initialize() {
    if (get().initialized) {
      return () => undefined
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      set({
        session: null,
        user: null,
        isEmailVerified: false,
        isLoading: false,
        initialized: true,
      })
    } else {
      const user = data.session?.user ?? null
      const verified = isVerifiedUser(user)
      if (user && !verified) {
        await supabase.auth.signOut()
      }
      set({
        session: verified ? data.session : null,
        user: verified ? user : null,
        isEmailVerified: verified,
        isLoading: false,
        initialized: true,
      })
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      const verified = isVerifiedUser(user)
      if (user && !verified) {
        void supabase.auth.signOut()
      }
      set({
        session: verified ? session : null,
        user: verified ? user : null,
        isEmailVerified: verified,
        isLoading: false,
      })
    })

    return () => listener.subscription.unsubscribe()
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return error?.message ?? null
  },
}))
