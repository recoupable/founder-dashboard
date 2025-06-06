// Shared TypeScript interfaces and types for the conversations dashboard

export interface Customer {
  id: string;
  name: string;
  type: 'Agency' | 'MajorLabel' | 'IndieLabel' | 'Other';
  stage: 'Prospect' | 'InDiscussion' | 'FreeTrial' | 'Paying' | 'Churned';
  currentArtists: number;
  potentialArtists: number;
  currentMRR: number;
  potentialMRR: number;
  trialStartDate?: string;
  trialEndDate?: string;
  lastContactDate: string;
  notes: string;
}

export type PipelineStage = 'Prospect' | 'InDiscussion' | 'FreeTrial' | 'Paying' | 'Churned';

export interface PipelineColumn {
  id: PipelineStage;
  title: string;
  customerIds: string[];
}

export interface PipelineData {
  customers: Record<string, Customer>;
  columns: Record<PipelineStage, PipelineColumn>;
  columnOrder: PipelineStage[];
}

export interface ChartAnnotation {
  id: number;
  event_date: string;
  event_description: string;
  chart_type: string;
  created_at: string;
}

export interface ChartDatasetDataPoint {
  x: string;
  y: number;
}

export interface ChartDataset {
  label: string;
  data: ChartDatasetDataPoint[];
  borderColor: string;
  backgroundColor: string;
}

export interface ApiChartDataset {
  label: string;
  borderColor: string;
  backgroundColor: string;
  data: number[];
}

export interface MyChartData {
  rawDates: string[];
  datasets: ChartDataset[];
  annotations: ChartAnnotation[];
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

export interface CustomTooltipProps {
  content: string;
  children: React.ReactNode;
}

export interface UserAnalysis {
  user_profile: string;
  engagement_level: string;
  primary_use_cases: string[];
  strengths: string[];
  pain_points: string[];
  satisfaction_level: string;
  ai_performance: string;
  top_recommendations: string[];
  user_journey_stage: string;
  key_insights: string[];
  conversation_themes: string[];
  growth_opportunities: string[];
}

export interface ArtistUsage {
  artistId: string;
  artistName: string;
  rooms: number;
  messages: number;
  reports: number;
  topics: string[];
  totalActivity: number;
}

export interface UserActivityDetails {
  newArtistsCreated: number;
  artistUsage: ArtistUsage[];
  totalRooms: number;
  totalMemories: number;
} 