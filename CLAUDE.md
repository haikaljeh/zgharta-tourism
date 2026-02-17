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
- **Maps:** Google Maps JavaScript API (loaded dynamically, raster mode — no `libraries=marker`)
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
├── .env.example            # Template listing all required env vars
├── .gitignore              # Ignores node_modules, build, .env, *.save
├── scripts/
│   ├── lib/
│   │   ├── env.js            # Shared env validation + DRY_RUN flag
│   │   ├── supabase.js       # Shared Supabase admin client factory
│   │   ├── googlePlaces.js   # Google Places API with retry/backoff
│   │   └── utils.js          # sleep() + FailureTracker for grouped reporting
│   ├── import-businesses.js  # Google Places API → Supabase (upsert)
│   ├── update-websites.js    # Find/add website URLs for businesses
│   └── fetch-photos.js       # Fetch Google Places photos → Supabase
├── public/
│   ├── index.html          # OG tags, PWA meta, Google Fonts
│   ├── manifest.json       # PWA manifest
│   └── favicon.ico
└── src/
    ├── index.js            # React 18 createRoot entry point
    ├── index.css           # Global reset, scrollbar hide, Inter font
    ├── config/
    │   └── categories.js   # Canonical category definitions & helpers
    └── App.js              # THE ENTIRE APP (~1230 lines, single file)
