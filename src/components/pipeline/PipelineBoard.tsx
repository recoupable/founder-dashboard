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
  
  // Calculate Pipeline LTV (Lifetime Value)
  const calculatePipelineLTV = () => {
    // Get customers in trial and paying stages
    const trialCustomers = getCustomersByStage('Free Trial');
    const payingCustomers = getCustomersByStage('Paying Customer');
    const relevantCustomers = [...trialCustomers, ...payingCustomers];
    
    // Calculate total potential artists across these customers
    const totalPotentialArtists = relevantCustomers.reduce(
      (sum, customer) => sum + (customer.potential_artists || 0), 
      0
    );
    
    // Calculate LTV assuming 80% of potential artists at top tier ($999)
    const topTierPrice = 999; // Price for top tier subscription
    const conversionRate = 0.8; // 80% conversion to top tier
    
    // Monthly value if 80% of potential artists were on top tier
    return totalPotentialArtists * conversionRate * topTierPrice;
  };
  
  const pipelineLTV = calculatePipelineLTV();
  
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
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="bg-background p-3 rounded-md shadow-sm">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">Current MRR</p>
              <div className="group relative">
                <button className="h-4 w-4 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-xs">
                  ?
                </button>
                <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
                  Monthly Recurring Revenue currently being generated from paying customers.
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
                </div>
              </div>
            </div>
            <p className="text-xl font-bold">{formatCurrency(currentMRR)}</p>
          </div>
          
          <div className="bg-background p-3 rounded-md shadow-sm">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">Potential MRR</p>
              <div className="group relative">
                <button className="h-4 w-4 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-xs">
                  ?
                </button>
                <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
                  Total MRR from current paying customers plus potential MRR if free trial customers convert (based only on artists in their accounts, not their full roster).
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
                </div>
              </div>
            </div>
            <p className="text-xl font-bold">{formatCurrency(potentialMRR)}</p>
          </div>
          
          <div className="bg-background p-3 rounded-md shadow-sm">
            <div className="flex items-center gap-1">
              <p className="text-sm text-muted-foreground">Pipeline LTV (Monthly)</p>
              <div className="group relative">
                <button className="h-4 w-4 rounded-full bg-muted-foreground/20 text-muted-foreground flex items-center justify-center text-xs">
                  ?
                </button>
                <div className="absolute z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-300 bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-white rounded shadow-lg text-xs text-gray-700 border">
                  Monthly revenue projection if 80% of artists from trial and paying customers upgrade to top tier ($999). Helps prioritize premium features.
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b"></div>
                </div>
              </div>
            </div>
            <p className="text-xl font-bold">{formatCurrency(pipelineLTV)}</p>
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