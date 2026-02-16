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
    └── App.js              # THE ENTIRE APP (~950 lines, single file)
```
There are **no** subdirectories under `src/`. No `components/`, `pages/`, `hooks/`, `context/`, or `utils/` folders. Everything lives in `App.js`.

## Architecture — Single-File App (src/App.js)

### Top-Level Components
| Component | Lines | Description |
|-----------|-------|-------------|
| `StickCross` | ~5-9 | Custom SVG cross icon (thin stick cross for religious category, replaces lucide `Cross`) |
| `PlaceImage` | ~11-20 | Reusable image with category-colored gradient fallback + lazy loading |
| `ZghartaTourismApp` | ~22-950+ | Main app (default export). All state, helpers, and screens inside. |

### State (inside ZghartaTourismApp)
- `tab` — Active tab: `'map'` | `'explore'` | `'events'` | `'guide'` | `'favorites'`
- `lang` — `'en'` | `'ar'` (persisted to localStorage `zgharta-lang`)
- `selPlace`, `selBiz`, `selEvent` — Currently selected item for detail modals
- `favs` — `{ places: [id...], businesses: [id...] }` (persisted to localStorage `zgharta-favs`)
- `catFilter` — Category filter for Explore screen
- `mapFilter` — Set of active category filters for MapScreen chips
- `mapVillageFilter` — Village filter shared between Guide and Map screens
- `selectedMarker` — Currently highlighted marker on map (auto-scrolls carousel)
- `visibleCards` — Top 8 places/businesses in current map viewport (carousel data; persists when viewport is empty)
- `geoActive` — Whether locate-me button is active (MapScreen)
- `cardsVisible` — Whether card carousel is shown or hidden (MapScreen, default `true`)
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
| `MapScreen` | `'map'` | Google Maps with 3-tier AdvancedMarkerElement markers, frosted glass search/filters, locate-me button, compass button, inline search, horizontal category filter chips, village filter dropdown, swipeable image-card carousel |
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
- **All inline CSS** — no className usage except `.map-screen` (dvh height) and `.map-carousel` (scrollbar hiding)
- Category color system: `catIcons`, `catColors`, `catBgs` objects map category strings to icons, hex colors, and background colors
- **Religious icon:** Custom `StickCross` SVG component (thin stick cross) used everywhere instead of lucide `Cross`
- Map marker colors in separate `markerColors` object
- RTL handled via `direction: isRTL ? 'rtl' : 'ltr'` on all screens and modals, conditional `textAlign`/`flexDirection`, and `[isRTL ? 'right' : 'left']` for absolute positioning (back buttons, badges, dropdowns, close buttons)

### Bilingual
- `t(en, ar)` inline helper — no i18n library
- DB fields: `name`/`name_ar`, `description`/`description_ar` (snake_case in DB, camelCase in JS)
- Language persisted in localStorage `zgharta-lang`
- **Arabic fallbacks:** All `isRTL ? item.nameAr : item.name` patterns use `(item.nameAr || item.name)` to prevent blank text when Arabic field is null

### Data & Caching
- All data fetched on mount via `fetchData()` with `Promise.all` for all 3 tables
- localStorage cache key: `zgharta-data` (JSON with `places`, `businesses`, `events`, `ts`)
- Shows cached data immediately (if <24 hours old), then fetches fresh in background
- **Cache expiration:** 24 hours (`Date.now() - ts < 86400000`); stale cache is ignored
- If fetch fails and cache exists, app works offline silently

### Shared Style Constants
- `eventCatStyles` — event category color map (used in EventsScreen + EventModal)
- `modalBackBtn` — RTL-aware back button style for all 3 modals
- `circleBtn` — base 40x40 circular button style
- `primaryBtn` / `secondaryBtn` — action button styles used across modals

### Performance
- **`React.useMemo`** used for expensive computations: `allLocations`, `filteredLocations`, `villages` (MapScreen), `allItems`, `searchResults`, `fPlaces`, `fBiz` (ExploreScreen), `fEvents`, `upcomingCount` (EventsScreen), `allSaved`, `groups` (FavsScreen)
- **useEffect cleanup:** Map rendering effect clears markers on unmount; script loader clears recursive setTimeout
- **Refs:** `visibleCardsRef` keeps latest visible cards accessible inside stale closures; `selectedMarkerRef` tracks selection synchronously for `updateCards`; `carouselRef` for auto-scroll on marker tap; `geoMarkerRef` for blue dot overlay

### Map Implementation
- Google Maps loaded dynamically via script tag injection (no `mapId` — raster mode for local JSON styles)
- **POI hiding:** Local `styles` array hides all Google default POIs (`poi`, `poi.business`) and transit stations; only custom markers visible
- **3-tier marker system** using custom `HtmlMarker` class extending `google.maps.OverlayView`:
  - **Zoom ≤13:** 10px colored dots with white border (`makeDotEl`)
  - **Zoom 14-16:** 28px white circle with 2D category SVG icon inside (`makeIconEl`)
  - **Zoom 17+:** Icon + truncated name label (max 20 chars) in category color with white text-shadow halo (`makeLabeledEl`)
  - Content swapped via `updateContent(zoom)` on `zoom_changed` event
  - Click listener on wrapper div works at all zoom levels; sets `selectedMarkerRef` synchronously before `panTo`
- **Marker helpers:** `catIconPaths` (SVG path data per category), `makeCatSVG()`, `makeDotEl()`, `makeIconEl()`, `makeLabeledEl()` — all defined inside MapScreen
- **Category icons:** Custom `StickCross` SVG for religious (thin stick cross), lucide-style SVGs for nature/heritage/restaurant/hotel/cafe/shop
- **Frosted glass UI:** Search bar, village filter, language toggle, and category chips use `backdrop-filter: blur()` with semi-transparent backgrounds
- **Category filter chips:** Horizontal scrollable row of pill-shaped chips (Restaurants, Hotels, Churches, Nature, Landmarks, Cafés) with icons, bilingual labels, multi-select, color-coded active states
- **Swipeable card carousel:** Horizontal scroll-snap carousel of image-background cards at bottom of map (`bottom: 56px`). Cards show top 8 places/businesses in viewport (updated via `idle` listener). Selected marker always injected into card list. Cards persist when viewport is empty (only updates when new results > 0). Full-bleed images with dark gradient overlay, frosted heart buttons, white text.
- **Card carousel toggle:** `cardsVisible` state with toggle button (bottom-right). Cards slide out via `translateY` transition. Buttons animate position between `bottom: 224px` (visible) and `bottom: 64px` (hidden). Tapping a marker auto-shows cards.
- **Locate-me button:** Bottom-left (RTL: bottom-right) frosted glass circle. Taps to geolocate, pans map, places pulsing blue dot (`geoPulse` CSS animation via custom OverlayView). Icon fills solid blue when active; `dragstart` listener deactivates.
- **No zoom buttons:** `zoomControl: false`, `disableDefaultUI: true` — pinch-to-zoom only
- **Body scroll lock:** useEffect locks body/html overflow when map tab is active; root wrapper gets conditional `overflow: 'hidden'`
- Map height uses `100dvh` with `100vh` fallback (CSS class `.map-screen`)
- **Google attribution:** Repositioned above nav via CSS (`.gm-style > div:last-child { bottom: 56px }`)
- **Default center:** Zgharta city (`34.3955, 35.8945`) at zoom 15 (street-level)
- **Geolocation on mount:** Requests user position; only pans if within Zgharta caza bounding box (`lat: 34.24–34.42, lng: 35.82–36.00`), otherwise silently keeps default
- **No initial fitBounds** — map does not zoom out to show all markers on load; fitBounds only triggers on filter changes
- **Loading/error states:** Loader2 spinner while Google Maps script loads; error screen with reload button if script fails

### Navigation
- Tab-based via `tab` state — no React Router
- Bottom nav is `position: fixed` with 5 tabs, compact sizing (icons 20px, labels 10px)
- **Active tab indicator:** Green pill background (`rgba(16,185,129,0.2)`) behind active icon (22px, strokeWidth 2.5), darker green (`#059669`), bold 700 weight label, smooth transitions. No top pill bar.
- **Conditional nav styling:** Semi-transparent with blur on map tab (`rgba(255,255,255,0.12)`, `blur(4px)`), solid white on other tabs
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
