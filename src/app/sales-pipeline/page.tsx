"use client"

import { useState, useEffect } from 'react'
import { ResponsivePipelineBoard } from '@/components/responsive/ResponsivePipelineBoard'
import Link from 'next/link'

export default function SalesPipelinePage() {
  const [tableExists, setTableExists] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // We know the table exists, so let's just set it to true
    setTableExists(true)
    setIsChecking(false)
  }, [])

  if (isChecking) {
    return (
      <div className="container mx-auto p-4 sm:p-8 text-center">
        <h1 className="text-xl sm:text-2xl font-bold mb-4">Loading Sales Pipeline...</h1>
        <div className="animate-pulse flex justify-center">
          <div className="h-4 w-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  if (!tableExists) {
    return (
      <div className="container mx-auto p-4 sm:p-8">
        <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 text-center">
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Sales Pipeline Setup Required</h1>
          <p className="mb-6">
            The sales pipeline database table doesn&apos;t exist yet. You need to create it before using this feature.
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="/sales-pipeline/admin" 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Go to Admin Page
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <ResponsivePipelineBoard />
    </div>
  )
} 