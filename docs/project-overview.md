# CEO Dashboard - Project Overview

## Architecture Overview

The CEO Dashboard is a Next.js application that provides real-time analytics and error monitoring for the Recoup AI platform. It tracks user activity, conversation metrics, sales pipeline, and error logs through direct Supabase integration.

## Key Components

### Error Logging System
- `/src/lib/supabase/errorLogger.ts`: Direct Supabase error logging helper that bypasses Telegram API limitations for immediate error tracking. Maps ErrorContext to database schema with duplicate prevention.
- `/src/app/api/add-errors-manual/route.ts`: Manual error insertion API for backfilling historical errors
- `/src/app/api/sync-telegram-errors/route.ts`: Enhanced Telegram error sync with comprehensive debugging and support for channels/supergroups
- `/src/app/api/telegram-debug/route.ts`: Comprehensive Telegram bot diagnostic tool with permissions checking and troubleshooting
- `/src/app/api/log-error-direct/route.ts`: Direct error logging API endpoint for external applications
- `/docs/telegram-bot-fix.md`: Documentation about Telegram sync limitations and solutions

### Analytics & Metrics
- `/src/app/api/error-logs/route.ts`: Error log aggregation and analytics API
- `/src/app/api/active-users/route.ts`: Active user tracking and analytics
- `/src/app/api/conversations/route.ts`: Conversation analytics and message counting with account_id and artist_id tracking, enhanced search through message content
- `/src/components/dashboard/ErrorReport.tsx`: Real-time error reporting component
- `/src/components/MetricsChart.tsx`: General-purpose metrics visualization component
- `/src/components/ConversationList.tsx`: Enhanced conversation management cards displaying account_id and artist_id for better room identification

### Sales Pipeline
- `/src/components/pipeline/PipelineBoard.tsx`: Main sales pipeline visualization
- `/src/components/pipeline/CustomerCard.tsx`: Individual customer card component
- `/src/context/PipelineContext.tsx`: Pipeline state management
- `/src/hooks/useSalesPipelineMRR.ts`: MRR calculations for pipeline customers

### Database Integration
- `/src/lib/supabase.ts`: Supabase client configuration
- `/supabase/migrations/001_create_error_logs_table.sql`: Error logs table schema
- `/migrations/001_create_tables.sql`: Main application tables

## Error Logging Flow

### Automatic Logging (Recommended)
1. **Recoup App** → `sendErrorNotification()` → **CEO Dashboard Supabase**
2. Direct database insertion with `logErrorToSupabase()` helper
3. Immediate tracking without Telegram API limitations
4. Duplicate prevention and proper error categorization

### Manual/Fallback Options
1. **Telegram Sync**: `/api/sync-telegram-errors` (limited by Telegram API)
2. **Manual Addition**: `/api/add-errors-manual` for historical data
3. **Direct API**: `/api/log-error-direct` for external integrations

## Integration Guide

### For Recoup App Integration
1. Install the `errorLogger.ts` helper in your Recoup app
2. Add CEO Dashboard Supabase credentials to environment variables
3. Update existing error notification calls to use dual logging
4. Errors will immediately appear in CEO Dashboard analytics

### Environment Variables Required
```bash
# In Recoup App
CEO_DASHBOARD_SUPABASE_URL=your_ceo_dashboard_url
CEO_DASHBOARD_SUPABASE_ANON_KEY=your_ceo_dashboard_key

# In CEO Dashboard
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

## Key Features

### Real-time Error Tracking
- Immediate error logging to dashboard
- Tool-specific error categorization
- User email and room ID tracking
- Stack trace preservation
- Duplicate prevention

### Analytics Dashboard
- Error rate calculations
- Tool failure analysis
- User activity metrics
- Conversation analytics
- Sales pipeline MRR tracking

### Responsive Design
- Mobile-friendly pipeline views
- Adaptive customer cards
- Responsive metrics charts
- Touch-friendly interfaces

## Recent Improvements (Sidney/ErrorFix3)

### Error Logging Enhancements
- ✅ Direct Supabase logging to bypass Telegram limitations
- ✅ Enhanced duplicate prevention
- ✅ Comprehensive error categorization
- ✅ Improved debugging and diagnostics
- ✅ Fallback mechanisms for reliability

### Infrastructure
- ✅ Enhanced Telegram webhook support
- ✅ Comprehensive error parsing
- ✅ Manual error addition capabilities
- ✅ Detailed logging and monitoring

### Conversation Management
- ✅ Enhanced conversation cards with account_id and artist_id display
- ✅ Improved room identification for easier debugging and user tracking
- ✅ Updated API responses to include account_id information
- ✅ Advanced search functionality that searches through user message content in addition to emails, topics, and artist names

## File Structure

```
src/
├── app/
│   ├── api/                    # API endpoints
│   ├── analytics/             # Analytics pages
│   ├── conversations/         # Conversation management
│   └── sales-pipeline/        # Sales pipeline interface
├── components/
│   ├── dashboard/             # Dashboard-specific components
│   ├── pipeline/              # Pipeline components
│   └── ui/                    # Reusable UI components
├── lib/
│   ├── supabase/              # Supabase utilities
│   └── utils.ts               # General utilities
└── types/                     # TypeScript type definitions
```



