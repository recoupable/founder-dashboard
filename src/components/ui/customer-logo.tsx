import React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CustomerLogoProps {
  name: string
  logoUrl?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * CustomerLogo component displays either the customer's logo or a fallback with their initials
 */
export function CustomerLogo({ name, logoUrl, size = 'md', className }: CustomerLogoProps) {
  // Get the initials from the customer name
  const initials = name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
  
  // Determine size classes
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg'
  }
  
  // If we have a logo URL, display the image
  if (logoUrl) {
    return (
      <div className={cn('relative rounded-md overflow-hidden', sizeClasses[size], className)}>
        <Image 
          src={logoUrl} 
          alt={`${name} logo`}
          fill
          className="object-cover"
        />
      </div>
    )
  }
  
  // Otherwise, display a fallback with initials
  return (
    <div 
      className={cn(
        'flex items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  )
} 