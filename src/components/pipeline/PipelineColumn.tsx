'use client';

import React, { useState } from 'react';
import { Customer, PipelineStage } from '@/lib/customerService';
import { CustomerCard } from './CustomerCard';
import { usePipeline } from '@/context/PipelineContext';

interface PipelineColumnProps {
  stage: PipelineStage;
  customers: Customer[];
  onCustomerClick: (customerId: string) => void;
  onAddClick?: () => void;
}

export function PipelineColumn({ stage, customers, onCustomerClick, onAddClick }: PipelineColumnProps) {
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
      className={`rounded-lg shadow-sm ${getColumnColor()} flex flex-col h-full ${
        isDragOver ? 'ring-2 ring-primary ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b flex justify-between items-center">
        <div>
          <h3 className="font-medium flex items-center">
            {stage} <span className="ml-2 bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">{customers.length}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddClick}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Add new customer"
            title="Add new customer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button 
            className="text-gray-500 hover:text-gray-700"
            aria-label="More options"
            title="More options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="19" cy="12" r="1"></circle>
              <circle cx="5" cy="12" r="1"></circle>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Column Content */}
      <div className="p-3 flex-1 overflow-y-auto">
        {customers.length > 0 ? (
          customers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onClick={() => onCustomerClick(customer.id)}
            />
          ))
        ) : (
          <div className="text-center p-4 text-sm text-gray-500">
            No customers in this stage
          </div>
        )}
        
        {/* Add New Button */}
        <div className="flex justify-center mt-4">
          <button 
            onClick={onAddClick}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 px-4 py-2 rounded-md hover:bg-gray-100 border border-dashed border-gray-300 transition-colors"
            aria-label="Add new customer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add new
          </button>
        </div>
      </div>
    </div>
  );
} 