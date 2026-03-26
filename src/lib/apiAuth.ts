import { supabase } from './supabase'

export async function getApiJsonHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}
