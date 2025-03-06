import React from 'react'
import { CreditCard, Users, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { getPayingCustomersCount } from '@/lib/stripe'
import { getActiveUsersCount, getLastMonthActiveUsersCount } from '@/lib/privy'
import { getMonthlyFinancials } from '@/lib/finance'
import { PipelineMRRProvider } from '@/components/dashboard/PipelineMRRProvider'
import { FinancialMetricsProvider } from '@/components/dashboard/FinancialMetricsProvider'

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = 'force-dynamic';

// Manual enterprise customers count
const ENTERPRISE_CUSTOMERS_COUNT = 3; // Tyler, Megan, and Luh Tyler

// Format percentage change
const formatPercentChange = (current: number, previous: number): string => {
  if (previous === 0) return '0.0%';
  const percentChange = ((current - previous) / previous) * 100;
  return `${percentChange.toFixed(1)}%`;
};

export default async function Dashboard() {
  // Fetch metrics in parallel
  const [stripeCustomers, activeUsers, lastMonthActiveUsers, financials] = await Promise.all([
    getPayingCustomersCount(),
    getActiveUsersCount(),
    getLastMonthActiveUsersCount(),
    getMonthlyFinancials(),
  ])

  // Check if we have valid data
  const hasValidActiveUsers = activeUsers >= 0;
  const hasValidLastMonthActiveUsers = lastMonthActiveUsers >= 0;

  // Calculate active users difference and percent change only if we have valid data
  const activeUsersDiff = hasValidActiveUsers && hasValidLastMonthActiveUsers 
    ? activeUsers - lastMonthActiveUsers 
    : 0;
    
  const activeUsersPercentChange = hasValidActiveUsers && hasValidLastMonthActiveUsers 
    ? formatPercentChange(activeUsers, lastMonthActiveUsers)
    : '0.0';

  // Calculate total paying customers
  const totalPayingCustomers = stripeCustomers + ENTERPRISE_CUSTOMERS_COUNT;

  return (
    <main className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <ConnectionStatus className="w-auto" />
        </div>
        
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Monthly Active Users Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Rolling Active Users
                <span className="block text-xs font-normal text-muted-foreground">
                  Users active in the last 30 days
                </span>
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {hasValidActiveUsers ? (
                <>
                  <div className="text-2xl font-bold">{activeUsers}</div>
                  {hasValidLastMonthActiveUsers ? (
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`flex items-center gap-1 ${activeUsersDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {activeUsersDiff >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{activeUsersPercentChange}%</span>
                      </div>
                      <span className="text-muted-foreground">vs previous 30 days</span>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-500">Previous period data unavailable</div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-red-500">Error</div>
                  <div className="text-xs text-red-500">Unable to fetch active users data</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paying Customers Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Paying Customers
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPayingCustomers}</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">{ENTERPRISE_CUSTOMERS_COUNT}</div>
                  Enterprise
                </div>
                <div>
                  <div className="font-medium text-foreground">{stripeCustomers}</div>
                  Non-Enterprise
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MRR Card - Now using data from Sales Pipeline */}
          <PipelineMRRProvider />
        </div>

        {/* Financial Metrics - Now using data from Sales Pipeline for Net Profit */}
        <FinancialMetricsProvider 
          developmentCost={financials.expenses.development}
          operationalCost={financials.expenses.operational}
        />
        
        {/* Additional dashboard content can go here */}
      </div>
    </main>
  )
} 