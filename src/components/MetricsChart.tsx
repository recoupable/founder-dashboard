'use client'

import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface MetricsChartProps {
  className?: string
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}

type DatasetType = 'activeUsers' | 'payingCustomers';
type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'allTime';

export default function MetricsChart({ className }: MetricsChartProps) {
  const [data, setData] = useState<ChartData>({
    labels: [],
    datasets: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDataset, setSelectedDataset] = useState<DatasetType>('activeUsers')
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('monthly')
  const [fullData, setFullData] = useState<ChartData | null>(null)

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        console.log('Fetching chart data...')
        const response = await fetch(`/api/chart-data?timeframe=${selectedTimeframe}`)
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch chart data: ${response.status}`)
        }
        
        const chartData = await response.json()
        console.log('Received chart data:', chartData)
        
        if (!chartData.labels || !chartData.datasets) {
          throw new Error('Invalid chart data format')
        }
        
        setFullData(chartData)
        updateDisplayedData(chartData, selectedDataset)
        setError(null)
      } catch (error) {
        console.error('Error fetching historical data:', error)
        setError(error instanceof Error ? error.message : 'Failed to load chart data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistoricalData()
  }, [selectedTimeframe])

  const updateDisplayedData = (chartData: ChartData, datasetType: DatasetType) => {
    const dataset = chartData.datasets.find(ds => 
      datasetType === 'activeUsers' ? ds.label === 'Active Users' : ds.label === 'Paying Customers'
    )

    if (dataset) {
      setData({
        labels: chartData.labels,
        datasets: [dataset]
      })
    }
  }

  const handleDatasetChange = (value: DatasetType) => {
    setSelectedDataset(value)
    if (fullData) {
      updateDisplayedData(fullData, value)
    }
  }

  const handleTimeframeChange = (value: TimeframeType) => {
    setSelectedTimeframe(value)
    setIsLoading(true)
  }

  const getTimeframeLabel = (timeframe: TimeframeType) => {
    switch (timeframe) {
      case 'daily':
        return 'Last 7 Days'
      case 'weekly':
        return 'Last 8 Weeks'
      case 'monthly':
        return 'Last 6 Months'
      case 'allTime':
        return 'All Time'
      default:
        return 'Time Period'
    }
  }

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: getTimeframeLabel(selectedTimeframe),
      },
    },
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex justify-end gap-4 mb-4">
        <Select
          value={selectedTimeframe}
          onValueChange={(value: TimeframeType) => handleTimeframeChange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily (7 Days)</SelectItem>
            <SelectItem value="weekly">Weekly (8 Weeks)</SelectItem>
            <SelectItem value="monthly">Monthly (6 Months)</SelectItem>
            <SelectItem value="allTime">All Time</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={selectedDataset}
          onValueChange={(value: DatasetType) => handleDatasetChange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select metric" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activeUsers">Active Users</SelectItem>
            <SelectItem value="payingCustomers">Paying Customers</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      ) : data.datasets.length > 0 ? (
        <Line options={options} data={data} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </div>
  )
} 