'use client';

import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OperationalCostCardProps {
  operationalCost: number;
  developmentCost: number;
}

export function OperationalCostCard({ operationalCost, developmentCost }: OperationalCostCardProps) {
  // Format number as currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  // Calculate total costs
  const totalCosts = operationalCost + developmentCost;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Expenses
        </CardTitle>
        <Settings className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">-{formatCurrency(totalCosts)}</div>
      </CardContent>
    </Card>
  );
} 