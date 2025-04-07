'use client';

import React, { useState, useEffect } from 'react';
import { conversationService, ConversationListItem, ConversationDetail, ConversationFilters } from '@/lib/conversationService';
import ReactMarkdown from 'react-markdown';
import parse from 'html-react-parser';
import DOMPurify from 'dompurify';
import { MagnifyingGlassIcon, CogIcon } from '@heroicons/react/24/outline';

// Custom Switch component with proper TypeScript types
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

function Switch({ checked, onChange, className, children }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked="false"
      className={className}
      onClick={() => onChange(!checked)}
    >
      {children}
    </button>
  );
}

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [excludeTestEmails, setExcludeTestEmails] = useState(false);
  const [timeFilter, setTimeFilter] = useState('All Time');
  
  // Test email management state
  const [showTestEmailPopup, setShowTestEmailPopup] = useState(false);
  const [testEmails, setTestEmails] = useState<string[]>([]);
  const [newTestEmail, setNewTestEmail] = useState('');
  const [isLoadingTestEmails, setIsLoadingTestEmails] = useState(false);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  
  // Listen for data source updates
  useEffect(() => {
    const handleDataSourceUpdate = (event: CustomEvent) => {
      console.log('Data source update:', event.detail);
      // We're no longer updating debugInfo since it's not being displayed
    };
    
    // Add event listener
    window.addEventListener('data-source-update', handleDataSourceUpdate as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('data-source-update', handleDataSourceUpdate as EventListener);
    };
  }, []);
    
  // Load conversations when filters change
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const filters: ConversationFilters = {
          searchQuery,
          excludeTestEmails,
          timeFilter
        };
        
        console.log('Fetching conversations with filters:', filters);
        
        // Add event listener to capture console logs about data source
        const originalConsoleLog = console.log;
        console.log = function(...args) {
          originalConsoleLog.apply(console, args);
        };
        
        const result = await conversationService.getConversationList(filters);
        
        // Restore original console.log
        console.log = originalConsoleLog;
        
        setConversations(result);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadConversations();
  }, [searchQuery, excludeTestEmails, timeFilter]);
  
  // Load conversation detail when selection changes
  useEffect(() => {
    const loadConversationDetail = async () => {
      if (!selectedConversation) {
        setConversationDetail(null);
        return;
      }
      
      try {
        const result = await conversationService.getConversationDetail(selectedConversation);
        setConversationDetail(result);
      } catch (err) {
        console.error('Failed to load conversation detail:', err);
        setError('Failed to load conversation details. Please try again.');
      }
    };
    
    loadConversationDetail();
  }, [selectedConversation]);

  // Load test emails from Supabase when the popup is opened
  useEffect(() => {
    if (showTestEmailPopup) {
      fetchTestEmails();
    }
  }, [showTestEmailPopup]);

  // Also load test emails on initial page load
  useEffect(() => {
    fetchTestEmails();
  }, []);

  // Fetch test emails from the API
  const fetchTestEmails = async () => {
    try {
      setIsLoadingTestEmails(true);
      setTestEmailError(null);
      
      const response = await fetch('/api/test-emails');
      
      if (!response.ok) {
        throw new Error(`Error fetching test emails: ${response.status}`);
      }
      
      const data = await response.json();
      setTestEmails(data.emails || []);
    } catch (err) {
      console.error('Failed to load test emails:', err);
      setTestEmailError('Failed to load test emails. Please try again.');
      
      // Fallback to localStorage if API fails
      const savedEmails = localStorage.getItem('testEmails');
      if (savedEmails) {
        try {
          setTestEmails(JSON.parse(savedEmails));
        } catch (parseErr) {
          console.error('Failed to parse stored test emails:', parseErr);
        }
      }
    } finally {
      setIsLoadingTestEmails(false);
    }
  };

  // Handle adding a new test email
  const addTestEmail = async () => {
    if (!newTestEmail) return;
    
    try {
      setIsLoadingTestEmails(true);
      setTestEmailError(null);
      
      const response = await fetch('/api/test-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newTestEmail }),
      });
      
      if (!response.ok) {
        throw new Error(`Error adding test email: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.added) {
        // Only update the list if the email was actually added
        setTestEmails([...testEmails, newTestEmail]);
      }
      
      // Reset the input field
      setNewTestEmail('');
      
      // Refresh the list to ensure it's up to date
      fetchTestEmails();
    } catch (err) {
      console.error('Failed to add test email:', err);
      setTestEmailError('Failed to add test email. Please try again.');
      
      // Fallback to localStorage if API fails
      if (!testEmails.includes(newTestEmail)) {
        const updatedEmails = [...testEmails, newTestEmail];
        setTestEmails(updatedEmails);
        localStorage.setItem('testEmails', JSON.stringify(updatedEmails));
        setNewTestEmail('');
      }
    } finally {
      setIsLoadingTestEmails(false);
    }
  };

  // Handle removing a test email
  const removeTestEmail = async (email: string) => {
    try {
      setIsLoadingTestEmails(true);
      setTestEmailError(null);
      
      const response = await fetch(`/api/test-emails?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error removing test email: ${response.status}`);
      }
      
      // Update the local state
      setTestEmails(testEmails.filter(e => e !== email));
    } catch (err) {
      console.error('Failed to remove test email:', err);
      setTestEmailError('Failed to remove test email. Please try again.');
      
      // Fallback to localStorage if API fails
      const updatedEmails = testEmails.filter(e => e !== email);
      setTestEmails(updatedEmails);
      localStorage.setItem('testEmails', JSON.stringify(updatedEmails));
    } finally {
      setIsLoadingTestEmails(false);
    }
  };

  // Filter conversations based on test emails
  const filteredConversations = excludeTestEmails 
    ? conversations.filter(conv => {
        // Exclude emails that are in the test emails list
        if (testEmails.includes(conv.account_email)) return false;
        
        // Automatically exclude emails containing "@example.com"
        if (conv.account_email.includes('@example.com')) return false;
        
        // Automatically exclude emails containing a "+"
        if (conv.account_email.includes('+')) return false;
        
        return true;
      }) 
    : conversations;

  return (
    <main className="p-4 sm:p-8">
      {/* Test Email Popup */}
      {showTestEmailPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Manage Test Emails</h2>
              <button 
                onClick={() => setShowTestEmailPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {testEmailError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {testEmailError}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="test-email" className="block text-sm font-medium text-gray-700 mb-1">
                Add Test Email
              </label>
              <div className="flex">
                <input
                  id="test-email"
                  type="email"
                  className="flex-1 p-2 border rounded-l-md"
                  placeholder="email@example.com"
                  value={newTestEmail}
                  onChange={(e) => setNewTestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTestEmail()}
                />
                <button
                  onClick={addTestEmail}
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={isLoadingTestEmails || !newTestEmail}
                >
                  Add
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Current Test Emails</h3>
              {isLoadingTestEmails ? (
                <p className="text-gray-500 text-sm">Loading test emails...</p>
              ) : testEmails.length === 0 ? (
                <p className="text-gray-500 text-sm">No test emails added yet.</p>
              ) : (
                <ul className="divide-y">
                  {testEmails.map((email) => (
                    <li key={email} className="py-2 flex justify-between items-center">
                      <span>{email}</span>
                      <button
                        onClick={() => removeTestEmail(email)}
                        className="text-red-600 hover:text-red-800 text-sm disabled:text-red-300"
                        disabled={isLoadingTestEmails}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">User Conversations</h1>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel - Conversation List */}
          <div className="w-full lg:w-2/5 bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex-1 overflow-auto pr-4">
              {/* Conversation list header */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-bold">Rooms</div>
                <div className="flex space-x-2">
                  <div className="text-sm bg-gray-100 px-2 py-1 rounded-md">
                    {filteredConversations.length} rooms
                  </div>
                  <div className="text-sm bg-gray-100 px-2 py-1 rounded-md">
                    {new Set(filteredConversations.map(conv => conv.account_email)).size} users
                  </div>
                </div>
              </div>
              
              {/* Search and filter controls */}
              <div className="mb-4">
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Search by email or artist"
                    className="w-full p-2 pr-10 border rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <select
                    className="p-2 border rounded-md"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    aria-label="Time filter"
                  >
                    <option>All Time</option>
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                    <option>Last 90 Days</option>
                  </select>
                  
                  <div className="flex items-center">
                    <span className="mr-2 text-sm">Exclude test emails</span>
                    <Switch
                      checked={excludeTestEmails}
                      onChange={setExcludeTestEmails}
                      className={`${
                        excludeTestEmails ? 'bg-blue-600' : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 items-center rounded-full`}
                    >
                      <span className="sr-only">Exclude test emails</span>
                      <span
                        className={`${
                          excludeTestEmails ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                      />
                    </Switch>
                    <button 
                      onClick={() => setShowTestEmailPopup(true)}
                      className="ml-2 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                      title="Manage test emails"
                    >
                      <CogIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Conversation list */}
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading conversations...
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-500">
                    {error}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.room_id}
                      className={`w-full text-left p-4 rounded-md transition-colors ${
                        selectedConversation === conversation.room_id
                          ? 'bg-blue-100'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedConversation(conversation.room_id)}
                    >
                      <div className="font-medium">
                        {conversation.account_email}
                      </div>
                      <div className="text-sm text-gray-500">
                        Artist: {conversation.artist_name || conversation.artist_reference}
                      </div>
                      {conversation.topic ? (
                        <div className="text-sm text-gray-500">
                          Topic: {conversation.topic}
                        </div>
                      ) : conversation.account_name && (
                        <div className="text-sm text-gray-500">
                          Account: {conversation.account_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 flex justify-between mt-1">
                        <span>
                          Created: {conversation.created_at 
                            ? new Date(conversation.created_at).toLocaleString() 
                            : 'Invalid Date'}
                        </span>
                        <span>
                          Last message: {conversation.last_message_date 
                            ? new Date(conversation.last_message_date).toLocaleString() 
                            : 'Invalid Date'}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No conversations found
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right panel - Conversation Detail */}
          <div className="w-full lg:w-3/5 bg-white rounded-lg shadow-sm p-4 border">
            {conversationDetail ? (
              <>
                <div className="mb-4 pb-3 border-b">
                  <h2 className="text-xl font-semibold">{conversationDetail.account_email}</h2>
                  <p className="text-sm text-gray-600">
                    Artist: {conversationDetail.artist_name || conversationDetail.artist_reference}
                  </p>
                  {conversationDetail.account_name && (
                    <p className="text-sm text-gray-600 mb-1">Account: {conversationDetail.account_name}</p>
                  )}
                  {conversationDetail.topic && (
                    <p className="text-gray-600">
                      Topic: {conversationDetail.topic}
                    </p>
                  )}
                </div>
                
                <div className="overflow-y-auto max-h-[calc(100vh-250px)] space-y-4">
                  {conversationDetail.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg max-w-[85%] ${
                        message.role === 'user'
                          ? 'bg-blue-50 ml-auto'
                          : 'bg-white border'
                      }`}
                    >
                      <div className="text-gray-800 markdown-content">
                        {message.content.includes('<') && message.content.includes('</') ? (
                          // Content appears to be HTML, render it safely
                          parse(DOMPurify.sanitize(message.content))
                        ) : (
                          // Regular text or markdown, use ReactMarkdown
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        )}
                      </div>
                      {message.reasoning && message.role === 'assistant' && (
                        <details className="mt-2 text-sm">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                            View reasoning
                          </summary>
                          <div className="mt-1 p-2 bg-gray-50 rounded border text-gray-700 whitespace-pre-wrap">
                            <ReactMarkdown>{message.reasoning}</ReactMarkdown>
                          </div>
                        </details>
                      )}
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                        {' '}
                        {new Date(message.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : selectedConversation ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading conversation...</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a conversation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 