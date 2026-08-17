const path = require("path");
const { execFile } = require("child_process");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const PORT = process.env.PORT || 3001;
const CACHE_TTL_MS = 5 * 60 * 1000;
// Set when mounted under a path prefix behind a shared-host Ingress (e.g.
// "/downloads"). All links/routes are built from this so the page works
// correctly at a sub-path, not just at the domain root. Leave unset to run
// at "/" (e.g. local dev).
const BASE_PATH = (process.env.BASE_PATH || "").replace(/\/+$/, "");

const EAS_BIN = path.join(__dirname, "..", "node_modules", ".bin", "eas");
const EAS_PROJECT_DIR = path.join(__dirname, "..", "eas-project");

const PROFILE = "production";
let cache = null;

function fetchLatestBuild() {
  return new Promise((resolve, reject) => {
    execFile(
      EAS_BIN,
      ["build:list", "-p", "android", "-e", PROFILE, "--status", "finished", "--limit", "1", "--json", "--non-interactive"],
      { cwd: EAS_PROJECT_DIR, env: process.env, maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        try {
          const list = JSON.parse(stdout);
          resolve(list[0] || null);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

async function getLatestBuild() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
  const data = await fetchLatestBuild();
  cache = { data, fetchedAt: Date.now() };
  return data;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatDate(iso) {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function renderCard(result) {
  if (result.status === "error") {
    return `
      <section class="card">
        <h2>Production</h2>
        <p class="blurb">Signed release APK. Install this for everyday use.</p>
        <p class="error">Couldn't load build info right now. Try again shortly.</p>
      </section>`;
  }

  const build = result.build;
  if (!build) {
    return `
      <section class="card">
        <h2>Production</h2>
        <p class="blurb">Signed release APK. Install this for everyday use.</p>
        <p class="empty">No finished build yet.</p>
      </section>`;
  }

  const expired = build.expirationDate && new Date(build.expirationDate).getTime() < Date.now();
  const commitShort = build.gitCommitHash ? build.gitCommitHash.slice(0, 7) : null;

  return `
    <section class="card">
      <h2>Production</h2>
      <p class="blurb">Signed release APK. Install this for everyday use.</p>
      <dl class="meta">
        <dt>Version</dt><dd>${escapeHtml(build.appVersion || "?")} (build ${escapeHtml(build.appBuildVersion || "?")})</dd>
        <dt>Built</dt><dd>${formatDate(build.createdAt)}</dd>
        ${commitShort ? `<dt>Commit</dt><dd><code>${escapeHtml(commitShort)}</code> ${escapeHtml(build.gitCommitMessage || "")}</dd>` : ""}
        <dt>Expires</dt><dd>${formatDate(build.expirationDate)}</dd>
      </dl>
      ${
        expired
          ? `<p class="error">This build's download link has expired. Trigger a new EAS build.</p>`
          : `<a class="download" href="${BASE_PATH}/download/production">Download APK</a>`
      }
    </section>`;
}

const PAGE_CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(160deg, #1a1730 0%, #241b3d 55%, #2c1f4a 100%);
    color: #f1eefc;
    padding: clamp(20px, 6vw, 48px) 16px;
  }
  header { max-width: 440px; margin: 0 auto clamp(20px, 5vw, 32px); text-align: center; }
  header h1 { font-size: clamp(1.4rem, 4vw, 1.8rem); margin: 0 0 6px; }
  header p { margin: 0; color: #b8b0d9; font-size: 0.95rem; }
  main { max-width: 440px; margin: 0 auto; }
  .card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: clamp(18px, 5vw, 26px);
  }
  .card h2 { margin: 0 0 4px; font-size: 1.2rem; }
  .blurb { margin: 0 0 14px; color: #b8b0d9; font-size: 0.88rem; }
  .meta { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0 0 16px; font-size: 0.88rem; }
  .meta dt { color: #9086b8; }
  .meta dd { margin: 0; color: #e7e3f7; word-break: break-word; }
  .meta code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 4px; }
  .download {
    display: inline-block;
    width: 100%;
    text-align: center;
    padding: 12px 18px;
    border-radius: 10px;
    background: linear-gradient(90deg, #5B52F0, #8338EC);
    color: #fff;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
  }
  .download:active { opacity: 0.85; }
  .error { color: #ff9b9b; font-size: 0.88rem; margin: 0; }
  .empty { color: #9086b8; font-size: 0.88rem; margin: 0; }
  footer { max-width: 440px; margin: 24px auto 0; text-align: center; color: #736a97; font-size: 0.78rem; }
`;

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet());

const pageLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

// Not prefixed: k8s probes hit the pod directly on its containerPort,
// bypassing the Ingress and its path prefix entirely.
app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.get(`${BASE_PATH}/style.css`, (_req, res) => {
  res.set("Content-Type", "text/css; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(PAGE_CSS);
});

const indexPaths = BASE_PATH ? [BASE_PATH, `${BASE_PATH}/`] : ["/"];

app.get(indexPaths, pageLimiter, async (_req, res) => {
  let result;
  try {
    result = { status: "ok", build: await getLatestBuild() };
  } catch (err) {
    console.error("[downloads-site] failed to load latest build:", err.message);
    result = { status: "error" };
  }

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>TCG Calendar App — Download</title>
  <link rel="stylesheet" href="${BASE_PATH}/style.css" />
</head>
<body>
  <header>
    <h1>TCG Calendar App</h1>
    <p>Latest Android build, pulled live from EAS.</p>
  </header>
  <main>
    ${renderCard(result)}
  </main>
  <footer>Refreshes automatically — the link always points at the newest finished build.</footer>
</body>
</html>`);
});

app.get(`${BASE_PATH}/download/:profile`, pageLimiter, async (req, res) => {
  if (req.params.profile !== PROFILE) return res.status(404).send("Unknown build profile.");

  let build;
  try {
    build = await getLatestBuild();
  } catch (err) {
    console.error("[downloads-site] failed to load latest build:", err.message);
    return res.status(502).send("Failed to fetch build info. Try again shortly.");
  }
  if (!build) return res.status(404).send("No finished build available yet.");
  if (build.expirationDate && new Date(build.expirationDate).getTime() < Date.now()) {
    return res.status(410).send("This build's download link has expired. Trigger a new EAS build.");
  }
  const url = build.artifacts && build.artifacts.buildUrl;
  if (!url) return res.status(404).send("Build has no downloadable artifact.");
  res.redirect(302, url);
});

app.listen(PORT, () => {
  console.log(`downloads-site listening on :${PORT}`);
});
