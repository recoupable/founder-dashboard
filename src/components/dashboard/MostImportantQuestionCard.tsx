'use client';

import { LightbulbIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MostImportantQuestionCard() {
  return (
    <Card className="col-span-full overflow-hidden border-0 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 shadow-lg transition-all duration-300 hover:shadow-xl relative">
      <div className="absolute top-0 left-0 h-full w-1.5 bg-gradient-to-b from-indigo-500 to-purple-600"></div>
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
      
      {/* Subtle animated gradient accent */}
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-300/20 to-purple-300/20 blur-xl animate-pulse"></div>
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5 px-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
            <LightbulbIcon className="h-5 w-5" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight text-gray-800">
            Most Important Question
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="py-4 px-6 relative z-10">
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <p className="text-xl font-medium leading-relaxed text-gray-800">
            What specific product issues would prevent our Free Trial users from converting to Paid Customers and why?
          </p>
          <div className="mt-4 h-1 w-24 bg-gradient-to-r from-indigo-300 to-purple-400 rounded-full"></div>
        </div>
      </CardContent>
    </Card>
  );
} 