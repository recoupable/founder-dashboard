import { createClient } from '@supabase/supabase-js'

// These values should be set in environment variables in production
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

// Log Supabase configuration on initialization
console.log('🔄 Initializing Supabase client with:');
console.log('🔄 URL:', supabaseUrl);
console.log('🔄 Has Anon Key:', !!supabaseAnonKey);
console.log('🔄 Environment:', process.env.NODE_ENV);

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'founder-dashboard-auth',
  },
  global: {
    fetch: fetch,
    headers: {
      'X-Client-Info': 'ceo-dashboard',
      // Add the apikey as a header to bypass RLS
      'apikey': supabaseAnonKey
    }
  },
  // Ensure we're not using local storage in different tabs
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
})

// Check if we're running on the client or server
const isClient = typeof window !== 'undefined'

// Create a separate admin client with service role for admin operations
// This will only work on the server side
export const supabaseAdmin = isClient 
  // On client, return a client with anon key (it won't have admin privileges)
  ? supabase  
  // On server, use the service role key
  : createClient(
      supabaseUrl, 
      process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey, 
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          fetch: fetch,
          headers: {
            'X-Client-Info': 'ceo-dashboard-admin'
          }
        }
      }
    )

// Log when the client is created
console.log('✅ Supabase client initialized');

// Type definitions for our database tables
export type CustomerRow = {
  id: string
  name: string
  type: string
  stage: string
  current_artists: number
  potential_artists: number
  current_mrr: number
  potential_mrr: number
  trial_start_date: string | null
  trial_end_date: string | null
  last_contact_date: string
  notes: string
  created_at?: string
  updated_at?: string
}

// Types for our database tables
export interface SalesPipelineItem {
  id: number
  company_name: string
  potential_revenue: number
  status: 'lead' | 'meeting' | 'proposal' | 'negotiation' | 'closed'
  created_at: string
}

// Function to get total potential revenue from sales pipeline
export async function getSalesPipelineValue(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('sales_pipeline')
      .select('potential_revenue')
      .not('status', 'eq', 'closed')

    if (error) throw error

    return data.reduce((total, item) => total + (item.potential_revenue || 0), 0)
  } catch (error) {
    console.error('Error fetching sales pipeline:', error)
    throw error
  }
}

// Function to upload an image to Supabase storage
export async function uploadCustomerLogo(file: File): Promise<string | null> {
  try {
    console.log('Starting image upload process...');
    
    // Check if Supabase is properly configured
    if (supabaseUrl === 'https://your-project.supabase.co' || !supabaseAnonKey || supabaseAnonKey === 'your-anon-key') {
      console.warn('Supabase not properly configured for storage. Using local URL instead.');
      return null;
    }
    
    // Ensure the bucket exists
    await createCustomerLogosBucketIfNotExists();
    
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `customer_logos/${fileName}`;
    
    console.log(`Uploading file to path: ${filePath}`);
    
    // Upload the file to the "customer_logos" bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('customer_logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }
    
    console.log('File uploaded successfully:', uploadData);
    
    // Get the public URL for the file
    const { data: urlData } = supabase.storage
      .from('customer_logos')
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('Failed to get public URL for uploaded file');
      return null;
    }
    
    console.log('Generated public URL:', urlData.publicUrl);
    
    // Verify the URL is accessible
    try {
      const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`URL verification failed with status ${response.status}`);
      } else {
        console.log('URL verified successfully');
      }
    } catch (verifyError) {
      console.warn('URL verification error (this may be normal for CORS reasons):', verifyError);
    }
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadCustomerLogo:', error);
    return null;
  }
}

// Function to create the customer_logos bucket if it doesn't exist
export async function createCustomerLogosBucketIfNotExists() {
  try {
    console.log('Checking for customer_logos bucket...');
    
    // Check if the bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error listing buckets:', error);
      
      // If the error is related to permissions, try to create the bucket anyway
      if (error.message.includes('permission') || error.message.includes('auth')) {
        console.log('Permission issue detected, attempting to create bucket directly');
        await createBucket();
      } else {
        throw error;
      }
    } else {
      // Check if customer_logos bucket exists
      const bucketExists = buckets.some(bucket => bucket.name === 'customer_logos');
      
      if (!bucketExists) {
        await createBucket();
      } else {
        console.log('customer_logos bucket already exists');
      }
    }
  } catch (error) {
    console.error('Error in createCustomerLogosBucketIfNotExists:', error);
  }
}

// Helper function to create the bucket
async function createBucket() {
  try {
    console.log('Creating customer_logos bucket...');
    const { error: createError } = await supabase.storage.createBucket('customer_logos', {
      public: true // Make the bucket public
    });
    
    if (createError) {
      console.error('Error creating bucket:', createError);
      throw createError;
    }
    
    console.log('Successfully created customer_logos bucket');
  } catch (error) {
    console.error('Failed to create bucket:', error);
    throw error;
  }
}

// Function to check Supabase connection
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    console.log('🔄 Checking Supabase connection...');
    console.log('🔄 Supabase URL:', supabaseUrl);
    console.log('🔄 Environment:', process.env.NODE_ENV);
    console.log('🔄 Has Anon Key:', !!supabaseAnonKey);
    
    if (supabaseUrl === 'https://your-project.supabase.co' || !supabaseAnonKey) {
      console.error('❌ Supabase not properly configured - missing URL or key');
      return false;
    }
    
    // Try to make a simple query to check connection
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('sales_pipeline_customers')
      .select('count', { count: 'exact', head: true });
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.error('❌ Supabase connection error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return false;
    }
    
    console.log(`✅ Supabase connection successful (${duration}ms), data:`, data);
    return true;
  } catch (error) {
    console.error('❌ Exception checking Supabase connection:', error);
    return false;
  }
} 