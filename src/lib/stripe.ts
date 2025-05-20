import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY')
}

// Initialize Stripe client
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia', // Use the supported API version for this stripe-node version
})

export async function getPayingCustomersCount(): Promise<number> {
  try {
    // Get customers with successful payments
    const customers = await stripe.customers.list({
      limit: 100, // Adjust based on your needs
      expand: ['data.subscriptions'],
    })

    // Count customers with active subscriptions
    const activeCustomers = customers.data.filter(customer => {
      const subscriptions = customer.subscriptions?.data || []
      return subscriptions.some(sub => sub.status === 'active')
    })

    return activeCustomers.length
  } catch (error) {
    console.error('Error fetching paying customers:', error)
    return 0 // Return 0 instead of throwing to prevent dashboard from breaking
  }
}

// Function to get MRR from Stripe subscriptions
export async function getStripeMRR(): Promise<number> {
  try {
    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100, // Adjust based on your needs
      expand: ['data.plan'],
    })

    // Calculate total MRR from active subscriptions
    const stripeMRR = subscriptions.data.reduce((total, subscription) => {
      // Get the monthly amount for this subscription
      const monthlyAmount = subscription.items.data.reduce((subTotal, item) => {
        const unitAmount = item.price.unit_amount || 0
        const quantity = item.quantity || 1
        const interval = item.price.recurring?.interval || 'month'
        const intervalCount = item.price.recurring?.interval_count || 1

        // Convert to monthly amount
        let monthlyPrice = (unitAmount * quantity) / 100 // Convert from cents to dollars
        if (interval === 'year') {
          monthlyPrice = monthlyPrice / 12
        } else if (interval === 'week') {
          monthlyPrice = monthlyPrice * 52 / 12
        }
        monthlyPrice = monthlyPrice / intervalCount

        return subTotal + monthlyPrice
      }, 0)

      return total + monthlyAmount
    }, 0)

    return Math.round(stripeMRR) // Round to nearest dollar
  } catch (error) {
    console.error('Error fetching Stripe MRR:', error)
    return 0 // Return 0 instead of throwing to prevent dashboard from breaking
  }
} 