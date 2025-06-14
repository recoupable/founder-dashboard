'use client';

import React, { useState } from 'react'
import { Customer } from '@/lib/customerService'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ChevronDown, ChevronUp, Check, Square } from 'lucide-react'

interface ResponsiveCustomerCardProps {
  customer: Customer
  onClick?: (customer: Customer) => void
  isSelected?: boolean
}

export function ResponsiveCustomerCard({ customer, onClick, isSelected = false }: ResponsiveCustomerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Get initials for the customer
  const getInitials = () => {
    return customer.name.substring(0, 2).toUpperCase();
  };
  
  // Check if URL is valid (not a local blob URL)
  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    // Local blob URLs won't persist between sessions
    if (url.startsWith('blob:')) return false;
    // Check if it's a valid URL format
    try {
      new URL(url);
      return true;
    } catch {
      // Ignore the error and return false for invalid URLs
      return false;
    }
  };
  
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm mb-3 overflow-hidden border ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('customerId', customer.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onClick && onClick(customer)}
    >
      <div className="p-2 sm:p-3">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Customer Avatar */}
          <div className="flex-shrink-0">
            {isValidImageUrl(customer.logo_url) ? (
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden">
                <Image 
                  src={customer.logo_url || ''}
                  alt={customer.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs sm:text-sm">
                {getInitials()}
              </div>
            )}
          </div>
          
          {/* Customer Info */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base max-w-[120px] sm:max-w-none">
                {customer.name}
              </h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                {isExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            </div>
            
            {/* Customer Details */}
            <div className="mt-1 text-xs sm:text-sm text-gray-500 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1">
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
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t text-xs sm:text-sm">
            {/* Todos Section */}
            {(customer.todos && customer.todos.length > 0) && (
              <div className="mb-2 sm:mb-3">
                <h4 className="font-medium text-gray-700 mb-1 text-xs sm:text-sm">Todos</h4>
                <ul className="space-y-1">
                  {customer.todos.map((todo, index) => (
                    <li key={index} className="flex items-start gap-2">
                      {todo.completed ? (
                        <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Square size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={`text-xs sm:text-sm ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                        {todo.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Notes Section */}
            {customer.notes && (
              <div>
                <h4 className="font-medium text-gray-700 mb-1 text-xs sm:text-sm">Notes</h4>
                <p className="text-gray-600 whitespace-pre-line text-xs">{customer.notes}</p>
              </div>
            )}
            
            {/* Contact Info */}
            <div className="mt-2 sm:mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2 text-xs">
              {customer.contact_email && (
                <div>
                  <span className="text-gray-500">Email:</span> {customer.contact_email}
                </div>
              )}
              {customer.contact_phone && (
                <div>
                  <span className="text-gray-500">Phone:</span> {customer.contact_phone}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 