import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AutoRefresh } from '@/components/AutoRefresh'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CEO Dashboard',
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
        <div className="min-h-screen">
          {children}
          <AutoRefresh interval={2 * 60 * 1000} /> {/* Refresh every 2 minutes */}
        </div>
      </body>
    </html>
  )
} 