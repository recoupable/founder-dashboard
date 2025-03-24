'use client';

import { useSalesPipelineMRR } from '@/hooks/useSalesPipelineMRR';
import { NetProfitCard } from './NetProfitCard';
import { useRevenueDisplay } from '@/context/RevenueDisplayContext';

interface NetProfitCalculatorProps {
  developmentCost: number;
  operationalCost: number;
}

export function NetProfitCalculator({ developmentCost, operationalCost }: NetProfitCalculatorProps) {
  // Get the MRR from the sales pipeline
  const { currentMRR } = useSalesPipelineMRR();
  const { showAnnual } = useRevenueDisplay();
  
  // Calculate the net profit
  const totalMonthlyExpenses = developmentCost + operationalCost;
  
  // Adjust revenue and expenses based on monthly/yearly view
  const revenue = showAnnual ? currentMRR * 12 : currentMRR;
  const expenses = showAnnual ? totalMonthlyExpenses * 12 : totalMonthlyExpenses;
  
  const netProfit = revenue - expenses;
  const isProfit = netProfit >= 0;
  
  return (
    <NetProfitCard 
      netProfit={Math.abs(netProfit)} 
      isProfit={isProfit}
      isAnnual={showAnnual}
    />
  );
} 