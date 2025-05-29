# CEO Dashboard: Comprehensive Technical Breakdown

## 0. Application Overview
The CEO Dashboard is a Next.js application designed to provide key business insights through various data visualizations and management tools. It features a main dashboard with financial and sales pipeline metrics, a detailed conversations browser, and administrative tools for managing underlying database structures. The application heavily utilizes Supabase for its backend database, data storage, and potentially authentication, with a robust service layer in `src/lib/` for interacting with data and managing business logic. It is built with TypeScript and uses Tailwind CSS for styling.

**Key Technologies & Patterns:**
- Next.js (App Router)
- React (with Hooks for state management)
- TypeScript
- Supabase (Database, Storage, potentially Auth, RPC functions)
- Tailwind CSS
- Client-side components (`"use client"`) for interactive UIs
- Server-side data fetching (e.g., in `src/app/page.tsx`)
- API Routes (in `src/app/api/`)
- Environment variables for configuration
- Utility functions for common tasks (formatting, calculations)
- Mock data for development and fallbacks
- Programmatic database schema management for some features

**Core Application Structure (`src/`):**
- `app/`: Contains pages, layouts, and API routes.
  - `page.tsx`: Main dashboard page.
  - `layout.tsx`: Root layout for the entire application.
  - `conversations/`: Feature for browsing and managing conversations.
  - `sales-pipeline/`: (Redirects to main dashboard) Formerly a separate page for sales pipeline.
  - `pipeline-admin/`: Admin page for managing the sales pipeline database table.
  - `api/`: Houses all backend API endpoints.
    - `chart-data/`: API for chart visualizations.
    - `conversations/`: API for conversation data and leaderboard.
    - `customers/`: API for customer data (e.g., updates).
    - `test-emails/`: API for managing test email lists.
    - `metrics/`, `test-connections/`, `add-customer/`: Other API endpoints.
- `components/`: Reusable UI components (e.g., Navigation, ConnectionStatus, Charts).
- `lib/`: Core logic, services, utility functions.
  - `supabase.ts`: Supabase client initialization and utility functions.
  - `conversationService.ts`: Service for conversation data.
  - `customerService.ts`: Service for sales pipeline customer data.
  - `databaseFunctions.ts`: Functions for managing database schema (e.g., sales pipeline table).
  - `utils.ts`: General utility functions.
  - `finance.ts`: Functions related to financial data.
  - `mockConversationData.ts`, `mockPipelineData.ts`: Mock data sources.
- `context/`: React Context API implementations (e.g., `PipelineProvider`, `RevenueDisplayProvider`).
- `hooks/`: Custom React Hooks.
- `types/`: TypeScript type definitions.

---

## 1. Main Dashboard (`src/app/page.tsx`)
The main dashboard page serves as the central hub for viewing key performance indicators.

### A. Functionality & Features
- **Dynamic Rendering**: Uses `export const dynamic = 'force-dynamic';` to ensure data is always fresh on each request.
- **Financial Metrics**:
  - Fetches monthly financial data via `getMonthlyFinancials()` from `src/lib/finance.ts`.
  - Displays MRR (Monthly Recurring Revenue) metrics through `MRRMetricsProvider`.
  - Displays other financial metrics (development cost, operational cost, net profit) via `FinancialMetricsProvider`.
  - Net profit calculation incorporates data from the Sales Pipeline.
- **Sales Pipeline Overview**:
  - Integrates and displays the sales pipeline directly on the dashboard using `PipelineProvider` and `ResponsivePipelineBoard`.
- **Connection Status**: Shows the status of backend connections using the `ConnectionStatus` component.

### B. Key Components Used
- `ConnectionStatus`: Displays backend connection status.
- `FinancialMetricsProvider`: Renders financial metrics.
- `PipelineProvider`: Provides context for sales pipeline data.
- `ResponsivePipelineBoard`: Renders the sales pipeline view.
- `MRRMetricsProvider`: Renders MRR specific metrics.
- `RevenueDisplayProvider`: Manages revenue data display context.

