# Charades / Silent Cinema Game - Implementation Documentation

## Overview

A real-time multiplayer charades game built with Next.js, TypeScript, and Supabase Realtime. The game supports multiple players with one player acting as narrator per turn while others guess.

## Architecture

### State Machine

The game uses an explicit state machine with the following phases:

```
waiting → playing ⟷ time_up → playing → ... → finished
                ↓
              reveal → playing
                ↓
            canceled (if host disbands)
```

**Phases:**
- `waiting` - Lobby is open, players can join
- `playing` - Active gameplay, narrator is acting out the word
- `time_up` - Timer expired, waiting for narrator to press "Continue"
- `reveal` - Showing the correct answer after a guess (4 second intermission)
- `finished` - Game completed normally
- `canceled` - Game was disbanded by host

### Who Can Do What

| Action | Who Can Perform |
|--------|-----------------|
| Start Game | Host only (when ≥2 players) |
| Confirm Correct Guess | Narrator only |
| Skip Word | Narrator only |
| Continue after Time Up | Narrator only |
| Disband Lobby | Host only |
| Leave Game | Any non-host player |

### Turn Order & Task Distribution

**Key Rule:** Each player narrates their assigned number of tasks **consecutively**.

Example with 3 players and 2 tasks per player:
```
Player A → Task 1, Task 2
Player B → Task 3, Task 4  
Player C → Task 5, Task 6
```

The player order is randomized once at game start, but tasks are assigned in blocks.

### Data Model

**GameState** (stored in `charades_lobbies.current_game_state`):
```typescript
{
  phase: 'waiting' | 'playing' | 'time_up' | 'reveal' | 'finished' | 'canceled',
  playerOrder: string[],           // Randomized once at start
  tasksPerPlayer: number,
  roundDurationSec: number,
  turn: {
    narratorId: string,
    narratorIndex: number,         // Index in playerOrder
    wordIndexInBlock: number,      // 0..tasksPerPlayer-1
    globalTurnIndex: number,       // Overall progress
    taskId: string,
    taskContent: string,
  },
  taskQueue: Turn[],               // All tasks for the game
  timer: {
    startedAtMs: number | null,
    durationSec: number,
    pausedAtMs: number | null,
  },
  reveal?: {                       // Only during reveal phase
    taskContent: string,
    correctPlayerId: string,
    correctPlayerName: string,
    endsAtMs: number,
  },
  version: number,                 // For optimistic concurrency
  lastActionAt: number,
  lastActionBy: string,
}
```

## Realtime Architecture

### Subscriptions

1. **Lobby Updates** - Subscribe to `charades_lobbies` UPDATE events for the specific lobby ID
2. **Player Changes** - Subscribe to `charades_lobby_players` INSERT/UPDATE/DELETE events
3. **Lobby Deletion** - Subscribe to `charades_lobbies` DELETE events

### Anti-Race Conditions

**Narrator-Authoritative Approach:**
- Only the current narrator triggers state transitions
- `transitioningRef` prevents double-triggers from timer intervals
- `version` field in GameState enables optimistic concurrency control

### Watchdog / Fallback Polling

Every 4 seconds, clients verify:
1. Lobby still exists in database
2. Lobby hasn't been canceled
3. If either fails → show toast → redirect to `/home`

Additional polling every 3 seconds for player list during waiting state.

## UX Features

### Toast Notifications (No `alert()`)
- Modern, non-blocking notifications
- Variants: success (green), error (red), info (blue)
- Auto-dismiss after 3 seconds

### Confirmation Dialogs
- Disband Lobby: Confirms with host before removing all players
- Leave Game: Confirms before player exits mid-game

### Phase-Specific UI

**Time Up Overlay:**
- Full-screen overlay with clock icon
- Narrator sees "Continue" button
- Others see "Waiting for narrator..."

**Reveal Overlay:**
- Shows correct word and who guessed it
- 4-second animation before auto-advancing

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Narrator disconnects mid-turn | Watchdog detects, other clients redirect |
| Host disbands during game | All clients get toast + redirect |
| Realtime subscription fails | Toast shown, fallback polling continues |
| Double-click on actions | `transitioningRef` prevents duplicate DB writes |
| Player leaves mid-game | Removed from `charades_lobby_players`, game continues |

## Files

- `app/sessizsinema/page.tsx` - Main game component
- `lib/charades-types.ts` - Type definitions and helper functions

---

## Test Plan (Manual)

### 1. Lobby Creation & Joining
- [ ] Create lobby → shows 6-digit code
- [ ] Second player joins with code → both see player list update
- [ ] Third player joins → all three see updated list
- [ ] Non-host sees "Leave Lobby" button
- [ ] Host sees "Start Game" + "Disband Lobby"

### 2. Game Start
- [ ] Host clicks Start with <2 players → button disabled
- [ ] Host clicks Start with ≥2 players → game begins
- [ ] All clients transition to playing phase simultaneously
- [ ] First narrator sees their word
- [ ] Others see narrator name + countdown

### 3. Correct Guess Flow
- [ ] Narrator clicks player name who guessed → reveal overlay
- [ ] Reveal shows word + guesser name for 4 seconds
- [ ] Guesser's score increments by 1
- [ ] Auto-advances to next turn after reveal

### 4. Time Up Flow
- [ ] Timer counts down to 0 → time_up overlay appears
- [ ] Non-narrators see "Waiting for narrator..."
- [ ] Only narrator sees "Continue" button
- [ ] Narrator clicks Continue → advances to next turn

### 5. Skip Word
- [ ] Narrator clicks "Skip Word" → advances immediately
- [ ] No score given, next turn starts

### 6. Consecutive Tasks Per Player
- [ ] With 2 tasks/player setting, verify same narrator gets 2 words in a row
- [ ] After 2nd word, next player becomes narrator

### 7. Game End
- [ ] After all turns complete → finished screen
- [ ] Shows leaderboard sorted by score
- [ ] Gold/silver/bronze styling for top 3
- [ ] Host sees "New Game" button

### 8. Leave/Disband
- [ ] Non-host leaves during game → redirected, game continues for others
- [ ] Host clicks Disband → confirmation dialog
- [ ] Host confirms → all players see toast + redirect to home

### 9. Realtime Sync
- [ ] Open game in 2 browser windows
- [ ] Actions in one reflect instantly in other
- [ ] Timer stays synchronized across clients

### 10. Edge Cases
- [ ] Refresh page mid-game → rejoins correctly
- [ ] Close tab and reopen → can rejoin if still in lobby_players
- [ ] Network disconnect → watchdog shows toast after ~4s

---

## Design Decisions

1. **Narrator-authoritative vs Server-authoritative**: Chose narrator-authoritative for simplicity. The narrator's client triggers all state transitions, which is acceptable for a social game where players trust each other.

2. **Tasks from global pool**: Tasks come from `charades_tasks` table. Same task can appear in different games but not twice in the same game.

3. **Narrator leaves during block**: If narrator leaves, game continues without them. Their remaining tasks are effectively skipped. For a more robust solution, could implement host-initiated skip or automatic reassignment.

4. **Version field**: Added for future optimistic concurrency if needed, currently tracks state mutations for debugging.
