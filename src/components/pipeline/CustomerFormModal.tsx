'use client';

import React, { useState, useEffect } from 'react';
import { Customer, PipelineStage, CustomerType } from '@/lib/customerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TodoList } from '@/components/ui/todo-list';
import { useAllUsers } from '@/hooks/useAllUsers';
import { getUsersForOrganization, UserActivity } from '@/lib/userOrgMatcher';
import { Users } from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id'>) => void;
  onDelete?: (id: string) => void;
  customer?: Customer;
  isCreating?: boolean;
  selectedStage?: PipelineStage | null;
}

type TabType = 'details' | 'status';

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
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('status');
  
  // User activity data - always use all users (no filter toggle)
  const { allUsers, loading: isLoadingAll } = useAllUsers();

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
    potential_artists: 0,
    current_mrr: 0,
    potential_mrr: 0,
    last_contact_date: new Date().toISOString().split('T')[0],
    notes: '',
    website: '',
    logo_url: '',
    todos: [],
  });
  
  // Add state for section visibility
  const [isTasksVisible, setIsTasksVisible] = useState(true);
  const [isNotesVisible, setIsNotesVisible] = useState(true);

  // Toggle section visibility
  const toggleTasksVisibility = () => {
    setIsTasksVisible(!isTasksVisible);
  };
  
  const toggleNotesVisibility = () => {
    setIsNotesVisible(!isNotesVisible);
  };

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
        potential_artists: customer.potential_artists,
        current_mrr: customer.current_mrr,
        potential_mrr: customer.potential_mrr,
        expected_close_date: customer.expected_close_date,
        trial_start_date: customer.trial_start_date,
        trial_end_date: customer.trial_end_date,
        last_contact_date: customer.last_contact_date,
        notes: customer.notes || '',
        website: customer.website || '',
        logo_url: customer.logo_url || '',
        industry: customer.industry || '',
        company_size: customer.company_size || '',
        contact_name: customer.contact_name || '',
        contact_email: customer.contact_email || '',
        contact_phone: customer.contact_phone || '',
        todos: customer.todos || [],
      });
    } else if (isCreating && selectedStage) {
      // When creating a new customer from a specific column, use that stage
      setFormData(prev => ({
        ...prev,
        stage: selectedStage,
        type: selectedStage as CustomerType
      }));
    }
  }, [customer, isCreating, selectedStage]);

  // Get matched users for this customer (always use all users)
  const customerForMatching = customer || { ...formData, id: 'temp' };
  const matchedUsers = getUsersForOrganization(
    customerForMatching,
    allUsers || []
  );



  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted", formData);
    // Directly call onSave here
    onSave(formData);
  };

  // When the dialog is closed internally, notify the parent
  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  // Direct save handler (no event parameter)
  const handleSaveClick = async () => {
    try {
      console.log("💾 Save button clicked");
      
      // Call the onSave callback
      onSave(formData);
      
      // Immediately close the dialog without waiting for the API response
      console.log("✅ Closing dialog immediately");
      setOpen(false);
      onClose();
    } catch (error) {
      console.error("❌ Error in CustomerFormModal handleSaveClick:", error);
      
      // Alert the user that there was an error, but their changes were stored locally
      alert("There was an error saving to the database, but your changes have been stored locally and will sync when the connection is restored.");
      
      // Close the dialog even if there was an error
      setOpen(false);
      onClose();
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    if (onDelete && customer && customer.id) {
      onDelete(customer.id);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    if (activeTab === 'status') {
      return (
        <div className="space-y-4">
          {/* User Activity Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-600" />
              <span className="font-medium text-gray-700">
                All Users ({matchedUsers.length})
              </span>
            </div>
          </div>

          {/* Loading States */}
          {(isLoadingAll) && (
            <div className="text-center py-4 text-gray-500">
              Loading user activity...
            </div>
          )}

          {/* No Users Found */}
          {!isLoadingAll && matchedUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users size={24} className="mx-auto mb-2 opacity-50" />
              <p>No users found for this organization</p>
              {!customer?.contact_email && (
                <p className="text-xs mt-1">Add a contact email to automatically match users</p>
              )}
            </div>
          )}

                     {/* Users List */}
           {matchedUsers.length > 0 && (
             <div className="space-y-3">
               {matchedUsers.map((user: UserActivity, index: number) => (
                 <div key={user.email || index} className="border rounded-lg p-3 bg-gray-50">
                   <div className="flex items-center justify-between">
                     <div className="font-medium text-gray-900 truncate">
                       {user.email}
                     </div>
                     <div className="flex items-center gap-3 text-sm text-gray-600">
                       {user.messages > 0 && (
                         <div className="flex items-center gap-1">
                           <span className="text-xs text-gray-500">Messages:</span>
                           <span className="font-medium">{user.messages}</span>
                         </div>
                       )}
                       {user.reports > 0 && (
                         <div className="flex items-center gap-1">
                           <span className="text-xs text-gray-500">Reports:</span>
                           <span className="font-medium">{user.reports}</span>
                         </div>
                       )}
                       {user.artists > 0 && (
                         <div className="flex items-center gap-1">
                           <span className="text-xs text-gray-500">Artists:</span>
                           <span className="font-medium">{user.artists}</span>
                         </div>
                       )}
                       {user.messages === 0 && user.reports === 0 && user.artists === 0 && (
                         <span className="text-gray-400 text-xs">No activity</span>
                       )}
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}


        </div>
      );
    }

    // Details tab content (existing form)
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="website" className="text-sm font-medium">
              Website
            </label>
            <input
              id="website"
              name="website"
              value={formData.website || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
              placeholder="https://example.com"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="contact_email" className="text-sm font-medium">
              Contact Email
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              value={formData.contact_email || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
              placeholder="contact@onerpm.com"
            />
            <p className="text-xs text-gray-500">Used to match users to this organization</p>
          </div>
          
          <div className="space-y-1">
            <label htmlFor="contact_name" className="text-sm font-medium">
              Contact Name
            </label>
            <input
              id="contact_name"
              name="contact_name"
              value={formData.contact_name || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
              placeholder="Primary contact person"
            />
          </div>
        </div>
        
        {selectedStage && (
          <div className="text-sm text-blue-600 mb-1">
            <span className="font-medium">Stage:</span> {selectedStage} 
            <span className="text-gray-500 ml-1">(determined by the column)</span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
          <div className="space-y-1">
            <label htmlFor="last_contact_date" className="text-sm font-medium">
              Last Contact Date
            </label>
            <input
              id="last_contact_date"
              name="last_contact_date"
              type="date"
              value={formData.last_contact_date || ''}
              onChange={handleInputChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="current_artists" className="text-sm font-medium">
              Current Artists
            </label>
            <input
              id="current_artists"
              name="current_artists"
              type="number"
              min="0"
              value={formData.current_artists}
              onChange={handleNumberChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="potential_artists" className="text-sm font-medium">
              Potential Artists
            </label>
            <input
              id="potential_artists"
              name="potential_artists"
              type="number"
              min="0"
              value={formData.potential_artists}
              onChange={handleNumberChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="current_mrr" className="text-sm font-medium">
              Current MRR ($)
            </label>
            <input
              id="current_mrr"
              name="current_mrr"
              type="number"
              min="0"
              value={formData.current_mrr}
              onChange={handleNumberChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="potential_mrr" className="text-sm font-medium">
              Upcoming MRR ($)
            </label>
            <input
              id="potential_mrr"
              name="potential_mrr"
              type="number"
              min="0"
              value={formData.potential_mrr}
              onChange={handleNumberChange}
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        
        {/* Notes */}
        <div className="space-y-3 border rounded-md p-3">
          <div className="flex justify-between items-center cursor-pointer" onClick={toggleNotesVisibility}>
            <h3 className="text-sm font-medium text-gray-700">Notes</h3>
            <button 
              type="button" 
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                toggleNotesVisibility();
              }}
            >
              {isNotesVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          
          {isNotesVisible && (
            <div className="space-y-1">
              <textarea
                id="notes"
                name="notes"
                value={formData.notes || ''}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md h-20"
                placeholder="Add any notes about this customer..."
              />
            </div>
          )}
        </div>
        
        {/* Tasks */}
        <div className="space-y-3 border rounded-md p-3">
          <div className="flex justify-between items-center cursor-pointer" onClick={toggleTasksVisibility}>
            <h3 className="text-sm font-medium text-gray-700">Tasks</h3>
            <button 
              type="button" 
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                toggleTasksVisibility();
              }}
            >
              {isTasksVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          
          {isTasksVisible && (
            <TodoList
              todos={formData.todos || []}
              onChange={(todos) => setFormData(prev => ({ ...prev, todos }))}
            />
          )}
        </div>
      </div>
    );
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
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isCreating ? 'Create Customer' : 'Edit Customer'}</DialogTitle>
          
          {/* Tab Navigation */}
          <div className="flex border-b mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            {!isCreating && (
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'status'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Customer Status
              </button>
            )}
          </div>
        </DialogHeader>
        
        <form 
          id="customerForm" 
          onSubmit={handleSubmit} 
          className="flex flex-col flex-grow"
        >
          <div className="overflow-y-auto pr-2 flex-grow">
            {renderTabContent()}
          </div>
          
          <DialogFooter className="mt-4 border-t pt-4 shrink-0">
            <div className="flex justify-between w-full">
              <div>
                {!isCreating && onDelete && customer && activeTab === 'details' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  {activeTab === 'status' ? 'Close' : 'Cancel'}
                </button>
                {activeTab === 'details' && (
                  <button
                    type="button" 
                    onClick={() => handleSaveClick()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    {isCreating ? 'Create' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 