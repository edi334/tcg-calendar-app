# TCG Calendar App — Downloads Site

A tiny, standalone website that shows the latest finished **production** and
**development** Android builds from EAS and lets you download the APK
directly. It queries EAS live on each page load (5 min cache), so it never
goes stale — no redeploy needed when you cut a new build.

It's a plain Express server (`src/server.js`), no build step, no framework.

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
