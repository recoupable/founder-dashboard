"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SalesPipelinePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the main dashboard since the pipeline is now integrated there
    router.replace('/')
  }, [router])

  return (
    <div className="container mx-auto p-4 sm:p-8 text-center">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Redirecting to Dashboard...</h1>
      <div className="animate-pulse flex justify-center">
        <div className="h-4 w-32 bg-gray-300 rounded"></div>
      </div>
    </div>
  )
} 