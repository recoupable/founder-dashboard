'use client';

import { usePipeline } from '@/context/PipelineContext';

export function useSalesPipelineMRR() {
  const { getTotalMRR } = usePipeline();
  
  // Get the MRR data from the pipeline context
  const { current: currentMRR, potential: upcomingMRR } = getTotalMRR();
  
  return {
    currentMRR,
    upcomingMRR,
    // Calculate the difference between upcoming and current MRR
    potentialGrowth: upcomingMRR - currentMRR,
    // Format the MRR as currency
    formatMRR: (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
  };
} 