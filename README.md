# TCG Calendar App

A calendar for Magic: The Gathering and Flesh and Blood tabletop events happening
between Timișoara, Romania and Vienna, Austria — filtered to just the event types
that matter:

- **Magic**: Prerelease, Regional Championship Qualifier, Store Championship
- **Flesh and Blood**: Prerelease, Skirmish, Pro Quest

Sign in with Google to set a home address and build **Trips** — named groups of
one or more events — with a one-tap "Drive there" button that opens Google Maps
with a driving route from home through every store in the trip, so you can chain
a weekend of events into one drive.

Two parts:

- **`backend/`** — a small Node/TypeScript service that pulls events from
  Wizards' and Legend Story Studios' own store-locator endpoints, normalizes
  them into one schema, stores them in Postgres, and serves them over a REST
  API. Also handles Google sign-in (verifies the ID token, issues its own
  session JWT) and owns the `trips`/`users` data. Fetching events runs as its
  own separate process/job (`src/jobs/runOnce.ts`), not inside the API
  server — see "Running the backend" below.
- **`app/`** — an Expo (React Native) app — iOS, Android, and Web from one
  codebase — with a month calendar view, an agenda list, filters, a Trips tab,
  and a Profile tab.

## How the data is sourced

Neither game has an official public API. Both locator websites, however, call
their own backend endpoints directly from the browser, and those turned out to
return structured data rather than requiring HTML scraping:

- **Wizards** (`locator.wizards.com`) is a React Router 7 app; its search results
  come from `GET /search.data?...`, encoded in React Router's "turbo-stream"
  wire format (decoded with the `turbo-stream` npm package). Event-type
  categories (Prerelease, RCQ, Store Championship, etc.) are stable tag slugs
  returned in the same response's taxonomy, so filtering matches on those tags
  rather than on event titles (which stores can name however they like).
- **Flesh and Blood** (`fabtcg.com/locator`) calls a plain JSON REST API at
  `fabtcg.com/api/fab/v1/locator/events/`. Event-type names rotate every
  season/set (e.g. "Usurp the Shadow Throne Pre-Release"), so filtering matches
  on keywords ("Pre-Release", "Skirmish", "Pro Quest") instead of exact titles.
  Its `start_time` field always carries a bogus `+12:00` offset regardless of
  the event's real location (Legend Story Studios is NZ-based) — the backend
  strips that and reconstructs the correct UTC instant from the venue's actual
  country time zone. Most FAB events also have no dedicated listing page at all
  (the locator is just an embedded map) — "View original listing" only appears
  when the source actually gives us a real link (e.g. a Facebook event).

These are undocumented endpoints, not a published API — if either site changes
its frontend architecture, the corresponding fetcher in `backend/src/sources/`
may need updating. Both fetchers fail independently and log a warning rather
than crash the sync job or wipe existing data if a single run comes back empty.

**If FAB sync fails with a 403 on a server deploy:** `fabtcg.com`'s origin
blocks requests from known hosting/datacenter IP ranges outright (a bare
"403 Forbidden" straight from its load balancer, not a bot-detection page —
confirmed this isn't a missing-header issue, since the exact same request
with the exact same headers succeeds from a residential IP). This is common
across cloud providers, not specific to any one host. There's no code fix for
an IP-range block; if you hit this, set `FAB_PROXY_URL` (`backend/.env.sync`
locally, or the `FAB_PROXY_URL` key in the k8s Secret on the server) to an
HTTP/HTTPS/SOCKS proxy URL — a VPN client's local proxy, or a proxy service
— with a non-datacenter exit IP, and FAB requests will route through it
instead of connecting directly. Leave it unset to connect directly (the
default); Wizards/MTG sync is unaffected either way.

## Running the backend

```bash
cd backend
cp .env.example .env
docker compose up --build
```

This starts three things: Postgres, the API server (`backend`, migrations run
automatically on boot), and `sync` — a container that runs the event fetch
once immediately and then loops every 6h (see `docker-compose.yaml`). The API
server itself never fetches events; it only serves whatever's already in the
DB. The API listens on `http://localhost:4000`.

Without Docker, point `DATABASE_URL` in `.env` at your own Postgres and run:

