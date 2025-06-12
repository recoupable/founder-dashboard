/**
 * SearchAndFilters component: handles search input and filter controls with inline error summary
 */
import React, { useState, useEffect } from 'react';

export interface SearchAndFiltersProps {
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  timeFilter,
  onTimeFilterChange
}) => {
  const [errorData, setErrorData] = useState<{totalErrors: number, errorBreakdown: Record<string, number>, errorRate: number}>({ 
    totalErrors: 0, 
    errorBreakdown: {},
    errorRate: 0
  })
  const [showErrorDropdown, setShowErrorDropdown] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showErrorDropdown) {
        const target = event.target as HTMLElement
        if (!target.closest('.error-dropdown-container')) {
          setShowErrorDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showErrorDropdown])

  useEffect(() => {
    const fetchErrorData = async () => {
      try {
        const days = timeFilter === 'Last 24 Hours' ? 1 : timeFilter === 'Last 7 Days' ? 7 : 30
        
        // Fetch error data
        const errorResponse = await fetch(`/api/error-logs?days=${days}`)
        const errorData = await errorResponse.json()
        
        // Fetch total messages for rate calculation
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
        const endDate = new Date()
        
        const messagesResponse = await fetch(`/api/conversations/leaderboard?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`)
        const messagesData = await messagesResponse.json()
        
        // Calculate total messages by summing up individual user message counts
        const totalMessages = messagesData.leaderboard ? 
          messagesData.leaderboard.reduce((sum: number, user: { currentPeriodActions?: number }) => sum + (user.currentPeriodActions || 0), 0) : 0
        const totalErrors = errorData.totalErrors || 0
        const errorRate = totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0
        
        if (errorResponse.ok) {
          setErrorData({
            totalErrors: totalErrors,
            errorBreakdown: errorData.errorBreakdown || {},
            errorRate: Math.round(errorRate * 100) / 100 // Round to 2 decimal places
          })
        }
      } catch (error) {
        console.error('Error fetching error data:', error)
      }
    }
    
    fetchErrorData()
  }, [timeFilter])

  return (
    <div className="flex flex-col gap-4 mb-12">
      {/* Clean Page Header with Error Summary and Master Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Product Usage</h1>
          
          {/* Compact Error Summary */}
          <div className="relative error-dropdown-container">
            <button
              onClick={() => setShowErrorDropdown(!showErrorDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                <span className="text-red-600 font-semibold">{errorData.totalErrors}</span>
                <span className="text-gray-500">errors</span>
              </div>
              <svg 
                className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showErrorDropdown ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Compact Error Breakdown Dropdown */}
            {showErrorDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">Error Rate</span>
                    </div>
                    {/* Error Rate Display - aligned with tool count badges */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      (errorData.errorRate || 0) >= 5 ? 'bg-red-100 text-red-700' :
                      (errorData.errorRate || 0) >= 2 ? 'bg-orange-100 text-orange-700' :
                      (errorData.errorRate || 0) > 0 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {(errorData.errorRate || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  
                  {/* Tool Breakdown */}
                  {Object.keys(errorData.errorBreakdown).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(errorData.errorBreakdown)
                        .sort(([,a], [,b]) => b - a) // Sort by count descending
                        .map(([tool, count], index) => (
                          <div key={tool} className="flex justify-between items-center text-xs hover:bg-gray-50 px-2 py-1.5 rounded transition-colors">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                index === 0 ? 'bg-red-500' : 
                                index === 1 ? 'bg-orange-500' : 
                                index === 2 ? 'bg-yellow-500' : 
                                'bg-gray-400'
                              }`}></div>
                              <span className="text-gray-700 font-medium">{tool.replace(/_/g, ' ')}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              count >= 4 ? 'bg-red-100 text-red-700' :
                              count >= 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {count}
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-gray-500">No errors found</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Master Time Filter */}
        <div className="flex items-center gap-4">
          <label htmlFor="master-time-filter" className="font-medium text-sm text-gray-700">
            Time Period:
          </label>
          <select
            id="master-time-filter"
            value={timeFilter}
            onChange={e => onTimeFilterChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="Last 24 Hours">Last 24 Hours</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="Last 12 Months">Last 12 Months</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilters; 