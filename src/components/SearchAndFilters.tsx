/**
 * SearchAndFilters component: handles page header and time filter controls
 */
import React from 'react';

export interface SearchAndFiltersProps {
  timeFilter: string;
  onTimeFilterChange: (filter: string) => void;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  timeFilter,
  onTimeFilterChange
}) => {

  return (
    <div className="flex flex-col gap-4 mb-12">
      {/* Clean Page Header with Master Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Product Usage</h1>
        </div>
        
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
    </div>
  );
};

export default SearchAndFilters; 