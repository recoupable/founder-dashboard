'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, AlertCircle, Check, AlertTriangle } from 'lucide-react';

export default function PipelineUtilities() {
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error' | 'info' | 'warning'; text: string} | null>(null);
  
  const resetStageHistory = async () => {
    if (!customerId) {
      setMessage({ type: 'error', text: 'Please enter a customer ID' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: 'info', text: 'Checking stage history...' });
    
    try {
      const response = await fetch('/api/customers/reset-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: customerId })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error resetting stage history');
      }
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Stage history reset successfully!' });
      } else if (data.message?.includes('removed from the database')) {
        setMessage({ type: 'warning', text: data.message });
      } else {
        setMessage({ type: 'warning', text: 'Unknown response from server' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-8">Pipeline Utilities</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Database Status</CardTitle>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Fixed</span>
            </div>
            <CardDescription>
              The database schema has been modified by removing the stage_history column that was causing issues.
              This effectively resolved the timeout problems when updating customer records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
              <div className="flex items-center">
                <Info className="h-5 w-5 mr-2" />
                <div className="font-semibold">Stage History Column Removed</div>
              </div>
              <div className="mt-1">
                The stage_history column has been deleted from the database to prevent timeout issues.
                No further action is required.
              </div>
            </div>
          </CardContent>
        </Card>
      
        <Card>
          <CardHeader>
            <CardTitle>Reset Stage History</CardTitle>
            <CardDescription>
              This utility is no longer needed since the stage_history column has been removed.
              It&apos;s kept here for reference in case the column is added again in the future.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Input
                  placeholder="Enter customer ID"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={resetStageHistory} disabled={loading || !customerId}>
                  {loading ? 'Checking...' : 'Check History'}
                </Button>
              </div>
              
              {message && (
                <div className={`p-4 rounded-md ${
                  message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                  message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                  message.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                  'bg-blue-50 text-blue-800 border border-blue-200'
                }`}>
                  <div className="flex items-center">
                    {message.type === 'success' && <Check className="h-4 w-4 mr-2" />}
                    {message.type === 'error' && <AlertCircle className="h-4 w-4 mr-2" />}
                    {message.type === 'info' && <Info className="h-4 w-4 mr-2" />}
                    {message.type === 'warning' && <AlertTriangle className="h-4 w-4 mr-2" />}
                    <div className="font-semibold">
                      {message.type === 'success' && 'Success!'}
                      {message.type === 'error' && 'Error!'}
                      {message.type === 'info' && 'Processing...'}
                      {message.type === 'warning' && 'Notice:'}
                    </div>
                  </div>
                  <div className="mt-1">{message.text}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 