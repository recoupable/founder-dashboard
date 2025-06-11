/**
 * AdvancedConversationFilters component: handles search input and advanced filter controls
 */
import React from 'react';
import { MagnifyingGlassIcon, CogIcon } from '@heroicons/react/24/outline';
import Switch from './Switch';

export interface AdvancedConversationFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  excludeTestEmails: boolean;
  onToggleTestEmails: (exclude: boolean) => void;
  onManageTestEmails: () => void;
}

const AdvancedConversationFilters: React.FC<AdvancedConversationFiltersProps> = ({
  searchQuery,
  onSearchChange,
  excludeTestEmails,
  onToggleTestEmails,
  onManageTestEmails
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search conversations..."
          className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      {/* Test Email Toggle */}
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Switch
          checked={excludeTestEmails}
          onChange={onToggleTestEmails}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            excludeTestEmails ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              excludeTestEmails ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </Switch>
        <span className="text-sm text-gray-700">Exclude test emails</span>
        <button
          type="button"
          onClick={onManageTestEmails}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Manage test emails"
        >
          <CogIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AdvancedConversationFilters; 