import { Customer, PipelineData, PipelineStage } from './types';

// Mock customers
const customers: Record<string, Customer> = {
  'customer-1': {
    id: 'customer-1',
    name: 'Black Flag',
    type: 'IndieLabel',
    stage: 'FreeTrial',
    currentArtists: 5,
    potentialArtists: 100,
    currentMRR: 0,
    potentialMRR: 9900, // $99 * 100 artists
    trialStartDate: '2023-03-01',
    trialEndDate: '2023-03-31',
    lastContactDate: '2023-03-15',
    notes: 'Interested in expanding to full roster if trial goes well.'
  },
  'customer-2': {
    id: 'customer-2',
    name: 'Sonic Agency',
    type: 'Agency',
    stage: 'Prospect',
    currentArtists: 0,
    potentialArtists: 50,
    currentMRR: 0,
    potentialMRR: 4950, // $99 * 50 artists
    lastContactDate: '2023-03-10',
    notes: 'Initial contact made, scheduling demo.'
  },
  'customer-3': {
    id: 'customer-3',
    name: 'Universal Music',
    type: 'MajorLabel',
    stage: 'InDiscussion',
    currentArtists: 0,
    potentialArtists: 500,
    currentMRR: 0,
    potentialMRR: 49500, // $99 * 500 artists
    lastContactDate: '2023-03-05',
    notes: 'Had initial demo, discussing pilot program with 10 artists.'
  },
  'customer-4': {
    id: 'customer-4',
    name: 'Indie Collective',
    type: 'IndieLabel',
    stage: 'Paying',
    currentArtists: 10,
    potentialArtists: 25,
    currentMRR: 990, // $99 * 10 artists
    potentialMRR: 2475, // $99 * 25 artists
    lastContactDate: '2023-02-20',
    notes: 'Happy customer, considering adding more artists next quarter.'
  },
  'customer-5': {
    id: 'customer-5',
    name: 'Beat Productions',
    type: 'Agency',
    stage: 'Churned',
    currentArtists: 0,
    potentialArtists: 15,
    currentMRR: 0,
    potentialMRR: 1485, // $99 * 15 artists
    lastContactDate: '2023-01-15',
    notes: 'Churned due to budget constraints. May revisit in 6 months.'
  }
};

// Pipeline columns
const columns: Record<PipelineStage, { id: PipelineStage, title: string, customerIds: string[] }> = {
  'Prospect': {
    id: 'Prospect',
    title: 'Prospects',
    customerIds: ['customer-2']
  },
  'InDiscussion': {
    id: 'InDiscussion',
    title: 'In Discussion',
    customerIds: ['customer-3']
  },
  'FreeTrial': {
    id: 'FreeTrial',
    title: 'Free Trial',
    customerIds: ['customer-1']
  },
  'Paying': {
    id: 'Paying',
    title: 'Paying Customers',
    customerIds: ['customer-4']
  },
  'Churned': {
    id: 'Churned',
    title: 'Churned',
    customerIds: ['customer-5']
  }
};

// Column order
const columnOrder: PipelineStage[] = ['Prospect', 'InDiscussion', 'FreeTrial', 'Paying', 'Churned'];

// Export mock data
export const initialPipelineData: PipelineData = {
  customers,
  columns,
  columnOrder
}; 