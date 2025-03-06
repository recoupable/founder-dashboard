'use client';

import { Code } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DevelopmentCostCardProps {
  developmentCost: number;
}

export function DevelopmentCostCard({ developmentCost }: DevelopmentCostCardProps) {
  // Format number as currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Development Costs
        </CardTitle>
        <Code className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(developmentCost)}</div>
        <p className="text-xs text-muted-foreground">
          Monthly development expenses
        </p>
      </CardContent>
    </Card>
  );
} 