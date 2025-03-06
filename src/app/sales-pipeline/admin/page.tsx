"use client"

import { useState, useEffect } from 'react'
import { createSalesPipelineTableFunction, executeSalesPipelineTableCreation, checkSalesPipelineTableExists } from '@/lib/databaseFunctions'
import Link from 'next/link'

export default function PipelineAdminPage() {
  const [tableExists, setTableExists] = useState<boolean>(false)
  const [isChecking, setIsChecking] = useState<boolean>(true)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('Checking if table exists...')

  useEffect(() => {
    checkTableExists()
  }, [])

  // Check if the customers table exists
  const checkTableExists = async () => {
    try {
      setIsChecking(true)
      setStatusMessage('Checking if table exists...')
      
      const exists = await checkSalesPipelineTableExists()
      setTableExists(exists)
      
      if (exists) {
        setStatusMessage('Table exists!')
      } else {
        setStatusMessage('Table does not exist. Create it to use the sales pipeline.')
      }
    } catch (err) {
      console.error('Error checking if table exists:', err)
      setError(err instanceof Error ? err.message : String(err))
      setStatusMessage('Error checking if table exists. Check console for details.')
    } finally {
      setIsChecking(false)
    }
  }

  // Create the customers table
  const createTable = async () => {
    try {
      setIsCreating(true)
      setStatusMessage('Creating table function...')
      
      // First create the function
      await createSalesPipelineTableFunction()
      
      setStatusMessage('Creating table...')
      // Then execute it
      await executeSalesPipelineTableCreation()
      
      setTableExists(true)
      setError(null)
      setStatusMessage('Table created successfully!')
    } catch (err) {
      console.error('Error creating table:', err)
      setError(err instanceof Error ? err.message : String(err))
      setStatusMessage('Error creating table. Check console for details.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sales Pipeline Admin</h1>
        <Link href="/sales-pipeline" className="text-blue-500 hover:underline">
          Back to Pipeline
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Database Setup</h2>
        
        <div className="mb-4">
          <p className="mb-2"><strong>Status:</strong> {statusMessage}</p>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <p><strong>Error:</strong> {error}</p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={checkTableExists}
            disabled={isChecking}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            {isChecking ? 'Checking...' : 'Check Again'}
          </button>
          
          {!tableExists && (
            <button
              onClick={createTable}
              disabled={isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Table'}
            </button>
          )}
        </div>
      </div>
      
      {tableExists && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Table Management</h2>
          <p className="mb-4">The sales_pipeline_customers table is set up and ready to use.</p>
          
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
            <p className="font-bold">Warning</p>
            <p>The following actions will affect your data. Use with caution.</p>
          </div>
          
          {/* Add more admin functions here if needed */}
        </div>
      )}
    </div>
  )
} 