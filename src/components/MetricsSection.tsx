/**
 * MetricsSection component: displays the three main metrics cards
 */
import React from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import MetricCard from './MetricCard';

export interface MetricData {
  percentChange: number;
  changeDirection: 'up' | 'down' | 'neutral';
}

export interface ActiveUsersData extends MetricData {
  activeUsers: number;
  previousActiveUsers: number;
}

export interface PowerUsersData extends MetricData {
  powerUsers: number;
  previousPowerUsers: number;
}

export interface PmfSurveyReadyData extends MetricData {
  pmfSurveyReady: number;
  previousPmfSurveyReady: number;
}

export interface MetricsSectionProps {
  activeUsersData: ActiveUsersData;
  powerUsersData: PowerUsersData;
  pmfSurveyReadyData: PmfSurveyReadyData;
}

const MetricsSection: React.FC<MetricsSectionProps> = ({
  activeUsersData,
  powerUsersData,
  pmfSurveyReadyData
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <MetricCard
        title="Active Users"
        value={activeUsersData.activeUsers}
        description="Active Users are users who have sent at least one message or created at least one segment report during the selected time period."
        icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
      />

      <MetricCard
        title="Power Users"
        value={powerUsersData.powerUsers}
        description="Power Users are your most engaged users with 10+ total actions (messages + reports) in the selected period."
        icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>}
      />

      <MetricCard
        title="PMF Survey Ready"
        value={pmfSurveyReadyData.pmfSurveyReady}
        description="PMF Survey Ready users meet Sean Ellis criteria for product-market fit surveys."
        icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>}
      />
    </div>
  );
};

export default MetricsSection;