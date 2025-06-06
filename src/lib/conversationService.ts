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
  role: 'user' | 'assistant' | 'report';
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
  messageCount?: number;
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
  page?: number;
  limit?: number;
  userFilter?: string;
}

// Paginated response interface
export interface PaginatedConversationResponse {
  conversations: ConversationListItem[];
  totalCount: number;
  totalUniqueUsers: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  filtered?: boolean;
  originalCount?: number;
  conversationCounts?: {
    today: number;
    yesterday: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
}

// Service class
class ConversationService {
  // Flag to control whether we use mock data or API data
  private useMockData = process.env.NODE_ENV === 'development' && false; // Using real API data
  
  // Get list of conversations with optional filtering
  async getConversationList(filters?: ConversationFilters): Promise<PaginatedConversationResponse> {
    try {
      if (this.useMockData) {
        console.log('Using mock data for conversation list');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('data-source-update', { detail: { source: 'mock' } }));
        }
        const conversations = await this.getMockConversationList(filters);
        return {
          conversations,
          totalCount: conversations.length,
          totalUniqueUsers: 0,
          currentPage: filters?.page || 1,
          totalPages: 1,
          hasMore: false
        };
      }
      
      console.log('Fetching conversations from API with filters:', filters);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('data-source-update', { detail: { source: 'api' } }));
      }
      
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
      if (filters?.page) {
        searchParams.append('page', filters.page.toString());
      }
      if (filters?.limit) {
        searchParams.append('limit', filters.limit.toString());
      }
      if (filters?.userFilter) {
        searchParams.append('userFilter', filters.userFilter);
      }
      
      const apiUrl = `/api/conversations?${searchParams.toString()}`;
      console.log('API URL:', apiUrl);
      
      // Make request to API - use absolute URL for server-side
      const fullUrl = typeof window !== 'undefined' ? apiUrl : `http://localhost:3000${apiUrl}`;
      console.log('Sending fetch request to API...', fullUrl);
      const response = await fetch(fullUrl);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText);
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorText = await response.text();
          if (errorText && errorText.trim() !== '' && errorText !== '{}') {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }
        console.error('Error response from API:', errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('Processing API response...');
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '' || responseText === '{}') {
        console.warn('Empty response from conversations API');
        return {
          conversations: [],
          totalCount: 0,
          totalUniqueUsers: 0,
          currentPage: filters?.page || 1,
          totalPages: 0,
          hasMore: false
        };
      }
      
      const data: PaginatedConversationResponse = JSON.parse(responseText);
      console.log('Received paginated data from API:', {
        conversationCount: data.conversations?.length || 0,
        totalCount: data.totalCount,
        currentPage: data.currentPage,
        totalPages: data.totalPages,
        hasMore: data.hasMore
      });
      
      // Check if we got fallback data
      if (data.conversations?.length === 1 && data.conversations[0].room_id?.startsWith('mock-room-')) {
        console.warn('API returned fallback/mock data:', data.conversations[0].room_id);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('data-source-update', { detail: { source: 'fallback', reason: data.conversations[0].room_id } }));
        }
      } else {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('data-source-update', { detail: { source: 'supabase' } }));
        }
      }
      
      return data;
    } catch (error: unknown) {
      console.error('Error fetching conversation list:', error);
      
      // Fall back to mock data if there's an error
      if (!this.useMockData) {
        console.warn('Falling back to mock data due to error');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('data-source-update', { 
            detail: { 
              source: 'mock-fallback', 
              error: error instanceof Error ? error.message : String(error) 
            } 
          }));
        }
        const conversations = await this.getMockConversationList(filters);
        return {
          conversations,
          totalCount: conversations.length,
          totalUniqueUsers: 0,
          currentPage: filters?.page || 1,
          totalPages: 1,
          hasMore: false
        };
      }
      
      return {
        conversations: [],
        totalCount: 0,
        totalUniqueUsers: 0,
        currentPage: 1,
        totalPages: 0,
        hasMore: false
      };
    }
  }
  
  // Get detailed conversation including messages
  async getConversationDetail(roomId: string): Promise<ConversationDetail | null> {
    try {
      if (this.useMockData) {
        return getMockConversationDetail(roomId);
      }
      
      console.log('Fetching conversation detail from API for room:', roomId);
      
      // Make request to API - use absolute URL for server-side
      const apiUrl = `/api/conversations/${roomId}`;
      const fullUrl = typeof window !== 'undefined' ? apiUrl : `http://localhost:3000${apiUrl}`;
      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        // Handle 404 specifically - this is expected for blocked test conversations
        if (response.status === 404) {
          console.log(`Conversation ${roomId} not found (likely blocked test conversation)`);
          return null;
        }
        
        // Try to get error details for other errors
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorText = await response.text();
          if (errorText && errorText.trim() !== '' && errorText !== '{}') {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (parseError) {
          // If we can't parse the error response, just use the status code
          console.warn('Could not parse error response:', parseError);
        }
        
        console.error('Error response from API:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Try to parse the successful response
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '' || responseText === '{}') {
        console.warn(`Empty response for conversation ${roomId}`);
        return null;
      }
      
      const data = JSON.parse(responseText);
      return data;
    } catch (error) {
      // Only log as error if it's not a 404 (test conversation block)
      if (error instanceof Error && !error.message.includes('404')) {
        console.error(`Error fetching conversation detail for room ${roomId}:`, error);
      }
      
      // For any error, try to fall back to mock data if available
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
      return conversations.totalCount;
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
      if (filters.limit && filters.page !== undefined) {
        const offset = (filters.page - 1) * filters.limit;
        conversations = conversations.slice(offset, offset + filters.limit);
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