export enum PipelineStage {
  PROSPECT = "Prospect",
  MEETING = "Meeting",
  FREE_TRIAL = "Free Trial",
  PAYING_CUSTOMER = "Paying Customer"
}

export type CustomerType = "Prospect" | "Meeting" | "Free Trial" | "Paying Customer";

export interface Customer {
  id: string;
  name: string;
  type: CustomerType;
  stage: PipelineStage;
  currentArtists: number;
  potentialArtists: number;
  currentMRR: number;
  potentialMRR: number;
  trialStartDate: string | null;
  trialEndDate: string | null;
  lastContactDate: string;
  notes: string;
} 