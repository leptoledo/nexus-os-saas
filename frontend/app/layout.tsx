import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'NexusOS — Tudo o que a sua empresa precisa',
    template: '%s | NexusOS',
  },
  description:
    'Plataforma SaaS all-in-one para gerir Marketing, Projetos, Analytics e WhatsApp numa só plataforma.',
  keywords: ['SaaS', 'gestão empresarial', 'marketing', 'projetos', 'analytics', 'whatsapp'],
  authors: [{ name: 'NexusOS' }],
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    url: 'https://nexusos.io',
    title: 'NexusOS — Tudo o que a sua empresa precisa',
    description: 'Plataforma SaaS all-in-one para gerir Marketing, Projetos, Analytics e WhatsApp.',
    siteName: 'NexusOS',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexusOS',
    description: 'Plataforma SaaS all-in-one para a sua empresa.',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a1a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="bottom-right"
                richColors
                closeButton
                duration={4000}
                toastOptions={{
                  classNames: {
                    toast: 'font-sans',
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
