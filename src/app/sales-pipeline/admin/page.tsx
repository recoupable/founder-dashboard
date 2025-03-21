"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SalesPipelineAdminPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the new pipeline admin page
    router.replace('/pipeline-admin')
  }, [router])

  return (
    <div className="container mx-auto p-4 sm:p-8 text-center">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">Redirecting to Pipeline Admin...</h1>
      <div className="animate-pulse flex justify-center">
        <div className="h-4 w-32 bg-gray-300 rounded"></div>
      </div>
    </div>
  )
} 