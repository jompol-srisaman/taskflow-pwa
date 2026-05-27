# Progress Report: Eisenhower Matrix Implementation & Connection Restore

## Status: Operational (Local Build Passed)
Everything has been migrated to the **Eisenhower Matrix** (Urgent vs Important) system. The project builds successfully (`npm run build`).

## What has been completed
1.  **Architecture Migration:**
    - Cleaned up all Supabase references (deleted `supabase/`, `lib/supabase`, etc.).
    - Updated `Task` type and database headers in `lib/sheets.ts` to `is_urgent` and `is_important`.
    - Implemented `getEisenhowerLabel` in `lib/utils.ts` for consistent UI/Calendar color-coding.
2.  **API & Infrastructure:**
    - Created `app/api/mcp/route.ts` to expose MCP endpoints (`mcpListTasks`, `mcpAddTask`).
    - Enhanced error diagnostics in `app/actions/calendar.ts` and `app/(app)/settings/page.tsx` to explicitly report "Token Expired" errors to the UI.
3.  **UI Updates:**
    - Updated `TaskModal.tsx` (switched priority dropdown to checkboxes for Urgent/Important).
    - Updated `TaskCard.tsx` (switched labels to Eisenhower matrix).
    - Updated `Dashboard` (added 4-quadrant grid visualization).
    - Fixed TypeScript errors in `calendar/page.tsx` and `history/page.tsx`.

## Current Blockers & Pending Tasks
1.  **Token Refresh Required:** The app currently fails with `invalid_grant` in production because the Google Refresh Token expired.
    - **Instruction for Claude:** Instruct the user to run `node scripts/get-token.js` and paste the new `GOOGLE_REFRESH_TOKEN` into `.env.local`.
2.  **Google Sheet Schema Update:** The user needs to manually update their Google Sheet:
    - Rename column `priority` to `is_urgent`.
    - Add a new column `is_important` (before `status`).
    - Values should be `true` or `false`.
3.  **Deployment:** Once the token and sheet are updated, deploy to Vercel and ensure environment variables (`.env.local` contents) are set in the Vercel Dashboard.

## MCP Usage
The MCP bridge (`/api/mcp`) is ready for external interaction. 
- GET: `/api/mcp` (List tasks)
- POST: `/api/mcp` (Add task: `{ "title": "...", "urgent": true, "important": false }`)
