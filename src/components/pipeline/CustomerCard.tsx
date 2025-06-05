'use client';

import React from 'react';
import { Customer } from '@/lib/customerService';
import Image from 'next/image';

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

  // Check if URL is valid (not a local blob URL or just text)
  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    // Local blob URLs won't persist between sessions
    if (url.startsWith('blob:')) return false;
    // Check if it's a valid URL format
    try {
      new URL(url);
      return true;
    } catch {
      // Return false for invalid URLs (including plain text)
      return false;
    }
  };

  return (
    <div
      onClick={handleClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('customerId', customer.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`
        border rounded-lg p-3 cursor-pointer transition-all duration-200 bg-white
        ${isSelected 
          ? 'border-blue-500 shadow-md ring-2 ring-blue-200' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-center justify-start space-x-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isValidImageUrl(customer.logo_url) ? (
            <Image
              src={customer.logo_url || ''}
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
        <div className="min-w-0">
          <h3 className="font-medium text-gray-900 truncate text-sm">
            {customer.name}
          </h3>
        </div>
      </div>
    </div>
  );
}