### C. Data Flow
- Fetches initial financial data server-side.
- Pipeline data is managed through `PipelineProvider` and likely fetched within its context or components.
- The page structure suggests a top-down flow of data, with providers making data available to their child components.

---

## 2. Sales Pipeline Feature
The Sales Pipeline functionality is integrated into the main dashboard and managed through various services and database functions.

### A. Data Model & Storage (`Customer` Interface in `customerService.ts`)
- Customer data is comprehensive, including:
  - Basic info: `name`, `type`, `stage`, `priority`, `probability`.
  - Financials: `current_artists`, `potential_artists`, `current_mrr`, `potential_mrr`, `weighted_mrr` (auto-calculated in DB).
  - Time tracking: `expected_close_date`, `stage_entered_at`, `days_in_stage` (auto-calculated in DB).
  - Activity: `last_contact_date`, `activity_count`, `next_activity_type/date` (some auto-updated by DB triggers).
  - Contact/Company details, Deal info, Notes, Todos.
  - `contacts`, `stage_history`, `todos`, `custom_fields`, `external_ids` are stored as JSONB in Supabase.
- Data is stored in the `sales_pipeline_customers` table in Supabase.

### B. Core Logic (`src/lib/customerService.ts`)
- **CRUD Operations**: Provides functions to `fetchCustomers`, `createCustomer`, `updateCustomer`, `deleteCustomer`.
- **`updateCustomer` Logic**:
  - Primarily attempts to update via a backend API: `/api/customers/update`.
  - **Offline/Fallback**: Includes a fallback to update customer data in `localStorage` if the API is unavailable or fails, providing resilience.
- **Data Transformation**: `rowToCustomer` and `customerToRow` functions handle conversion between the database row format (with JSON strings) and the application's `Customer` object model.
- **Specialized Updates**: `updateCustomerStage`, `updateCustomerOrder`.

### C. Database Schema & Management (`src/lib/databaseFunctions.ts`)
- **Programmatic Schema Creation**:
  - `createSalesPipelineTableFunction()`: Defines a SQL function in Supabase (`create_sales_pipeline_table`) that creates the `sales_pipeline_customers` table if it doesn't exist.
  - This SQL includes table columns, generated columns (`weighted_mrr`), and several **database triggers** for:
    - `update_days_in_stage()`: Auto-calculates days in the current stage.
    - `update_modified_column()`: Auto-updates `updated_at` timestamp.
    - `update_activity_tracking()`: Auto-updates activity-related fields (`last_activity_date`, `activity_count`, `stage_entered_at` on stage change).
- **Row Level Security (RLS)**:
  - RLS is enabled on `sales_pipeline_customers`.
  - An initial, permissive policy `"Allow all operations for authenticated users"` is set up.
- **Execution**:
  - `executeSalesPipelineTableCreation()`: Calls the SQL function to create the table.
  - `checkSalesPipelineTableExists()`: Checks if the table exists.
- These functions are used by the `PipelineAdminPage`.

### D. Admin Page (`src/app/pipeline-admin/page.tsx`)
- Provides a UI for administrators to:
  - Check if the `sales_pipeline_customers` table exists.
  - Create the table (by executing the functions from `databaseFunctions.ts`) if it doesn't.
- Serves as a setup and troubleshooting tool for the sales pipeline's database dependency.
- The `/sales-pipeline` page itself now redirects to the main dashboard, as the pipeline is displayed there.

---

## 3. Supabase Integration (`src/lib/supabase.ts`)
Supabase is used as the primary backend for database storage, and potentially authentication and file storage.

### A. Client Initialization
- **Primary Client (`supabase`)**:
  - Initialized with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Configured for session persistence and token auto-refresh.
  - Includes an `apikey` header in requests, potentially for bypassing RLS under specific configurations.
