import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AutoRefresh } from '@/components/AutoRefresh'
import { Navigation } from '@/components/Navigation'
import { StorageInitializer } from '@/components/StorageInitializer'
import { PipelineProvider } from '@/context/PipelineContext'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Founder Admin',
  description: 'Track key metrics for your business',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <PipelineProvider>
          <ToastProvider>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main className="flex-1">
              {children}
            </main>
            <AutoRefresh interval={2 * 60 * 1000} /> {/* Refresh every 2 minutes */}
            <StorageInitializer />
          </div>
          </ToastProvider>
        </PipelineProvider>
      </body>
    </html>
  )
} 