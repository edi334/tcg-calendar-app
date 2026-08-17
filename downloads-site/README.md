# TCG Calendar App — Downloads Site

A tiny, standalone website that shows the latest finished **production**
Android build from EAS and lets you download the APK directly. It queries
EAS live on each page load (5 min cache), so it never goes stale — no
redeploy needed when you cut a new build.

It's a plain Express server (`src/server.js`), no build step, no framework.
Responsive down to small phones and centered/readable on desktop.

## Public-internet hardening

This is meant to be reachable from the open internet with no login (the
question of whether an APK link needs a password came up while building it —
the APK doesn't contain any secrets: everything baked into the client bundle
is `EXPO_PUBLIC_*`/Firebase config that's meant to be public). Given that, it
ships with:

- `helmet` — CSP, `X-Frame-Options`, HSTS, and the other standard security
  headers, all served from a same-origin `/style.css` (no inline `<style>`,
  so the default CSP needs no relaxing).
- `express-rate-limit` — 30 req/min/IP on `/` and `/download/:profile`.
  `/healthz` is excluded so k8s liveness/readiness probes aren't throttled.
- `app.set("trust proxy", 1)` so rate limiting reads the real client IP from
  behind your ingress instead of the ingress's own IP. Adjust the hop count
  if you ever add another proxy layer in front.
- Sanitized errors — subprocess/`eas-cli` failures are logged server-side
  only; the client gets a generic message, never raw stderr.
- `<meta name="robots" content="noindex, nofollow">` so it doesn't end up in
  search results.
- Minimal attack surface: three routes total (`/`, `/download/:profile`,
  `/healthz`), no body parsing, no static file serving, no user input reaches
  the `eas-cli` subprocess call (the profile is a fixed constant, not passed
  through from the request).

`npm audit` currently reports 18 vulnerabilities, all transitive deps of
`eas-cli` itself (ajv, jsdiff, joi, minimatch, nanoid, tar — config-parsing
tooling). None of them sit on a path this server ever exercises with
attacker-controlled input, since `eas build:list` is always called with the
same fixed args against the bundled project. Not treating these as
actionable unless `eas-cli` ships a fix upstream.

## How it finds builds

It shells out to `eas build:list` using a bundled minimal "project" under
`eas-project/` (just enough `app.json`/`eas.json` for eas-cli to resolve the
project — no real app code). Auth is via the `EXPO_TOKEN` environment
variable, which eas-cli picks up automatically in non-interactive mode.

## Required config

- `EXPO_TOKEN` — an EAS **Personal Access Token** (or a Robot token scoped to
  this project). Create one at https://expo.dev/accounts/edi334/settings/access-tokens
  and hand it to the container as a secret env var. **Never commit this.**
- `PORT` — optional, defaults to `3001`.
- `BASE_PATH` — optional, e.g. `/downloads`. Set this when the site is routed
  behind an Ingress on a shared host at a sub-path rather than the domain
  root — every link/route in the page is built from it, so it works
  correctly either way. Leave unset to serve at `/`.

## Local run

```bash
npm install
EXPO_TOKEN=... npm start
```

## Build + push image

```bash
./build.sh
```

Pushes `188.34.177.197:32000/tcg-calendar-app-downloads:latest`, matching the
backend's image registry.

## Deploying

No k8s manifests live in this repo (by design — see the backend's notes).
Deploy manually the same way as the backend: a Deployment running this image
exposing port `3001`, with `EXPO_TOKEN` set from a Secret, plus a Service/
Ingress to expose it.
