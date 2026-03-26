import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'

type AuthState = {
  session: Session | null
  user: User | null
  isLoading: boolean
  initialized: boolean
  initialize: () => Promise<() => void>
  signOut: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  initialized: false,

  async initialize() {
    if (get().initialized) {
      return () => undefined
    }

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      set({ session: null, user: null, isLoading: false, initialized: true })
    } else {
      const confirmedUser = data.session?.user?.email_confirmed_at
        ? data.session.user
        : null
      set({
        session: confirmedUser ? data.session : null,
        user: confirmedUser,
        isLoading: false,
        initialized: true,
      })
      if (data.session && !confirmedUser) {
        await supabase.auth.signOut()
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const confirmedUser = session?.user?.email_confirmed_at ? session.user : null
      set({
        session: confirmedUser ? session : null,
        user: confirmedUser,
        isLoading: false,
      })
      if (session && !confirmedUser) {
        void supabase.auth.signOut()
      }
    })

    return () => listener.subscription.unsubscribe()
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return error?.message ?? null
  },
}))
