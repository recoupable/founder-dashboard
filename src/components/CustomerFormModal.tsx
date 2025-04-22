'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import type { Customer, PipelineStage, EngagementHealth, CustomerType } from '@/lib/customerService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X, Loader } from 'lucide-react';
import CustomerImage from './CustomerImage';
import { addCustomerImage, removeCustomerImage } from '@/lib/imageService';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customer: Customer) => void;
  customer?: Customer;
  title?: string;
}

export default function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  customer,
  title = 'Add Customer',
}: CustomerFormModalProps) {
  const initialCustomer: Customer = {
    id: '',
    name: '',
    stage: 'Prospect' as PipelineStage,
    type: 'Prospect' as CustomerType,
    logo_url: '',
    todos: [],
    notes: '',
    email: '',
    organization: '',
    current_artists: 0,
    potential_artists: 0,
    current_mrr: 0,
    potential_mrr: 0,
    trial_start_date: '',
    conversion_target_date: '',
    next_action: '',
    internal_owner: '',
    engagement_health: 'Warm' as EngagementHealth,
    use_case_type: '',
    last_contact_date: new Date().toISOString(),
  };

  const [formData, setFormData] = useState<Customer>(
    customer ? { ...customer } : { ...initialCustomer }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer) {
      setFormData({ ...customer });
    }
  }, [customer]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    
    // Handle numeric values
    if (name === 'potential_mrr' || name === 'current_artists' || name === 'current_mrr' || name === 'potential_artists') {
      const numValue = value === '' ? 0 : Number.parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        [name]: numValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      const file = e.target.files[0];
      const imageUrl = await addCustomerImage(formData.id, file);
      
      setFormData((prev) => ({
        ...prev,
        logo_url: imageUrl,
      }));
      
      toast({
        title: 'Image uploaded successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error uploading image',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveImage = async () => {
    if (!formData.logo_url) return;
    
    try {
      await removeCustomerImage(formData.id);
      
      setFormData((prev) => ({
        ...prev,
        logo_url: '',
      }));
      
      toast({
        title: 'Image removed successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error removing image:', error);
      toast({
        title: 'Error removing image',
        description: 'Please try again later',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error saving customer',
        description: 'Please try again later',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <Dialog.Title className="text-lg font-medium">
              {title}
            </Dialog.Title>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close"
            >
              <X size={20} />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {/* Logo Upload */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CustomerImage
                  url={formData.logo_url}
                  name={formData.name}
                  size={64}
                />
                <div className="flex mt-2 space-x-2 justify-center">
                  <label className="cursor-pointer px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                  {formData.logo_url && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="px-2 py-1 text-xs bg-red-100 rounded hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Customer Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center">
                  <Label htmlFor="name" className="self-start">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="organization">Organization</Label>
                <Input
                  id="organization"
                  name="organization"
                  value={formData.organization || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Select 
                    name="stage" 
                    value={formData.stage} 
                    onValueChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        stage: value as PipelineStage
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Prospect">Prospect</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Free Trial">Free Trial</SelectItem>
                      <SelectItem value="Paying Customer">Paying Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="engagement_health">Engagement Health</Label>
                  <Select 
                    name="engagement_health" 
                    value={formData.engagement_health || 'Warm'} 
                    onValueChange={(value) => {
                      setFormData(prev => ({
                        ...prev,
                        engagement_health: value as EngagementHealth
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select health" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Warm">Warm</SelectItem>
                      <SelectItem value="At Risk">At Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* Trial Information */}
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-sm font-medium">Trial Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trial_start_date">Trial Start Date</Label>
                  <Input
                    id="trial_start_date"
                    name="trial_start_date"
                    type="date"
                    value={formData.trial_start_date || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="conversion_target_date">Target Conversion Date</Label>
                  <Input
                    id="conversion_target_date"
                    name="conversion_target_date"
                    type="date"
                    value={formData.conversion_target_date || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="next_action">Next Action</Label>
                  <Input
                    id="next_action"
                    name="next_action"
                    value={formData.next_action || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="conversion_stage">Conversion Stage</Label>
                  <Input
                    id="conversion_stage"
                    name="conversion_stage"
                    value={formData.conversion_stage || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
            
            {/* Financial Information */}
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-sm font-medium">Financial Information</h3>
              
              <div>
                <Label htmlFor="potential_mrr">Potential MRR ($)</Label>
                <Input
                  id="potential_mrr"
                  name="potential_mrr"
                  type="number"
                  value={formData.potential_mrr || 0}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            {/* Artist Information */}
            <div className="space-y-4 pt-2 border-t">
              <h3 className="text-sm font-medium">Artist Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current_artists"># of Artists</Label>
                  <Input
                    id="current_artists"
                    name="current_artists"
                    type="number"
                    value={formData.current_artists || 0}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label htmlFor="messages_sent"># of Messages Sent</Label>
                  <Input
                    id="messages_sent"
                    name="_recoupable_messages_sent"
                    type="number"
                    value={formData._recoupable_messages_sent || 0}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Customer'
                )}
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 