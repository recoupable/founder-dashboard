'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Customer, 
  PipelineStage, 
  fetchCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer, 
  updateCustomerStage,
  ensureTableExists
} from '@/lib/customerService';
import { checkSupabaseConnection } from '@/lib/supabase';

// Simple function to generate UUIDs
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Storage key and version for fallback localStorage
const STORAGE_KEY = 'pipelineData';
const STORAGE_VERSION = '1.0';

// Empty initial pipeline - no preloaded cards
const initialCustomers: Customer[] = [];

interface PipelineContextType {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (id: string, customer: Omit<Customer, 'id'>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  moveCustomerToStage: (customerId: string, newStage: PipelineStage) => Promise<void>;
  reorderCustomers: (sourceId: string, targetId: string) => Promise<void>;
  getCustomersByStage: (stage: PipelineStage) => Customer[];
  getTotalMRR: () => { current: number; potential: number };
  exportData: () => string;
  importData: (jsonData: string) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

// Helper function to safely save data to localStorage (fallback)
const saveToStorage = (data: Customer[]) => {
  try {
    const storageData = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      customers: data
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    return true;
  } catch (error) {
    console.error('Failed to save pipeline data to localStorage:', error);
    return false;
  }
};

// Helper function to safely load data from localStorage (fallback)
const loadFromStorage = (): Customer[] | null => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return null;
    
    const parsedData = JSON.parse(storedData);
    
    // Check if data has the expected structure
    if (!parsedData.customers || !Array.isArray(parsedData.customers)) {
      console.warn('Invalid data structure in localStorage');
      return null;
    }
    
    // Check version compatibility
    if (parsedData.version !== STORAGE_VERSION) {
      console.warn(`Data version mismatch: stored=${parsedData.version}, current=${STORAGE_VERSION}`);
      // Could implement migration logic here if needed
    }
    
    return parsedData.customers;
  } catch (error) {
    console.error('Failed to load pipeline data from localStorage:', error);
    return null;
  }
};

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load customers from Supabase on initial render
  const loadCustomers = async () => {
    try {
      console.log('🔄 Loading customers from Supabase...');
      console.log('🔄 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('🔄 Environment:', process.env.NODE_ENV);
      
      setLoading(true);
      setError(null);
      
      // Check Supabase connection first
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        console.error('❌ Failed to connect to Supabase');
        throw new Error('Failed to connect to Supabase');
      }
      
      // Ensure the table exists
      const tableExists = await ensureTableExists();
      if (!tableExists) {
        console.error('❌ Table does not exist and could not be created');
        throw new Error('Table does not exist and could not be created');
      }
      
      const data = await fetchCustomers();
      console.log('✅ Fetched customers:', data.length);
      
      if (data.length > 0) {
        setCustomers(data);
        console.log('✅ Set customers from Supabase data');
        
        // Also save to localStorage as backup
        saveToStorage(data);
      } else {
        // No customers in database and no initial data to load
        console.log('🔄 No customers found in database');
        setCustomers([]);
        saveToStorage([]);
      }
    } catch (err) {
      console.error('❌ Error loading customers from Supabase:', err);
      setError('Failed to load customers. Using local data instead.');
      
      // Fallback to localStorage if Supabase fails
      const savedCustomers = loadFromStorage();
      if (savedCustomers) {
        setCustomers(savedCustomers);
        console.log('✅ Loaded customers from localStorage');
      } else {
        console.log('🔄 No saved customers found, starting with empty pipeline');
        setCustomers([]);
      }
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  // Initial load
  useEffect(() => {
    loadCustomers();
  }, []);

  // Save customers to localStorage as a backup
  useEffect(() => {
    if (initialized) {
      saveToStorage(customers);
    }
  }, [customers, initialized]);

  // Refresh data from Supabase
  const refreshData = async () => {
    await loadCustomers();
  };

  // Add a new customer
  const addCustomer = async (customer: Omit<Customer, 'id'>) => {
    try {
      const newCustomer = await createCustomer(customer);
      setCustomers((prev) => [...prev, newCustomer]);
    } catch (err) {
      console.error('Error adding customer:', err);
      setError('Failed to add customer');
      
      // Fallback: add to local state only
      const newCustomer: Customer = {
        ...customer,
        id: generateUUID(),
      };
      setCustomers((prev) => [...prev, newCustomer]);
    }
  };

  // Update an existing customer
  const updateCustomerData = async (id: string, customerData: Omit<Customer, 'id'>) => {
    try {
      const updatedCustomer = await updateCustomer(id, customerData);
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === id ? updatedCustomer : customer
        )
      );
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Failed to update customer');
      
      // Fallback: update local state only
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === id ? { ...customerData, id } : customer
        )
      );
    }
  };

  // Remove a customer
  const removeCustomer = async (id: string) => {
    try {
      console.log(`🔄 Removing customer with ID: ${id}`);
      
      await deleteCustomer(id);
      console.log(`✅ Successfully deleted customer with ID: ${id} from database`);
      
      setCustomers((prev) => {
        const newCustomers = prev.filter((customer) => customer.id !== id);
        console.log(`✅ Removed customer from state, remaining: ${newCustomers.length}`);
        
        // Also update localStorage
        saveToStorage(newCustomers);
        
        return newCustomers;
      });
    } catch (err) {
      console.error(`❌ Error removing customer with ID: ${id}:`, err);
      setError('Failed to remove customer');
      
      // Fallback: remove from local state only
      setCustomers((prev) => {
        const newCustomers = prev.filter((customer) => customer.id !== id);
        console.log(`⚠️ Removed customer from state only (database operation failed)`);
        
        // Also update localStorage
        saveToStorage(newCustomers);
        
        return newCustomers;
      });
    }
  };

  // Move a customer to a different stage
  const moveCustomerToStage = async (customerId: string, newStage: PipelineStage) => {
    try {
      const updatedCustomer = await updateCustomerStage(customerId, newStage);
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerId ? updatedCustomer : customer
        )
      );
    } catch (err) {
      console.error('Error moving customer to new stage:', err);
      setError('Failed to update customer stage');
      
      // Fallback: update local state only
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerId
            ? { ...customer, stage: newStage }
            : customer
        )
      );
    }
  };

  // Reorder customers within the same stage
  const reorderCustomers = async (sourceId: string, targetId: string) => {
    try {
      // Find the source and target customers
      const sourceIndex = customers.findIndex(c => c.id === sourceId);
      const targetIndex = customers.findIndex(c => c.id === targetId);
      
      if (sourceIndex === -1) {
        console.error('Source customer not found');
        return;
      }
      
      // If target is not found, it might be because we're trying to move to the end of the list
      // In that case, we'll just append to the end
      const sourceCustomer = customers[sourceIndex];
      let targetCustomer = null;
      
      if (targetIndex !== -1) {
        targetCustomer = customers[targetIndex];
        
        // Make sure they're in the same stage
        if (sourceCustomer.stage !== targetCustomer.stage) {
          console.error('Cannot reorder customers in different stages');
          return;
        }
      }
      
      // Create a new array with the reordered customers
      const newCustomers = [...customers];
      
      // Remove the source customer
      newCustomers.splice(sourceIndex, 1);
      
      if (targetIndex === -1) {
        // If target not found, find all customers in the same stage and append to the end
        const sameStageCustomers = newCustomers.filter(c => c.stage === sourceCustomer.stage);
        const lastIndex = newCustomers.indexOf(sameStageCustomers[sameStageCustomers.length - 1]);
        newCustomers.splice(lastIndex + 1, 0, sourceCustomer);
      } else {
        // Find the new target index (it might have changed after removing the source)
        const newTargetIndex = newCustomers.findIndex(c => c.id === targetId);
        
        // Insert the source customer at the new position
        newCustomers.splice(newTargetIndex, 0, sourceCustomer);
      }
      
      // Add a small animation delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update the state
      setCustomers(newCustomers);
      
      // No need to update the database since order isn't stored there
      // Just save to localStorage as backup
      saveToStorage(newCustomers);
      
    } catch (error) {
      console.error('Error reordering customers:', error);
      setError('Failed to reorder customers');
    }
  };

  // Get customers by stage
  const getCustomersByStage = (stage: PipelineStage) => {
    return customers.filter(customer => customer.stage === stage);
  };

  // Calculate total MRR (current and potential)
  const getTotalMRR = () => {
    const currentMRR = customers.reduce(
      (total, customer) => total + customer.current_mrr,
      0
    );
    
    // Calculate upcoming MRR as current MRR + upcoming MRR from Free Trial customers
    const freeTrialPotentialMRR = customers
      .filter(customer => customer.stage === 'Free Trial')
      .reduce((total, customer) => total + customer.potential_mrr, 0);
    
    return {
      current: currentMRR,
      potential: currentMRR + freeTrialPotentialMRR, // Current MRR + upcoming from trials
    };
  };

  // Export data as JSON string
  const exportData = (): string => {
    const exportData = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      customers: customers
    };
    return JSON.stringify(exportData, null, 2);
  };

  // Import data from JSON string
  const importData = async (jsonData: string): Promise<boolean> => {
    try {
      const parsedData = JSON.parse(jsonData);
      
      // Validate data structure
      if (!parsedData.customers || !Array.isArray(parsedData.customers)) {
        console.error('Invalid data structure in import');
        return false;
      }
      
      // Check if each customer has required fields
      const isValid = parsedData.customers.every((customer: Record<string, unknown>) => 
        customer.name && 
        customer.type && 
        customer.stage
      );
      
      if (!isValid) {
        console.error('Invalid customer data in import');
        return false;
      }
      
      // Clear existing customers and add imported ones
      try {
        // First, delete all existing customers
        for (const customer of customers) {
          await deleteCustomer(customer.id);
        }
        
        // Then add the imported customers
        for (const customer of parsedData.customers) {
          await createCustomer({
            name: customer.name,
            type: customer.type,
            stage: customer.stage,
            current_artists: customer.current_artists || 0,
            potential_artists: customer.potential_artists || 0,
            current_mrr: customer.current_mrr || 0,
            potential_mrr: customer.potential_mrr || 0,
            last_contact_date: customer.last_contact_date || new Date().toISOString().split('T')[0],
            notes: customer.notes || "",
          });
        }
        
        // Refresh the data
        await refreshData();
        return true;
      } catch (err) {
        console.error('Error importing data to Supabase:', err);
        
        // Fallback: update local state only
        setCustomers(parsedData.customers);
        return true;
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  };

  return (
    <PipelineContext.Provider
      value={{
        customers,
        loading,
        error,
        addCustomer,
        updateCustomer: updateCustomerData,
        removeCustomer,
        moveCustomerToStage,
        reorderCustomers,
        getCustomersByStage,
        getTotalMRR,
        exportData,
        importData,
        refreshData
      }}
    >
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