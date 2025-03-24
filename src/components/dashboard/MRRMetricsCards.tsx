'use client';

import { HelpCircle } from 'lucide-react';
import { usePipeline } from '@/context/PipelineContext';
import { useRevenueDisplay } from '@/context/RevenueDisplayContext';

export function MRRMetricsCards() {
  const { getTotalMRR } = usePipeline();
  const { current: currentMRR, potential: upcomingMRR } = getTotalMRR();
  const { showAnnual, setShowAnnual } = useRevenueDisplay();
  
  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Convert MRR to ARR (multiply by 12)
  const getDisplayValue = (value: number) => {
    return showAnnual ? value * 12 : value;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {/* MRR/ARR Toggle */}
      <div className="col-span-1 sm:col-span-2 flex justify-end">
        <div className="inline-flex items-center bg-white shadow-sm border rounded-md">
          <button 
            onClick={() => setShowAnnual(false)}
            className={`px-3 py-1 text-xs font-medium rounded-l-md ${!showAnnual ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            MRR
          </button>
          <button 
            onClick={() => setShowAnnual(true)}
            className={`px-3 py-1 text-xs font-medium rounded-r-md ${showAnnual ? 'bg-blue-100 text-blue-800' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            ARR
          </button>
        </div>
      </div>
      
      {/* Current MRR/ARR Card */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center gap-1 mb-2">
          <h3 className="text-sm font-medium text-gray-700">
            Current {showAnnual ? 'ARR' : 'MRR'}
          </h3>
          <div className="group relative">
            <HelpCircle className="h-4 w-4 text-gray-400" />
            <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
              {showAnnual 
                ? 'Annual Recurring Revenue currently being generated from paying customers (MRR × 12).'
                : 'Monthly Recurring Revenue currently being generated from paying customers.'
              }
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          </div>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(getDisplayValue(currentMRR))}</p>
      </div>
      
      {/* Upcoming MRR/ARR Card */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center gap-1 mb-2">
          <h3 className="text-sm font-medium text-gray-700">
            Upcoming {showAnnual ? 'ARR' : 'MRR'}
          </h3>
          <div className="group relative">
            <HelpCircle className="h-4 w-4 text-gray-400" />
            <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
              {showAnnual 
                ? 'Current ARR plus upcoming ARR if free trial customers convert to paying customers (MRR × 12).'
                : 'Current MRR plus upcoming MRR if free trial customers convert to paying customers.'
              }
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
            </div>
          </div>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(getDisplayValue(upcomingMRR))}</p>
      </div>
    </div>
  );
} 