'use client';

import React, { useState } from 'react'
import { Customer } from '@/lib/customerService'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ChevronDown, ChevronUp, Check, Square, Link } from 'lucide-react'

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
  
  // Get the appropriate emoji for engagement health
  const getHealthEmoji = () => {
    switch(customer.engagement_health) {
      case 'Active': return '💚';
      case 'Warm': return '💛';
      case 'At Risk': return '❤️';
      default: return '💛'; // Default to warm
    }
  };
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  };
  
  // Check if customer has a linked Recoupable account
  const hasRecoupableAccount = Boolean(customer.recoupable_user_id);
  
  return (
    <div 
      className={`bg-white rounded-lg shadow-sm mb-3 overflow-hidden border ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${hasRecoupableAccount ? 'border-blue-300' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('customerId', customer.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onClick && onClick(customer)}
    >
      <div className="p-2 sm:p-3">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* User Avatar */}
          <div className="flex-shrink-0">
            {isValidImageUrl(customer.logo_url) ? (
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden">
                {customer.logo_url?.startsWith('blob:') ? (
                  // Use regular img tag for blob URLs
                  <img 
                    src={customer.logo_url}
                    alt={customer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Use Next.js Image for regular URLs
                <Image 
                  src={customer.logo_url || ''}
                  alt={customer.name}
                  fill
                  className="object-cover"
                    unoptimized={customer.logo_url?.startsWith('data:') || false}
                />
                )}
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-xs sm:text-sm">
                {getInitials()}
              </div>
            )}
          </div>
          
          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
              <h3 className="font-medium text-gray-900 truncate text-sm sm:text-base max-w-[120px] sm:max-w-none">
                  🧑‍💼 {customer.name}
                  {hasRecoupableAccount && (
                    <span className="ml-1 text-blue-500" title="Linked to Recoupable account">
                      <Link size={12} />
                    </span>
                  )}
              </h3>
                {customer.email && (
                  <div className="text-xs text-gray-600 truncate">
                    📧 {customer.email}
                  </div>
                )}
              </div>
              <button 
                type="button"
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
            
            {/* Organization & Health */}
            <div className="mt-1 text-xs sm:text-sm flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1">
              {customer.organization && (
                <div className="text-gray-700">
                  🏢 {customer.organization}
                </div>
              )}
              {customer.engagement_health && (
                <div className="text-gray-700">
                  🔥 {getHealthEmoji()} {customer.engagement_health}
                </div>
              )}
            </div>
            
            {/* Basic Metrics */}
            <div className="mt-1 text-xs sm:text-sm text-gray-600 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1">
              {/* Artists Count */}
              <div className="flex items-center gap-1">
                🎤 {customer.current_artists || 0} artists
              </div>
              
              {/* Messages Sent - Show from Recoupable if available */}
              {customer._recoupable_messages_sent !== undefined && (
                <div className="flex items-center gap-1 text-blue-600">
                  💬 {customer._recoupable_messages_sent} msgs
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t text-xs">
            {/* Artists Section - Show from Recoupable if available */}
            {customer._recoupable_artists && customer._recoupable_artists.length > 0 && (
              <div className="mb-2">
                <h4 className="font-medium text-blue-600 mb-1 flex items-center">
                  🎤 Artists in Account <Link size={12} className="ml-1" />
                </h4>
                <ul className="space-y-1 pl-4 list-disc">
                  {customer._recoupable_artists.map((artist, idx) => (
                    <li key={`artist-${idx}`}>{artist}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Trial Info */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
              {customer.trial_start_date && (
                <div>
                  <span className="text-gray-500">🚀 Trial Start:</span> {formatDate(customer.trial_start_date)}
                </div>
              )}
              {customer.conversion_target_date && (
                <div>
                  <span className="text-gray-500">📆 Target:</span> {formatDate(customer.conversion_target_date)}
                </div>
              )}
            </div>
            
            {/* Conversion & Next Action */}
            {(customer.conversion_stage || customer.next_action) && (
              <div className="mb-2">
                {customer.conversion_stage && (
                  <div className="mb-1">
                    <span className="text-gray-500">📍 Stage:</span> {customer.conversion_stage}
                  </div>
                )}
                {customer.next_action && (
                  <div>
                    <span className="text-gray-500">🔁 Next Action:</span> {customer.next_action}
                  </div>
                )}
              </div>
            )}
            
            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-2">
              {customer.internal_owner && (
                <div>
                  <span className="text-gray-500">👤 Owner:</span> {customer.internal_owner}
                </div>
              )}
              {customer.use_case_type && (
                <div>
                  <span className="text-gray-500">🧠 Use Case:</span> {customer.use_case_type}
                </div>
              )}
              {customer.recoupable_user_id && (
                <div className="col-span-2">
                  <span className="text-blue-500">🔗 Recoupable ID:</span> {customer.recoupable_user_id}
                </div>
              )}
            </div>
            
            {/* Todos Section */}
            {(customer.todos && customer.todos.length > 0) && (
              <div className="mb-2">
                <h4 className="font-medium text-gray-700 mb-1">Todos</h4>
                <ul className="space-y-1">
                  {customer.todos.map((todo, idx) => (
                    <li key={`todo-${idx}`} className="flex items-start gap-2">
                      {todo.completed ? (
                        <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Square size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={todo.completed ? 'line-through text-gray-400' : ''}>
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
                <h4 className="font-medium text-gray-700 mb-1">🗒️ Notes</h4>
                <p className="text-gray-600 whitespace-pre-line">{customer.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 