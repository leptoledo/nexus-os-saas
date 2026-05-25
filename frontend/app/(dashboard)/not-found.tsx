'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex items-center justify-center gap-2 select-none">
          <span className="text-[6rem] font-black leading-none text-indigo-600">4</span>
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/60 dark:to-violet-950/60 flex items-center justify-center">
            <span className="text-4xl">🔍</span>
          </div>
          <span className="text-[6rem] font-black leading-none text-indigo-600">4</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Página não encontrada</h1>
          <p className="text-muted-foreground">
            Esta secção não existe ou foi movida. Verifica o URL ou regressa ao dashboard.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar atrás
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
