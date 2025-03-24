'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Context type
interface RevenueDisplayContextType {
  showAnnual: boolean;
  setShowAnnual: (value: boolean) => void;
}

// Create context with default values
const RevenueDisplayContext = createContext<RevenueDisplayContextType>({
  showAnnual: false,
  setShowAnnual: () => {},
});

// Provider component
export function RevenueDisplayProvider({ children }: { children: ReactNode }) {
  const [showAnnual, setShowAnnual] = useState(false);
  
  return (
    <RevenueDisplayContext.Provider value={{ showAnnual, setShowAnnual }}>
      {children}
    </RevenueDisplayContext.Provider>
  );
}

// Hook for easy context usage
export function useRevenueDisplay() {
  return useContext(RevenueDisplayContext);
} 