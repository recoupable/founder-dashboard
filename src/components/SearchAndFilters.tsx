/**
 * SearchAndFilters component: handles search input and filter controls
 * @param searchQuery - Current search query
 * @param onSearchChange - Callback when search query changes
 * @param excludeTestEmails - Whether test emails are excluded
 * @param onToggleTestEmails - Callback to toggle test email exclusion
 * @param timeFilter - Current time filter
 * @param onTimeFilterChange - Callback when time filter changes
 * @param onManageTestEmails - Callback to open test email management
 */
import React from 'react';
import { MagnifyingGlassIcon, CogIcon } from '@heroicons/react/24/outline';
import Switch from './Switch';

export interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  excludeTestEmails: boolean;
  onToggleTestEmails: (exclude: boolean) => void;
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
  onManageTestEmails: () => void;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  searchQuery,
  onSearchChange,
  excludeTestEmails,
  onToggleTestEmails,
  timeFilter,
  onTimeFilterChange,
  onManageTestEmails
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Page Header with Master Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">User Conversations</h1>
        
        {/* Master Time Filter */}
        <div className="flex items-center gap-4">
          <label htmlFor="master-time-filter" className="font-medium text-sm text-gray-700">
            Time Period:
          </label>
          <select
            id="master-time-filter"
            value={timeFilter}
            onChange={e => onTimeFilterChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="Last 24 Hours">Last 24 Hours</option>
            <option value="Last 7 Days">Last 7 Days</option>
            <option value="Last 30 Days">Last 30 Days</option>
            <option value="Last 3 Months">Last 3 Months</option>
            <option value="Last 12 Months">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Search and local filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        {/* Test Email Toggle */}
        <div className="flex items-center gap-2">
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
    </div>
  );
};

export default SearchAndFilters; 