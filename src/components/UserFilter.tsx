/**
 * UserFilter component: displays the user filter status and allows clearing it
 * @param selectedUserFilter - The currently selected user filter (email)
 * @param onClearFilter - Callback to clear the user filter
 */
import React from 'react';

export interface UserFilterProps {
  selectedUserFilter: string | null;
  onClearFilter: () => void;
}

const UserFilter: React.FC<UserFilterProps> = ({
  selectedUserFilter,
  onClearFilter
}) => {
  if (!selectedUserFilter) {
    return null;
  }

  return (
    <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-sm text-blue-800">
          Filtering conversations by: <strong>{selectedUserFilter}</strong>
        </span>
      </div>
      <button
        type="button"
        onClick={onClearFilter}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        Clear Filter
      </button>
    </div>
  );
};

export default UserFilter; 