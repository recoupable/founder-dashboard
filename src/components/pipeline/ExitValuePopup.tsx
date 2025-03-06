'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface ExitValuePopupProps {
  potentialMRR: number;
  isVisible: boolean;
}

// Typical SaaS multiples for AI companies
const AI_SAAS_MULTIPLES = {
  conservative: 8,
  average: 12,
  optimistic: 16
};

export function ExitValuePopup({ potentialMRR, isVisible }: ExitValuePopupProps) {
  const [selectedMultiple, setSelectedMultiple] = useState(AI_SAAS_MULTIPLES.average);
  
  // Calculate annual recurring revenue
  const annualRevenue = potentialMRR * 12;
  
  // Calculate potential exit value
  const exitValue = annualRevenue * selectedMultiple;
  
  if (!isVisible) return null;
  
  return (
    <div className="absolute z-50 top-full mt-2 left-1/2 transform -translate-x-1/2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 animate-fade-in">
      <div className="text-center">
        <h3 className="text-lg font-bold mb-1">Potential Exit Value</h3>
        <p className="text-xs text-gray-500 mb-3">Based on {selectedMultiple}x ARR multiple</p>
        
        <div className="text-3xl font-bold mb-2">{formatCurrency(exitValue)}</div>
        
        <p className="text-xs text-gray-500 mb-3">
          From {formatCurrency(potentialMRR)} monthly revenue
        </p>
        
        <div className="flex justify-center gap-2 mt-2">
          <button 
            onClick={() => setSelectedMultiple(AI_SAAS_MULTIPLES.conservative)}
            className={`text-xs px-3 py-1 rounded-full ${selectedMultiple === AI_SAAS_MULTIPLES.conservative ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {AI_SAAS_MULTIPLES.conservative}x
          </button>
          <button 
            onClick={() => setSelectedMultiple(AI_SAAS_MULTIPLES.average)}
            className={`text-xs px-3 py-1 rounded-full ${selectedMultiple === AI_SAAS_MULTIPLES.average ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {AI_SAAS_MULTIPLES.average}x
          </button>
          <button 
            onClick={() => setSelectedMultiple(AI_SAAS_MULTIPLES.optimistic)}
            className={`text-xs px-3 py-1 rounded-full ${selectedMultiple === AI_SAAS_MULTIPLES.optimistic ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            {AI_SAAS_MULTIPLES.optimistic}x
          </button>
        </div>
      </div>
    </div>
  );
} 