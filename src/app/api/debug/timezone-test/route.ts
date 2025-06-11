import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 7 Days';
    
    const now = new Date();
    
    // Server timezone information
    const timezoneInfo = {
      serverTime: now.toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utcTime: now.toISOString(),
      localTime: now.toLocaleString(),
      timestamp: now.getTime()
    };
    
    // Old method (potentially timezone-dependent)
    const oldMethod = (() => {
      switch (timeFilter) {
        case 'Last 7 Days':
          const oldStart = new Date(now);
          oldStart.setDate(now.getDate() - 7);
          oldStart.setHours(0, 0, 0, 0);
          const oldEnd = new Date(now);
          oldEnd.setHours(23, 59, 59, 999);
          return { start: oldStart, end: oldEnd };
        default:
          return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      }
    })();
    
    // New method (UTC-consistent)
    const newMethod = (() => {
      switch (timeFilter) {
        case 'Last 7 Days':
          const newStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const newEnd = new Date(now.getTime());
          return { start: newStart, end: newEnd };
        default:
          return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
      }
    })();
    
    // Calculate the difference in hours
    const startTimeDiff = Math.abs(oldMethod.start.getTime() - newMethod.start.getTime()) / (1000 * 60 * 60);
    const endTimeDiff = Math.abs(oldMethod.end.getTime() - newMethod.end.getTime()) / (1000 * 60 * 60);
    
    const result = {
      timezoneInfo,
      timeFilter,
      comparison: {
        oldMethod: {
          start: oldMethod.start.toISOString(),
          end: oldMethod.end.toISOString(),
          startLocal: oldMethod.start.toLocaleString(),
          endLocal: oldMethod.end.toLocaleString()
        },
        newMethod: {
          start: newMethod.start.toISOString(),
          end: newMethod.end.toISOString(),
          startLocal: newMethod.start.toLocaleString(),
          endLocal: newMethod.end.toLocaleString()
        },
        differences: {
          startDiffHours: startTimeDiff,
          endDiffHours: endTimeDiff,
          significant: startTimeDiff > 1 || endTimeDiff > 1
        }
      }
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Timezone Test API: Error:', error);
    return NextResponse.json({ error: 'Failed to run timezone test' }, { status: 500 });
  }
} 