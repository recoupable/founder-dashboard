'use client';

import { DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesPipelineMRR } from '@/hooks/useSalesPipelineMRR';

export function MRRCard() {
  const { currentMRR, potentialGrowth, formatMRR } = useSalesPipelineMRR();
  
  // Calculate the percentage growth
  const percentGrowth = currentMRR > 0 
    ? Math.round((potentialGrowth / currentMRR) * 100) 
    : 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Monthly Recurring Revenue
        </CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatMRR(currentMRR)}</div>
        <div className="flex items-center gap-2 text-xs mt-1">
          <div className="flex items-center gap-1 text-green-500">
            <TrendingUp className="h-3 w-3" />
            <span>+{formatMRR(potentialGrowth)}</span>
            {percentGrowth > 0 && <span>({percentGrowth}%)</span>}
          </div>
          <span className="text-muted-foreground">potential growth</span>
        </div>
      </CardContent>
    </Card>
  );
} 