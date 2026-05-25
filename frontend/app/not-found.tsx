'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="space-y-6 max-w-md">
        {/* Ilustração numérica */}
        <div className="flex items-center justify-center gap-2 select-none">
          <span className="text-[8rem] font-black leading-none text-indigo-600">4</span>
          <div className="h-28 w-28 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center">
            <span className="text-5xl">🔍</span>
          </div>
          <span className="text-[8rem] font-black leading-none text-indigo-600">4</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Página não encontrada</h1>
          <p className="text-muted-foreground">
            A página que procuras não existe ou foi movida. Verifica o endereço ou regressa ao início.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar atrás
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Ir para o Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