```bash
npm install
npm run db:migrate
npm run dev        # API server only — doesn't fetch events
npm run sync:once   # fetches events once, in a separate terminal/whenever you want fresh data
```

`npm run sync:once` (and the `sync` container above) both run
`src/jobs/runOnce.ts` — the same script the K8s CronJob runs in production
(see "Deploying to Kubernetes"). It's self-contained: it runs pending
migrations itself, fetches from both sources, upserts, prunes stale events,
sends any new-event push notifications, then exits.

`npm run sync:once` reads `backend/.env.sync` instead of `.env` (see
`.env.sync.example`) — a separate file from the API server's, so you can
point the sync job at different config (e.g. a `FAB_PROXY_URL`) without
touching what the server uses. `cp .env.sync.example .env.sync` to set it up;
it's gitignored like `.env`.

Useful endpoints (full interactive docs at `GET /api/docs`):

- `GET /api/health`
- `GET /api/events?game=mtg,fab&type=prerelease,rcq,store_championship,skirmish,pro_quest&from=&to=`
- `GET /api/events/:id`
- `GET /api/meta` — origin location + search radius
- `POST /api/sync` — manual re-sync, requires header `x-sync-token: <SYNC_TOKEN>`
- `POST /api/auth/google` — `{ idToken }` → `{ token, user }`
- `GET /api/me` / `PUT /api/me` — profile (requires `Authorization: Bearer <token>`)
- `GET/POST /api/trips`, `PATCH/DELETE /api/trips/:id`,
  `POST /api/trips/:id/events`, `DELETE /api/trips/:id/events/:eventId` — all
  require `Authorization: Bearer <token>`

Config (`backend/.env`, see `.env.example`): `ORIGIN_QUERY` and `RADIUS_KM`
control the search corridor — one radius, in km, applied to both the MTG and
FAB sources (Wizards' locator API takes miles, so the backend converts
internally); `GOOGLE_WEB_CLIENT_ID`/`GOOGLE_IOS_CLIENT_ID`/`GOOGLE_ANDROID_CLIENT_ID`
and `JWT_SECRET` control sign-in (see below); `RUN_MIGRATIONS_ON_STARTUP`
(default `true`) controls whether the API server and the sync job each run
pending migrations on startup — see the Kubernetes section for when to turn
it off. How often events get re-fetched is no longer an env var — locally
it's the `sleep` in `docker-compose.yaml`'s `sync` service, in production
it's the `CronJob`'s `schedule:` on the k8s server (see "Deploying to
Kubernetes").

## Running the app

```bash
cd app
cp .env.example .env   # EXPO_PUBLIC_API_URL, defaults to http://localhost:4000
npm install
npm run web       # or: npm run ios / npm run android
```

Note: on an Android emulator, `localhost` refers to the emulator itself, not
your host machine — set `EXPO_PUBLIC_API_URL` to `http://10.0.2.2:4000`
instead. On a physical device, use your machine's LAN IP.

## Running on your phone

The whole app requires Google sign-in now, and that interacts with how you
run it on a real device — read the note at the end before picking a path.

**1. Find your laptop's LAN IP** (so the phone can reach the backend —
`localhost` on the phone means the phone itself, not your laptop):

```bash
ipconfig getifaddr en0   # macOS, prints something like 192.168.1.42
```

**2. Point the app at your laptop** — set both of these to that IP, then
restart any running `expo start`:

```
# app/.env
EXPO_PUBLIC_API_URL=http://192.168.1.42:4000
```

Make sure the backend is actually running and reachable (`docker compose up`
in `backend/`, or `npm run dev`) — `curl http://192.168.1.42:4000/api/health`
from another device on the same network is a quick way to confirm before
involving the phone at all.

**3. Install Expo Go** on your phone — free, from the App Store (iOS) or Play
Store (Android).

**4. Start Metro and connect:**

```bash
cd app
npx expo start
```

This prints a QR code in the terminal.
- **iOS**: scan it with the Camera app.
- **Android**: scan it from inside the Expo Go app ("Scan QR code").
- Both need the phone on the **same Wi-Fi network** as your laptop.
- **Android over USB instead of Wi-Fi**: enable Developer Options →
  USB debugging on the phone, plug it in, confirm the laptop sees it with
  `adb devices`, then press `a` in the `expo start` terminal — Expo tunnels
  the connection over the cable via `adb reverse` automatically. iOS has no
  equivalent for Expo Go; it needs Wi-Fi (or `npx expo start --tunnel`, which
  works over any network but is slower to load).

