'use client';

import { HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MostImportantQuestionCard() {
  return (
    <Card className="col-span-full border-2 border-blue-500 bg-blue-50 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold text-blue-600">
          Most Important Question
        </CardTitle>
        <HelpCircle className="h-5 w-5 text-blue-500" />
      </CardHeader>
      <CardContent className="py-4">
        <div className="text-lg font-medium leading-relaxed">
          What specific product issues would prevent our Free Trial users from converting to Paid Customers and why?
        </div>
      </CardContent>
    </Card>
  );
} 