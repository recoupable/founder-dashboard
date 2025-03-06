'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Customer, PipelineData, PipelineStage } from './types';
import { initialPipelineData } from './mockPipelineData';

interface PipelineContextType {
  pipelineData: PipelineData;
  moveCustomer: (customerId: string, fromStage: PipelineStage, toStage: PipelineStage) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [pipelineData, setPipelineData] = useState<PipelineData>(initialPipelineData);

  // Move a customer from one stage to another
  const moveCustomer = (customerId: string, fromStage: PipelineStage, toStage: PipelineStage) => {
    setPipelineData((prevData) => {
      // Create new column objects
      const sourceColumn = { ...prevData.columns[fromStage] };
      const destinationColumn = { ...prevData.columns[toStage] };
      
      // Remove from source column
      sourceColumn.customerIds = sourceColumn.customerIds.filter(id => id !== customerId);
      
      // Add to destination column
      destinationColumn.customerIds = [...destinationColumn.customerIds, customerId];
      
      // Update customer stage
      const updatedCustomer = { 
        ...prevData.customers[customerId],
        stage: toStage
      };
      
      return {
        ...prevData,
        customers: {
          ...prevData.customers,
          [customerId]: updatedCustomer
        },
        columns: {
          ...prevData.columns,
          [fromStage]: sourceColumn,
          [toStage]: destinationColumn
        }
      };
    });
  };

  // Add a new customer
  const addCustomer = (customer: Omit<Customer, 'id'>) => {
    setPipelineData((prevData) => {
      // Generate a new ID
      const newId = `customer-${Date.now()}`;
      
      // Create the new customer with ID
      const newCustomer: Customer = {
        ...customer,
        id: newId
      };
      
      // Add to the appropriate column
      const column = { ...prevData.columns[customer.stage] };
      column.customerIds = [...column.customerIds, newId];
      
      return {
        ...prevData,
        customers: {
          ...prevData.customers,
          [newId]: newCustomer
        },
        columns: {
          ...prevData.columns,
          [customer.stage]: column
        }
      };
    });
  };

  // Update an existing customer
  const updateCustomer = (customer: Customer) => {
    setPipelineData((prevData) => {
      // Check if stage has changed
      const oldStage = prevData.customers[customer.id].stage;
      const newStage = customer.stage;
      
      if (oldStage !== newStage) {
        // Handle stage change (similar to moveCustomer)
        const sourceColumn = { ...prevData.columns[oldStage] };
        const destinationColumn = { ...prevData.columns[newStage] };
        
        sourceColumn.customerIds = sourceColumn.customerIds.filter(id => id !== customer.id);
        destinationColumn.customerIds = [...destinationColumn.customerIds, customer.id];
        
        return {
          ...prevData,
          customers: {
            ...prevData.customers,
            [customer.id]: customer
          },
          columns: {
            ...prevData.columns,
            [oldStage]: sourceColumn,
            [newStage]: destinationColumn
          }
        };
      } else {
        // Just update the customer data
        return {
          ...prevData,
          customers: {
            ...prevData.customers,
            [customer.id]: customer
          }
        };
      }
    });
  };

  // Delete a customer
  const deleteCustomer = (customerId: string) => {
    setPipelineData((prevData) => {
      // Get the customer's stage
      const stage = prevData.customers[customerId].stage;
      
      // Create a new customers object without the deleted customer
      const newCustomers = { ...prevData.customers };
      delete newCustomers[customerId];
      
      // Update the column
      const column = { ...prevData.columns[stage] };
      column.customerIds = column.customerIds.filter(id => id !== customerId);
      
      return {
        ...prevData,
        customers: newCustomers,
        columns: {
          ...prevData.columns,
          [stage]: column
        }
      };
    });
  };

  return (
    <PipelineContext.Provider value={{ 
      pipelineData, 
      moveCustomer, 
      addCustomer, 
      updateCustomer, 
      deleteCustomer 
    }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const context = useContext(PipelineContext);
  if (context === undefined) {
    throw new Error('usePipeline must be used within a PipelineProvider');
  }
  return context;
} 