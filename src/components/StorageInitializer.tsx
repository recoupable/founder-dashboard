'use client';

import { useEffect } from 'react';
import { createCustomerLogosBucketIfNotExists } from '@/lib/supabase';
import { ensureTableExists } from '@/lib/customerService';
import { checkSupabaseConnection } from '@/lib/supabase';

export function StorageInitializer() {
  // Initialize storage buckets and database tables
  const initStorage = async () => {
    try {
      console.log('🔄 StorageInitializer: Starting initialization...');
      
      // Check Supabase connection first
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        console.error('❌ StorageInitializer: Supabase connection failed');
        return;
      }
      console.log('✅ StorageInitializer: Supabase connection successful');
      
      // Create storage buckets if they don't exist
      await createCustomerLogosBucketIfNotExists();
      console.log('✅ StorageInitializer: Storage buckets initialized');
      
      // Ensure database tables exist
      const tableExists = await ensureTableExists();
      console.log(`${tableExists ? '✅' : '❌'} StorageInitializer: Database table check completed`);
      
      console.log('✅ StorageInitializer: Initialization complete');
    } catch (err) {
      console.error('❌ StorageInitializer: Initialization error:', err);
    }
  };

  useEffect(() => {
    initStorage();
  }, []);

  // This component doesn't render anything visible
  return null;
} 