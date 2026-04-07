# GlowBuddy

**Know before you glow.** A crowdsourced cosmetic procedure price index — think GasBuddy for med spa treatments.

Patients log what they paid. Providers upload their verified pricing and specials. Everyone benefits from the collective data.

## Tech Stack

- **Frontend**: React + Vite
- **Database & Auth**: Supabase
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Routing**: React Router v6
- **Deployment**: Vercel

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/glowbuddy.git
cd glowbuddy
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Features

- **Browse Feed** — Search and filter crowdsourced procedure prices
- **Log a Treatment** — Multi-step form with outlier detection
- **Procedure Pages** — Detailed pricing for each procedure type
- **Provider Profiles** — Verified menus + community-reported prices
- **Specials Feed** — Provider-posted promotions and deals
- **Insights** — Charts and trends from aggregate data
- **Community** — Badges, leaderboard, monthly giveaway
- **Business Portal** — Providers can claim listings, upload menus, post specials
- **Admin Panel** — Review flagged submissions and disputes

## Deploying to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy

## Admin Access

Navigate to `/admin` and use the password: `glowadmin2026`

## Project Structure

```
src/
  components/       # Shared UI components
    LogForm/        # Multi-step form components
  pages/            # Route pages
    Business/       # Provider portal pages
  lib/              # Utilities, Supabase client, constants
supabase/
  schema.sql        # Full database schema + RLS policies
```
