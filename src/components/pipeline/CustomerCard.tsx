'use client';

import React, { useState } from 'react'
import { Customer, Todo } from '@/lib/customerService'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ChevronDown, ChevronUp, Check, Square } from 'lucide-react'

interface CustomerCardProps {
  customer: Customer
  onClick?: (customer: Customer) => void
  isSelected?: boolean
}

export function CustomerCard({ customer, onClick, isSelected = false }: CustomerCardProps) {
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
  
  // Format date to be more readable
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };
  
  // Check if last contact was more than two weeks ago
  const isContactOverdue = (dateString: string) => {
    if (!dateString) return false;
    const lastContact = new Date(dateString);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return lastContact < twoWeeksAgo;
  };
  
  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('customerId', customer.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  // Calculate days left in trial if applicable
  const getDaysLeftInTrial = () => {
    if (customer.stage !== 'Free Trial' || !customer.trial_end_date) return null;
    
    const today = new Date();
    const endDate = new Date(customer.trial_end_date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };
  
  const trialDays = getDaysLeftInTrial();
  
  // Toggle expanded state
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  // Get incomplete todos count
  const incompleteTodosCount = (customer.todos || []).filter(todo => !todo.completed).length;
  
  return (
    <div 
      className={`bg-white rounded-md shadow-sm transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500' : ''
      } ${isExpanded ? 'pb-3' : ''} hover:shadow-md cursor-pointer mb-4`}
      onClick={() => onClick?.(customer)}
      draggable={true}
      onDragStart={handleDragStart}
    >
      {/* Card Header */}
      <div className="p-3">
        {/* Header with logo and name */}
        <div className="flex items-center gap-3 mb-3">
          {customer.logo_url && isValidImageUrl(customer.logo_url) ? (
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
              <Image 
                src={customer.logo_url} 
                alt={`${customer.name} logo`}
                width={40}
                height={40}
                className="object-cover w-full h-full"
                onError={(e) => {
                  // If image fails to load, show initials instead
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `<div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 font-medium">${getInitials()}</div>`;
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-600 font-medium">
              {getInitials()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{customer.name}</h3>
          </div>
        </div>
        
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <p className="text-xs text-gray-500">Current MRR</p>
            <p className="font-medium">{formatCurrency(customer.current_mrr)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Potential MRR</p>
            <p className="font-medium">{formatCurrency(customer.potential_mrr)}</p>
          </div>
        </div>
        
        {/* Footer with date and trial info */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {trialDays !== null && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {trialDays} days left
              </span>
            )}
            
            {customer.last_contact_date && (
              <div className="flex items-center gap-1">
                {isContactOverdue(customer.last_contact_date) ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span className="text-xs text-red-500">
                      Last: {formatDate(customer.last_contact_date)}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-500">
                    Last: {formatDate(customer.last_contact_date)}
                  </span>
                )}
              </div>
            )}
            
            {customer.activity_count && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">{customer.activity_count}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              </div>
            )}
          </div>
        </div>
        
        {/* Add expand/collapse button */}
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center space-x-1">
            {incompleteTodosCount > 0 && (
              <div className="flex items-center bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                {incompleteTodosCount} task{incompleteTodosCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          <button 
            onClick={toggleExpanded}
            className={`p-1 rounded-full focus:outline-none ${isExpanded ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            aria-label={isExpanded ? "Collapse card" : "Expand card"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 mt-2 pb-2 bg-gray-50 rounded-b-md border-t border-gray-100">
          {/* Todo List */}
          {(customer.todos || []).length > 0 ? (
            <div className="pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <span className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                    <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </span>
                Tasks
              </h4>
              <ul className="space-y-2">
                {(customer.todos || []).map((todo: Todo) => (
                  <li 
                    key={todo.id} 
                    className={`flex items-start p-2 rounded-md ${
                      todo.completed ? 'bg-green-50' : 'bg-white border border-gray-200'
                    }`}
                  >
                    <span className={`mr-2 mt-0.5 ${todo.completed ? 'text-green-500' : 'text-gray-400'}`}>
                      {todo.completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </span>
                    <span className={`text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {todo.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          
          {/* Notes (if any) */}
          {customer.notes && (
            <div className={`${(customer.todos || []).length > 0 ? 'mt-3' : 'pt-3'}`}>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <span className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4"></path>
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"></path>
                  </svg>
                </span>
                Notes
              </h4>
              <div className="bg-white p-2 rounded-md border border-gray-200">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}