'use client';

import React from 'react';
import { Customer } from '@/lib/customerService';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

interface CustomerCardProps {
  customer: Customer;
  onClick?: (customer: Customer) => void;
  isSelected?: boolean;
}

export function CustomerCard({ customer, onClick, isSelected = false }: CustomerCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(customer);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        border rounded-lg p-3 cursor-pointer transition-all duration-200 bg-white
        ${isSelected 
          ? 'border-blue-500 shadow-md ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {customer.logo_url ? (
            <Image
              src={customer.logo_url}
              alt={`${customer.name} logo`}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600 uppercase">
                {customer.name.slice(0, 2)}
              </span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-gray-900 truncate text-sm">
              {customer.name}
            </h3>
          </div>
          
          {/* Customer Details */}
          <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
            {/* Current MRR */}
            <div className="flex items-center gap-1">
              <span className="font-medium">{formatCurrency(customer.current_mrr)}</span>
              <span className="text-xs">MRR</span>
            </div>
            
            {/* Potential MRR - Only show if greater than 0 */}
            {customer.potential_mrr > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium">{formatCurrency(customer.potential_mrr)}</span>
                <span className="text-xs">Upcoming</span>
              </div>
            )}
          </div>

          {/* Contact Email */}
          {customer.contact_email && (
            <div className="mt-2 text-xs text-gray-600">
              <span className="font-medium">Email:</span> {customer.contact_email}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}