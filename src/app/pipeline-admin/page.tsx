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
      
      // Then execute the function to create the table
      await executeSalesPipelineTableCreation()
      
      setStatusMessage('Table created successfully!')
      setTableExists(true)
    } catch (err) {
      console.error('Error creating table:', err)
      setError(err instanceof Error ? err.message : String(err))
      setStatusMessage('Error creating table. Check console for details.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="bg-white shadow-md rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold">Sales Pipeline Admin</h1>
          <Link 
            href="/" 
            className="mt-2 sm:mt-0 px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
          >
            Back to Dashboard
          </Link>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Database Status</h2>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="mb-2">
              <span className="font-medium">Status:</span> {statusMessage}
            </p>
            {error && (
              <p className="text-red-500 mb-2">
                <span className="font-medium">Error:</span> {error}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={checkTableExists}
                disabled={isChecking || isCreating}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Refresh Status
              </button>
              {!tableExists && (
                <button
                  onClick={createTable}
                  disabled={isChecking || isCreating}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  Create Table
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">Help</h2>
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="mb-2">
              This page helps you manage the database table required for the Sales Pipeline feature.
            </p>
            <p className="mb-2">
              If you&apos;re seeing issues with the Sales Pipeline, you can check if the table exists and create it if needed.
            </p>
            <p>
              Note: Creating the table will not affect any existing data.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 