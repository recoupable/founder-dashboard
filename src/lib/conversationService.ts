import { 
  getMockConversationList, 
  getMockConversationDetail,
  mockAccounts,
  mockArtists,
  mockRooms,
  mockMessages
} from './mockConversationData';

// Data models matching our database structure
export interface Account {
  id: string;
  email: string;
  is_test_account?: boolean;
  created_at: string;
}

export interface Artist {
  id: string;
  account_id: string;
  name: string;
  reference_id?: string;
}

export interface Room {
  id: string;
  account_id: string;
  created_at: string;
  last_message_date: string;
}

export interface Message {
  id: string;
  room_id: string;
  content: string;
  reasoning?: string;
  role: 'user' | 'assistant';
  created_at: string;
}

// Composite types for the UI
export interface ConversationListItem {
  room_id: string;
  created_at: string;
  last_message_date: string;
  account_email: string;
  account_name?: string;
  artist_name: string;
  artist_reference: string;
  topic?: string;
  is_test_account: boolean;
}

export interface ConversationDetail {
  room_id: string;
  account_email: string;
  account_name?: string;
  artist_name: string;
  artist_reference: string;
  topic?: string;
  messages: Message[];
}

// Filter parameters
export interface ConversationFilters {
  searchQuery?: string;
  excludeTestEmails?: boolean;
  timeFilter?: string;
  limit?: number;
  offset?: number;
}

// Service class
class ConversationService {
  // Flag to control whether we use mock data or API data
  private useMockData = process.env.NODE_ENV === 'development' && false; // Using real API data
  
  // Get list of conversations with optional filtering
  async getConversationList(filters?: ConversationFilters): Promise<ConversationListItem[]> {
    try {
      if (this.useMockData) {
        console.log('Using mock data for conversation list');
        window.dispatchEvent(new CustomEvent('data-source-update', { detail: { source: 'mock' } }));
        return this.getMockConversationList(filters);
      }
      
      console.log('Fetching conversations from API with filters:', filters);
      window.dispatchEvent(new CustomEvent('data-source-update', { detail: { source: 'api' } }));
      
      // Build API URL with query parameters
      const searchParams = new URLSearchParams();
      if (filters?.searchQuery) {
        searchParams.append('search', filters.searchQuery);
      }
      if (filters?.excludeTestEmails) {
        searchParams.append('excludeTest', 'true');
      }
      if (filters?.timeFilter) {
        searchParams.append('timeFilter', filters.timeFilter);
      }
      
      const apiUrl = `/api/conversations?${searchParams.toString()}`;
      console.log('API URL:', apiUrl);
      
      // Make request to API
      console.log('Sending fetch request to API...');
      const response = await fetch(apiUrl);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        try {
          const errorData = await response.json();
          console.error('Error response from API:', errorData);
          throw new Error(errorData.error || `API error: ${response.status}`);
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          throw new Error(`API error: ${response.status}`);
        }
      }
      
      console.log('Processing API response...');
      const data = await response.json();
      console.log('Received data from API, count:', data?.length || 0);
      
      // Check if we got fallback data
      if (data.length === 1 && data[0].room_id?.startsWith('mock-room-')) {
        console.warn('API returned fallback/mock data:', data[0].room_id);
        window.dispatchEvent(new CustomEvent('data-source-update', { detail: { source: 'fallback', reason: data[0].room_id } }));
      } else {
        window.dispatchEvent(new CustomEvent('data-source-update', { detail: { source: 'supabase' } }));
      }
      
      return data;
    } catch (error: unknown) {
      console.error('Error fetching conversation list:', error);
      
      // Fall back to mock data if there's an error
      if (!this.useMockData) {
        console.warn('Falling back to mock data due to error');
        window.dispatchEvent(new CustomEvent('data-source-update', { 
          detail: { 
            source: 'mock-fallback', 
            error: error instanceof Error ? error.message : String(error) 
          } 
        }));
        return this.getMockConversationList(filters);
      }
      
      return [];
    }
  }
  
  // Get detailed conversation including messages
  async getConversationDetail(roomId: string): Promise<ConversationDetail | null> {
    try {
      if (this.useMockData) {
        return getMockConversationDetail(roomId);
      }
      
      console.log('Fetching conversation detail from API for room:', roomId);
      
      // Make request to API
      const response = await fetch(`/api/conversations/${roomId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from API:', errorData);
        throw new Error(errorData.error || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching conversation detail for room ${roomId}:`, error);
      
      // Fall back to mock data if there's an error
      if (!this.useMockData) {
        console.warn('Falling back to mock data for conversation detail due to error');
        return getMockConversationDetail(roomId);
      }
      
      return null;
    }
  }
  
  // Get total count of conversations (for pagination)
  async getConversationCount(filters?: ConversationFilters): Promise<number> {
    try {
      if (this.useMockData) {
        const conversations = await this.getMockConversationList(filters);
        return conversations.length;
      }
      
      // For first version, we'll just count the items we fetch
      // In the future, we can optimize this with a COUNT query in the API
      const conversations = await this.getConversationList(filters);
      return conversations.length;
    } catch (error) {
      console.error('Error getting conversation count:', error);
      return 0;
    }
  }
  
  // Helper method to get mock conversation list with filtering
  private async getMockConversationList(filters?: ConversationFilters): Promise<ConversationListItem[]> {
    let conversations = getMockConversationList();
    
    // Apply filters if provided
    if (filters) {
      // Apply search filter
      if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const query = filters.searchQuery.toLowerCase();
        conversations = conversations.filter(conversation => 
          conversation.account_email.toLowerCase().includes(query) ||
          conversation.artist_name.toLowerCase().includes(query) ||
          conversation.artist_reference.toLowerCase().includes(query)
        );
      }
      
      // Apply test email filter
      if (filters.excludeTestEmails) {
        conversations = conversations.filter(conversation => !conversation.is_test_account);
      }
      
      // Apply time filter
      if (filters.timeFilter && filters.timeFilter !== 'All Time') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (filters.timeFilter) {
          case 'Last 7 Days':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'Last 30 Days':
            filterDate.setDate(now.getDate() - 30);
            break;
          case 'Last 90 Days':
            filterDate.setDate(now.getDate() - 90);
            break;
          default:
            filterDate.setFullYear(2000); // Set to a very old date
        }
        
        conversations = conversations.filter(conversation => 
          new Date(conversation.last_message_date) >= filterDate
        );
      }
      
      // Apply pagination
      if (filters.limit && filters.offset !== undefined) {
        conversations = conversations.slice(filters.offset, filters.offset + filters.limit);
      }
    }
    
    return conversations;
  }
}

// Export a singleton instance
export const conversationService = new ConversationService();

// For testing/development purposes, export these methods directly
export const getAccounts = () => mockAccounts;
export const getArtists = () => mockArtists;
export const getRooms = () => mockRooms;
export const getMessages = () => mockMessages; 