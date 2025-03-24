'use client';

import { PipelineProvider } from '@/context/PipelineContext';
import { OperationalCostCard } from './OperationalCostCard';
import { NetProfitCalculator } from './NetProfitCalculator';

interface FinancialMetricsProviderProps {
  developmentCost: number;
  operationalCost: number;
}

export function FinancialMetricsProvider({ 
  developmentCost, 
  operationalCost 
}: FinancialMetricsProviderProps) {
  return (
    <PipelineProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Combined Operational Costs Card */}
        <OperationalCostCard 
          operationalCost={operationalCost} 
          developmentCost={developmentCost}
        />
        
        {/* Net Profit Card - Calculated from MRR minus expenses */}
        <NetProfitCalculator 
          developmentCost={developmentCost}
          operationalCost={operationalCost}
        />
      </div>
    </PipelineProvider>
  );
} 