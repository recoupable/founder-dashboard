/**
 * MetricCard component: displays a dashboard metric with title, value, optional description, and optional icon.
 * @param title - The metric title (e.g., 'Active Users')
 * @param value - The metric value
 * @param description - Optional description or subtitle (also used for tooltip)
 * @param icon - Optional icon element
 * @param className - Optional CSS classes for custom styling
 * @param showTooltip - Whether to show description as tooltip (default: true)
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
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  className,
  showTooltip = true 
}) => {
  const cardContent = (
    <div className={`bg-white rounded-2xl shadow-md p-6 text-left transition-all hover:shadow-lg ${className || ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        </div>
        {icon && <div className="text-blue-600">{icon}</div>}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      {!showTooltip && description && (
        <div className="text-sm text-gray-500">{description}</div>
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