/**
 * User-Organization Matching Utilities
 * Connects users from the leaderboard to sales pipeline organizations based on email domains
 */

import { Customer } from './customerService';

// User data structure from leaderboard
export interface UserActivity {
  email: string;
  messages: number;
  reports: number;
  artists: number;
  totalActivity: number;
}

// Organization with its users
export interface OrganizationWithUsers {
  organization: Customer;
  users: UserActivity[];
  totalUserActivity: number;
}

/**
 * Extract domain from email address
 * Handles edge cases like subdomains and normalization
 */
export function extractDomain(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  
  try {
    // Clean up the email
    const cleanEmail = email.toLowerCase().trim();
    
    // Basic email validation
    if (!cleanEmail.includes('@') || cleanEmail.indexOf('@') === 0 || cleanEmail.indexOf('@') === cleanEmail.length - 1) {
      return null;
    }
    
    // Extract domain part
    const domain = cleanEmail.split('@')[1];
    
    // Skip common personal email providers
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'icloud.com', 'aol.com', 'protonmail.com', 'tutanota.com'
    ];
    
    if (personalDomains.includes(domain)) {
      return null; // Return null for personal domains - they'll go to "Personal Accounts"
    }
    
    return domain;
  } catch (error) {
    console.error('Error extracting domain from email:', email, error);
    return null;
  }
}

/**
 * Check if an email is from a personal provider
 */
export function isPersonalEmail(email: string): boolean {
  const domain = extractDomain(email);
  return domain === null; // If extractDomain returns null, it's personal
}

/**
 * Auto-populate domain field for existing organizations
 * This will extract domains from contact_email and update the domain field
 */
export function populateOrganizationDomains(organizations: Customer[]): Customer[] {
  return organizations.map(org => {
    // If domain is already set, keep it
    if (org.domain) {
      return org;
    }
    
    // Extract domain from contact_email
    const domain = org.contact_email ? extractDomain(org.contact_email) : null;
    
    return {
      ...org,
      domain: domain || undefined
    };
  });
}

/**
 * Match users to organizations based on email domains
 */
export function matchUsersToOrganizations(
  organizations: Customer[], 
  users: UserActivity[]
): OrganizationWithUsers[] {
  // First, populate domains for organizations that don't have them
  const orgsWithDomains = populateOrganizationDomains(organizations);
  
  // Create a map of domain -> organization for quick lookup
  const domainToOrg = new Map<string, Customer>();
  orgsWithDomains.forEach(org => {
    if (org.domain) {
      domainToOrg.set(org.domain, org);
    }
  });
  
  // Group users by their email domain
  const usersByDomain = new Map<string, UserActivity[]>();
  const personalUsers: UserActivity[] = [];
  
  users.forEach(user => {
    const domain = extractDomain(user.email);
    
    if (domain === null) {
      // Personal email - goes to personal accounts
      personalUsers.push(user);
    } else {
      // Business email - group by domain
      if (!usersByDomain.has(domain)) {
        usersByDomain.set(domain, []);
      }
      usersByDomain.get(domain)!.push(user);
    }
  });
  
  // Match users to organizations
  const organizationsWithUsers: OrganizationWithUsers[] = [];
  
  // Add organizations with their matched users
  orgsWithDomains.forEach(org => {
    const orgUsers = org.domain ? usersByDomain.get(org.domain) || [] : [];
    const totalUserActivity = orgUsers.reduce((sum, user) => sum + user.totalActivity, 0);
    
    organizationsWithUsers.push({
      organization: org,
      users: orgUsers,
      totalUserActivity
    });
  });
  
  // Create "Personal Accounts" organization if there are personal users
  if (personalUsers.length > 0) {
    const personalAccountsOrg: Customer = {
      id: 'personal-accounts',
      name: 'Personal Accounts',
      type: 'Prospect',
      stage: 'Prospect',
      current_artists: 0,
      potential_artists: personalUsers.length, // Number of personal users
      current_mrr: 0,
      potential_mrr: 0,
      last_contact_date: new Date().toISOString().split('T')[0],
      notes: 'Individual users with personal email addresses',
      domain: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const totalPersonalActivity = personalUsers.reduce((sum, user) => sum + user.totalActivity, 0);
    
    organizationsWithUsers.push({
      organization: personalAccountsOrg,
      users: personalUsers,
      totalUserActivity: totalPersonalActivity
    });
  }
  
  return organizationsWithUsers;
}

/**
 * Get users for a specific organization
 */
export function getUsersForOrganization(
  organization: Customer, 
  users: UserActivity[]
): UserActivity[] {
  if (!organization.domain) {
    // Handle personal accounts
    if (organization.id === 'personal-accounts') {
      return users.filter(user => isPersonalEmail(user.email));
    }
    return [];
  }
  
  return users.filter(user => {
    const userDomain = extractDomain(user.email);
    return userDomain === organization.domain;
  });
}

/**
 * Format user activity for display
 */
export function formatUserActivity(user: UserActivity): string {
  const parts = [];
  if (user.messages > 0) parts.push(`${user.messages} messages`);
  if (user.reports > 0) parts.push(`${user.reports} reports`);
  if (user.artists > 0) parts.push(`${user.artists} artists`);
  return parts.length > 0 ? parts.join(', ') : 'No activity';
}

/**
 * Sort organizations by user activity (most active users first)
 */
export function sortOrganizationsByUserActivity(orgsWithUsers: OrganizationWithUsers[]): OrganizationWithUsers[] {
  return orgsWithUsers.sort((a, b) => {
    // Sort by total user activity, then by MRR, then by user count
    if (b.totalUserActivity !== a.totalUserActivity) {
      return b.totalUserActivity - a.totalUserActivity;
    }
    
    if (b.organization.current_mrr !== a.organization.current_mrr) {
      return b.organization.current_mrr - a.organization.current_mrr;
    }
    
    return b.users.length - a.users.length;
  });
}

/**
 * Get summary statistics for organization-user matching
 */
export function getMatchingSummary(orgsWithUsers: OrganizationWithUsers[]) {
  const totalOrgs = orgsWithUsers.length;
  const orgsWithUsers_count = orgsWithUsers.filter(org => org.users.length > 0).length;
  const totalUsers = orgsWithUsers.reduce((sum, org) => sum + org.users.length, 0);
  const personalUsers = orgsWithUsers.find(org => org.organization.id === 'personal-accounts')?.users.length || 0;
  const businessUsers = totalUsers - personalUsers;
  
  return {
    totalOrganizations: totalOrgs,
    organizationsWithUsers: orgsWithUsers_count,
    totalUsers,
    businessUsers,
    personalUsers,
    matchingRate: totalOrgs > 0 ? (orgsWithUsers_count / totalOrgs * 100).toFixed(1) : '0'
  };
} 