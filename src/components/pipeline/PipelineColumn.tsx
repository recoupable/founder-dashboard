'use client';

import React, { useState, useRef } from 'react';
import { Customer, PipelineStage } from '@/lib/customerService';
import { CustomerCard } from './CustomerCard';
import { usePipeline } from '@/context/PipelineContext';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PipelineColumnProps {
  stage: PipelineStage;
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
  onAddClick?: () => void;
}

export function PipelineColumn({ stage, customers, onCustomerClick, onAddClick }: PipelineColumnProps) {
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [dropPosition, setDropPosition] = useState<{ id: string, position: 'top' | 'bottom' } | null>(null);
  const [showEmptyIndicator, setShowEmptyIndicator] = useState(false);
  const { moveCustomerToStage, reorderCustomers } = usePipeline();
  const columnRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Handle drag over event for the column
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
    
    // If there are no customers or the mouse is below all cards, show the empty indicator
    if (customers.length === 0 || isMouseBelowAllCards(e)) {
      setShowEmptyIndicator(true);
    } else {
      setShowEmptyIndicator(false);
    }
  };
  
  // Check if mouse is below all cards
  const isMouseBelowAllCards = (e: React.DragEvent): boolean => {
    if (!contentRef.current || customers.length === 0) return true;
    
    const contentRect = contentRef.current.getBoundingClientRect();
    const lastCardElement = contentRef.current.lastElementChild as HTMLElement;
    
    if (!lastCardElement) return true;
    
    const lastCardRect = lastCardElement.getBoundingClientRect();
    return e.clientY > lastCardRect.bottom && e.clientY < contentRect.bottom;
  };
  
  // Handle drag leave event
  const handleDragLeave = () => {
    setIsDropTarget(false);
    setShowEmptyIndicator(false);
  };
  
  // Handle drag over for card
  const handleCardDragOver = (e: React.DragEvent, customerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseY = e.clientY;
    const threshold = rect.top + rect.height / 2;
    
    // Determine if we're dropping above or below the target card
    const position = mouseY < threshold ? 'top' : 'bottom';
    
    setDropPosition({ id: customerId, position });
  };
  
  // Handle drag leave for card
  const handleCardDragLeave = () => {
    setDropPosition(null);
  };
  
  // Handle drop event
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDropTarget(false);
    setDropPosition(null);
    setShowEmptyIndicator(false);
    
    const customerId = e.dataTransfer.getData('customerId');
    if (!customerId) return;
    
    // Check if we're dropping at the end of the column
    if (isMouseBelowAllCards(e)) {
      // Find the source customer
      const sourceCustomer = customers.find(c => c.id === customerId);
      
      if (sourceCustomer) {
        if (sourceCustomer.stage !== stage) {
          // Move to this stage if from a different stage
          await moveCustomerToStage(customerId, stage);
        } else {
          // Move to the end of this stage
          await reorderCustomers(customerId, '');  // Empty target ID means move to end
        }
      } else {
        // Move to this stage
        await moveCustomerToStage(customerId, stage);
      }
    } else {
      // Move to this stage
      await moveCustomerToStage(customerId, stage);
    }
  };
  
  // Handle drop on card
  const handleCardDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const position = dropPosition?.position || 'bottom';
    setIsDropTarget(false);
    setDropPosition(null);
    
    const sourceId = e.dataTransfer.getData('customerId');
    if (!sourceId || sourceId === targetId) return;
    
    // Find the target customer
    const targetIndex = customers.findIndex(c => c.id === targetId);
    if (targetIndex === -1) return;
    
    // If dropping at the bottom of a card, we want to place it after the target
    // If dropping at the top, we want to place it before the target
    let actualTargetId = targetId;
    
    if (position === 'bottom' && targetIndex < customers.length - 1) {
      // If dropping at the bottom and there's a next card, use the next card as target
      // This ensures the dragged card is placed between the current and next card
      actualTargetId = customers[targetIndex + 1].id;
    }
    
    // Reorder within the same stage
    await reorderCustomers(sourceId, actualTargetId);
  };
  
  // Get stage display name
  const getStageName = (stage: PipelineStage) => {
    switch (stage) {
      case 'Prospect':
        return 'Leads';
      case 'Meeting':
        return 'Qualified';
      case 'Free Trial':
        return 'Proposal';
      case 'Paying Customer':
        return 'Closed';
      default:
        return stage;
    }
  };
  
  // Calculate total MRR for this stage
  const totalMRR = customers.reduce((sum, customer) => sum + customer.current_mrr, 0);
  
  return (
    <div 
      ref={columnRef}
      className={`flex-1 min-w-[250px] max-w-[350px] flex flex-col h-full rounded-lg ${
        isDropTarget ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50'
      } transition-colors duration-200`}
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
              <span className="mx-1">•</span>
              <span>{formatCurrency(totalMRR)} MRR</span>
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
      
      {/* Column Content - Scrollable */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 relative"
      >
        {customers.map((customer) => (
          <div 
            key={customer.id}
            className={`relative ${
              dropPosition?.id === customer.id ? 'z-10' : 'z-0'
            }`}
            onDragOver={(e) => handleCardDragOver(e, customer.id)}
            onDragLeave={handleCardDragLeave}
            onDrop={(e) => handleCardDrop(e, customer.id)}
          >
            {/* Drop indicator - top */}
            {dropPosition?.id === customer.id && dropPosition.position === 'top' && (
              <div className="absolute -top-1.5 left-0 right-0 h-1 bg-blue-500 rounded-full animate-pulse" />
            )}
            
            <CustomerCard 
              customer={customer} 
              onClick={onCustomerClick}
            />
            
            {/* Drop indicator - bottom */}
            {dropPosition?.id === customer.id && dropPosition.position === 'bottom' && (
              <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
        ))}
        
        {/* Empty state or drop indicator at the end */}
        {customers.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm italic">
            No customers in this stage
          </div>
        ) : showEmptyIndicator && (
          <div className="mt-3 border-2 border-dashed border-blue-300 rounded-lg p-4 text-center text-blue-500 animate-pulse">
            Drop here to add to the end
          </div>
        )}
      </div>
    </div>
  );
} 