/**
 * ConversationList component: displays a paginated list of conversations
 * @param conversations - Array of conversation items
 * @param loading - Whether conversations are loading
 * @param error - Error message if any
 * @param selectedConversation - Currently selected conversation ID
 * @param onConversationSelect - Callback when a conversation is selected
 * @param currentPage - Current page number
 * @param totalPages - Total number of pages
 * @param onPageChange - Callback when page changes
 * @param totalCount - Total number of conversations
 * @param totalUniqueUsers - Total number of unique users
 */
import React from 'react';
import type { ConversationListItem } from '@/lib/conversationService';

export interface ConversationListProps {
  conversations: ConversationListItem[];
  loading: boolean;
  error: string | null;
  selectedConversation: string | null;
  onConversationSelect: (conversationId: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount: number;
  totalUniqueUsers: number;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading,
  error,
  selectedConversation,
  onConversationSelect,
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
  totalUniqueUsers
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Recent Conversations</h3>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-1/4 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Recent Conversations</h3>
        <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Recent Conversations</h3>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {totalCount.toLocaleString()} conversations
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {totalUniqueUsers.toLocaleString()} users
          </span>
        </div>
      </div>

      {conversations.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No conversations found matching your criteria.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {conversations.map((conversation) => (
            <div
              key={conversation.room_id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedConversation === conversation.room_id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onConversationSelect(conversation.room_id)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-gray-900 truncate">
                    {conversation.topic || 'Untitled Conversation'}
                  </h4>
                  <p className="text-sm text-gray-600 truncate">
                    {conversation.account_email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conversation.last_message_date).toLocaleDateString()} at{' '}
                    {new Date(conversation.last_message_date).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ConversationList; 