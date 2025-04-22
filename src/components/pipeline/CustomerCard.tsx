'use client';

import React, { useState, useRef, useEffect } from 'react'
import { Customer } from '@/lib/customerService'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { ChevronDown, ChevronUp, Check, Square, Camera } from 'lucide-react'
import { addCustomerImage } from '@/lib/imageService'

interface CustomerCardProps {
  customer: Customer
  onClick?: (customer: Customer) => void
  isSelected?: boolean
  onCustomerUpdate?: (updatedCustomer: Customer) => void
}

export function CustomerCard({ customer, onClick, isSelected = false, onCustomerUpdate }: CustomerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevPositionRef = useRef<DOMRect | null>(null);
  
  // Debug log the customer data to see what artist fields are available
  useEffect(() => {
    console.log(`CustomerCard [${customer.name}]`, {
      _recoupable_artists_count: customer._recoupable_artists_count,
      current_artists: customer.current_artists,
      _recoupable_artists: customer._recoupable_artists?.length || 0,
      recoupable_user_id: customer.recoupable_user_id
    });
  }, [customer]);
  
  // Store the previous position of the card for animation
  useEffect(() => {
    if (cardRef.current) {
      prevPositionRef.current = cardRef.current.getBoundingClientRect();
    }
    
    // Return a cleanup function that will run before the next render
    return () => {
      prevPositionRef.current = null;
    };
  });
  
  // Apply FLIP animation when position changes
  useEffect(() => {
    if (!cardRef.current || !prevPositionRef.current || isDragging) return;
    
    const currentPosition = cardRef.current.getBoundingClientRect();
    const prevPosition = prevPositionRef.current;
    
    // Calculate the difference in position
    const deltaY = prevPosition.top - currentPosition.top;
    
    // Only animate if there's a significant change in position
    if (Math.abs(deltaY) > 5) {
      // Set initial position
      cardRef.current.style.transform = `translateY(${deltaY}px)`;
      cardRef.current.style.transition = 'none';
      
      // Force a reflow
      void cardRef.current.offsetHeight;
      
      // Start animation
      setIsAnimating(true);
      cardRef.current.style.transform = '';
      cardRef.current.style.transition = 'transform 300ms ease-out';
      
      // Reset after animation completes
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.style.transition = '';
          setIsAnimating(false);
        }
      }, 300);
    }
  }, [customer.id, isDragging]);
  
  // Get initials for the customer
  const getInitials = () => {
    return customer.name.substring(0, 2).toUpperCase();
  };
  
  // Check if URL is valid (not a local blob URL)
  const isValidImageUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    
    // Local blob URLs are actually valid for our purposes now
    // But we still need to check if it's a valid URL
    try {
      new URL(url);
      return true;
    } catch {
      // Ignore the error and return false for invalid URLs
      return false;
    }
  };

  // Handle avatar click to open file upload dialog
  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click from triggering
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle image file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    try {
      setIsUploadingImage(true);
      const file = e.target.files[0];
      
      // Upload image and get URL
      const imageUrl = await addCustomerImage(customer.id, file);
      
      // Update customer with new image URL
      if (onCustomerUpdate) {
        const updatedCustomer = { ...customer, logo_url: imageUrl };
        onCustomerUpdate(updatedCustomer);
      }
      
      // Clear the input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading customer image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };
  
  return (
    <div 
      ref={cardRef}
      className={`bg-white rounded-lg shadow-sm mb-3 overflow-hidden border ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      } ${
        isAnimating ? 'z-10' : 'z-0'
      } transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('customerId', customer.id);
        e.dataTransfer.effectAllowed = 'move';
        
        // Create a ghost image for dragging
        if (cardRef.current) {
          const rect = cardRef.current.getBoundingClientRect();
          const ghostElem = cardRef.current.cloneNode(true) as HTMLElement;
          ghostElem.style.width = `${rect.width}px`;
          ghostElem.style.opacity = '0.8';
          ghostElem.style.position = 'absolute';
          ghostElem.style.top = '-1000px';
          document.body.appendChild(ghostElem);
          e.dataTransfer.setDragImage(ghostElem, rect.width / 2, 30);
          
          // Remove the ghost element after a short delay
          setTimeout(() => {
            document.body.removeChild(ghostElem);
          }, 100);
        }
        
        setIsDragging(true);
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      onClick={() => onClick?.(customer)}
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Customer Avatar with File Upload */}
          <div 
            className="flex-shrink-0 relative cursor-pointer group"
            onClick={handleAvatarClick}
          >
            {isValidImageUrl(customer.logo_url) ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                {customer.logo_url?.startsWith('blob:') ? (
                  // Use regular img tag for blob URLs
                  <img 
                    src={customer.logo_url}
                    alt={customer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  // Use Next.js Image for regular URLs
                <Image 
                  src={customer.logo_url || ''}
                  alt={customer.name}
                  fill
                  className="object-cover"
                    unoptimized={customer.logo_url?.startsWith('data:') || false}
                />
                )}
                {/* Camera overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium relative">
                {getInitials()}
                {/* Camera overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
            )}
            
            {/* Uploading indicator */}
            {isUploadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-full">
                <div className="h-4 w-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              aria-label="Upload customer image"
            />
          </div>
          
          {/* Customer Info */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-gray-900 truncate max-w-[150px] sm:max-w-none">
                {customer.name}
              </h3>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="text-gray-400 hover:text-gray-600 ml-2"
              >
                {isExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            </div>
            
            {/* Artist Count */}
            <div className="mt-1 text-xs text-gray-600">
              Artists: {customer.current_artists || 0}
            </div>
          </div>
        </div>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t text-sm">
            {/* Todos Section */}
            {(customer.todos && customer.todos.length > 0) && (
              <div className="mb-3">
                <h4 className="font-medium text-gray-700 mb-1">Todos</h4>
                <ul className="space-y-1">
                  {customer.todos.map((todo, index) => (
                    <li key={`todo-${customer.id}-${index}`} className="flex items-start gap-2">
                      {todo.completed ? (
                        <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Square size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={`${todo.completed ? 'line-through text-gray-400' : ''}`}>
                        {todo.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Notes Section */}
            {customer.notes && (
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Notes</h4>
                <p className="text-gray-600 whitespace-pre-line text-xs">{customer.notes}</p>
              </div>
            )}
            
            {/* Contact Info */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {customer.contact_email && (
                <div>
                  <span className="text-gray-500">Email:</span> {customer.contact_email}
                </div>
              )}
              {customer.contact_phone && (
                <div>
                  <span className="text-gray-500">Phone:</span> {customer.contact_phone}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}