```

## Architecture — Single-File App (src/App.js)

### Top-Level Components
| Component | Location | Description |
|-----------|----------|-------------|
| `StickCross` | `src/config/categories.js` | Custom SVG cross icon (thin stick cross for religious category, replaces lucide `Cross`) |
| `PlaceImage` | `src/App.js` ~11-20 | Reusable image with category-colored gradient fallback + lazy loading |
| `ZghartaTourismApp` | `src/App.js` ~22-1230+ | Main app (default export). All state, helpers, and screens inside. |

### Category Config (src/config/categories.js)
Canonical source of truth for all 7 categories. Each category has:
- `id` — Database string: `'restaurant'` | `'cafe'` | `'shop'` | `'heritage'` | `'nature'` | `'hotel'` | `'religious'`
- `labelEn`, `labelAr` — Full labels (e.g. "Restaurants" / "مطاعم")
- `shortLabelEn`, `shortLabelAr` — Short labels for GuideScreen (e.g. "Dining" / "مطاعم", "Stay" / "إقامة")
- `icon` — Lucide-react component reference (or `StickCross` for religious)
- `color` — Primary color for chips/markers (e.g. `'#e06060'`)
- `badgeColor` — Badge/label color (e.g. `'#dc2626'`)
- `bgColor` — Light background color (e.g. `'#fee2e2'`)
- `gradient` — CSS gradient for GuideScreen category cards
- `gradientAccent` — Darker accent for gradient card text
- `mutedColor` — Semi-transparent rgba for favorited markers
- `markerColor` — Map marker color
- `emoji` — For share-trip text
- `displayOrder` — 0-6, canonical order: Restaurant → Cafe → Shop → Heritage → Nature → Hotel → Religious
- `type` — `'place'` or `'business'`

**Exported helpers:** `getCategoryColor(id)`, `getCategoryBadgeColor(id)`, `getCategoryBgColor(id)`, `getCategoryMarkerColor(id)`, `getCategoryMutedColor(id)`, `getCategoryIcon(id)`, `getCategoryEmoji(id)`, `getCategoryLabel(id, lang)`, `getCategoryShortLabel(id, lang)`, `getCategory(id)`, `getPlaceCategories()`, `getBusinessCategories()`, `getAllCategories()`, `getCategoryOrder()`

**Exported lookup maps** (for drop-in use in App.js): `catIcons`, `catColors`, `catBgs`, `markerColors`, `mutedCatColors`, `catEmoji`

**Canonical category order:** Restaurant → Cafe → Shop → Heritage → Nature → Hotel → Religious — used consistently across all screens (Explore, Guide, Map, Saved). All screens show all 7 categories. FavsScreen derives `catOrder` from `CATEGORIES.map(c => c.id)`.

### State (inside ZghartaTourismApp)
- `tab` — Active tab: `'map'` | `'explore'` | `'events'` | `'guide'` | `'favorites'`
- `lang` — `'en'` | `'ar'` (persisted to localStorage `zgharta-lang`)
- `selPlace`, `selBiz`, `selEvent` — Currently selected item for detail modals
- `favs` — `{ places: [id...], businesses: [id...] }` (persisted to localStorage `zgharta-favs`)
- `catFilter` — Category filter for Explore screen
- `mapFilter` — Set of active category filters for MapScreen chips
- `mapVillageFilter` — Village filter shared between Explore, Guide, and Map screens
- `selectedMarker` — Currently highlighted marker on map (auto-scrolls carousel)
- `visibleCards` — Top 8 places/businesses in current map viewport (carousel data; persists when viewport is empty)
- `geoActive` — Whether locate-me button is active (MapScreen)
- `cardsVisible` — Whether card carousel is shown or hidden (MapScreen, default `true`)
- `places`, `businesses`, `events` — Data arrays from Supabase
- `loading`, `error` — Fetch state

### Helper Functions
- `t(en, ar)` — Inline translation helper based on `lang`
- `fetchData()` — Loads from Supabase with localStorage cache fallback (`zgharta-data`). Uses `hasValidCache` local boolean to avoid stale closure over `places` state — only shows error when no valid cache exists.
- `toggleFav(id, type)` / `isFav(id, type)` — Favorites management
- `getDistance(a, b)` — Haversine distance in km. Uses nullish checks (`== null`) for coordinates so lat/lng of 0 isn't treated as missing.
- `getNearby(coords, excludeId, limit)` — Sorted nearby places/businesses
- `shareLoc(name, village, coords)` — Web Share API / clipboard fallback
- `showOnMap(coords)` — Navigate to map tab

### Screen Components (defined inside ZghartaTourismApp)
| Screen | Tab ID | Rendering | Description |
|--------|--------|-----------|-------------|
| `GuideScreen` | `'guide'` | `<GuideScreen />` | Travel magazine landing: cinematic hero, full-image must-see card, horizontal category strip (from `CATEGORIES`), calendar-style event, story-style top rated, circular village thumbnails, minimal transit directions |
| `ExploreScreen` | `'explore'` | `<ExploreScreen />` | Warm gradient list view with global search, rating filter, village filter dropdown (synced with MapScreen via `mapVillageFilter`), icon-enriched category pills (from `CATEGORIES`), card shadows with inline favorite hearts, colored category badges, active filters summary bar with removable tags, magazine-style empty state with clear-all button |
| `EventsScreen` | `'events'` | `<EventsScreen />` | Events list with upcoming/past/all toggle and category filters |
| `MapScreen` | `'map'` | `{MapScreen()}` (function call) | Google Maps with 3-tier HtmlMarker overlays, frosted glass search/filters, locate-me button, inline search, horizontal category filter chips (from `CATEGORIES`), village filter dropdown, swipeable image-card carousel. **Always mounted** (hidden via `display:none` when not active tab) |
| `FavsScreen` | `'favorites'` | `{FavsScreen()}` (function call) | Saved items grouped by category (ordered via `CATEGORIES`), share-trip, view-on-map |

**Rendering note:** MapScreen and FavsScreen are called as functions (not components) because their hooks are lifted to the parent scope. This prevents React from unmounting/remounting them on parent re-renders (which would destroy the Google Maps instance or cause image flicker). Other screens still render as `<Component />` with hooks inside.

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
| `google_place_id` | — | Unique, used as upsert conflict key by import script |

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
# Client-side (React app) — REACT_APP_ prefix (CRA convention)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<in .env>
REACT_APP_GOOGLE_MAPS_KEY=<in .env>

# Server-side (scripts only) — never exposed to client
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<in .env>
GOOGLE_API_KEY=<in .env>
```
**No hardcoded fallbacks** — all env vars must be set via `.env` or hosting environment. If `REACT_APP_SUPABASE_URL` or `REACT_APP_SUPABASE_ANON_KEY` are missing, the Supabase client is `null` and `fetchData()` shows a descriptive error (unless valid cache exists). See `.env.example` for the full template with comments.

## Scripts (scripts/)

