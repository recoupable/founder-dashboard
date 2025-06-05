'use client';

import { useRevenueDisplay } from '@/context/RevenueDisplayContext';

export function RevenueToggle() {
  const { showAnnual, setShowAnnual } = useRevenueDisplay();

  return (
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
  );
} 