# Zgharta Caza Tourism PWA

## Overview
A bilingual (English/Arabic) Progressive Web App promoting tourism in Zgharta Caza, North Lebanon. The app showcases places, businesses, and events across the mountain villages of the region — helping visitors and locals discover landmarks, restaurants, accommodations, and cultural attractions.

## Deployment
- **Production URL:** https://zgharta-tourism.vercel.app
- **Hosting:** Vercel (auto-deploys on push to `main`)
- **Backend:** Supabase (https://mhohpseegfnfzycxvcuk.supabase.co)
- **Maps:** Google Maps API (key in `.env` as `REACT_APP_GOOGLE_MAPS_KEY`)
- **Vercel config:** `vercel.json` — SPA rewrite rule (`/(.*) → /`)

## Tech Stack
- **Frontend:** React 18.3.1 (Create React App via react-scripts 5.0.1)
- **Backend/Database:** Supabase (@supabase/supabase-js ^2.45.0)
- **Maps:** Google Maps JavaScript API (loaded dynamically with `libraries=marker`)
- **Icons:** lucide-react ^0.263.1
- **Styling:** 100% inline CSS — no Tailwind, no CSS Modules, no styled-components
- **Fonts:** Inter (EN) + Tajawal (AR), loaded via Google Fonts in `index.html`
- **Language:** JavaScript (no TypeScript)
- **PWA:** manifest.json (standalone, portrait, theme `#059669`), no service worker file

## Dependencies (package.json)
```
@supabase/supabase-js  ^2.45.0
lucide-react            ^0.263.1
react                   ^18.3.1
react-dom               ^18.3.1
react-scripts           5.0.1
```
No other runtime dependencies. No router — single-page app with tab-based navigation.

## Project Structure
```
zgharta-tourism/
├── CLAUDE.md               # This file
├── package.json
├── vercel.json             # SPA rewrite for Vercel
├── .env                    # Environment variables (not committed)
├── public/
│   ├── index.html          # OG tags, PWA meta, Google Fonts
│   ├── manifest.json       # PWA manifest
│   └── favicon.ico
└── src/
    ├── index.js            # React 18 createRoot entry point
    ├── index.css           # Global reset, scrollbar hide, Inter font
    └── App.js              # THE ENTIRE APP (~920 lines, single file)
```
There are **no** subdirectories under `src/`. No `components/`, `pages/`, `hooks/`, `context/`, or `utils/` folders. Everything lives in `App.js`.

## Architecture — Single-File App (src/App.js)

### Top-Level Components
| Component | Lines | Description |
|-----------|-------|-------------|
| `PlaceImage` | ~10-19 | Reusable image with category-colored gradient fallback + lazy loading |
| `ZghartaTourismApp` | ~21-916 | Main app (default export). All state, helpers, and screens inside. |

### State (inside ZghartaTourismApp)
- `tab` — Active tab: `'map'` | `'explore'` | `'events'` | `'guide'` | `'favorites'`
- `lang` — `'en'` | `'ar'` (persisted to localStorage `zgharta-lang`)
- `selPlace`, `selBiz`, `selEvent` — Currently selected item for detail modals
- `favs` — `{ places: [id...], businesses: [id...] }` (persisted to localStorage `zgharta-favs`)
- `catFilter` — Category filter for Explore screen
- `mapVillageFilter` — Village filter shared between Guide and Map screens
- `places`, `businesses`, `events` — Data arrays from Supabase
- `loading`, `error` — Fetch state

### Helper Functions
- `t(en, ar)` — Inline translation helper based on `lang`
- `fetchData()` — Loads from Supabase with localStorage cache fallback (`zgharta-data`)
- `toggleFav(id, type)` / `isFav(id, type)` — Favorites management
- `getDistance(a, b)` — Haversine distance in km
- `getNearby(coords, excludeId, limit)` — Sorted nearby places/businesses
- `shareLoc(name, village, coords)` — Web Share API / clipboard fallback
- `showOnMap(coords)` — Navigate to map tab

### Screen Components (defined inside ZghartaTourismApp)
| Screen | Tab ID | Description |
|--------|--------|-------------|
| `GuideScreen` | `'guide'` | Landing page: hero stats, featured place card, category quick-links, upcoming event banner, top-rated businesses, village carousel, getting-there directions |
| `ExploreScreen` | `'explore'` | List view with global search, rating filter, places/businesses toggle, category pills |
| `EventsScreen` | `'events'` | Events list with upcoming/past/all toggle and category filters |
| `MapScreen` | `'map'` | Google Maps with custom OverlayView markers, pixel-based clustering, inline search, multi-select category/village filter dropdowns, preview card |
| `FavsScreen` | `'favorites'` | Saved items grouped by category, share-trip, view-on-map |

### Modal Components (defined inside ZghartaTourismApp)
| Modal | Trigger | Description |
|-------|---------|-------------|
| `PlaceModal` | `selPlace` set | Full-screen place detail: image hero, fav/share, hours, coords, directions, nearby carousel |
| `BizModal` | `selBiz` set | Full-screen business detail: rating stars, specialties, call/website/directions, Google Maps reviews link, nearby |
| `EventModal` | `selEvent` set | Full-screen event detail: gradient hero, date/time/location, add-to-calendar, share |

### Bottom Nav (5 tabs)
`Discover (map)` → `Explore` → `Events` → `Guide` → `Saved (favorites)`

## Supabase Schema (inferred from code)

### `places` table
| Column | Maps to | Notes |
|--------|---------|-------|
| `id` | `id` | Primary key |
| `name` | `name` | English name |
| `name_ar` | `nameAr` | Arabic name |
| `category` | `category` | `'religious'` \| `'nature'` \| `'heritage'` |
| `village` | `village` | Village name (English) |
| `description` | `description` | English description |
| `description_ar` | `descriptionAr` | Arabic description |
| `image_url` | `image` | Image URL |
| `latitude` | `coordinates.lat` | |
| `longitude` | `coordinates.lng` | |
| `open_hours` | `openHours` | Opening hours string |
| `featured` | `featured` | Boolean, sorted descending |

### `businesses` table
| Column | Maps to | Notes |
|--------|---------|-------|
| `id` | `id` | Primary key |
| `name` | `name` | English name |
| `name_ar` | `nameAr` | Arabic name |
| `category` | `category` | `'restaurant'` \| `'hotel'` \| `'cafe'` \| `'shop'` |
| `village` | `village` | |
| `description` | `description` | |
| `description_ar` | `descriptionAr` | |
| `image_url` | `image` | |
| `latitude` | `coordinates.lat` | |
| `longitude` | `coordinates.lng` | |
| `rating` | `rating` | Numeric, sorted descending |
| `price_range` | `priceRange` | e.g. `'$$'` |
| `phone` | `phone` | |
| `website` | `website` | |
| `specialties` | `specialties` | Array of strings |
| `verified` | `verified` | Boolean |

### `events` table
| Column | Maps to | Notes |
|--------|---------|-------|
| `id` | `id` | Primary key |
| `name` | `name` | English name |
| `name_ar` | `nameAr` | Arabic name |
| `category` | `category` | `'festival'` \| `'religious'` \| `'cultural'` \| `'nature'` |
| `village` | `village` | |
| `description` | `description` | |
| `description_ar` | `descriptionAr` | |
| `event_date` | `date` | Date string, sorted ascending |
| `event_time` | `time` | Time string |
| `location` | `location` | English location name |
| `location_ar` | `locationAr` | Arabic location name |
| `featured` | `featured` | Boolean |

## Environment Variables
```env
REACT_APP_SUPABASE_URL=https://mhohpseegfnfzycxvcuk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<in .env>
REACT_APP_GOOGLE_MAPS_KEY=<in .env>
```
All use `REACT_APP_` prefix (CRA convention). Hardcoded fallbacks exist for Supabase URL and anon key in `App.js`.

## Key Patterns & Conventions

### Styling
- **All inline CSS** — no className usage except `.map-screen` for dvh height
- Category color system: `catIcons`, `catColors`, `catBgs` objects map category strings to Lucide icons, hex colors, and background colors
- Map marker colors in separate `markerColors` object
- RTL handled via `direction: isRTL ? 'rtl' : 'ltr'` and conditional `textAlign`/`flexDirection`

### Bilingual
- `t(en, ar)` inline helper — no i18n library
- DB fields: `name`/`name_ar`, `description`/`description_ar` (snake_case in DB, camelCase in JS)
- Language persisted in localStorage `zgharta-lang`

### Data & Caching
- All data fetched on mount via `fetchData()` with `Promise.all` for all 3 tables
- localStorage cache key: `zgharta-data` (JSON with `places`, `businesses`, `events`, `ts`)
- Shows cached data immediately, then fetches fresh in background
- If fetch fails and cache exists, app works offline silently

### Map Implementation
- Google Maps loaded dynamically via script tag injection
- Custom `OverlayView` markers (not standard Markers/AdvancedMarkers)
- Pixel-based clustering: converts lat/lng to world pixels, groups by pixel distance threshold that varies by zoom level
- Tiny inline SVG icons for map dot markers
- Map height uses `100dvh` with `100vh` fallback (CSS class `.map-screen`)
- Preview card positioned with `bottom: 84px` to sit above the 76px nav bar

### Navigation
- Tab-based via `tab` state — no React Router
- Bottom nav is `position: fixed` with 5 tabs
- Modals are full-screen overlays (`position: fixed, inset: 0, zIndex: 50`)
- Max width: 448px centered (mobile-first design)

## Development
```bash
npm install        # Install dependencies
npm start          # Dev server (CRA, port 3000)
npm run build      # Production build
git push origin main   # Auto-deploys to Vercel
```

## Geographic Context
Zgharta Caza (District) is in the North Governorate of Lebanon. Villages referenced in the codebase:
- **Ehden** — Mountain resort town
- **Zgharta** — District capital
- **Ardeh**, **Kfarsghab**, **Rachiine**, **Mejdlaya** — Featured in village carousel
- Many more villages appear in Supabase data
