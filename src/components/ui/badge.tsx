import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'sm' | 'default';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', size = 'default', children, className = '' }: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800',
    outline: 'border border-gray-300 text-gray-700'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-0.5 text-xs'
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
} 