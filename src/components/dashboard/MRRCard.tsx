'use client';

import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesPipelineMRR } from '@/hooks/useSalesPipelineMRR';

export function MRRCard() {
  const { currentMRR, formatMRR } = useSalesPipelineMRR();
  
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
        <p className="text-xs text-muted-foreground mt-1">
          Monthly recurring revenue
        </p>
      </CardContent>
    </Card>
  );
} 