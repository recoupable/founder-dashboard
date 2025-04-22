# Sales Pipeline Implementation Analysis

## Overview
The sales pipeline is implemented as a core feature of the CEO dashboard. It allows tracking potential customers through various stages of the sales process.

## Current Implementation
The sales pipeline is currently business-focused, with each card representing a business/organization. We need to refactor to make it user-focused, with each card representing an individual user.

## Important Context
- This is an internal tool used only by you
- The pipeline is new with minimal existing data
- Implementation complexity can be significantly reduced

## Database Structure
- **Table Name**: `sales_pipeline_customers`
- **Current Key Fields**:
  - `id`: UUID primary key
  - `name`: Customer name (business)
  - `type`: Customer type classification (Prospect, Lead, Customer, Partner)
  - `stage`: Pipeline stage (Prospect, Meeting, Free Trial, Paying Customer)
  - `current_artists`: Number of artists currently onboarded
  - `potential_artists`: Potential number of artists
  - `current_mrr`: Current Monthly Recurring Revenue
  - `potential_mrr`: Potential Monthly Recurring Revenue
  - `weighted_mrr`: Calculated field (potential_mrr * probability/100)
  - `probability`: Success probability percentage
  - Various tracking fields for activity, dates, and customer information

## Required Changes

### 1. Database Schema Updates
We need to modify the `sales_pipeline_customers` table to accommodate the new user-focused fields:

```sql
ALTER TABLE sales_pipeline_customers
ADD COLUMN email TEXT,
ADD COLUMN organization TEXT,
ADD COLUMN artists_in_account TEXT[], -- Store array of artist names
ADD COLUMN trial_start_date DATE,
ADD COLUMN conversion_target_date DATE,
ADD COLUMN messages_sent INTEGER DEFAULT 0,
ADD COLUMN conversion_stage TEXT,
ADD COLUMN next_action TEXT,
ADD COLUMN internal_owner TEXT,
ADD COLUMN engagement_health TEXT CHECK (engagement_health IN ('Active', 'Warm', 'At Risk')),
ADD COLUMN use_case_type TEXT;
```

### 2. Customer Type Interface Updates
Update the `Customer` interface in `src/lib/customerService.ts` to include new fields:

```typescript
export interface Customer {
  // Existing fields
  id: string
  name: string
  type: CustomerType
  stage: PipelineStage
  // ...
  
  // New fields
  email?: string
  organization?: string
  artists_in_account?: string[]
  trial_start_date?: string
  conversion_target_date?: string
  messages_sent?: number
  conversion_stage?: string
  next_action?: string
  internal_owner?: string
  engagement_health?: 'Active' | 'Warm' | 'At Risk'
  use_case_type?: string
}
```

### 3. Card Component Updates
Modify `CustomerCard` and `ResponsiveCustomerCard` components to display the new user-focused fields:

- Update `ResponsiveCustomerCard.tsx` to show user information instead of business information
- Display emojis for different field categories
- Add health indicators (green/yellow/red hearts)
- Show artists as a list under the user
- Make organization clickable or support grouping

### 4. Form Component Updates
Update `CustomerFormModal.tsx` to include form fields for the new user data:

- Add fields for email, organization, artists list, etc.
- Add fields for trial dates, conversion target
- Add engagement health dropdown (Active/Warm/At Risk)
- Add use case type field

### 5. Pipeline Context Updates
Update context functions in `PipelineContext.tsx` to handle the new fields:

- Update `addCustomer` and `updateCustomer` functions
- Add methods for handling artist listings
- Add support for engagement health filtering

### 6. API Endpoint Updates
If we're using API endpoints for customer CRUD operations, we'll need to update them:

- Update `/api/customers/update` endpoint to handle new fields
- Update any input validation logic for new fields
- Ensure API responses include the new fields

## Simplified Migration Plan

Since this is an internal tool with minimal data:

1. **Database Updates**:
   - Run the ALTER TABLE commands directly
   - Since there's minimal data, even re-creating the table is feasible if needed
   - No need for complex migration scripts or rollback procedures

2. **Frontend Updates**:
   - Update the Customer interface
   - Update the card components
   - Update the form component
   - No need for backward compatibility or feature flags

3. **Data Migration**:
   - With minimal data, you could manually update existing records
   - Or write a simple script to populate the new fields with default values

4. **Testing**:
   - Since you're the only user, you can test directly in the production environment
   - No need for extensive QA or user acceptance testing

## New Card Structure
🧑‍💼 Name: [Full Name]
📧 Email: [email address]
🏢 Organization: [Company name, clickable or grouped]
🎤 Artists in Account: [#] 
  - [Artist 1], [Artist 2], [Artist 3], ...

🚀 Trial Start Date: [MM/DD/YY]
📆 Conversion Target: [MM/DD/YY] (or blank if unknown)
💰 Potential MRR: $[Projected MRR if they convert]
💬 Messages Sent: [Number]

📍 Conversion Stage: [e.g. "Day 5 of Trial", "Considering Upsell", "Waiting on Label Budget"]
🔁 Next Action: [e.g. "Follow up after Dog Reason drops 4/19"]
👤 Internal Owner: [Your team member's name]

🔥 Engagement Health: [💚 Active, 💛 Warm, ❤️ At Risk]
🧠 Use Case Type: [e.g. "A&R," "Marketing," "Data team," "Executive"]

🗒️ Notes:
[Freeform notes about convos, blockers, activation steps, or vibes]

## Streamlined Risk Management

Given the simplified context, these are the only things to be concerned about:

1. **Data Preservation**
   - Take a backup of your existing data before making changes
   - Since there's minimal data, you could even export it to JSON/CSV as a backup

2. **Organization Representation**
   - Consider how you want to group users by organization
   - Simple solution: just make the organization field filter/sortable

3. **Mobile Layout**
   - Make sure the new card layout works well on all devices you use
   - Collapsible sections might help with information density

## Current Pipeline Stages (Unchanged)
1. Prospect
2. Meeting
3. Free Trial
4. Paying Customer

The sales pipeline is currently integrated into the main dashboard page and serves as a critical tool for tracking and managing potential revenue.
