'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Customer, PipelineStage } from '@/lib/customerService';
import { usePipeline } from '@/context/PipelineContext';
import { PipelineColumn } from '../pipeline/PipelineColumn';
import { CustomerFormModal } from '@/components/pipeline/CustomerFormModal';
import { ExitValuePopup } from '../pipeline/ExitValuePopup';

export function ResponsivePipelineBoard() {
  const { getCustomersByStage, customers, addCustomer, updateCustomer, removeCustomer } = usePipeline();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(true);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [showExitValue, setShowExitValue] = useState(false);
  
  // Timer ref for long press
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // Handle click outside to close exit value popup
  const handleDocumentClick = () => {
    setShowExitValue(false);
  };
  
  // Add event listener for document click
  useEffect(() => {
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);
  
  // Get all pipeline stages
  const pipelineStages: PipelineStage[] = [
    'Prospect',
    'Meeting',
    'Free Trial',
    'Paying Customer'
  ];
  
  // Calculate Potential MRR
  const calculatePotentialMRR = () => {
    // Get all customers regardless of stage
    const allCustomers = customers;
    
    // Calculate total potential artists across all customers
    const totalPotentialArtists = allCustomers.reduce(
      (sum, customer) => sum + (customer.potential_artists || 0), 
      0
    );
    
    // Calculate potential MRR if all potential artists were paying $99
    const artistPrice = 99; // Price per artist
    
    // Monthly value if all potential artists were paying $99
    return totalPotentialArtists * artistPrice;
  };
  
  const potentialArtistMRR = calculatePotentialMRR();
  
  // Handle customer click
  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCreating(false);
    setIsFormOpen(true);
  };
  
  // Handle add new customer
  const handleAddCustomer = (stage?: PipelineStage) => {
    setSelectedCustomer(null);
    setIsCreating(true);
    setSelectedStage(stage || null);
    setIsFormOpen(true);
  };
  
  // Close the form modal
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedStage(null);
  };
  
  // Handle save customer
  const handleSaveCustomer = async (customerData: Omit<Customer, 'id'>) => {
    try {
      // If a stage was selected, use that stage
      const finalData = selectedStage 
        ? { ...customerData, stage: selectedStage }
        : customerData;
        
      if (isCreating) {
        await addCustomer(finalData);
      } else if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, finalData);
      }
      setIsFormOpen(false);
      setSelectedStage(null);
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };
  
  // Handle delete customer
  const handleDeleteCustomer = async (id: string) => {
    try {
      await removeCustomer(id);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineStages.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            customers={getCustomersByStage(stage)}
            onCustomerClick={handleCustomerClick}
            onAddClick={() => handleAddCustomer(stage)}
          />
        ))}
      </div>
      
      {/* Customer Form Modal */}
      {isFormOpen && (
        <CustomerFormModal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSave={handleSaveCustomer}
          onDelete={handleDeleteCustomer}
          customer={selectedCustomer || undefined}
          isCreating={isCreating}
          selectedStage={selectedStage}
        />
      )}
      
      {/* Exit Value Popup - Hidden but kept for potential future use */}
      {showExitValue && (
        <ExitValuePopup 
          potentialMRR={potentialArtistMRR} 
          isVisible={showExitValue} 
        />
      )}
    </div>
  );
} 