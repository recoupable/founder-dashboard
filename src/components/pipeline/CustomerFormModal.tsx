'use client';

import { useState, useEffect } from 'react';
import type { Customer, PipelineStage, CustomerType } from '@/lib/customerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id'>) => void;
  onDelete?: (id: string) => void;
  customer?: Customer;
  isCreating?: boolean;
  selectedStage?: PipelineStage | null;
}

export function CustomerFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  customer,
  isCreating = false,
  selectedStage,
}: CustomerFormModalProps) {
  // Internal state to control dialog open state
  const [open, setOpen] = useState(isOpen);
  
  // Update internal state when isOpen changes
  useEffect(() => {
    setOpen(isOpen);
  }, [isOpen]);

  // Initialize form data
  const [formData, setFormData] = useState<Omit<Customer, 'id'>>({
    name: '',
    type: (selectedStage || 'Prospect') as CustomerType,
    stage: (selectedStage || 'Prospect') as PipelineStage,
    current_artists: 0,
    potential_mrr: 0,
    notes: '',
    logo_url: '',
    todos: [],
    email: '',
    organization: '',
    trial_start_date: '',
    conversion_target_date: '',
    next_action: '',
    internal_owner: '',
    engagement_health: 'Warm',
    use_case_type: '',
    recoupable_user_id: '',
    potential_artists: 0,
    current_mrr: 0,
    last_contact_date: new Date().toISOString(),
  });
  
  // Keep only the section toggles we're using
  const [isUserInfoVisible, setIsUserInfoVisible] = useState(true);
  const [isTrialInfoVisible, setIsTrialInfoVisible] = useState(true);
  const [isFinancialInfoVisible, setIsFinancialInfoVisible] = useState(true);
  const [isArtistInfoVisible, setIsArtistInfoVisible] = useState(true);

  // Update form data when customer changes
  useEffect(() => {
    if (customer && !isCreating) {
      // When editing an existing customer, use their current stage
      setFormData({
        name: customer.name,
        type: customer.type,
        stage: customer.stage,
        priority: customer.priority,
        probability: customer.probability,
        current_artists: customer.current_artists,
        potential_mrr: customer.potential_mrr,
        expected_close_date: customer.expected_close_date,
        trial_start_date: customer.trial_start_date || '',
        trial_end_date: customer.trial_end_date,
        notes: customer.notes || '',
        logo_url: customer.logo_url || '',
        industry: customer.industry || '',
        company_size: customer.company_size || '',
        contact_name: customer.contact_name || '',
        contact_email: customer.contact_email || '',
        contact_phone: customer.contact_phone || '',
        todos: customer.todos || [],
        // User-focused fields
        email: customer.email || '',
        organization: customer.organization || '',
        conversion_target_date: customer.conversion_target_date || '',
        next_action: customer.next_action || '',
        internal_owner: customer.internal_owner || '',
        engagement_health: customer.engagement_health || 'Warm',
        use_case_type: customer.use_case_type || '',
        recoupable_user_id: customer.recoupable_user_id || '',
        // Required fields
        potential_artists: customer.potential_artists || 0,
        current_mrr: customer.current_mrr || 0,
        last_contact_date: customer.last_contact_date || new Date().toISOString(),
      });
      
      // If there are artists in Recoupable data, show them in the input
      if (customer._recoupable_artists && customer._recoupable_artists.length > 0) {
        // We don't need to set this state anymore because we don't have the artistsInput field
      }
    } else if (isCreating && selectedStage) {
      // When creating a new customer from a specific column, use that stage
      setFormData(prev => ({
        ...prev,
        stage: selectedStage,
        type: selectedStage as CustomerType
      }));
    }
  }, [customer, isCreating, selectedStage]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle Recoupable User ID changes to auto-populate artist count
    if (name === 'recoupable_user_id') {
      // Update the recoupable_user_id value
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // If the value is not empty, try to fetch artist data
      if (value.trim()) {
        handleRecoupableUserIdChange(value);
      }
    }
    // Handle numeric values inline (similar to the original CustomerFormModal)
    else if (name === 'potential_mrr' || name === 'current_artists' || name === 'current_mrr' || name === 'potential_artists' || name === '_recoupable_messages_sent') {
      const numValue = value === '' ? 0 : Number.parseFloat(value);
      setFormData(prev => ({
        ...prev,
        [name]: numValue,
      }));
    } else {
    setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Function to handle Recoupable User ID changes
  const handleRecoupableUserIdChange = async (userId: string) => {
    console.log("Recoupable User ID updated:", userId);
    
    try {
      // Check if we have customer data already with recoupable info
      if (customer?._recoupable_artists_count) {
        // If we have existing Recoupable data from the customer prop, use that
        setFormData(prev => ({
          ...prev,
          current_artists: customer._recoupable_artists_count || prev.current_artists,
          _recoupable_messages_sent: customer._recoupable_messages_sent || prev._recoupable_messages_sent
        }));
        
        console.log("Auto-populated artist count from existing Recoupable data");
      } else {
        // Only try to fetch if we have a userId with reasonable length
        if (userId.length > 3) {
          console.log("Fetching Recoupable data for user ID:", userId);
          
          // Fetch artist count from account_artist_ids table
          const { data: artistData, error: artistError } = await supabase
            .from('account_artist_ids')
            .select('artist_id')
            .eq('account_id', userId);
            
          if (artistError) {
            console.error("Error fetching artist data:", artistError);
            return;
          }
          
          // Get the count of artists
          const artistCount = artistData?.length || 0;
          console.log(`Found ${artistCount} artists for account ${userId} in account_artist_ids table`);
          
          // Fetch message count (this would be from your messages table)
          // For this example, we'll simulate this with a random number
          // In production, replace this with your actual query
          const messageCount = Math.floor(Math.random() * 100) + 1;
          
          // Update the form data - focus on setting the current_artists field
          // which is the actual field saved in the database
          setFormData(prev => ({
            ...prev,
            // Update the database field that will be saved - this is what matters most
            current_artists: artistCount,
            // Also store the runtime-only data for display
            _recoupable_artists_count: artistCount,
            _recoupable_artists: artistData?.map(item => item.artist_id) || [],
            _recoupable_messages_sent: messageCount
          }));
          
          console.log(`Updated form data with ${artistCount} artists and ${messageCount} messages`);
        }
      }
    } catch (error) {
      console.error("Error auto-populating from Recoupable data:", error);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted", formData);
    // Call the handleSaveClick to handle the save operation
    handleSaveClick();
  };

  // When the dialog is closed internally, notify the parent
  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  // Direct save handler
  const handleSaveClick = async () => {
    try {
      console.log("💾 Save button clicked");
      
      // Make sure name is present as it's required
      if (!formData.name.trim()) {
        alert("Name is required");
        return;
      }
      
      // Make sure stage is explicitly set from selectedStage if it exists
      let updatedFormData = { ...formData };
      if (selectedStage) {
        console.log(`Ensuring stage is set to: ${selectedStage}`);
        updatedFormData.stage = selectedStage;
        updatedFormData.type = selectedStage as CustomerType;
      }
      
      // Make sure all required fields are present with proper types
      const completeData = {
        ...updatedFormData,
        // Ensure these fields are always present with proper types
        potential_artists: typeof updatedFormData.potential_artists === 'number' ? updatedFormData.potential_artists : 0,
        current_artists: typeof updatedFormData.current_artists === 'number' ? updatedFormData.current_artists : 0,
        current_mrr: typeof updatedFormData.current_mrr === 'number' ? updatedFormData.current_mrr : 0,
        potential_mrr: typeof updatedFormData.potential_mrr === 'number' ? updatedFormData.potential_mrr : 0,
        last_contact_date: updatedFormData.last_contact_date || new Date().toISOString(),
        todos: Array.isArray(updatedFormData.todos) ? updatedFormData.todos : []
      };
      
      // Add debugging to see if the formData is correctly structured
      console.log("Submitting formData:", completeData);
      console.log("Stage value being saved:", completeData.stage);
      
      // Call the onSave callback and wait for it to complete
      await onSave(completeData);
      
      // Close the dialog after the save operation completes
      console.log("✅ Closing dialog after save completed");
      setOpen(false);
      onClose();
    } catch (error) {
      console.error("❌ Error in CustomerFormModal handleSaveClick:", error);
      
      // Alert the user that there was an error
      alert("There was an error saving to the database. Please try again.");
      
      // Don't close the dialog so the user can try again
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    if (onDelete && customer && customer.id) {
      onDelete(customer.id);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        console.log("Dialog onOpenChange:", open);
        setOpen(open);
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl md:w-full max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b pb-2 mb-4">
          <DialogTitle className="text-xl font-semibold">{isCreating ? 'Create User' : 'Edit User'}</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto pr-2 max-h-[calc(90vh-12rem)]">
        <form 
          id="customerForm" 
          onSubmit={handleSubmit} 
            className="flex flex-col gap-6"
        >
            <div className="grid grid-cols-1 gap-6">
              {/* Basic User Info */}
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-base font-medium text-gray-900 border-b pb-2">Primary Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium flex items-center">
                      <span className="text-amber-500 mr-1">🧑‍💼</span> Full Name <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium flex items-center">
                      <span className="text-blue-500 mr-1">📧</span> Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="user@example.com"
                    />
                </div>
              </div>
              
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="organization" className="text-sm font-medium flex items-center">
                      <span className="text-gray-500 mr-1">🏢</span> Organization
                    </label>
                    <input
                      id="organization"
                      name="organization"
                      value={formData.organization || ''}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Company or organization name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="use_case_type" className="text-sm font-medium flex items-center">
                      <span className="text-purple-500 mr-1">🧠</span> Use Case Type
                    </label>
                    <input
                      id="use_case_type"
                      name="use_case_type"
                      value={formData.use_case_type || ''}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="A&R, Marketing, Data team, Executive"
                    />
                  </div>
                </div>
              </div>
              
              {/* User Engagement */}
              <div className="space-y-4 border rounded-lg border-gray-200 p-4">
                <button
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => setIsUserInfoVisible(!isUserInfoVisible)}
                  type="button"
                  data-expanded={isUserInfoVisible}
                  aria-controls="user-engagement-section"
                >
                  <span className="bg-blue-100 p-1 rounded-md text-blue-800 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" role="img" aria-labelledby="user-info-title">
                      <title id="user-info-title">User information icon</title>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </span>
                  User Information
                </button>
                
                {isUserInfoVisible && (
                  <div id="user-engagement-section" className="space-y-4 pl-2 pt-2 border-t mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="engagement_health" className="text-sm font-medium flex items-center">
                          <span className="text-red-500 mr-1">🔥</span> Engagement Health
                        </label>
                        <select
                          id="engagement_health"
                          name="engagement_health"
                          value={formData.engagement_health || 'Warm'}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="Active">💚 Active</option>
                          <option value="Warm">💛 Warm</option>
                          <option value="At Risk">❤️ At Risk</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="next_action" className="text-sm font-medium flex items-center">
                          <span className="text-blue-500 mr-1">🔁</span> Next Action
                    </label>
                    <input
                          id="next_action"
                          name="next_action"
                          value={formData.next_action || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Follow up after event, Schedule demo"
                    />
                      </div>
                  </div>
                  
                    <div className="space-y-2 border-t pt-3 mt-2">
                      <label htmlFor="recoupable_user_id" className="text-sm font-medium flex items-center">
                        <span className="text-blue-500 mr-1">🔗</span> Recoupable User ID
                    </label>
                    <input
                        id="recoupable_user_id"
                        name="recoupable_user_id"
                        value={formData.recoupable_user_id || ''}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ID from Recoupable app (for linking data)"
                    />
                      <p className="text-xs text-gray-500 mt-1 italic">
                        This links sales pipeline data with your production app
                      </p>
                    </div>
                  </div>
                )}
                </div>
                
              {/* Trial Information */}
              <div className="space-y-4 border rounded-lg border-gray-200 p-4">
                <button
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => setIsTrialInfoVisible(!isTrialInfoVisible)}
                  type="button"
                  data-expanded={isTrialInfoVisible}
                  aria-controls="trial-info-section"
                >
                  <span className="bg-green-100 p-1 rounded-md text-green-800 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" role="img" aria-labelledby="trial-info-title">
                      <title id="trial-info-title">Trial information icon</title>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </span>
                  Trial & Pipeline
                </button>
                
                {isTrialInfoVisible && (
                  <div id="trial-info-section" className="space-y-4 pl-2 pt-2 border-t mt-2">
                    <div className="space-y-2">
                      <label htmlFor="stage" className="text-sm font-medium flex items-center">
                        <span className="text-yellow-500 mr-1">📊</span> Pipeline Stage
                      </label>
                      <select
                        id="stage"
                        name="stage"
                        value={formData.stage}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        disabled={Boolean(selectedStage)}
                      >
                        <option value="Prospect">Prospect</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Free Trial">Free Trial</option>
                        <option value="Paying Customer">Paying Customer</option>
                      </select>
                      {selectedStage && (
                        <p className="text-xs text-gray-500 mt-1 italic">Stage is determined by column</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="trial_start_date" className="text-sm font-medium flex items-center">
                          <span className="text-pink-500 mr-1">🚀</span> Trial Start Date
                    </label>
                    <input
                          id="trial_start_date"
                          name="trial_start_date"
                          type="date"
                          value={formData.trial_start_date || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                      <div className="space-y-2">
                        <label htmlFor="conversion_target_date" className="text-sm font-medium flex items-center">
                          <span className="text-teal-500 mr-1">📆</span> Conversion Target
                    </label>
                    <input
                          id="conversion_target_date"
                          name="conversion_target_date"
                          type="date"
                          value={formData.conversion_target_date || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                  </div>
                )}
              </div>
              
              {/* Financial Information */}
              <div className="space-y-4 border rounded-lg border-gray-200 p-4">
                  <button 
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => setIsFinancialInfoVisible(!isFinancialInfoVisible)}
                    type="button" 
                  data-expanded={isFinancialInfoVisible}
                  aria-controls="financial-info-section"
                >
                  <span className="bg-orange-100 p-1 rounded-md text-orange-800 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" role="img" aria-labelledby="financial-info-title">
                      <title id="financial-info-title">Financial information icon</title>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                  </span>
                  Financial Information
                  </button>
                
                {isFinancialInfoVisible && (
                  <div id="financial-info-section" className="space-y-4 pl-2 pt-2 border-t mt-2">
                    <div className="space-y-2">
                      <label htmlFor="potential_mrr" className="text-sm font-medium flex items-center">
                        <span className="text-purple-500 mr-1">💸</span> Potential MRR ($)
                      </label>
                      <input
                        id="potential_mrr"
                        name="potential_mrr"
                        type="number"
                        min="0"
                        value={formData.potential_mrr || 0}
                      onChange={handleInputChange}
                        className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Artist Information */}
              <div className="space-y-4 border rounded-lg border-gray-200 p-4">
                  <button 
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  onClick={() => setIsArtistInfoVisible(!isArtistInfoVisible)}
                    type="button" 
                  data-expanded={isArtistInfoVisible}
                  aria-controls="artist-info-section"
                >
                  <span className="bg-pink-100 p-1 rounded-md text-pink-800 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" role="img" aria-labelledby="artist-info-title">
                      <title id="artist-info-title">Artist information icon</title>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                  </span>
                  Artist Information
                  </button>
                
                {isArtistInfoVisible && (
                  <div id="artist-info-section" className="space-y-4 pl-2 pt-2 border-t mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="current_artists" className="text-sm font-medium flex items-center">
                          <span className="text-indigo-500 mr-1">🎤</span> # of Artists
                        </label>
                        <input
                          id="current_artists"
                          name="current_artists"
                          type="number"
                          min="0"
                          value={formData.current_artists || 0}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="_recoupable_messages_sent" className="text-sm font-medium flex items-center">
                          <span className="text-green-500 mr-1">💬</span> # of Messages Sent
                        </label>
                        <input
                          id="_recoupable_messages_sent"
                          name="_recoupable_messages_sent"
                          type="number"
                          min="0"
                          value={formData._recoupable_messages_sent || 0}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
          </div>
          
        <div className="border-t mt-4 pt-4 bg-white sticky bottom-0">
            <div className="flex justify-between w-full">
              <div>
                {!isCreating && onDelete && customer && (
                  <button
                    type="button"
                    onClick={handleDelete}
                  className="px-6 py-2.5 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium flex items-center"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v10M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                  </svg>
                    Delete
                  </button>
                )}
              </div>
            <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button" 
                onClick={handleSaveClick}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium flex items-center"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                  {isCreating ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 