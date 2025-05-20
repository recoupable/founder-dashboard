// Manual enterprise customers with verified MRR
const ENTERPRISE_CUSTOMERS = [
  { name: 'Tyler Tee Grizzley', mrr: 999 },
  { name: 'Megan Thee Stallion', mrr: 999 },
  { name: 'Luh Tyler', mrr: 999 }
];

// Calculate enterprise MRR - this is accurate as it's based on actual contracts
const getEnterpriseMRR = () => {
  return ENTERPRISE_CUSTOMERS.reduce((total, customer) => total + customer.mrr, 0);
};

// Monthly grant amount - verified
const MONTHLY_GRANT = 3000;

// Monthly expenses - verified amounts
const MONTHLY_EXPENSES = {
  development: 5555,
  operations: {
    apis: 200,
    subscriptions: 200,
    tools: 100,
  }
};

// Calculate total operational costs
const getOperationalCosts = () => {
  return Object.values(MONTHLY_EXPENSES.operations).reduce((total, cost) => total + cost, 0);
};

// Calculate total monthly expenses
const getTotalMonthlyExpenses = () => {
  return MONTHLY_EXPENSES.development + getOperationalCosts();
};

// Monthly financials interface
interface MonthlyFinancials {
  revenue: {
    mrr: number;
    grants: number;
    total: number;
  };
  expenses: {
    development: number;
    operational: number;
    total: number;
  };
  profit: {
    isProfit: boolean;
    amount: number;
  };
}

// Calculate monthly financials with only verified numbers
export async function getMonthlyFinancials(): Promise<MonthlyFinancials> {
  const stripeMRR = 0;
  const enterpriseMRR = getEnterpriseMRR();
  const totalMRR = stripeMRR + enterpriseMRR;
  const totalRevenue = totalMRR + MONTHLY_GRANT;
  const operationalCosts = getOperationalCosts();
  const totalExpenses = getTotalMonthlyExpenses();
  const profit = totalRevenue - totalExpenses;
  
  return {
    revenue: {
      mrr: totalMRR,
      grants: MONTHLY_GRANT,
      total: totalRevenue
    },
    expenses: {
      development: MONTHLY_EXPENSES.development,
      operational: operationalCosts,
      total: totalExpenses
    },
    profit: {
      isProfit: profit >= 0,
      amount: Math.abs(profit)
    }
  };
} 