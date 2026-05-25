import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'
import { createServerClient as _createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// --------------- Browser client (React components) ---------------
// Uses @supabase/supabase-js createClient with localStorage for persistence.
// This avoids cookie-based storage which can cause issues in certain contexts.

export function createBrowserClient() {
  return _createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}

// Singleton for use in client components / stores
// Uses localStorage-backed client so it works independently of cookie access
let browserClient: ReturnType<typeof _createBrowserClient<Database>> | null = null

export function getSupabaseBrowser(): ReturnType<typeof _createBrowserClient<Database>> {
  if (!browserClient) {
    if (typeof window !== 'undefined') {
      // Browser: use @supabase/supabase-js with explicit localStorage storage
      browserClient = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: localStorage,
          storageKey: 'sb-nozsstkwknmjpepzxqqb-auth-token',
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      }) as unknown as ReturnType<typeof _createBrowserClient<Database>>
    } else {
      // Server-side fallback
      browserClient = _createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    }
  }
  return browserClient!
}

// --------------- Server client (Server Components / API Routes) ---------------

export function createServerClient(
  cookieStore: {
    get: (name: string) => { value: string } | undefined
    set: (name: string, value: string, options: CookieOptions) => void
    delete: (name: string, options: CookieOptions) => void
  }
) {
  return _createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.delete(name, options)
      },
    },
  })
}

// --------------- Auth helpers ---------------

export async function getSession() {
  // Read session directly from localStorage for reliability.
  // This avoids cookie-based auth and Supabase client lock contention.
  if (typeof window !== 'undefined') {
    try {
      const storageKey = process.env.NEXT_PUBLIC_SUPABASE_URL
        ? `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]}-auth-token`
        : 'sb-nozsstkwknmjpepzxqqb-auth-token'
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const stored = JSON.parse(raw)
        const now = Math.floor(Date.now() / 1000)
        if (stored?.access_token && stored?.expires_at > now) {
          return stored as import('@supabase/supabase-js').Session
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }
  // Server-side or localStorage fallback via Supabase client
  const supabase = getSupabaseBrowser()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUser() {
  const supabase = getSupabaseBrowser()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  const supabase = getSupabaseBrowser()
  await supabase.auth.signOut()
}

export async function signInWithGoogle(redirectTo?: string) {
  const supabase = getSupabaseBrowser()
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
    },
  })
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseBrowser()
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: { name?: string; organization_name?: string }
) {
  const supabase = getSupabaseBrowser()
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
}

export async function resetPassword(email: string) {
  const supabase = getSupabaseBrowser()
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
}

export async function verifyMFA(factorId: string, code: string) {
  const supabase = getSupabaseBrowser()
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })
  if (challengeError) return { error: challengeError }

  return supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  })
}