**⚠️ Google sign-in likely won't work inside Expo Go itself.** Expo Go
redirects OAuth back into the app via its own `exp://...` URL scheme, and the
Google OAuth client you created is a **Web application** client — Google only
allows `http`/`https` redirect URIs for that client type, not `exp://`. So
you'll hit the sign-in screen, but tapping the button will fail.

Two ways around it:
- **Easiest today**: open the **web** build in your phone's browser instead
  of using Expo Go — `npm run web` on the laptop, then visit
  `http://192.168.1.42:8081` in Safari/Chrome on the phone (same Wi-Fi). Add
  that same URL as an extra Authorized JavaScript origin *and* redirect URI
  on your existing Web OAuth client in Google Cloud Console, next to
  `http://localhost:8081`. No new Google Cloud setup beyond that one line.
- **True native app later**: create the iOS/Android OAuth client types (see
  "Google sign-in setup" above) and build a custom dev client with EAS Build
  or Xcode/Android Studio — Expo Go can't use those either, only a real
  native build can.

## Google sign-in setup

There's no password system — just Google. This needs one thing from you that
I can't do on your behalf: a Google Cloud OAuth client. It's free (no billing,
no Maps/Directions API key needed — "Drive there" uses Google's free public
Maps deep-link URLs).

1. Go to [console.cloud.google.com](https://console.cloud.google.com/), create
   or pick a project.
2. **APIs & Services → OAuth consent screen**: choose "External", fill in an
   app name and your email as support/developer contact. Leave it in
   "Testing" status and add your own Google account under "Test users" — no
   need to publish or verify it for personal use.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Type **Web application**.
   - Authorized JavaScript origins: `http://localhost:8081`
   - Authorized redirect URIs: `http://localhost:8081`
     (if sign-in fails, Expo/Google's error page shows the exact redirect URI
     it actually used — add that literal value if it differs)
   - Save, copy the client ID (`xxxx.apps.googleusercontent.com`) into
     **both** `backend/.env`'s `GOOGLE_WEB_CLIENT_ID` and `app/.env`'s
     `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
4. That's enough to sign in via `npm run web`. iOS/Android need their own
   OAuth client (type "iOS"/"Android", no secret, keyed to the app's bundle
   ID/package name) once you're ready to test native builds — same
   Credentials page, then fill `GOOGLE_IOS_CLIENT_ID`/`GOOGLE_ANDROID_CLIENT_ID`
   (backend) and their `EXPO_PUBLIC_...` counterparts (app).

Also set `JWT_SECRET` in `backend/.env` to a long random string — this signs
the app's own 30-day session tokens after Google verification.

A Web application client ID is already wired into `backend/.env` and
`app/.env` for local dev. The Google Cloud Console download also includes a
`client_secret` — that's for server-side authorization-code exchange, which
this app doesn't use (the app requests an ID token directly and the backend
verifies it), so the secret is never referenced anywhere in this repo. Don't
paste it into either `.env` file.

## Push notifications for new events

On the Profile screen, pick which event types you care about ("Notify me
about"). Whenever the sync job adds newly-discovered events of a subscribed
type, you get **one** push notification summarizing everything new from that
sync run (e.g. "3 new events — 2 Skirmish, 1 Prerelease"), never one per
event.

How it fits together:
- `backend/src/db/schema.ts` — `notification_subscriptions` (user ↔ event
  type) and `push_tokens` (device ↔ Expo push token) tables.
- `backend/src/jobs/syncEvents.ts` — diffs which event ids are new before
  upserting, then calls `notifyNewEvents()`.
- `backend/src/notifications/notifyNewEvents.ts` — groups the new events by
  each subscribed user's chosen types and builds one summarized message per
  user (not per event).
- `backend/src/notifications/push.ts` — sends via Expo's free push API
  (`https://exp.host/--/api/v2/push/send`), no credentials or paid tier
  required.
- `app/src/components/PushNotificationRegistrar.tsx` — on native (iOS/
  Android), requests notification permission and registers the device's Expo
  push token with `POST /api/me/push-token` once signed in.

Push notifications only work in the native iOS/Android app (via a real
device or `expo-notifications`-capable build) — there's no web push support,
so the Profile screen shows a note there instead. `expo-notifications` is
also only ever imported dynamically, gated to native platforms; its web
shim isn't SSR-safe (it touches `localStorage` at import time), which is
also why `app.json`'s `web.output` is `"single"` rather than `"static"`.

## Deploying to Kubernetes

The K8s manifests aren't kept in this repo — they live only on the k8s
server, maintained by hand there. Build and push the image with `./build.sh`
(see `backend/build.sh`), then apply/update manifests directly on the server.

What's deployed there: a `Namespace` (`tcg-calendar-app`), a `ConfigMap` +
`Secret` (`backend-config`/`backend-secrets`, env-injected into both
resources below via `envFrom`), a `Deployment`/`Service` for the API server,
and a `CronJob` (`sync-events`) that runs `node dist/jobs/runOnce.js` on a
schedule to fetch events — the API server itself never fetches, it only
serves what's already in Postgres. `RUN_MIGRATIONS_ON_STARTUP=true` is set
for both, each running pending migrations itself before doing anything else
(safe if both start around the same time — Drizzle's migrator takes a
Postgres advisory lock). The CronJob has `concurrencyPolicy: Forbid` so a
slow run can't overlap the next tick.

**Whenever a code change needs a new/changed ConfigMap key, Secret key, or
anything else on the server side (ports, image name, resource limits,
CronJob schedule, etc.), I'll call it out explicitly in chat** — apply it to
the live manifests yourself when that happens, rather than expecting it to
already be reflected anywhere in this repo.

To trigger a sync manually (e.g. right after a fresh deploy, instead of
waiting for the schedule):

```bash
kubectl create job --from=cronjob/sync-events sync-events-manual -n tcg-calendar-app
kubectl logs -n tcg-calendar-app -l job-name=sync-events-manual --follow
```

## Project layout

```
backend/src/
  sources/        wizardsLocator.ts, fabLocator.ts, normalize.ts, timezones.ts
  db/             Drizzle schema (events, users, trips, tripEvents) + Postgres client + migration runner
  jobs/           syncEvents.ts (fetch → normalize → upsert → prune stale → notify),
                  runOnce.ts (standalone entrypoint — migrate, sync once, exit;
                  run by the K8s CronJob, the docker-compose sync service, or
                  `npm run sync:once` by hand)
  notifications/  push.ts (Expo push API), notifyNewEvents.ts (batches new
                  events per user's subscribed types into one notification)
  auth/           google.ts (verify ID token), jwt.ts (session tokens), middleware.ts (requireAuth)
  api/            Express app + routes (events, auth, me, trips) + OpenAPI spec — serves only, never fetches
app/
  app/           expo-router screens: (tabs)/index (calendar), (tabs)/trips,
                 (tabs)/profile, event/[id], trip/[id]
  src/           api client + react-query hooks, components, theme, auth/filter state
```

## Verification notes

Both fetchers and the full sync → Postgres → API → app pipeline were exercised
against the live sites during development (real events across all 6 target
types, correct venue-local time conversion, working filters, working event
detail links, working Trips flow including "Drive there" URL construction).

Trip persistence was verified against a **real** Postgres, not just an
in-memory stand-in: `docker compose up --build` end to end (migrations ran,
sync populated real events), then a trip was created through the live API,
the `backend` container was fully restarted, and the trip was still there
afterward — confirming it's actually landing in the `postgres_data` volume
and not just process memory.

The Google sign-in *button* itself couldn't be exercised end-to-end in this
environment (no way to complete an interactive Google consent screen here);
`/api/auth/google` was verified to correctly reject malformed/absent tokens
with a 401 rather than crashing, and the client ID is now wired in on both
sides — worth a real click-through on your end.

The iOS build specifically wasn't verified on-device — this machine only has
the Xcode command-line tools, not a full Xcode install, so the Simulator
wasn't available this session. `npm run ios` should work once Xcode is
installed; the app uses only standard Expo/React Native APIs.
