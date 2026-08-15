import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  originQuery: process.env.ORIGIN_QUERY ?? "Timisoara, Romania",
  // One radius for both sources, in km. FAB's locator API takes km directly;
  // Wizards' takes miles, so wizardsLocator.ts converts at the call site.
  radiusKm: Number(process.env.RADIUS_KM ?? 500),
  syncToken: process.env.SYNC_TOKEN ?? "change-me",
  // Google OAuth client IDs — the Web/iOS/Android app each gets its own client
  // in Google Cloud Console (a "Web application" client can't accept a native
  // custom-scheme redirect, so these are necessarily separate). Any ID token
  // whose audience matches one of these is accepted. See README for setup.
  // Sign-in fails clearly at request time until at least one is set; it
  // doesn't block boot so the rest of the app keeps working without it.
  googleClientIds: [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter((id): id is string => !!id),
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  // Runs pending Drizzle migrations before the server starts listening.
  // Defaults on so a fresh deploy just works. Turn off with
  // RUN_MIGRATIONS_ON_STARTUP=false when running multiple replicas (so N
  // pods don't race to migrate at once) and instead run `npm run db:migrate`
  // — or a dedicated init container / K8s Job — once, before rollout.
  runMigrationsOnStartup: process.env.RUN_MIGRATIONS_ON_STARTUP !== "false",
  // fabtcg.com's origin blocks requests from known hosting/datacenter IP
  // ranges (returns a bare 403 at the load balancer, no header combination
  // gets around it — confirmed by testing the same request from a
  // residential IP, which succeeds). If set, FAB requests are routed through
  // this HTTP/HTTPS/SOCKS proxy (e.g. a VPN or proxy exit with a
  // non-datacenter IP) instead of connecting directly. Unset by default.
  fabProxyUrl: process.env.FAB_PROXY_URL,
};

if (config.jwtSecret === "change-me") {
  console.warn("[config] JWT_SECRET is unset — using an insecure default. Set it before going to production.");
}
if (config.googleClientIds.length === 0) {
  console.warn("[config] No GOOGLE_*_CLIENT_ID is set — Google sign-in will fail until at least one is configured.");
}
