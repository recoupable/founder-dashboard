'use client';

import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePipeline } from '@/context/PipelineContext';
import { useRevenueDisplay } from '@/context/RevenueDisplayContext';

export function MRRMetricsCards() {
  const { getTotalMRR } = usePipeline();
  const { current: currentMRR } = getTotalMRR();
  const { showAnnual } = useRevenueDisplay();
  
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Revenue
        </CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(getDisplayValue(currentMRR))}</div>
      </CardContent>
    </Card>
  );
} 