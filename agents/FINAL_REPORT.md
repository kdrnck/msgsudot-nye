
# MSGSU DOT New Year Event App - Final Report

## Project Overview
This project is a mobile-first web application designed for the MSGSU DOT (Digital Game Design Club) New Year event. It features real-time interactive games, a lobby system, user authentication (Nickname/PIN), and a comprehensive admin panel.

**Tech Stack:**
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Database, Auth, Storage, Realtime)
- **Hosting:** Vercel (Free Tier friendly)

## Features Implemented

### 1. Core System
- **Authentication:** Custom Nickname & PIN based login (no email required).
- **Persistent Session:** automatic login via LocalStorage.
- **Responsive UI:** Mobile-first design with a dark/modern aesthetic (DOT Branding).

### 2. Game 1: Kiss / Marry / Kill (`/opoldurevlen`)
- **Gameplay:** Users draw 3 random characters and assign them to Kiss, Marry, or Kill slots.
- **Image Gen:** Generates a high-quality "Story Card" image client-side for social sharing.
- **Storage:** Saves results and generated images to Supabase.
- **Stats:** Global stats page showing choices.
- **My Cards:** Gallery of user's past games.

### 3. Game 2: Charades (`/sessizsinema`)
- **Lobby System:** Create/Join rooms via 6-digit code.
- **Real-time:** Supabase Realtime handles game state sync (active task, timer, scores).
- **Roles:**
    - **Narrator:** Sees the work and marks correct guessers.
    - **Guesser:** Sees who is narrating and tries to guess.
    - **Admin/Host:** Controls the game flow (Start, Skip, etc).
- **Leaderboard:** Global leaderboard for top players.

### 4. Admin Panel (`/admin`)
- **Authentication:** Password-gated access (Environmental Variable).
- **Player Management:** View and delete players.
- **Content Management:** 
    - Add/Edit KMK Characters (Image Upload).
    - Add/Edit Charades Tasks (Bulk text add).
    - Create Achievements (define triggers).

### 5. Extra Features
- **Achievements:** System to reward players (e.g. "First Kiss", "Charades Champ").
- **Live Stats (`/live`):** Auto-refreshing dashboard for big screens at the event.
- **Easter Eggs:** Konami Code, hidden logo clicks, custom 404 page.

## Setup Instructions

### 1. Environment Variables
Create a `.env.local` file with the following keys:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_PASSWORD=your_secret_password
```

### 2. Database Setup
Run the SQL script provided in `supabase_schema.sql` in your Supabase SQL Editor. This will:
- Create all tables (players, kmk_characters, lobbies, etc).
- Set up RLS policies.
- Enable Realtime for `charades_lobbies` and `charades_lobby_players`.

### 3. Storage Setup
Create two public buckets in Supabase Storage:
- `characters` (for KMK character images)
- `stories` (for generated result cards)
Ensure policies allow public read and authenticated upload.

## Next Steps / Notes
- **Audio:** Place mp3 files in `/public/audio/` for sound effects (e.g. `beep.mp3`).
- **Assets:** Add `dot-logo.png` and `pattern.png` to `/public/brand/` for branding.
- **Deployment:** Connect repository to Vercel. Add Environment Variables in Vercel Dashboard.

## Conclusion
The application is fully functional and ready for deployment. It meets all the requirements including mobile optimization, real-time interactivity, and administrative control.

**Happy New Year! 🎄**
