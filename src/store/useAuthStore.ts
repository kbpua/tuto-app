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
      set({
        session: data.session,
        user: data.session?.user ?? null,
        isLoading: false,
        initialized: true,
      })
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
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
