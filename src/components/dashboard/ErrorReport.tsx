'use client'

import { useState, useEffect } from 'react'

interface ErrorReport {
  date: string
  totalMessages: number // Not used anymore but keeping for API compatibility
  totalErrors: number
  errorRate: number // Not used anymore but keeping for API compatibility
  errorBreakdown: Record<string, number> // Now contains tool names instead of error types
}

export function ErrorReport() {
  const [errorData, setErrorData] = useState<ErrorReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(1) // Default to today

  useEffect(() => {
    fetchErrorData()
  }, [days])

  const fetchErrorData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/telegram-errors?days=${days}`)
      const data = await response.json()
      
      if (response.ok) {
        setErrorData(data)
      } else {
        console.error('Error fetching data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching error data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Error Report</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!errorData) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Error Report</h2>
        <p className="text-gray-500">No error data available</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Error Report</h2>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="border rounded px-3 py-1 text-sm"
          title="Select time period for error report"
        >
          <option value={1}>Today</option>
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{errorData.totalErrors}</div>
          <div className="text-sm text-red-500">Total Errors</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {Object.keys(errorData.errorBreakdown).length}
          </div>
          <div className="text-sm text-blue-500">Affected Tools</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {errorData.totalErrors > 0 ? Math.max(...Object.values(errorData.errorBreakdown)) : 0}
          </div>
          <div className="text-sm text-purple-500">Most Errors (Single Tool)</div>
        </div>
      </div>

      {/* Tool Error Breakdown */}
      {Object.keys(errorData.errorBreakdown).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Errors by Tool</h3>
          <div className="space-y-2">
            {Object.entries(errorData.errorBreakdown)
              .sort(([,a], [,b]) => b - a) // Sort by count descending
              .map(([errorType, count]) => (
                <div key={errorType} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{errorType}</span>
                  <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm font-semibold">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      <button
        onClick={fetchErrorData}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        🔄 Refresh Data
      </button>
    </div>
  )
} 