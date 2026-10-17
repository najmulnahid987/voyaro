# Voyaro Phase 9 — Step 8: Route Display Architecture & Evaluation Report

## 1. Executive Summary & MVP Evaluation

### Is in-app route display needed for the current MVP?
**Evaluation Decision: Defer default in-app road geometry rendering; keep behind an optional, authenticated backend proxy gate while maintaining external turn-by-turn navigation as the primary production solution.**

### Rationale:
1. **User Experience & Safety**: In a mobile travel app, users expecting a "route" require turn-by-turn guidance, real-time traffic updates, lane guidance, re-routing around closures, and voice navigation. A static 2D polyline drawn on top of a trip overview map cannot safely replace dedicated navigation apps. Voyaro's Step 5 implementation ("Get Directions" via native Apple Maps and Google Maps deep links) delivers full navigation for free with zero battery drain and offline caching.
2. **Security & API Secrets**: In-app routing requires querying third-party Directions APIs. Placing private API credentials inside a React Native / Expo mobile app bundle exposes them to trivial extraction (via `.apk` reverse engineering or web JavaScript bundle inspection).
3. **Billing & Cost Overhead**: Commercial routing providers charge recurring fees per request. Without an authenticated server-side proxy enforcing rate limits, a public mobile app can easily incur catastrophic billing overruns or quota exhaustion.
4. **Architectural Rule**: As mandated by Voyaro guidelines:
   - *Never display a straight line as if it were a real road route.*
   - *Never place privileged API credentials in the mobile app.*
   - *If a route provider is not configured, leave in-app drawing out and document the limitation.*

---

## 2. Inspection of Existing Map Implementation & Location Data

### Existing Map Infrastructure
- **Native Platforms (iOS & Android)**:
  - Powered by `react-native-maps` (`1.27.2`) via Expo SDK 57.
  - Native MapView renders Google Maps on Android and Apple Maps on iOS.
  - Interactive marker clustering, category filtering (Stays, Activities, Transit, Flights), and camera centroid fitting.
- **Web Platform**:
  - `VoyaroMapView.web.tsx` renders a lightweight coordinates grid and destination dashboard to guarantee 100% build compatibility and zero crash risk where native Google/Apple MapView cannot run.
- **Location Permissions & Ephemeral GPS**:
  - `expo-location` used for single-shot, foreground-only location centering. Ephemeral, never persisted to Supabase.

### Available Itinerary Location Data
| Itinerary Item Type | Coordinates Available | Storage in Database |
|---|---|---|
| **Hotel / Lodging** | Single Point (`latitude`, `longitude`) | Nullable `FLOAT` columns on `itinerary_items` |
| **Activity / Sightseeing** | Single Point (`latitude`, `longitude`) | Nullable `FLOAT` columns on `itinerary_items` |
| **Flight** | Origin (`latitude`, `longitude`) & Destination (`endLatitude`, `endLongitude`) | Dual coordinate pairs on `itinerary_items` |
| **Transportation (Train/Bus/Car)** | Origin (`latitude`, `longitude`) & Destination (`endLatitude`, `endLongitude`) | Dual coordinate pairs on `itinerary_items` |

All coordinates are constrained to valid geographic limits ($-90 \le \text{lat} \le 90$ and $-180 \le \text{lng} \le 180$). Coordinates are strictly optional, never fabricated, and user-editable.

---

## 3. Routing Provider Cost, Security & Billing Analysis

Before implementing a routing provider, Voyaro evaluated the 4 major routing services:

### A. Google Maps Directions / Routes API
- **API & Pricing**:
  - Legacy Directions API: **$5.00 per 1,000 requests** ($0.005 / request).
  - New Routes API (Basic): **$5.00 per 1,000 requests**.
  - Routes API (Advanced with traffic/toll info): **$15.00 per 1,000 requests**.
  - Google Cloud provides a $200/month recurring credit across all Google Maps Platform APIs.
- **Billing Requirements**:
  - Mandatory Google Cloud Platform (GCP) Billing Account tied to a verified business credit card.
  - Usage stops or charges card if monthly threshold is exceeded.
- **Key Restrictions & Security**:
  - Android API keys can be restricted to package name (`com.voyaro.app`) + SHA-1 certificate fingerprint.
  - iOS keys can be restricted to iOS Bundle ID.
  - **Critical Risk**: Web builds (`expo export -p web`) and Expo Go development cannot enforce native bundle restrictions. Any key embedded in client JavaScript can be extracted and used by bad actors.
