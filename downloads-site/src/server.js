const path = require("path");
const { execFile } = require("child_process");
const express = require("express");

const PORT = process.env.PORT || 3001;
const CACHE_TTL_MS = 5 * 60 * 1000;

const EAS_BIN = path.join(__dirname, "..", "node_modules", ".bin", "eas");
const EAS_PROJECT_DIR = path.join(__dirname, "..", "eas-project");

const PROFILES = ["production", "development"];
const cache = {};

function fetchLatestBuild(profile) {
  return new Promise((resolve, reject) => {
    execFile(
      EAS_BIN,
      ["build:list", "-p", "android", "-e", profile, "--status", "finished", "--limit", "1", "--json", "--non-interactive"],
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

async function getLatestBuild(profile) {
  const cached = cache[profile];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;
  const data = await fetchLatestBuild(profile);
  cache[profile] = { data, fetchedAt: Date.now() };
  return data;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatDate(iso) {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

const PROFILE_LABELS = {
  production: { title: "Production", blurb: "Signed release APK. Install this for everyday use." },
  development: { title: "Development", blurb: "Dev-client build. Requires `npx expo start --dev-client` to run the JS bundle." },
};

function renderCard(profile, result) {
  const label = PROFILE_LABELS[profile];

  if (result.status === "error") {
    return `
      <section class="card">
        <h2>${label.title}</h2>
        <p class="blurb">${label.blurb}</p>
        <p class="error">Couldn't load build info: ${escapeHtml(result.message)}</p>
      </section>`;
  }

  const build = result.build;
  if (!build) {
    return `
      <section class="card">
        <h2>${label.title}</h2>
        <p class="blurb">${label.blurb}</p>
        <p class="empty">No finished build yet.</p>
      </section>`;
  }

  const expired = build.expirationDate && new Date(build.expirationDate).getTime() < Date.now();
  const commitShort = build.gitCommitHash ? build.gitCommitHash.slice(0, 7) : null;

  return `
    <section class="card">
      <h2>${label.title}</h2>
      <p class="blurb">${label.blurb}</p>
      <dl class="meta">
        <dt>Version</dt><dd>${escapeHtml(build.appVersion || "?")} (build ${escapeHtml(build.appBuildVersion || "?")})</dd>
        <dt>Built</dt><dd>${formatDate(build.createdAt)}</dd>
        ${commitShort ? `<dt>Commit</dt><dd><code>${escapeHtml(commitShort)}</code> ${escapeHtml(build.gitCommitMessage || "")}</dd>` : ""}
        <dt>Expires</dt><dd>${formatDate(build.expirationDate)}</dd>
      </dl>
      ${
        expired
          ? `<p class="error">This build's download link has expired. Trigger a new EAS build.</p>`
          : `<a class="download" href="/download/${profile}">Download APK</a>`
      }
    </section>`;
}

const PAGE_STYLE = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(160deg, #1a1730 0%, #241b3d 55%, #2c1f4a 100%);
    color: #f1eefc;
    padding: 24px 16px 48px;
  }
  header { max-width: 640px; margin: 0 auto 28px; text-align: center; }
  header h1 { font-size: 1.6rem; margin: 0 0 6px; }
  header p { margin: 0; color: #b8b0d9; font-size: 0.95rem; }
  main { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
  .card {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 20px 22px;
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
  footer { max-width: 640px; margin: 28px auto 0; text-align: center; color: #736a97; font-size: 0.78rem; }
`;

async function loadAll() {
  const results = {};
  await Promise.all(
    PROFILES.map(async (profile) => {
      try {
        const build = await getLatestBuild(profile);
        results[profile] = { status: "ok", build };
      } catch (err) {
        results[profile] = { status: "error", message: err.message };
      }
    })
  );
  return results;
}

const app = express();

app.get("/healthz", (_req, res) => res.status(200).send("ok"));

app.get("/", async (_req, res) => {
  const results = await loadAll();
  const cards = PROFILES.map((profile) => renderCard(profile, results[profile])).join("\n");
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TCG Calendar App — Builds</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <header>
    <h1>TCG Calendar App</h1>
    <p>Latest Android builds, pulled live from EAS.</p>
  </header>
  <main>
    ${cards}
  </main>
  <footer>Refreshes automatically — links always point at the newest finished build.</footer>
</body>
</html>`);
});

app.get("/download/:profile", async (req, res) => {
  const profile = req.params.profile;
  if (!PROFILES.includes(profile)) return res.status(404).send("Unknown build profile.");

  let build;
  try {
    build = await getLatestBuild(profile);
  } catch (err) {
    return res.status(502).send(`Failed to fetch build info: ${err.message}`);
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
