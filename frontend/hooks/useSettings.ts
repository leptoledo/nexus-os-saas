'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, tenantsApi } from '@/lib/api'
import type { User } from '@/types'

// --------------- Profile ---------------

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      try {
        return await authApi.getProfile()
      } catch {
        return null
      }
    },
    staleTime: 300_000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<User>) => authApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

// --------------- Organization ---------------

export function useOrganization() {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      try {
        return await tenantsApi.getOrganization()
      } catch {
        return null
      }
    },
    staleTime: 300_000,
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: tenantsApi.updateOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] })
    },
  })
}

// --------------- Members ---------------

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      try {
        return await tenantsApi.getMembers()
      } catch {
        return []
      }
    },
    staleTime: 60_000,
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      tenantsApi.inviteMember(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      tenantsApi.updateMemberRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => tenantsApi.removeMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })
}
