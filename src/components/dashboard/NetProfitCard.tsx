'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NetProfitCardProps {
  netProfit: number;
  isProfit: boolean;
}

export function NetProfitCard({ netProfit, isProfit }: NetProfitCardProps) {
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
          Profit
        </CardTitle>
        {isProfit ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
          {isProfit ? '+' : '-'} {formatCurrency(netProfit)}
        </div>
      </CardContent>
    </Card>
  );
} 