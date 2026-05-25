'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { billingApi } from '@/lib/api'

export function useSubscription() {
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => billingApi.getSubscription(),
    staleTime: 300_000, // 5 min
  })
}

export function useInvoices() {
  return useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: () => billingApi.getInvoices(),
    staleTime: 300_000,
  })
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: (priceId: string) => billingApi.createCheckoutSession(priceId),
    onSuccess: (data) => {
      if (data?.url) window.location.href = data.url
    },
  })
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: () => billingApi.createPortalSession(),
    onSuccess: (data) => {
      if (data?.url) window.open(data.url, '_blank')
    },
  })
}

export function useCancelSubscription() {
  return useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
  })
}