- **Admin Client (`supabaseAdmin`)**:
  - Intended for server-side use with `SUPABASE_SERVICE_ROLE_KEY` for admin privileges (bypasses RLS).
  - Safely falls back to the non-admin client if attempted to be used on the client-side.

### B. Utility Functions
- `getSalesPipelineValue()`: Calculates total potential revenue from the sales pipeline (excluding closed deals).
- `uploadCustomerLogo(file)`: Uploads customer logos to Supabase Storage in the `customer_logos` public bucket. Includes logic to create the bucket if it doesn't exist.
- `checkSupabaseConnection()`: Performs a health check on the Supabase connection.
- Type definitions for `CustomerRow` (matching `sales_pipeline_customers` table) and `SalesPipelineItem`.

---

## 4. Core Application Layout & Utilities

### A. Root Layout (`src/app/layout.tsx`)
- Defines the overall HTML structure, sets "Founder Admin" as the title.
- Imports global CSS and the "Inter" font.
- **Key Components**:
  - `PipelineProvider`: Wraps the *entire application*, making pipeline context globally available.
  - `Navigation`: Renders the main navigation bar.
  - `AutoRefresh`: Refreshes data application-wide every 2 minutes.
  - `StorageInitializer`: Likely initializes some data in browser storage on load.

### B. General Utilities (`src/lib/utils.ts`)
- `cn()`: Merges Tailwind CSS classes.
- Formatting functions: `formatCurrency`, `formatDate`, `formatPercent`.
- Calculation functions: `calculatePercentage`, `calculatePercentChange`.
- Text manipulation: `truncateText`.
- ID generation: `generateId()`.
- The `isNotTestEmail` function (critical for conversation filtering) is located in `src/lib/conversationService.ts`, not in the general `utils.ts`.

---

## 5. Conversations Tab: Deep Dive & Technical Breakdown

## 1. Overview
The **Conversations** tab is a feature-rich page in the CEO Dashboard app that allows users to view, search, filter, and export user conversations (chats) between users and the assistant. It is implemented as a Next.js page at `src/app/conversations/page.tsx` and interacts with both backend APIs and mock data for development/testing.

---

## 2. Data Flow & Architecture

### A. Data Models
- **ConversationListItem**: Represents a summary of a conversation (room), including room ID, account email, artist, topic, timestamps, and test account status.
- **ConversationDetail**: Represents the full details of a conversation, including all messages, account info, artist info, and topic.
- **Message**: Each message in a conversation, with sender role (user/assistant), content, and timestamp.

### B. Data Fetching
- **conversationService** (in `src/lib/conversationService.ts`):
  - `getConversationList(filters)`: Fetches a list of conversations from the API (or mock data if in dev/fallback mode). Supports filtering by search query, test emails, and time range.
  - `getConversationDetail(roomId)`: Fetches all messages and details for a specific conversation.
  - **Fallbacks**: If the API fails, the service falls back to mock data from `src/lib/mockConversationData.ts`.

- **Test Emails**: Managed via `/api/test-emails` endpoints and stored in Supabase or localStorage as a fallback. Used to filter out internal/test conversations.

---

## 3. UI Structure (src/app/conversations/page.tsx)

### A. State Management
- Uses React `useState` and `useEffect` for:
  - Selected conversation (room)
  - Search query
  - Exclude test emails toggle
  - Time filter (All Time, Last 30/7/90 Days)
  - Test email popup state and management
  - Loading and error states
  - Fetched conversations and details

### B. Layout
- **Left Panel (Conversation List):**
  - Search bar for email/artist
  - Time filter dropdown
  - Exclude test emails toggle (with gear icon to manage test emails)
  - List of conversations (shows email, artist, topic, created/last message date)
  - Export all conversations to CSV (fetches all details for export)

- **Right Panel (Conversation Detail):**
  - Shows details for the selected conversation:
    - Account email, artist, topic, account name
    - All messages in the conversation (chat format)
    - Each message shows sender, content (Markdown or sanitized HTML), timestamp
    - Assistant messages can include a collapsible "reasoning" section
    - Export current conversation to JSON

