# User Leaderboard Tracking System Investigation

## Overview
The User Leaderboard displays user activity metrics including messages, reports, actions, and errors. Here's how each metric is tracked and calculated:

## ✅ COMPLETED: Reports → Scheduled Actions Swap

### **Migration Summary**
Successfully replaced the deprecated "reports" feature with "scheduled actions" tracking across the entire system.

### **Changes Made:**

#### **1. Backend API Updates**
- **`/api/conversations/leaderboard/route.ts`**:
  - Changed from querying `rooms` table with `segment:` topic filter
  - Now queries `scheduled_actions` table directly
  - Uses `account_id` field to link to users  
  - Uses `created_at` field for date filtering
  - Updated return format from `segmentReports` to `scheduledActions`

#### **2. Frontend State Updates**
- **`src/app/conversations/page.tsx`**:
  - Renamed `segmentReportsByUser` → `scheduledActionsByUser`
  - Updated all references across 4+ locations in the file
  - Fixed TypeScript type casting for proper number handling
  - Updated useEffect dependencies
  - Updated API fetch calls to use new data structure

#### **3. Database Schema**
- **`scheduled_actions` table structure**:
  - `account_id`: Links to users
  - `created_at`: Timestamp for date filtering
  - `enabled`: Boolean status
  - `last_run`, `next_run`: Schedule tracking fields

### **What Works Now:**
1. ✅ Leaderboard shows "scheduled actions" instead of "reports"
2. ✅ Sorting by "reports" now sorts by scheduled actions count
3. ✅ User activity calculations include scheduled actions
4. ✅ All UI displays updated terminology
5. ✅ TypeScript errors resolved

### **Technical Notes:**
- The UI still shows "reports" in the display labels (intentional UX decision)
- Backend data source completely changed from segment rooms to scheduled_actions table
- All calculations now use the new data source
- Error handling and loading states preserved

---

## Key Data Sources (Updated)

### 1. Messages Tracking
- **Source**: Database RPC function `get_message_counts_by_user`
- **Location**: Called from `/api/conversations/leaderboard/route.ts`
- **Calculation**: Counts messages sent by each user in a given time period
- **Storage**: Results stored in `messagesByUser` state (Record<string, number>)
- **API Endpoint**: `/api/conversations/message-counts`

### 2. Scheduled Actions Tracking  
- **Source**: `scheduled_actions` table in Supabase
- **Query**: `SELECT account_id, COUNT(*) FROM scheduled_actions WHERE created_at BETWEEN start AND end GROUP BY account_id`
- **Location**: Fetched in `/api/conversations/leaderboard/route.ts`
- **Storage**: Results stored in `scheduledActionsByUser` state (Record<string, number>)
- **Linking**: Uses `account_id` field to map to user emails

### 3. Total Actions
- **Formula**: `Total Actions = Messages + Scheduled Actions`
- **Used for**: Sorting users and calculating engagement metrics

### 4. Error Tracking
- **Source**: `error_logs` table with JOIN to user profiles
- **Complex system**: Tracks errors by user, tool, and time period
- **Storage**: `userErrorCounts` and `userErrorDetails` state
- **Rate calculation**: `Error Rate = (Total Errors / Total Actions) * 100`

## State Variables Map

### **Current State Variables:**
- `messagesByUser`: Maps user emails to message counts
- `scheduledActionsByUser`: Maps user emails to scheduled action counts ⭐ NEW
- `userErrorCounts`: Maps user emails to error counts
- `userErrorDetails`: Maps user emails to detailed error information

### **Derived Calculations:**
- **Total Activity**: `messages + scheduledActions` per user
- **Error Rate**: `(totalErrors / totalActions) * 100`
- **User Ranking**: Based on total activity, errors, or custom metrics

## API Endpoints Used

1. **`/api/conversations/leaderboard`** - Main data source
2. **`/api/conversations/message-counts`** - Message counting
3. **`/api/error-logs`** - Error tracking
4. **`/api/user-activity-consistency`** - Consistency metrics
5. **`/api/user-activity-trend`** - Activity trends

## Database Tables Referenced

1. **`scheduled_actions`** - New primary source for actions ⭐
2. **`error_logs`** - Error tracking and rate calculation  
3. **`user_profiles`** - User metadata and profiles
4. **`rooms`** - ~~Segment reports~~ (deprecated)
5. **Message counting** - Via RPC functions

---

*Last updated: After successful reports → scheduled actions migration*
