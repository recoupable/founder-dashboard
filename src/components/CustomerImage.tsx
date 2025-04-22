import React from 'react';

interface CustomerImageProps {
  url?: string;
  name: string;
  size?: number;
}

/**
 * Component to display a customer's logo or their initials if no logo is available
 */
export default function CustomerImage({ url, name, size = 40 }: CustomerImageProps) {
  // Get initials from name
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);
  
  if (url) {
    return (
      <img
        src={url}
        alt={`${name} logo`}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gray-200 text-gray-700 font-medium"
      style={{ width: size, height: size, fontSize: Math.max(size / 2.5, 12) }}
    >
      {initials}
    </div>
  );
} 