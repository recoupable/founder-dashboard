import React from 'react'
import { CreditCard, Users, DollarSign, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { getPayingCustomersCount } from '@/lib/stripe'
import { getActiveUsersCount, getLastMonthActiveUsersCount } from '@/lib/privy'
import { getMonthlyFinancials } from '@/lib/finance'

// Force dynamic rendering to ensure fresh data on each request
export const dynamic = 'force-dynamic';

// Manual enterprise customers count
const ENTERPRISE_CUSTOMERS_COUNT = 3; // Tyler, Megan, and Luh Tyler

// Format number as currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Get current month name
const getCurrentMonth = () => {
  return new Date().toLocaleString('default', { month: 'long' });
}

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

  // Calculate active users difference and percent change
  const activeUsersDiff = activeUsers - lastMonthActiveUsers;
  const activeUsersPercentChange = formatPercentChange(activeUsers, lastMonthActiveUsers);

  // Calculate total paying customers
  const totalPayingCustomers = stripeCustomers + ENTERPRISE_CUSTOMERS_COUNT;

  return (
    <main className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold tracking-tight">Recoup Founder Dashboard</h1>
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
              <div className="text-2xl font-bold">{activeUsers}</div>
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

          {/* MRR Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Recurring Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(financials.revenue.mrr)}</div>
              <p className="text-xs text-muted-foreground">
                Monthly recurring revenue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Financial Breakdown Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {getCurrentMonth()} Financial Breakdown
            </CardTitle>
            {financials.profit.isProfit ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Revenue Section */}
              <div>
                <h3 className="font-medium mb-2">Revenue</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Recurring Revenue</span>
                    <span>{formatCurrency(financials.revenue.mrr)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Grant</span>
                    <span>{formatCurrency(financials.revenue.grants)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Total Revenue</span>
                    <span>{formatCurrency(financials.revenue.total)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div>
                <h3 className="font-medium mb-2">Expenses</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Development</span>
                    <span>{formatCurrency(financials.expenses.development)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Operational Costs</span>
                    <span>{formatCurrency(financials.expenses.operational)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Total Expenses</span>
                    <span>{formatCurrency(financials.expenses.total)}</span>
                  </div>
                </div>
              </div>

              {/* Net Profit Section */}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Net Profit</span>
                  <span className={`text-lg font-bold ${financials.profit.isProfit ? 'text-green-500' : 'text-red-500'}`}>
                    {financials.profit.isProfit ? '+' : '-'} {formatCurrency(financials.profit.amount)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
} 