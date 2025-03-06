'use client';

import { PipelineProvider } from '@/context/PipelineContext';
import { MRRCard } from './MRRCard';

export function PipelineMRRProvider() {
  return (
    <PipelineProvider>
      <MRRCard />
    </PipelineProvider>
  );
} 