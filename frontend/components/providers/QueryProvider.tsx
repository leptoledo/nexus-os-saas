'use client'

import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { toast } from 'sonner'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Global mutation error handler — shows toast for any unhandled mutation error
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            // Only fire if mutation doesn't define its own onError
            if (mutation.options.onError) return
            const msg = error instanceof Error ? error.message : 'Ocorreu um erro inesperado'
            toast.error(msg)
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error) => {
              if (error instanceof Error && error.message.includes('401')) return false
              return failureCount < 2
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