- **Server Proxy Requirement**: **MANDATORY**. A backend proxy (e.g. Supabase Edge Function) must authenticate the Supabase user JWT, sign the request to GCP, and enforce rate limits.

### B. Mapbox Directions API
- **API & Pricing**:
  - Free tier: First **100,000 requests/month free**.
  - Pay-as-you-go: **$0.50 per 1,000 requests** (from 100k to 500k), scaling down to $0.40/1k thereafter.
- **Billing Requirements**:
  - Credit card required for account verification and scaling beyond the 100k monthly tier.
- **Key Restrictions & Security**:
  - Public tokens (`pk...`) can be URL-restricted for web, but URL restrictions do NOT apply to native mobile HTTP calls.
  - Secret tokens (`sk...`) must never be bundled into mobile binaries.
- **Server Proxy Requirement**: **MANDATORY**. Mobile requests must route through a protected gateway.

### C. OpenRouteService (ORS)
- **API & Pricing**:
  - Free plan: **2,000 requests/day**, max 40 requests/minute.
  - Commercial plans: €40 to €1,200/month.
- **Billing Requirements**:
  - Free plan requires developer registration; strict daily quota caps.
- **Key Restrictions & Security**:
  - 2,000 requests/day will quickly be exhausted by normal multi-user app traffic.
- **Server Proxy Requirement**: **MANDATORY** with aggressive server-side caching to survive quota limits.

### D. Open Source Routing Machine (OSRM)
- **API & Pricing**:
  - Public demo server (`router.project-osrm.org`): $0, but **strictly prohibits production app usage** in Terms of Service.
  - Self-Hosted OSRM (Docker): Infrastructure costs only (~$20–$50/month for a dedicated VPS running regional OpenStreetMap data).
- **Billing Requirements**:
  - None if self-hosted on an existing server.
- **Key Restrictions & Security**:
  - Requires maintaining server infrastructure, updating OSM PBF maps, and pre-processing graph algorithms (`osrm-extract`, `osrm-contract`).
- **Server Proxy Requirement**: **MANDATORY**. The mobile app should only speak to Voyaro's authenticated backend.

---

## 4. Architecture & Implementation in Voyaro

To fulfill all requirements while safeguarding credentials and preventing billing overruns:

```
┌─────────────────────────────────────────────────────────────┐
│                      Voyaro Mobile App                      │
│                                                             │
│  1. User selects 2 locations (or opens Transit Item)         │
│  2. Checks: isRouteProviderConfigured()?                    │
│                                                             │
│       ├── YES (Configured Backend Proxy)                     │
│       │     └── Queries Supabase Edge Function Proxy        │
│       │     └── Caches geometry in routeCache               │
│       │     └── Renders real road <Polyline> on MapView     │
│       │                                                     │
│       └── NO (Default MVP Zero-Cost State)                  │
│             └── Does NOT fabricate straight lines           │
│             └── Shows informative dialog explaining config  │
│             └── Offers 1-tap "Open Route in Maps"           │
│                   ├── Apple Maps (iOS): maps:?saddr=...     │
│                   └── Google Maps (Android/Web): .../dir/?  │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Safeguards
1. **Never Invent Road Geometry**: If routing geometry is unavailable, Voyaro strictly avoids connecting points with a straight line. Straight lines represent straight Euclidean distance, not driveable road geometry, and would mislead travelers.
2. **In-Memory Query Cache (`routeCache`)**:
   - Cache key: `${originLat},${originLng}->${destLat},${destLng}:${mode}`
   - If a user changes views or toggles markers, existing geometry is reused instantly without redundant network calls.
3. **Zero Secret Leakage**:
   - `isRouteProviderConfigured()` checks `process.env.EXPO_PUBLIC_ROUTING_PROXY_URL`.
   - In the absence of a configured proxy, the app cleanly documents the limitation and falls back to external maps without crashing.
4. **Out-of-Bounds & Missing Coordinate Handling**:
   - Coordinates outside $[-90, 90]$ or $[-180, 180]$ are rejected with clear error feedback.

---

## 5. Summary of Scope Boundaries

- **Turn-by-turn live voice navigation**: Out of scope for in-app display (handled by native Google Maps / Apple Maps).
- **Automatic traveling-salesman route optimization**: Out of scope for MVP.
- **Unproxied API keys**: Strictly prohibited.
