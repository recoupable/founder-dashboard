import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const excludeTest = searchParams.get('excludeTest') === 'true';
    
    if (!start || !end) {
      return NextResponse.json({ error: 'start and end parameters are required' }, { status: 400 });
    }
    
    console.log('Conversion Rate API: Calculating conversion from', start, 'to', end, 'excludeTest:', excludeTest);
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      start,
      end,
      excludeTest: excludeTest.toString()
    });
    
    // Fetch website visits and Privy sign-ins in parallel
    const [websiteVisitsResponse, privySigninsResponse] = await Promise.all([
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analytics/website-visits?${queryParams}`),
      fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analytics/privy-signins?${queryParams}`)
    ]);
    
    if (!websiteVisitsResponse.ok || !privySigninsResponse.ok) {
      console.error('Conversion Rate API: Error fetching data');
      console.error('Website visits status:', websiteVisitsResponse.status);
      console.error('Privy sign-ins status:', privySigninsResponse.status);
      throw new Error('Failed to fetch required data');
    }
    
    const websiteVisitsData = await websiteVisitsResponse.json();
    const privySigninsData = await privySigninsResponse.json();
    
    const websiteVisits = websiteVisitsData.websiteVisits || 0;
    const privySignins = privySigninsData.privySignins || 0;
    
    console.log('Conversion Rate API: Website visits:', websiteVisits);
    console.log('Conversion Rate API: Privy sign-ins:', privySignins);
    
    // Calculate conversion rate
    let conversionRate = 0;
    let conversionDirection: 'up' | 'down' | 'neutral' = 'neutral';
    
    if (websiteVisits > 0) {
      conversionRate = (privySignins / websiteVisits) * 100;
      // For conversion rate, we generally want higher percentages
      conversionDirection = conversionRate > 0 ? 'up' : 'neutral';
    }
    
    // Get previous period for comparison (optional enhancement)
    const periodDuration = new Date(end).getTime() - new Date(start).getTime();
    const prevEnd = new Date(start);
    const prevStart = new Date(new Date(start).getTime() - periodDuration);
    
    let previousConversionRate = 0;
    let percentChange = 0;
    
    try {
      const prevQueryParams = new URLSearchParams({
        start: prevStart.toISOString(),
        end: prevEnd.toISOString(),
        excludeTest: excludeTest.toString()
      });
      
      const [prevWebsiteVisitsResponse, prevPrivySigninsResponse] = await Promise.all([
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analytics/website-visits?${prevQueryParams}`),
        fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analytics/privy-signins?${prevQueryParams}`)
      ]);
      
      if (prevWebsiteVisitsResponse.ok && prevPrivySigninsResponse.ok) {
        const prevWebsiteVisitsData = await prevWebsiteVisitsResponse.json();
        const prevPrivySigninsData = await prevPrivySigninsResponse.json();
        
        const prevWebsiteVisits = prevWebsiteVisitsData.websiteVisits || 0;
        const prevPrivySignins = prevPrivySigninsData.privySignins || 0;
        
        if (prevWebsiteVisits > 0) {
          previousConversionRate = (prevPrivySignins / prevWebsiteVisits) * 100;
          
          if (previousConversionRate > 0) {
            percentChange = Math.round(((conversionRate - previousConversionRate) / previousConversionRate) * 100);
            conversionDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
          }
        }
        
        console.log('Conversion Rate API: Previous period - Website visits:', prevWebsiteVisits, 'Sign-ins:', prevPrivySignins);
        console.log('Conversion Rate API: Previous conversion rate:', previousConversionRate);
      }
    } catch (error) {
      console.warn('Conversion Rate API: Could not fetch previous period data:', error);
      // Continue without previous period comparison
    }
    
    const result = {
      conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
      conversionRateRaw: conversionRate, // Exact percentage
      websiteVisits,
      privySignins,
      previousConversionRate: Math.round(previousConversionRate * 100) / 100,
      percentChange: Math.abs(percentChange),
      changeDirection: conversionDirection,
      excludeTest,
      formula: `${privySignins} ÷ ${websiteVisits} × 100 = ${Math.round(conversionRate * 100) / 100}%`
    };
    
    console.log('Conversion Rate API: Final result:', result);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Conversion Rate API: Error:', error);
    return NextResponse.json({ 
      error: 'Failed to calculate conversion rate',
      conversionRate: 0,
      conversionRateRaw: 0,
      websiteVisits: 0,
      privySignins: 0,
      previousConversionRate: 0,
      percentChange: 0,
      changeDirection: 'neutral',
      excludeTest: false,
      formula: 'Error calculating'
    }, { status: 500 });
  }
} 