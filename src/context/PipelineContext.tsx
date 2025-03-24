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
  updateCustomerOrder,
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
  updateCustomer: (customerData: Partial<Customer> & { id: string }) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  moveCustomerToStage: (customerId: string, newStage: PipelineStage) => Promise<void>;
  reorderCustomers: (sourceId: string, targetId: string) => Promise<void>;
  getCustomersByStage: (stage: PipelineStage) => Customer[];
  getTotalMRR: () => { current: number; potential: number };
  exportData: () => string;
  importData: (jsonData: string) => Promise<boolean>;
  refreshData?: () => Promise<void>;
}

const PipelineContext = createContext<PipelineContextType | undefined>(undefined);

// Helper function to safely save data to localStorage (fallback)
const saveToStorage = (data: Customer[]) => {
  try {
    // Try to clear any existing data first to free up space
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (clearError) {
      // Ignore errors when clearing
      console.debug('Error clearing localStorage (continuing anyway):', clearError);
    }
    
    // Define different levels of data simplification
    const simplifyLevel1 = () => {
      // Create a simplified version of customers for storage - Level 1 simplification
      return data.map(customer => ({
        id: customer.id,
        name: customer.name,
        type: customer.type,
        stage: customer.stage,
        current_artists: customer.current_artists,
        potential_artists: customer.potential_artists,
        current_mrr: customer.current_mrr,
        potential_mrr: customer.potential_mrr,
        last_contact_date: customer.last_contact_date,
        // Omit large fields like notes, todos, and other detailed information
      }));
    };
    
    const simplifyLevel2 = () => {
      // More aggressive simplification - Level 2
      return data.map(c => ({ 
        id: c.id, 
        name: c.name, 
        stage: c.stage,
        current_mrr: c.current_mrr, 
        potential_mrr: c.potential_mrr 
      }));
    };
    
    const simplifyLevel3 = () => {
      // Minimal data - Level 3 (most aggressive simplification)
      return data.map(c => ({ 
        id: c.id, 
        name: c.name, 
        stage: c.stage 
      }));
    };
    
    // Try with Level 1 simplification first
    try {
      const storageData = {
        version: STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        customers: simplifyLevel1()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
      return true;
    } catch (error1) {
      console.warn('Level 1 simplification failed, trying Level 2:', error1);
      
      // If that fails, try Level 2
      try {
        const minimalData = {
          version: STORAGE_VERSION,
          timestamp: new Date().toISOString(),
          customers: simplifyLevel2()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalData));
        return true;
      } catch (error2) {
        console.warn('Level 2 simplification failed, trying Level 3:', error2);
        
        // If that fails too, try Level 3
        try {
          const superMinimalData = {
            version: STORAGE_VERSION,
            timestamp: new Date().toISOString(),
            customers: simplifyLevel3()
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(superMinimalData));
          return true;
        } catch (error3) {
          console.error('Could not save data even with maximum simplification:', error3);
          return false;
        }
      }
    }
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
  const addCustomer = async (customerData: Omit<Customer, 'id'>) => {
    try {
      // Assign order_index for new customers
      // Get the highest order_index in this stage and add 1
      const stageCustomers = getCustomersByStage(customerData.stage);
      const maxOrderIndex = stageCustomers.length > 0
        ? Math.max(...stageCustomers.map(c => c.order_index || 0))
        : -1;
      
      const customerWithOrder = {
        ...customerData,
        order_index: maxOrderIndex + 1
      };
      
      // Create the customer in the database
      const newCustomer = await createCustomer(customerWithOrder);
      setCustomers((prev) => [...prev, newCustomer]);
    } catch (err) {
      console.error('Error adding customer:', err);
      setError('Failed to add customer');
      
      // Fallback: add to local state only
      const newCustomer: Customer = {
        ...customerData,
        id: generateUUID(),
        order_index: customers.filter(c => c.stage === customerData.stage).length
      };
      
      setCustomers((prev) => [...prev, newCustomer]);
      saveToStorage([...customers, newCustomer]);
    }
  };

  // Update an existing customer
  const updateCustomerData = async (customerData: Partial<Customer> & { id: string }) => {
    try {
      const updatedCustomer = await updateCustomer(customerData);
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerData.id ? updatedCustomer : customer
        )
      );
    } catch (err) {
      console.error('Error updating customer:', err);
      setError('Failed to update customer');
      
      // Fallback: update local state only
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerData.id ? { ...customer, ...customerData } : customer
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
      
      let insertIndex = -1;
      if (targetIndex === -1) {
        // If target not found, find all customers in the same stage and append to the end
        const sameStageCustomers = newCustomers.filter(c => c.stage === sourceCustomer.stage);
        const lastIndex = sameStageCustomers.length > 0 
          ? newCustomers.indexOf(sameStageCustomers[sameStageCustomers.length - 1])
          : -1;
        insertIndex = lastIndex + 1;
        newCustomers.splice(insertIndex, 0, sourceCustomer);
      } else {
        // Find the new target index (it might have changed after removing the source)
        const newTargetIndex = newCustomers.findIndex(c => c.id === targetId);
        insertIndex = newTargetIndex;
        newCustomers.splice(insertIndex, 0, sourceCustomer);
      }
      
      // Reindex all customers in this stage to ensure proper ordering
      const stageCustomers = newCustomers
        .filter(c => c.stage === sourceCustomer.stage)
        .map((c, index) => ({ ...c, order_index: index }));
      
      // Update the state immediately for UI responsiveness
      setCustomers(newCustomers.map(c => 
        stageCustomers.find(sc => sc.id === c.id) || c
      ));
      
      // Save to localStorage as backup
      saveToStorage(newCustomers);
      
      // Persist orders to the database
      const updatePromises = stageCustomers.map(c => 
        updateCustomerOrder(c.id, c.order_index)
      );
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
    } catch (error) {
      console.error('Error reordering customers:', error);
      setError('Failed to reorder customers');
    }
  };

  // Get customers by stage with proper ordering
  const getCustomersByStage = (stage: PipelineStage) => {
    // Sort customers by order_index if available, otherwise by id
    return customers
      .filter(customer => customer.stage === stage)
      .sort((a, b) => {
        // If both have order_index, sort by that
        if (a.order_index !== undefined && b.order_index !== undefined) {
          return a.order_index - b.order_index;
        }
        // If only one has order_index, prioritize the one with order_index
        if (a.order_index !== undefined) return -1;
        if (b.order_index !== undefined) return 1;
        // Otherwise sort by id as fallback
        return a.id.localeCompare(b.id);
      });
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