'use client';

import React, { useState } from 'react';
import { Customer, PipelineStage } from '@/lib/customerService';
import { usePipeline } from '@/context/PipelineContext';
import { PipelineColumn } from './PipelineColumn';
import { CustomerFormModal } from '@/components/pipeline/CustomerFormModal';
import { formatCurrency } from '@/lib/utils';

export function PipelineBoard() {
  const { getCustomersByStage, getTotalMRR, customers, addCustomer, updateCustomer, removeCustomer } = usePipeline();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(true);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  
  // Get all pipeline stages
  const pipelineStages: PipelineStage[] = [
    'Prospect',
    'Meeting',
    'Free Trial',
    'Paying Customer'
  ];
  
  // Calculate totals
  const totalCustomers = pipelineStages.reduce(
    (count, stage) => count + getCustomersByStage(stage).length,
    0
  );
  
  const { current: currentMRR, potential: potentialMRR } = getTotalMRR();
  
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
  const handleCustomerClick = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer as Customer);
      setIsCreating(false);
      setIsFormOpen(true);
    }
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
      {/* Pipeline Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-card rounded-lg shadow">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Sales Pipeline</h2>
          <p className="text-muted-foreground">
            {totalCustomers} {totalCustomers === 1 ? "customer" : "customers"} in pipeline
          </p>
        </div>
        
        {/* Pipeline Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-medium text-gray-500">Current MRR</h3>
              <div className="group relative">
                <button className="h-4 w-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">
                  ?
                </button>
                <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
                  Monthly Recurring Revenue currently being generated from paying customers.
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(currentMRR)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-medium text-gray-500">Upcoming MRR</h3>
              <div className="group relative">
                <button className="h-4 w-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">
                  ?
                </button>
                <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
                  Current MRR plus upcoming MRR if free trial customers convert to paying customers.
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(potentialMRR)}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-1">
              <h3 className="text-sm font-medium text-gray-500">Potential MRR</h3>
              <div className="group relative">
                <button className="h-4 w-4 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">
                  ?
                </button>
                <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
                  Monthly revenue projection if all potential artists across all customers were paying $99 per artist.
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
                </div>
              </div>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(potentialArtistMRR)}</p>
          </div>
        </div>
      </div>
      
      {/* Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
    </div>
  );
} 