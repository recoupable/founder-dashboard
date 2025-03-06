'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Customer, 
  PipelineStage, 
  CustomerType,
  fetchCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer, 
  updateCustomerStage 
} from '@/lib/customerService';

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

// Mock data for initial pipeline
const initialCustomers: Customer[] = [
  {
    id: generateUUID(),
    name: "Acme Records",
    type: "Prospect" as CustomerType,
    stage: "Prospect" as PipelineStage,
    current_artists: 0,
    potential_artists: 250,
    current_mrr: 0,
    potential_mrr: 25000,
    last_contact_date: "2023-05-15",
    notes: "Initial contact made through conference"
  },
  {
    id: generateUUID(),
    name: "Indie Collective",
    type: "Lead" as CustomerType,
    stage: "Meeting" as PipelineStage,
    current_artists: 0,
    potential_artists: 75,
    current_mrr: 0,
    potential_mrr: 7500,
    last_contact_date: "2023-05-20",
    notes: "Meeting scheduled for next week"
  },
  {
    id: generateUUID(),
    name: "Global Music Group",
    type: "Customer" as CustomerType,
    stage: "Meeting" as PipelineStage,
    current_artists: 0,
    potential_artists: 500,
    current_mrr: 0,
    potential_mrr: 50000,
    last_contact_date: "2023-05-10",
    notes: "Follow-up meeting scheduled"
  },
  {
    id: generateUUID(),
    name: "Soundwave Studios",
    type: "Partner" as CustomerType,
    stage: "Free Trial" as PipelineStage,
    current_artists: 15,
    potential_artists: 30,
    current_mrr: 0,
    potential_mrr: 3000,
    trial_start_date: "2023-05-01",
    trial_end_date: "2023-05-30",
    last_contact_date: "2023-05-18",
    notes: "Trial going well, positive feedback"
  },
  {
    id: generateUUID(),
    name: "Harmony Productions",
    type: "Customer" as CustomerType,
    stage: "Paying Customer" as PipelineStage,
    current_artists: 85,
    potential_artists: 100,
    current_mrr: 8500,
    potential_mrr: 10000,
    last_contact_date: "2023-05-05",
    notes: "Contract signed, onboarding in progress"
  }
];

interface PipelineContextType {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (id: string, customer: Omit<Customer, 'id'>) => Promise<void>;
  removeCustomer: (id: string) => Promise<void>;
  moveCustomerToStage: (customerId: string, newStage: PipelineStage) => Promise<void>;
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
      console.log('Loading customers from Supabase...');
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('Environment:', process.env.NODE_ENV);
      
      setLoading(true);
      setError(null);
      
      const data = await fetchCustomers();
      console.log('Fetched customers:', data.length);
      
      if (data.length > 0) {
        setCustomers(data);
        console.log('Set customers from Supabase data');
      } else {
        // If no customers in database, use initial data
        // This is useful for first-time setup
        console.log('No customers found, initializing with default data');
        for (const customer of initialCustomers) {
          await createCustomer({
            name: customer.name,
            type: customer.type,
            stage: customer.stage,
            current_artists: customer.current_artists,
            potential_artists: customer.potential_artists,
            current_mrr: customer.current_mrr,
            potential_mrr: customer.potential_mrr,
            last_contact_date: customer.last_contact_date,
            notes: customer.notes,
          });
        }
        
        // Fetch again to get the IDs assigned by Supabase
        const freshData = await fetchCustomers();
        setCustomers(freshData);
      }
    } catch (err) {
      console.error('Error loading customers from Supabase:', err);
      setError('Failed to load customers. Using local data instead.');
      
      // Fallback to localStorage if Supabase fails
      const savedCustomers = loadFromStorage();
      if (savedCustomers) {
        setCustomers(savedCustomers);
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
      await deleteCustomer(id);
      setCustomers((prev) => prev.filter((customer) => customer.id !== id));
    } catch (err) {
      console.error('Error removing customer:', err);
      setError('Failed to remove customer');
      
      // Fallback: remove from local state only
      setCustomers((prev) => prev.filter((customer) => customer.id !== id));
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

  // Get customers by stage
  const getCustomersByStage = (stage: PipelineStage) => {
    return customers.filter(customer => customer.stage === stage);
  };

  // Calculate total MRR (current and potential)
  const getTotalMRR = () => {
    return customers.reduce(
      (total, customer) => {
        return {
          current: total.current + customer.current_mrr,
          potential: total.potential + customer.potential_mrr,
        };
      },
      { current: 0, potential: 0 }
    );
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