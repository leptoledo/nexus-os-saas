'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[NexusOS Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Algo correu mal
      </h2>
      <p className="text-muted-foreground max-w-sm mb-1">
        Ocorreu um erro inesperado nesta página.
      </p>
      {error?.message && (
        <p className="text-xs text-muted-foreground/70 font-mono bg-muted px-3 py-1.5 rounded-md mb-6 max-w-sm truncate">
          {error.message}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
        </Button>
        <Button asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4 mr-2" /> Ir para o Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
