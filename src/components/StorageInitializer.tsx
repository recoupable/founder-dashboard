'use client';

import { useEffect } from 'react';
import { createCustomerLogosBucketIfNotExists, checkSupabaseConnection } from '@/lib/supabase';

export function StorageInitializer() {
  useEffect(() => {
    // Initialize storage buckets
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
          console.warn('Skipping bucket creation - Supabase connection failed');
          return;
        }
        
        await createCustomerLogosBucketIfNotExists();
      } catch (error) {
        console.error('Failed to initialize storage:', error);
      }
    };
    
    initStorage();
  }, []);
  
  // This component doesn't render anything
  return null;
} 