Ticket – Add Full Funnel Metrics to Admin Dashboard

⸻

1. Why this matters

We can see message activity, but have no visibility into the steps that happen before a user sends their first chat. Privy shows five "active" sign-ins, our dashboard shows one active chatter, and Vercel says fifteen site visits. We need a single place to compare these numbers and spot where users drop off.

⸻

2. Outcome to deliver

A top-of-funnel view that answers, at a glance:

Website visit → Privy sign-in → First message sent

⸻

3. Dashboard changes

Row	Card	Metric	Drill-down needed?
New top row	Website Visits	Unique visitors for selected period	Table of visit sessions (same filter & test-email toggle rules as others)
	Privy Sign-ins	Users who authenticated with Privy	List of user identifiers (email or wallet)
	Conversion Rate	Privy Sign-ins ÷ Website Visits (%) plus raw counts	No drill-down
Existing second row	Active Users	Users who sent ≥1 message	Already live
	Power Users	(unchanged)	–
	PMF Survey Ready	(unchanged)	–

Period selector (24 h / 7 d / 30 d) applies to all cards.

⸻

4. Success criteria
	1.	Counts in each card match their source dashboards (within expected data-lag).
	2.	Drill-downs respect the "Exclude test emails" toggle.
	3.	Conversion rate updates instantly when the period changes.
	4.	No noticeable slow-down to existing dashboard loads.

⸻

5. Priority

P1 – this sprint. Resolves the 5-vs-1 discrepancy and lets us track the full acquisition funnel.

⸻

## CODEBASE ANALYSIS & IMPLEMENTATION PLAN

### Current Architecture Overview

**Analytics Dashboard Location**: `/src/app/analytics/page.tsx`
- Currently shows 6 metric cards: Active Users (working), New Users, Returning Users, Retention Rate, Avg Actions/User, [Add Metric] (all placeholders)
- Uses time range selector (24h, 7d, 30d, 3m, 12m)
- Has placeholder chart and breakdown panels

**Database Schema (Supabase)**:
- `accounts` - User accounts 
- `rooms` - Chat rooms per user
- `memories` - Messages/chat history (tracks activity via updated_at)
- `account_emails` - Email addresses linked to accounts
- `account_wallets` - Wallet addresses linked to accounts  
- `segment_reports` - User-generated reports
- `test_emails` - Test email addresses to exclude from analytics

**Existing API Endpoints**:
- `/api/analytics/active-users` - Users who sent ≥1 message in time period
- `/api/power-users` - Users with 10+ total activity (messages + reports)
- `/api/pmf-survey-ready` - Users with 2+ sessions AND recent activity (14-day window)

**Current Metric Definitions**:
- **Active Users**: Users who sent messages (tracked via `memories` table)
- **Power Users**: Users with 10+ combined message and report count
- **PMF Survey Ready**: Users with ≥2 sessions (max of room count or active days + reports) AND activity in last 14 days

**Privy Integration**: 
- Fully integrated via `/src/lib/privy.ts`
- Can fetch all Privy users with `privy.getUsers()`
- Tracks `latestVerifiedAt` for each linked account
- Has caching (1 hour) and retry logic

**Test Email Filtering**:
- Consistent across all endpoints
- Filters out `test_emails` table entries
- Filters out emails containing `@example.com` or `+`
- Hardcoded test wallet account IDs also excluded

### Implementation Plan

#### Phase 1: Add Privy Sign-ins Card ✅ COMPLETED
**New API Endpoint**: `/api/analytics/privy-signins`
- Fetch Privy users filtered by time period (using `latestVerifiedAt`)
- Apply same test email filtering as other endpoints
- Support drill-down with user list

#### Phase 2: Add Website Visits Card ✅ COMPLETED  
**Challenge**: No existing website visit tracking
**Solution**: Implemented custom page visit tracking system
- **New API Endpoint**: `/api/analytics/website-visits` (GET and POST)
- **Database Table**: `page_visits` with session tracking and deduplication
- **Client Component**: `PageVisitTracker.tsx` for automatic tracking
- **Migration**: `migrations/create_page_visits_table.sql`

#### Phase 3: Add Conversion Rate Card ✅ COMPLETED
**New API Endpoint**: `/api/analytics/conversion-rate` 
- Calculate (Privy Sign-ins ÷ Website Visits) × 100
- Return both percentage and raw counts
- Include previous period comparison
- No drill-down needed per requirements

#### Phase 4: Update Analytics Dashboard Layout 🔄 NEXT
**Modify**: `/src/app/analytics/page.tsx`
- Add new top row with 3 cards: Website Visits, Privy Sign-ins, Conversion Rate
- Move existing metrics to second row: Active Users, Power Users, PMF Survey Ready
- Apply time period filter to all cards

### ✅ COMPLETED IMPLEMENTATION

**API Endpoints Ready**:
- ✅ `/api/analytics/privy-signins` - Privy authentication tracking
- ✅ `/api/analytics/website-visits` - Page visit tracking (GET/POST)
- ✅ `/api/analytics/conversion-rate` - Conversion calculation

**Database & Infrastructure**:
- ✅ `page_visits` table migration created
- ✅ Automatic page visit tracking component
- ✅ Session-based deduplication for unique visitors
- ✅ Test email filtering across all endpoints

**Features Implemented**:
- ✅ Time period filtering (24h, 7d, 30d, etc.)
- ✅ Test email exclusion toggle support  
- ✅ Drill-down data for Website Visits and Privy Sign-ins
- ✅ Previous period comparison for conversion rate
- ✅ Consistent error handling and logging
- ✅ Privacy-conscious IP anonymization

### 🔄 REMAINING STEPS

#### Immediate (Ready to Deploy):
1. **Run Database Migration**: Execute `migrations/create_page_visits_table.sql` in Supabase
2. **Add Page Tracking**: Include `PageVisitTracker` component in root layout
3. **Update Analytics Dashboard**: Modify `/src/app/analytics/page.tsx` to show new cards

#### Next Sprint:
4. **UI Testing**: Verify all metrics display correctly with real data
5. **Performance Testing**: Ensure no slowdown with page visit tracking
6. **Documentation**: Update API documentation for new endpoints

### Technical Notes
- **No External Dependencies**: Self-contained solution using existing Supabase infrastructure
- **Privacy-First**: IP addresses anonymized, session-based tracking without cookies
- **Performance Optimized**: Indexes on key columns, efficient deduplication logic
- **Consistent Architecture**: Follows existing patterns for caching, filtering, and error handling

The core functionality is **complete and ready for dashboard integration**! 🚀