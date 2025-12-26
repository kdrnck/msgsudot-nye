# Live Update Plan: /live and /live-edit

## ✅ IMPLEMENTATION COMPLETED

### Files Created/Modified:
- `agents/live_broadcast_migration.sql` - Database migration for live_state, kms_games, leaderboard_entries
- `lib/live-state.ts` - Real-time hooks and helpers for live broadcast system
- `app/live-edit/page.tsx` - Admin control page for broadcast management
- `app/live/page.tsx` - TV display page with CANLI OYUN section
- `components/ui/switch.tsx` - Switch component for leaderboard toggle
- `lib/charades-types.ts` - Added waiting_for_start phase and translations
- `app/sessizsinema/page.tsx` - Updated with manual start/next task controls
- `app/admin/page.tsx` - Added link to /live-edit

### Database Setup Required:
Run the SQL migration in `agents/live_broadcast_migration.sql` in your Supabase dashboard.

---

## Agent TODO List (COMPLETED)

1) ✅ Foundations
- Define data model changes: `live_state`, `kms_games`, `leaderboard_entries` with RLS policies.
- Add realtime channel helpers and typed hooks in `lib/`.

2) ✅ Admin Control Surface (/live-edit)
- Implement admin-only page shell with auth guard.
- Query and list active KMS games with owner nicknames.
- Add "Project to screen" control to set `live_state.broadcast_game_type/id`.
- Add announcement editor bound to `live_state.announcement` with debounced writes.
- Add toggle for `live_state.show_leaderboard`.
- Handle empty state when no active games exist.

3) ✅ TV Page (/live)
- Redesign layout for TV: smaller player joined card, large CANLI OYUN section, side silent leaderboard, and announcement bar.
- Subscribe to `live_state` and reflect changes immediately.
- When KMS is broadcast, subscribe to that game's realtime stream and render 6-slot board + current card.
- Implement skeleton/loading and empty-state.
- Add performance-friendly rendering (debounce updates, avoid reflow).

4) ✅ KMS Live Sync
- Ensure KMS game creation publishes to a discoverable list for `/live-edit`.
- Ensure slot placements and current card updates propagate in realtime.
- Validate mapping between player device actions and `/live` rendering.

5) ✅ Silent Leaderboard
- Implement live leaderboard data read and compact layout.
- Respect `show_leaderboard` toggle.

6) ✅ Announcement Control
- Implement editable announcement from `/live-edit` and realtime display on `/live`.

7) ✅ Sessiz Sinema Flow Changes
- Add manual start/next task buttons to player UI.
- Prevent auto-start on new task or player rotation.
- Ensure round timers and transitions only begin after explicit confirmation.

8) Security & QA (Pending Testing)
- Enforce admin-only writes to `live_state`.
- Write minimal integration tests for realtime behavior and RLS policies.
- Verify TV page stability across screen sizes and network hiccups.

9) Delivery
- Document how to operate `/live-edit` during the event.
- Provide quick recovery/rollback guidance if broadcast fails.
