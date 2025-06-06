import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx and tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency (USD)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Formats a date as a string (MM/DD/YYYY)
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A'
  
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

/**
 * Calculates the percentage of a value relative to a total
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Truncates text to a specified length and adds ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Calculate the percentage change between two numbers
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format a percentage with one decimal place
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Utility functions for conversations dashboard

/**
 * Returns the start and end ISO date strings for a given time filter label.
 * @param {string} filter - The time filter label (e.g., 'Last 7 Days')
 * @returns {{ start: string | null, end: string | null }}
 */
export function getDateRangeForFilter(filter: string): { start: string | null, end: string | null } {
  const now = new Date();
  let start: Date | null = null;
  const end: Date | null = now;
  switch (filter) {
    case 'Last 24 Hours':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'Last 7 Days':
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case 'Last 30 Days':
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      break;
    case 'Last 3 Months':
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      break;
    case 'Last 12 Months':
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start = null;
  }
  return {
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null
  };
}

/**
 * Returns a badge object describing the user type based on activity and profile.
 * @param user - User activity data
 * @param profile - Optional user profile data
 * @returns {{ text: string, color: string }}
 */
export function getUserTypeBadge(
  user: { totalActivity: number; messages: number; reports: number },
  profile?: {
    company?: string;
    job_title?: string;
    meeting_notes?: string;
    observations?: string;
    pain_points?: string;
    opportunities?: string;
    context_notes?: string;
    tags?: string[];
    sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated';
    last_contact_date?: string;
  }
): { text: string; color: string } {
  if (!profile) {
    if (user.totalActivity === 0) return { text: '🔘 Inactive', color: 'bg-gray-100 text-gray-600' };
    if (user.reports > user.messages) return { text: '📊 Analyst', color: 'bg-purple-100 text-purple-700' };
    if (user.messages > 20 && user.reports === 0) return { text: '💬 Communicator', color: 'bg-blue-100 text-blue-700' };
    if (user.messages > 10 && user.reports > 5) return { text: '🚀 Power User', color: 'bg-green-100 text-green-700' };
    if (user.messages > 0 && user.reports > 0) return { text: '⚖️ Balanced', color: 'bg-yellow-100 text-yellow-700' };
    return { text: '🌱 New User', color: 'bg-gray-100 text-gray-600' };
  }
  if (profile.company && profile.job_title) {
    if (profile.job_title.toLowerCase().includes('ceo') || profile.job_title.toLowerCase().includes('founder')) {
      return { text: '👑 Executive', color: 'bg-red-100 text-red-700' };
    }
    if (profile.job_title.toLowerCase().includes('manager') || profile.job_title.toLowerCase().includes('director')) {
      return { text: '👔 Manager', color: 'bg-indigo-100 text-indigo-700' };
    }
    if (profile.job_title.toLowerCase().includes('engineer') || profile.job_title.toLowerCase().includes('developer')) {
      return { text: '⚙️ Technical', color: 'bg-cyan-100 text-cyan-700' };
    }
    if (profile.job_title.toLowerCase().includes('design') || profile.job_title.toLowerCase().includes('creative')) {
      return { text: '🎨 Creative', color: 'bg-pink-100 text-pink-700' };
    }
    if (profile.job_title.toLowerCase().includes('marketing') || profile.job_title.toLowerCase().includes('growth')) {
      return { text: '📈 Marketing', color: 'bg-orange-100 text-orange-700' };
    }
  }
  return getUserTypeBadge(user);
}

/**
 * Calculates the completeness percentage of a user profile.
 * @param profile - The user profile object
 * @returns {number} - Percentage of completed fields
 */
export function getProfileCompleteness(profile?: {
  company?: string;
  job_title?: string;
  meeting_notes?: string;
  observations?: string;
  pain_points?: string;
  opportunities?: string;
  context_notes?: string;
}): number {
  if (!profile) return 0;
  const fields = [
    profile.company,
    profile.job_title,
    profile.meeting_notes,
    profile.observations,
    profile.pain_points,
    profile.opportunities,
    profile.context_notes
  ];
  const filledFields = fields.filter((field) => field && field.trim().length > 0).length;
  return Math.round((filledFields / fields.length) * 100);
} 