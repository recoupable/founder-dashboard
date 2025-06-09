'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Generate a simple session ID for tracking
function generateSessionId(): string {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('visit-session-id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('visit-session-id', sessionId);
    }
    return sessionId;
  }
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Track a page visit
async function trackPageVisit(pagePath: string) {
  try {
    const sessionId = generateSessionId();
    
    const visitData = {
      page_path: pagePath,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: sessionId,
      user_email: null // Will be set by auth if available
    };
    
    // Use fetch with keepalive to ensure tracking works even during page unload
    const response = await fetch('/api/analytics/website-visits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(visitData),
      keepalive: true
    });
    
    if (!response.ok) {
      console.warn('Page visit tracking failed:', response.status);
    } else {
      console.log('Page visit tracked:', pagePath);
    }
  } catch (error) {
    console.warn('Error tracking page visit:', error);
  }
}

/**
 * PageVisitTracker component: automatically tracks page visits for analytics
 * This component should be included in the root layout to track all page views
 */
export function PageVisitTracker() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Track the initial page visit
    trackPageVisit(pathname);
  }, [pathname]);
  
  // Track page visibility changes (when user returns to tab)
  useEffect(() => {
    function handleVisibilityChange() {
      if (!document.hidden) {
        // User came back to the page, track as a new visit
        trackPageVisit(pathname);
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]);
  
  // This component doesn't render anything
  return null;
}

export default PageVisitTracker; 