All scripts read credentials from environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`). Shared infrastructure lives in `scripts/lib/`.

### Shared Libraries (scripts/lib/)
- **`env.js`** — `requireEnv(names)` validates required env vars at startup and exits with a clear error if any are missing. Exports `DRY_RUN` boolean from `--dry-run` argv flag.
- **`supabase.js`** — `createSupabaseClient(url, serviceKey)` factory wrapper around `@supabase/supabase-js`.
- **`googlePlaces.js`** — Centralized Google Places API functions: `findPlace()`, `nearbySearch()`, `getDetails()`, `photoUrl()`. All API calls go through `placesRequest()` which handles Google API status codes (`OK`, `ZERO_RESULTS`, `OVER_QUERY_LIMIT`, `REQUEST_DENIED`, `INVALID_REQUEST`, `UNKNOWN_ERROR`), retries retryable errors (`OVER_QUERY_LIMIT`, `UNKNOWN_ERROR`) with exponential backoff (1s/2s/4s, max 3 retries), and returns structured results: `{ ok, status, data, errorType, message }`.
- **`utils.js`** — `sleep(ms)` helper + `FailureTracker` class that groups failures by reason for end-of-run reporting (prints grouped counts with up to 5 item names per group).

### import-businesses.js
- Searches Google Places API across 14 village areas for restaurants, hotels, cafes, shops
- Uses **upsert** on `google_place_id` conflict key (idempotent — safe to re-run)
- Requires: `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;`
- Supports `--dry-run` flag to preview without writing

### update-websites.js
- Finds and adds missing website URLs and phone numbers for existing businesses
- Only updates records that are missing website or phone
- Supports `--dry-run` flag

### fetch-photos.js
- Fetches Google Places photos for places and businesses missing `image_url`
- Skips items that already have images
- Supports `--dry-run` flag

All scripts print a summary at the end: updated, skipped, failed counts + grouped failure breakdown (by reason) when failures occur.

## Key Patterns & Conventions

### Design Philosophy
- **Map tab = "outdoor"** — transparent, immersive, frosted glass UI overlaying the map
- **Other tabs = "indoor"** — warm, cozy, content-rich, like a beautiful travel magazine
- GuideScreen and ExploreScreen use warm cream gradient background (`#fafaf9` → `#f5f5f0`). GuideScreen has cinematic full-image cards, editorial typography with varied weights (800 hero → 600 sections → 400 body), 32px section spacing, `letterSpacing: 0.5` on section titles

### Styling
- **All inline CSS** — no className usage except `.map-screen` (dvh height) and `.map-carousel` (scrollbar hiding)
- **Category config:** All category definitions (icons, colors, backgrounds, labels, order) live in `src/config/categories.js`. App.js imports `CATEGORIES` array and pre-built lookup maps (`catIcons`, `catColors`, `catBgs`, `markerColors`, `mutedCatColors`, `catEmoji`). No category definitions should be duplicated in App.js.
- **Religious icon:** Custom `StickCross` SVG component (thin stick cross) defined in `config/categories.js`, used everywhere instead of lucide `Cross`
- **Category labels:** All screens use category ID as label (e.g. "religious", "heritage") — not aliases like "Churches" or "Landmarks". GuideScreen uses short labels from `shortLabelEn`/`shortLabelAr`: "Dining" (restaurant), "Stay" (hotel)
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
- If fetch fails and valid cache was loaded, app works offline silently (no error shown). Error only displayed when no valid cache exists — tracked via `hasValidCache` local boolean (avoids stale closure over `places` state).
- If Supabase client is `null` (env vars missing), `fetchData()` throws a descriptive configuration error

### Shared Style Constants
- `eventCatStyles` — event category color map (used in EventsScreen + EventModal)
- `modalBackBtn` — RTL-aware back button style for all 3 modals
- `circleBtn` — base 40x40 circular button style
- `primaryBtn` / `secondaryBtn` — action button styles used across modals
- `modalContainer` — full-screen modal wrapper with RTL direction
- `screenContainer` — standard screen wrapper with min-height and padding
- `stickyHeader` — sticky top header with bottom border
- `heroGradient` — dark gradient overlay for image heroes

