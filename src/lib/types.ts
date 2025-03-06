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