'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AutoRefreshProps {
  interval?: number; // Refresh interval in milliseconds
}

export function AutoRefresh({ interval = 5 * 60 * 1000 }: AutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    // Set up an interval to refresh the data
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing dashboard data...');
      router.refresh(); // This refreshes the current route's data without a full page reload
    }, interval);

    // Clean up the interval when the component unmounts
    return () => clearInterval(refreshInterval);
  }, [router, interval]);

  // This component doesn't render anything
  return null;
} 