# MSGSU DOT Event App - Master Plan

## 1. Feature Overview

### Kiss / Marry / Kill (`/opoldurevlen`)
Players select categories, draw 3 random character cards, and assign them to Kiss, Marry, or Kill slots. A high-quality story card is generated for sharing.

### Charades (`/sessizsinema`)
Realtime multiplayer game with lobby system. One player narrates while others guess.

### Achievements (`/achievements`)
Gamification layer with badges for specific actions.

### Live Stats (`/live`)
Big screen page showing realtime event stats.

### Hiring Page (`/hiring`)
Interactive recruitment page with application forms for various roles.

---

## 2. Pages & Routes

| Route | Description | Status |
|-------|-------------|--------|
| `/` | Landing + Auth | ✅ |
| `/home` | Navigation Hub | ✅ |
| `/opoldurevlen` | KMK Game | ✅ |
| `/opoldurevlen-documents` | My Cards Gallery | ✅ |
| `/opoldurevlen-stats` | Game Stats | ✅ |
| `/sessizsinema` | Charades Game | ✅ |
| `/sessizlobiolustur` | Create Lobby | ✅ |
| `/sessizoyungir` | Join Lobby | ✅ |
| `/sessizleaderboard` | Leaderboard | ✅ |
| `/achievements` | My Achievements | ✅ |
| `/ayarlar` | Settings | ✅ |
| `/live` | Live Stats | ✅ |
| `/hiring` | Job Applications | ✅ |
| `/admin/*` | Admin Panel | ✅ |

---

## 3. Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime & PM**: Bun (v1.3.5)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui (Base UI)
- **Backend**: Supabase (Postgres, Storage, Realtime)
- **Hosting**: Vercel (Free Tier)

---

## 4. Local Development

To run the project locally with Bun:

```bash
cd msgsudot-nye
bun install
bun run dev
```

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
ADMIN_PASSWORD=your_password
```

---

## 5. Setup Instructions

1. **Supabase**: Run `supabase_schema.sql` in SQL Editor
2. **Storage**: Create buckets `characters`, `stories`
3. **Realtime**: Enable for `charades_lobbies`, `charades_lobby_players`
4. **Environment**: Copy `.env.example` to `.env.local`
5. **Assets**: Add `dot-logo.png` to `/public/brand/`, `beep.mp3` to `/public/audio/`
6. **Deploy**: Push to GitHub, import to Vercel

---

## 6. Database Schema

See `supabase_schema.sql` for full schema including:
- `players` - User accounts
- `kmk_characters` - Game characters
- `kmk_results` - Game results
- `charades_lobbies` - Lobby state
- `charades_lobby_players` - Players in lobbies
- `charades_tasks` - Words for charades
- `achievements` - Badge definitions
- `player_achievements` - Earned badges
- `hiring_applications` - Job applications

---

## 7. Easter Eggs

- **Konami Code**: ArrowUp x2, ArrowDown x2, ArrowLeft, ArrowRight x2, B, A on Home page
- **Logo Clicks**: Click MSGSU DOT logo 10 times for color hue shift
- **Custom 404**: Themed not-found page

---

## 8. Performance Optimizations

- Suspense boundaries for searchParams access
- Optimized DB queries with specific column selection
- useCallback for memoized fetch functions
- Realtime subscriptions with proper cleanup
- Fallback values for env vars to prevent build crashes
