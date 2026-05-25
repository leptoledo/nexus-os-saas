'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { getSupabaseBrowser } from '@/lib/supabase'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setOrganization, fetchUserData, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await fetchUserData()
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setOrganization(null)
        router.push('/login')
      }

      if (event === 'TOKEN_REFRESHED') {
        // Token was refreshed silently, no action needed
      }

      if (event === 'USER_UPDATED') {
        await fetchUserData()
      }
    })

    // Check existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserData()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