### Performance & State Architecture
- **Lifted hooks pattern:** MapScreen and FavsScreen hooks (`useState`, `useEffect`, `useRef`, `useMemo`) are lifted to the parent `ZghartaTourismApp` scope. This prevents component identity changes from causing unmount/remount (which would destroy the Google Maps instance or trigger image reload flicker). The loading/error early returns are placed AFTER all hooks to comply with React's rules of hooks.
- **`favsRef`** — Ref tracking latest `favs` state; used by the marker creation effect so `favs` is not in its dependency array. A separate lightweight effect updates marker visuals in-place when favs change (no marker destruction/recreation, no zoom disruption).
- **`React.useMemo`** used for expensive computations: `allLocations`, `filteredLocations`, `villages` (map), `allItems`, `exploreVillages`, `filteredItems` (ExploreScreen), `fEvents`, `upcomingCount` (EventsScreen), `allSaved`, `favsGroups` (favs)
- **useEffect cleanup:** Map rendering effect clears markers on unmount; script loader clears recursive setTimeout
- **Refs:** `visibleCardsRef` keeps latest visible cards accessible inside stale closures; `selectedMarkerRef` tracks selection synchronously for `updateCards`; `carouselRef` for auto-scroll on marker tap; `geoMarkerRef` for blue dot overlay; `prevZoomTierRef` for staggered marker animation on zoom tier transitions; `boundaryRef` for Zgharta caza boundary polygon; `cazaBoundsRef` for dynamic bounding box from Nominatim API

### Map Implementation
- Google Maps loaded dynamically via script tag injection (no `mapId` — raster mode for local JSON styles)
- **POI hiding:** Local `styles` array hides all Google default POIs (`poi`, `poi.business`) and transit stations; only custom markers visible
- **3-tier marker system** using custom `HtmlMarker` class extending `google.maps.OverlayView`:
  - **Zoom ≤13:** 10px colored dots with white border; favorited markers show 20px filled SVG heart with white stroke outline and drop shadow (`makeDotEl`)
  - **Zoom 14-16:** 28px white circle with 2D category SVG icon inside (`makeIconEl`)
  - **Zoom 17+:** Icon + truncated name label (max 20 chars) in category color with white text-shadow halo (`makeLabeledEl`)
  - Content swapped via `updateContent(zoom, animate)` on `zoom_changed` event
  - **Staggered pop animation:** When zooming into a higher tier, markers animate in with `markerPop` keyframe and staggered delays (30ms per marker, max 500ms)
  - Click listener on wrapper div works at all zoom levels; sets `selectedMarkerRef` synchronously before `panTo`
- **Favorited marker styling:** Muted inverted colors — category-colored background with white icon (vs normal: white background with colored icon). Favorites render at z-index 10 (above normal z-index 1). Marker visuals update in-place via lightweight effect (no destruction/recreation).
- **Marker helpers:** `catIconPaths` (SVG path data per category), `makeCatSVG()`, `makeDotEl()`, `makeIconEl()`, `makeLabeledEl()` — defined at parent scope. Use `markerColors` and `mutedCatColors` from `config/categories.js`.
- **Category icons:** Custom `StickCross` SVG for religious (thin stick cross), lucide-style SVGs for nature/heritage/restaurant/hotel/cafe/shop
- **Frosted glass UI:** Search bar, village filter, language toggle, and category chips use `backdrop-filter: blur()` with semi-transparent backgrounds
- **Category filter chips:** Horizontal scrollable row of pill-shaped chips with icons, bilingual labels (from `CATEGORIES`), multi-select, color-coded active states, visible outline borders on inactive chips (fontWeight 700)
- **Swipeable card carousel:** Horizontal scroll-snap carousel of image-background cards at bottom of map (`bottom: 56px`). Cards show top 8 places/businesses in viewport (updated via `idle` listener). Selected marker always injected into card list. Cards persist when viewport is empty (only updates when new results > 0). Full-bleed images with dark gradient overlay, frosted heart buttons, white text.
- **Card carousel toggle:** `cardsVisible` state with toggle button (bottom-right). Cards slide out via `translateY` transition. Buttons animate position between `bottom: 224px` (visible) and `bottom: 64px` (hidden). Tapping a marker auto-shows cards.
- **Locate-me button:** Bottom-left (RTL: bottom-right) frosted glass circle. Taps to geolocate, pans map, places pulsing blue dot (`geoPulse` CSS animation via custom OverlayView). Icon fills solid blue when active; `dragstart` listener deactivates.
- **No zoom buttons:** `zoomControl: false`, `disableDefaultUI: true` — pinch-to-zoom only
- **No fitBounds on filter changes:** Category and village filter toggles only show/hide markers — they never call `fitBounds`, `setCenter`, or `setZoom`. Map position is only changed by: initial load, user gestures, geolocation button, marker tap, or "Back to Zgharta" button.
- **Back to Zgharta pill:** Floating frosted glass pill (Compass icon + "Zgharta Caza"/"زغرتا") appears when map center drifts outside the caza bounding box. Horizontally centered between locate-me and carousel toggle buttons, same `bottom` position and transition. On tap: pans to default center at zoom 13. Fades in/out via opacity transition, tracked by `outsideBounds` state updated on `idle` event.
- **Zgharta caza boundary polygon:** Fetched at runtime from OpenStreetMap Nominatim API (`polygon_geojson=1`) on map init. Handles both `Polygon` and `MultiPolygon` GeoJSON types. Stored in `boundaryRef`. Emerald green stroke (0.75 opacity, weight 4) and subtle fill (0.05 opacity). `clickable: false`, `zIndex: 0`. Bounding box computed from API response and stored in `cazaBoundsRef` — used by "Back to Zgharta" pill and geolocation check. Fallback bounds `{minLat: 34.26, maxLat: 34.43, minLng: 35.83, maxLng: 36.01}` if API fails. Single request, `User-Agent: ZghartaTourismApp/1.0` per Nominatim policy.
- **Body scroll lock:** useEffect locks body/html overflow when `tab === 'map'`; root wrapper gets conditional `overflow: 'hidden'`
- **Always mounted:** MapScreen div stays in the DOM (hidden via `display:none` when not active tab) so Google Maps instance persists across tab switches
- Map height uses `100dvh` with `100vh` fallback (CSS class `.map-screen`)
- **Google attribution:** Repositioned above nav via CSS (`.gm-style > div:last-child { bottom: 56px }`)
- **Default center:** Zgharta city (`34.3955, 35.8945`) at zoom 15 (street-level)
- **Geolocation on mount:** Requests user position; only pans if within Zgharta caza bounding box (from `cazaBoundsRef`, fallback `34.26–34.43, 35.83–36.01`), otherwise silently keeps default
- **No fitBounds ever** — map never zooms out to fit markers; stays where the user left it. Only the "Back to Zgharta" button programmatically changes view.
- **Loading/error states:** Loader2 spinner while Google Maps script loads; error screen with reload button if script fails

