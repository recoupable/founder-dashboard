import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

// Initialize Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

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