### C. Test Email Management
- Popup modal to add/remove test emails
- Test emails are used to filter out conversations from the main list
- Emails are stored in Supabase or localStorage

---

## 4. Filtering & Search Logic
- **Search Query**: Filters conversations by account email or artist name/reference.
- **Time Filter**: Filters conversations by creation or last message date (All Time, Last 30/7/90 Days).
- **Exclude Test Emails**: Removes conversations where the account email is in the test email list, contains `@example.com`, or contains a `+` (common in test emails).

---

## 5. Export Features
- **Export All to CSV**:
  - Fetches details for all filtered conversations.
  - Exports room ID, account info, artist, topic, timestamps, message count, and the full conversation (all messages, formatted as text).
  - Triggers a CSV file download in the browser.
- **Export Conversation to JSON**:
  - Exports the currently selected conversation (all details and messages) as a JSON file.

---

## 6. Message Rendering & Security
- Messages are rendered as Markdown (using `ReactMarkdown`) or sanitized HTML (using `DOMPurify` and `html-react-parser`).
- This prevents XSS attacks and ensures safe display of user-generated content.
- Assistant messages can include a "reasoning" field, which is shown in a collapsible `<details>` element.

---

## 7. Error Handling & Fallbacks
- If API calls fail, the UI displays error messages and falls back to mock data where possible.
- Test emails are also stored in localStorage as a backup if Supabase is unavailable.

---

## 8. Extensibility & Best Practices
- **Componentization**: The page could be further broken down into smaller components for maintainability.
- **Testing**: No tests are present; adding unit/integration tests would improve reliability.
- **Performance**: Exporting all conversations fetches details for each room, which could be slow for large datasets.
- **Accessibility**: Some ARIA labels are present, but more could be added for full accessibility.

---

## 9. Key Files & References
- `src/app/conversations/page.tsx`: Main UI and logic for the conversations tab.
- `src/lib/conversationService.ts`: Data fetching, filtering, and mock data fallback logic.
- `src/lib/mockConversationData.ts`: Mock data for development/testing.
- `src/components/ui/`: Contains reusable UI components (modals, buttons, etc.) used in the tab.

---

## 10. Summary
The Conversations tab is a robust, user-friendly feature for viewing, filtering, and exporting user/assistant conversations. It is designed with resilience (mock data fallback), security (sanitization), and extensibility in mind. Understanding its data flow, UI structure, and filtering logic will help you confidently extend or modify this feature.

---

## 11. Deep Technical Walkthrough: Conversations Tab

### A. React Component Lifecycle & Data Flow

#### 1. Initial Render
- When the user navigates to `/conversations`, the `ConversationsPage` component mounts.
- **State Initialization:**
  - `selectedConversation`: null (no conversation selected)
  - `searchQuery`, `excludeTestEmails`, `timeFilter`: default filter values
  - `testEmails`: fetched from API/localStorage
  - `conversations`, `conversationDetail`: empty
  - `loading`, `error`: set as needed

#### 2. Data Fetching (useEffect)
- **Conversations List:**
  - On mount and whenever `searchQuery`, `excludeTestEmails`, or `timeFilter` change, `getConversationList(filters)` is called.
  - Filters are passed as an object: `{ searchQuery, excludeTestEmails, timeFilter }`.
  - The service builds a query string and fetches `/api/conversations?...`.
  - If the API fails, it falls back to `getMockConversationList`.
  - The result is set in `conversations` state.

- **Conversation Detail:**
  - When `selectedConversation` changes, `getConversationDetail(roomId)` is called.
  - Fetches `/api/conversations/{roomId}` or mock data.
  - Sets `conversationDetail` state.

- **Test Emails:**
  - On mount and when the test email popup is opened, `fetchTestEmails()` is called.
  - Tries `/api/test-emails` (GET). If it fails, falls back to localStorage.

#### 3. User Interactions
- **Selecting a Conversation:**
  - Sets `selectedConversation`, triggers detail fetch.
