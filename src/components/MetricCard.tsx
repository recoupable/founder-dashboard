/**
 * MetricCard component: displays a dashboard metric with title, value, optional description, and optional icon.
 * @param title - The metric title (e.g., 'Active Users')
 * @param value - The metric value
 * @param description - Optional description or subtitle (also used for tooltip)
 * @param icon - Optional icon element
 * @param className - Optional CSS classes for custom styling
 * @param showTooltip - Whether to show description as tooltip (default: true)
 * @param percentChange - Optional percentage change from previous period
 * @param changeDirection - Direction of change: 'up', 'down', or 'neutral'
 * @param onClick - Optional click handler
 * @param isSelected - Whether the card is currently selected
 */
import React from 'react';
import CustomTooltip from './CustomTooltip';

export interface MetricCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  showTooltip?: boolean;
  percentChange?: number;
  changeDirection?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  isSelected?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  className,
  showTooltip = true,
  percentChange,
  changeDirection = 'neutral',
  onClick,
  isSelected = false
}) => {
  // Helper function to get badge styles based on change direction
  const getBadgeStyles = () => {
    switch (changeDirection) {
      case 'up':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'down':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-600 border border-gray-200';
    }
  };

  // Helper function to get the appropriate symbol and prefix
  const getChangeSymbolAndPrefix = () => {
    switch (changeDirection) {
      case 'up':
        return { symbol: '▲', prefix: '+' };
      case 'down':
        return { symbol: '▼', prefix: '' };
      default:
        return { symbol: '', prefix: '' };
    }
  };

  const getCardClasses = () => {
    let baseClasses = 'bg-white rounded-2xl shadow-md p-6 text-left transition-all hover:shadow-lg';
    
    if (onClick) {
      baseClasses += ' cursor-pointer';
      if (isSelected) {
        baseClasses += ' ring-2 ring-blue-500 border-2 border-blue-500';
      } else {
        baseClasses += ' hover:ring-1 hover:ring-blue-300';
      }
    }
    
    return `${baseClasses} ${className || ''}`;
  };

  const cardContent = (
    <div className={getCardClasses()} onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {/* Icon */}
          {icon && <div className="text-blue-600 flex-shrink-0">{icon}</div>}
          {/* Selection indicator */}
          {isSelected && (
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {/* Percentage Change Badge - Matching leaderboard style */}
        {typeof percentChange === 'number' && (
          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold min-w-20 text-center ${getBadgeStyles()}`}>
            {getChangeSymbolAndPrefix().symbol}
            {getChangeSymbolAndPrefix().prefix}{percentChange}%
          </span>
        )}
      </div>
      {!showTooltip && description && (
        <div className="text-sm text-gray-500">{description}</div>
      )}
      {onClick && (
        <div className="text-xs text-gray-400 mt-2">
          Click to view trend chart
        </div>
      )}
    </div>
  );

  if (showTooltip && description) {
    return (
      <CustomTooltip content={description}>
        {cardContent}
      </CustomTooltip>
    );
  }

  return cardContent;
};

export default MetricCard; 