'use client';

import React, { useState, useEffect } from 'react';
import { Customer, PipelineStage, CustomerType } from '@/lib/customerService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ImageUpload } from '@/components/ui/image-upload';
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

  // Handle select changes
  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If stage is changed, automatically update type to match
    if (name === 'stage') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value as PipelineStage,
        type: value as CustomerType 
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle number input changes
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Handle customer deletion
  const handleDelete = () => {
    if (customer && onDelete) {
      onDelete(customer.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Add New Customer' : 'Edit Customer'}</DialogTitle>
          <DialogDescription>
            {isCreating 
              ? 'Add a new customer to your sales pipeline.' 
              : 'Update the customer information.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
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
                
                <div className="space-y-2">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="logo_url" className="text-sm font-medium">
                    Logo
                  </label>
                  <ImageUpload 
                    initialImageUrl={formData.logo_url || undefined}
                    onImageUploaded={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                    debug={true}
                    forceLocalMode={false}
                  />
                </div>
              </div>
            </div>
            
            {/* Pipeline Information */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Pipeline Information</h3>
              
              {selectedStage && (
                <div className="text-sm text-blue-600 mb-2">
                  <span className="font-medium">Stage:</span> {selectedStage} 
                  <span className="text-gray-500 ml-1">(determined by the column)</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="priority" className="text-sm font-medium">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority || ''}
                    onChange={handleSelectChange}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">Select Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="probability" className="text-sm font-medium">
                    Probability (%)
                  </label>
                  <input
                    id="probability"
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability || ''}
                    onChange={handleNumberChange}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="expected_close_date" className="text-sm font-medium">
                    Expected Close Date
                  </label>
                  <input
                    id="expected_close_date"
                    name="expected_close_date"
                    type="date"
                    value={formData.expected_close_date || ''}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
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
            
            {/* Financial Information */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Financial Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
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
                
                <div className="space-y-2">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
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
                
                <div className="space-y-2">
                  <label htmlFor="potential_mrr" className="text-sm font-medium">
                    Potential MRR ($)
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
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <div className="mb-4">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {/* Todo List */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tasks
                </label>
                <TodoList 
                  todos={formData.todos || []} 
                  onChange={(todos) => setFormData({...formData, todos})}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            {!isCreating && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              {isCreating ? 'Create' : 'Save Changes'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 