- **Search/Filter:**
  - Updates state, triggers list fetch.
- **Export All to CSV:**
  - Fetches details for all filtered conversations (calls `getConversationDetail` for each room).
  - Builds CSV rows and triggers a download.
- **Export JSON:**
  - Serializes `conversationDetail` and triggers a download.
- **Test Email Management:**
  - Add: POST to `/api/test-emails`, update state/localStorage.
  - Remove: DELETE to `/api/test-emails`, update state/localStorage.

---

### B. Filtering & Export Logic (Code References)

- **Filtering:**
  - `getConversationList(filters)` in `conversationService.ts` builds a query string:
    - `search` for search query
    - `excludeTest` for test emails
    - `timeFilter` for time range
  - The API endpoint `/api/conversations` is expected to handle these filters server-side.
  - If the API fails, the same filters are applied to mock data in JS.

- **Export All to CSV:**
  - In `page.tsx`, the export button triggers an async function:
    - Loops over `filteredConversations`, calls `getConversationDetail` for each.
    - Builds a CSV with headers and rows for each conversation, including all messages (flattened as text).
    - Uses `Blob` and `URL.createObjectURL` to trigger a file download.

- **Export JSON:**
  - Serializes the current `conversationDetail` to JSON and triggers a download.

---

### C. Test Email Management (Under the Hood)
- **Fetching:**
  - Tries `/api/test-emails` (GET). If it fails, loads from localStorage (`testEmails`).
- **Adding:**
  - POSTs to `/api/test-emails` with `{ email }`.
  - On failure, adds to localStorage.
- **Removing:**
  - DELETEs `/api/test-emails?email=...`.
  - On failure, removes from localStorage.
- **Filtering:**
  - When `excludeTestEmails` is true, conversations are filtered out if:
    - The account email is in the test email list
    - The email contains `@example.com` or a `+`

---

### D. Security in Message Rendering
- **HTML Content:**
  - If a message contains `<` and `</`, it is treated as HTML.
  - Uses `DOMPurify.sanitize` to clean the HTML, then renders with `html-react-parser`.
- **Markdown Content:**
  - Otherwise, uses `ReactMarkdown` to render safe Markdown.
- **Why?**
  - Prevents XSS (cross-site scripting) attacks from user-generated content.

---

### E. Error & Loading State Handling
- **Loading:**
  - `loading` state is set true during fetches, disables buttons, and shows loading text.
- **Error:**
  - If fetch fails, `error` state is set and displayed in the UI.
  - For test emails, also falls back to localStorage.
- **Fallbacks:**
  - If API fails, mock data is used for both conversations and test emails.

---

### F. Opportunities for Refactoring & Extension
- **Componentization:**
  - The main page could be split into smaller components: ConversationList, ConversationDetail, TestEmailManager, etc.
- **Pagination:**
  - For large datasets, add pagination or infinite scroll to avoid loading all conversations at once.
- **Batch API:**
  - Exporting all conversations could be optimized with a batch API endpoint.
- **Testing:**
  - Add unit and integration tests for data fetching, filtering, and export logic.
- **Accessibility:**
  - Add ARIA roles, keyboard navigation, and screen reader support.
- **Advanced Filtering:**
  - Add filters for message content, assistant/user only, or by artist/topic.
- **Real-Time Updates:**
  - Use websockets or polling to update the conversation list in real time.

---

## 12. Data Flow Diagram (Textual)

1. **User loads /conversations**
2. `useEffect` triggers `getConversationList(filters)`
3. API returns data (or mock data is used)
4. User selects a conversation
5. `getConversationDetail(roomId)` fetches messages
6. User can search, filter, or export data
7. Test emails are managed via API/localStorage
8. All data is rendered with security in mind (sanitization/Markdown)

---

*This section provides a step-by-step, code-referenced, and security-aware deep dive into the conversations tab. Use it to guide advanced development, debugging, or refactoring efforts!*
