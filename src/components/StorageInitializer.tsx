'use client';

import { useEffect } from 'react';
import { createCustomerLogosBucketIfNotExists, checkSupabaseConnection } from '@/lib/supabase';
import { ensureTableExists } from '@/lib/customerService';

export function StorageInitializer() {
  useEffect(() => {
    // Initialize storage buckets and database tables
    const initStorage = async () => {
      try {
        // Skip initialization if Supabase isn't properly configured
        if (process.env.NODE_ENV === 'development' && 
            (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
             process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co')) {
          console.log('Skipping storage initialization - Supabase not configured');
          return;
        }
        
        // Check Supabase connection first
        const isConnected = await checkSupabaseConnection();
        
        if (!isConnected) {
          console.warn('Skipping initialization - Supabase connection failed');
          return;
        }
        
        // Ensure the database table exists
        const tableExists = await ensureTableExists();
        console.log('Database table check result:', tableExists);
        
        // Create storage buckets
        await createCustomerLogosBucketIfNotExists();
        console.log('Storage initialization complete');
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      }
    };
    
    initStorage();
  }, []);
  
  // This component doesn't render anything
  return null;
} 