### Navigation
- Tab-based via `tab` state — no React Router
- Bottom nav is `position: fixed` with 5 tabs, compact sizing (icons 20px, labels 10px)
- **Active tab indicator:** Green pill background (`rgba(16,185,129,0.35)`) behind active icon (22px, strokeWidth 2.5), darker green (`#047857`), bold 700 weight label, smooth transitions. No top pill bar. All labels bold (inactive 600, active 700), inactive color `#6b7280`.
- **Conditional nav styling:** Semi-transparent with blur on map tab (`rgba(255,255,255,0.12)`, `blur(4px)`), solid white on other tabs
- Modals are full-screen overlays (`position: fixed, inset: 0, zIndex: 50`)
- Max width: 448px centered (mobile-first design)

## Development
```bash
npm install        # Install dependencies
npm start          # Dev server (CRA, port 3000)
npm run build      # Production build
git push origin main   # Auto-deploys to Vercel

# Data import scripts (require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_API_KEY in env)
npm run import-businesses       # Import businesses from Google Places
npm run import-businesses:dry   # Preview without writing to DB
npm run update-websites         # Add missing website/phone data
npm run update-websites:dry     # Preview without writing to DB
npm run fetch-photos            # Fetch missing photos from Google Places
npm run fetch-photos:dry        # Preview without writing to DB
```

## Security
- **No hardcoded secrets anywhere** — all keys (client and server) are read from environment variables. If client-side Supabase env vars are missing, the app falls back to cached data or shows a configuration error.
- **Server-side keys** (Supabase service role key, Google API key for Places) are validated at script startup via `requireEnv()` — scripts exit with a clear error if any are missing
- `.env` is gitignored; `.env.example` documents all required variables
- `*.save` files are gitignored to prevent accidental credential leaks from editor backups

## Geographic Context
Zgharta Caza (District) is in the North Governorate of Lebanon. Villages referenced in the codebase:
- **Ehden** — Mountain resort town
- **Zgharta** — District capital
- **Ardeh**, **Kfarsghab**, **Rachiine**, **Mejdlaya** — Featured in village carousel
- Many more villages appear in Supabase data
