# Refactor Plan: Modularize `src/app/conversations/page.tsx`

## Goal
Break down the large `page.tsx` file into smaller, reusable, and maintainable modules (components, hooks, and utilities) without breaking existing functionality.

---

## Step-by-Step Checklist

### 1. Preparation
- [ ] Review and list all major UI sections and logic blocks in `page.tsx`.
- [ ] Identify repeated UI patterns and logic for DRY opportunities.

### 2. Extract Utility Functions and Types
- [ ] Move helper functions (e.g., `getDateRangeForFilter`, `getUserTypeBadge`, `getProfileCompleteness`) to `lib/utils.ts`.
    - [ ] **Verification:** Run the app and check that all features using these helpers still work (e.g., date filters, user badges, profile completeness).
- [ ] Move all TypeScript interfaces and types to `lib/types.ts`.
    - [ ] **Verification:** Ensure there are no TypeScript errors and the app compiles successfully.

### 3. Extract Reusable UI Components
- [ ] Create `components/CustomTooltip.tsx` and move the tooltip logic there.
    - [ ] **Verification:** Hover over tooltips in the UI and confirm they display correctly.
- [ ] Create `components/Switch.tsx` for the custom switch.
    - [ ] **Verification:** Toggle switches in the UI and confirm state changes as expected.
- [ ] Create a generic `components/Modal.tsx` for modals (Test Email, Annotation).
    - [ ] **Verification:** Open and close modals, and check that their content and actions work as before.

### 4. Extract Major Page Sections as Components
- [ ] Create `components/MetricCard.tsx` for analytics cards (Active Users, Power Users, PMF Survey Ready).
    - [ ] **Verification:** Confirm all metric cards render and update correctly.
- [ ] Create `components/Leaderboard.tsx` for the leaderboard list and user rows.
    - [ ] **Verification:** Check leaderboard sorting, filtering, and user expansion all work.
- [ ] Create `components/UserAnalysisCard.tsx` for the expanded user analysis section.
    - [ ] **Verification:** Expand user analysis and confirm AI analysis and activity details display correctly.
- [ ] Create `components/ProfileEditor.tsx` for editing and displaying user profiles.
    - [ ] **Verification:** Edit and save user profiles, and confirm changes persist and display.
- [ ] Create `components/ConversationList.tsx` for the conversation list.
    - [ ] **Verification:** Browse and paginate conversations, and confirm the list updates as expected.
- [ ] Create `components/ConversationDetail.tsx` for the conversation detail view.
    - [ ] **Verification:** Select a conversation and confirm details load and display correctly.

### 5. Extract Data Fetching and State Logic into Custom Hooks
- [ ] Create `hooks/useConversations.ts` for conversation fetching and pagination.
    - [ ] **Verification:** Confirm conversations load, paginate, and filter as before.
- [ ] Create `hooks/useLeaderboard.ts` for leaderboard data and filters.
    - [ ] **Verification:** Check leaderboard data updates with filters and sorting.
- [ ] Create `hooks/useUserProfile.ts` for user profile loading and saving.
    - [ ] **Verification:** Load, edit, and save user profiles without errors.
- [ ] Create `hooks/useUserAnalysis.ts` for AI analysis logic.
    - [ ] **Verification:** Run AI analysis and confirm results display for users.
- [ ] Create `hooks/useTestEmails.ts` for test email management.
    - [ ] **Verification:** Add, remove, and list test emails, and confirm exclusion logic works.
- [ ] Create `hooks/useChartData.ts` for chart and annotation data.
    - [ ] **Verification:** Load and display chart data and annotations as before.

### 6. Refactor `page.tsx` to Use New Modules
- [ ] Replace inlined logic and UI with imports from new components and hooks.
- [ ] Ensure all props and state are passed correctly.
- [ ] **Verification:** Run the app and manually test all major features (cards, leaderboard, user analysis, conversations, modals, etc.) to confirm nothing is broken.
- [ ] Test after each extraction to confirm nothing breaks.

### 7. Final Cleanup
- [ ] Remove unused code from `page.tsx`.
- [ ] Add comments and documentation to new modules.
- [ ] Run a full test of the page to ensure all features work as before.
    - [ ] **Verification:** Do a final walkthrough of the UI, checking all user flows and edge cases.

---

## Notes
- Refactor incrementally: test after each step.
- Keep all extracted code in the same repo for easy tracking.
- Prioritize extracting the most repeated or complex sections first.
- Use TypeScript for all new files for type safety.
