import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, Organization } from '@/types'
import { signOut as supabaseSignOut } from '@/lib/supabase'
import { authApi, tenantsApi } from '@/lib/api'

interface AuthState {
  user: User | null
  organization: Organization | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

interface AuthActions {
  setUser: (user: User | null) => void
  setOrganization: (org: Organization | null) => void
  setLoading: (loading: boolean) => void
  login: () => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  updateOrganization: (data: Partial<Organization>) => Promise<void>
  fetchUserData: () => Promise<void>
  clearError: () => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      organization: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      // Setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setOrganization: (organization) => set({ organization }),
      setLoading: (isLoading) => set({ isLoading }),
      clearError: () => set({ error: null }),

      // Actions
      login: async () => {
        set({ isLoading: true, error: null })
        try {
          await get().fetchUserData()
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Login failed'
          set({ error: message })
          throw err
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await supabaseSignOut()
        } finally {
          set({
            user: null,
            organization: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },

      fetchUserData: async () => {
        set({ isLoading: true })
        try {
          const [user, organization] = await Promise.all([
            authApi.getProfile(),
            tenantsApi.getOrganization(),
          ])
          set({ user, organization, isAuthenticated: true })
        } catch {
          set({ user: null, organization: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },

      updateProfile: async (data) => {
        const current = get().user
        if (!current) return

        // Optimistic update
        set({ user: { ...current, ...data } })
        try {
          const updated = await authApi.updateProfile(data)
          set({ user: updated })
        } catch (err) {
          // Rollback
          set({ user: current })
          const message = err instanceof Error ? err.message : 'Update failed'
          set({ error: message })
          throw err
        }
      },

      updateOrganization: async (data) => {
        const current = get().organization
        if (!current) return

        // Optimistic update
        set({ organization: { ...current, ...data } })
        try {
          const updated = await tenantsApi.updateOrganization(data)
          set({ organization: updated })
        } catch (err) {
          // Rollback
          set({ organization: current })
          const message = err instanceof Error ? err.message : 'Update failed'
          set({ error: message })
          throw err
        }
      },
    }),
    {
      name: 'nexus-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
