/**
 * ActiveUsersChart component: displays a chart of active users over time
 * @param chartData - Chart data with labels and data points
 * @param loading - Whether the chart is loading
 * @param error - Error message if any
 */
import React from 'react';
import { Line } from 'react-chartjs-2';

export interface ActiveUsersChartData {
  labels: string[];
  data: number[];
}

export interface ActiveUsersChartProps {
  chartData: ActiveUsersChartData | null;
  loading: boolean;
  error: string | null;
}

const ActiveUsersChart: React.FC<ActiveUsersChartProps> = ({
  chartData,
  loading,
  error
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Users Trend</h2>
        <div className="text-center text-gray-500 py-8">Loading chart...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Users Trend</h2>
        <div className="text-center text-red-500 py-8">{error}</div>
      </div>
    );
  }

  if (!chartData) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Active Users Trend</h2>
        <div className="text-center text-gray-500 py-8">No chart data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4">Active Users Trend</h2>
      <div className="h-64">
        <Line
          data={{
            labels: chartData.labels,
            datasets: [{
              label: 'Active Users',
              data: chartData.data,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.1
            }]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: { display: false }
            },
            scales: {
              y: { beginAtZero: true }
            }
          }}
        />
      </div>
    </div>
  );
};

export default ActiveUsersChart; 