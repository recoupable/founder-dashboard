'use client';

import React, { useState } from 'react';
import { Customer, PipelineStage } from '@/lib/customerService';
import { ResponsiveCustomerCard } from './ResponsiveCustomerCard';
import { usePipeline } from '@/context/PipelineContext';
import { Plus } from 'lucide-react';

interface ResponsivePipelineColumnProps {
  stage: PipelineStage;
  customers: Customer[];
  onCustomerClick: (customer: Customer) => void;
  onAddClick?: () => void;
}

export function ResponsivePipelineColumn({ 
  stage, 
  customers, 
  onCustomerClick, 
  onAddClick 
}: ResponsivePipelineColumnProps) {
  const { moveCustomerToStage } = usePipeline();
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Get background color based on stage
  const getColumnColor = () => {
    switch (stage) {
      case 'Prospect':
        return 'bg-blue-50 border-l-4 border-l-blue-500';
      case 'Meeting':
        return 'bg-purple-50 border-l-4 border-l-purple-500';
      case 'Free Trial':
        return 'bg-amber-50 border-l-4 border-l-amber-500';
      case 'Paying Customer':
        return 'bg-green-50 border-l-4 border-l-green-500';
      default:
        return 'bg-gray-50 border-l-4 border-l-gray-500';
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const customerId = e.dataTransfer.getData('customerId');
    if (customerId) {
      moveCustomerToStage(customerId, stage);
    }
  };

  return (
    <div 
      className={`rounded-lg shadow-sm ${getColumnColor()} flex flex-col h-full min-h-[300px] ${
        isDragOver ? 'ring-2 ring-primary ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b bg-white rounded-t-lg">
        <div className="flex justify-between items-center">
        <div>
            <h3 className="font-medium text-gray-900">{getStageName(stage)}</h3>
            <div className="text-sm text-gray-500 mt-1">
              <span>{customers.length} {customers.length === 1 ? 'customer' : 'customers'}</span>
            </div>
        </div>
          {onAddClick && (
          <button 
            onClick={onAddClick}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Add customer"
          >
              <Plus size={20} className="text-gray-500" />
          </button>
          )}
        </div>
      </div>
      
      {/* Column Content */}
      <div className="p-2 sm:p-3 flex-1 overflow-y-auto">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-gray-400">
            <p className="text-sm">No customers in this stage</p>
            <button 
              onClick={onAddClick}
              className="mt-2 text-blue-500 hover:text-blue-700 text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add customer
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {customers.map((customer) => (
              <ResponsiveCustomerCard 
                key={customer.id}
                customer={customer}
                onClick={() => onCustomerClick(customer)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 