import { supabase } from './supabase';

/**
 * Upload a customer image and return the URL
 * For simplicity, we're using local blob URLs instead of Supabase storage
 */
export async function addCustomerImage(customerId: string, file: File): Promise<string> {
  if (!customerId) {
    throw new Error('Customer ID is required');
  }

  try {
    console.log('Starting image upload process:', { customerId, fileName: file.name, fileSize: file.size });
    
    // Skip Supabase storage and just use local blob URL
    console.log('Using local blob URL for image');
    const localUrl = URL.createObjectURL(file);
    
    // Update the customer record with the URL
    try {
      await updateCustomerWithImageUrl(customerId, localUrl);
      console.log('Successfully updated customer with local image URL');
    } catch (updateError) {
      console.error('Failed to update customer record, but image URL is still valid:', updateError);
    }
    
    return localUrl;
  } catch (error) {
    console.error('Image process failed:', error);
    alert('Failed to process image. Please try again.');
    throw error;
  }
}

/**
 * Update the customer record with the image URL
 */
async function updateCustomerWithImageUrl(customerId: string, imageUrl: string): Promise<void> {
  try {
    console.log('Updating customer record with image URL');
    
    const { error: updateError } = await supabase
      .from('sales_pipeline_customers')
      .update({ logo_url: imageUrl })
      .eq('id', customerId);

    if (updateError) {
      console.error('Error updating customer logo URL:', updateError);
      throw updateError;
    }
    
    console.log('Successfully updated customer record with image URL');
  } catch (error) {
    console.error('Failed to update customer with image URL:', error);
    throw error;
  }
}

/**
 * Remove a customer image 
 */
export async function removeCustomerImage(customerId: string): Promise<void> {
  if (!customerId) {
    throw new Error('Customer ID is required');
  }

  try {
    // Just update the customer record to clear the logo URL
    const { error: updateError } = await supabase
      .from('sales_pipeline_customers')
      .update({ logo_url: null })
      .eq('id', customerId);

    if (updateError) {
      console.error('Error updating customer logo URL:', updateError);
      throw new Error('Failed to update customer record');
    }
    
    console.log('Successfully removed customer image');
  } catch (error) {
    console.error('Failed to remove customer image:', error);
    throw error;
  }
} 