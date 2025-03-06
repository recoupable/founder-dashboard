'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadCustomerLogo } from '@/lib/supabase';

interface ImageUploadProps {
  initialImageUrl?: string;
  onImageUploaded: (url: string) => void;
  debug?: boolean;
  forceLocalMode?: boolean;
}

export function ImageUpload({ 
  initialImageUrl, 
  onImageUploaded, 
  debug = false,
  forceLocalMode = false
}: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image size should be less than 2MB');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      if (debug) console.log('Processing file upload:', file.name, file.type, file.size);
      
      // Check if the URL is a local blob URL
      const isLocalUrl = initialImageUrl?.startsWith('blob:');
      if (debug && isLocalUrl) console.log('Initial image URL is a local blob URL');
      
      // Determine if we should use Supabase or local mode
      const supabaseConfigured = 
        process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co';
      
      const useLocalMode = forceLocalMode || !supabaseConfigured;
      
      if (debug) {
        console.log('Upload configuration:');
        console.log('- Force local mode:', forceLocalMode);
        console.log('- Supabase configured:', supabaseConfigured);
        console.log('- Using local mode:', useLocalMode);
      }
      
      // Use local mode if forced or if Supabase isn't configured
      if (useLocalMode) {
        if (debug) console.log('Using local URL mode');
        // Create a local object URL for the file
        const localUrl = URL.createObjectURL(file);
        if (debug) console.log('Created local URL:', localUrl);
        setImageUrl(localUrl);
        onImageUploaded(localUrl);
        setIsUploading(false);
        return;
      }
      
      // Upload the file to Supabase storage
      if (debug) console.log('Attempting to upload to Supabase storage');
      const url = await uploadCustomerLogo(file);
      
      if (url) {
        if (debug) console.log('Successfully uploaded image, setting URL:', url);
        setImageUrl(url);
        onImageUploaded(url);
      } else {
        if (debug) console.warn('Upload failed or returned null, falling back to local URL');
        setError('Failed to upload image. Using local preview instead.');
        // Fallback to local URL
        const localUrl = URL.createObjectURL(file);
        setImageUrl(localUrl);
        onImageUploaded(localUrl);
      }
    } catch (err) {
      if (debug) console.error('Error uploading image:', err);
      setError('Error uploading image. Using local preview instead.');
      
      // Fallback to local URL
      const localUrl = URL.createObjectURL(file);
      setImageUrl(localUrl);
      onImageUploaded(localUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div 
        className="border-2 border-dashed border-gray-300 rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleButtonClick}
      >
        {imageUrl ? (
          <div className="relative w-full h-32 mb-2">
            <Image 
              src={imageUrl} 
              alt="Customer logo" 
              fill
              className="object-contain"
              unoptimized={imageUrl.startsWith('blob:')} // Skip optimization for blob URLs
            />
          </div>
        ) : (
          <div className="text-gray-500 text-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-10 w-10 mx-auto mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <p className="text-sm font-medium">Click to upload logo</p>
            <p className="text-xs text-gray-400">PNG, JPG, GIF up to 2MB</p>
          </div>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          aria-label="Upload customer logo"
        />
      </div>
      
      {isUploading && (
        <div className="text-sm text-blue-600">Uploading...</div>
      )}
      
      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}
      
      {imageUrl && (
        <button
          type="button"
          onClick={handleButtonClick}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Change image
        </button>
      )}
    </div>
  );
} 