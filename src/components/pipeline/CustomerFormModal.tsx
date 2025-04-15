'use client';

import React, { useState, useEffect } from 'react';
import { Customer, PipelineStage, CustomerType } from '@/lib/customerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TodoList } from '@/components/ui/todo-list';

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
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isCreating ? 'Create Customer' : 'Edit Customer'}</DialogTitle>
        </DialogHeader>
        
        <form 
          id="customerForm" 
          onSubmit={handleSubmit} 
          className="flex flex-col flex-grow"
        >
          <div className="overflow-y-auto pr-2 flex-grow">
            <div className="grid grid-cols-1 gap-3">
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
              </div>
              
              <div className="space-y-3">
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
              </div>
              
              <div className="space-y-3">
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
          </div>
          
          <DialogFooter className="mt-2 border-t pt-2 shrink-0">
            <div className="flex justify-between w-full">
              <div>
                {!isCreating && onDelete && customer && (
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
                  Cancel
                </button>
                <button
                  type="button" 
                  onClick={() => handleSaveClick()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  {isCreating ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 