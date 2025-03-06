'use client';

import { useSalesPipelineMRR } from '@/hooks/useSalesPipelineMRR';
import { NetProfitCard } from './NetProfitCard';

interface NetProfitCalculatorProps {
  developmentCost: number;
  operationalCost: number;
}

export function NetProfitCalculator({ developmentCost, operationalCost }: NetProfitCalculatorProps) {
  // Get the MRR from the sales pipeline
  const { currentMRR } = useSalesPipelineMRR();
  
  // Calculate the net profit
  const totalExpenses = developmentCost + operationalCost;
  const netProfit = currentMRR - totalExpenses;
  const isProfit = netProfit >= 0;
  
  return (
    <NetProfitCard 
      netProfit={Math.abs(netProfit)} 
      isProfit={isProfit} 
    />
  );
} 