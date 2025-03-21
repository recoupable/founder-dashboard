'use client';

import { PipelineProvider } from '@/context/PipelineContext';
import { MRRMetricsCards } from './MRRMetricsCards';

export function MRRMetricsProvider() {
  return (
    <PipelineProvider>
      <MRRMetricsCards />
    </PipelineProvider>
  );
} 