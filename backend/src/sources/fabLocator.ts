import { fetch as undiciFetch, ProxyAgent } from "undici";
import { config } from "../config.js";
import type { EventType, NormalizedEvent } from "./normalize.js";
import { resolveTimeZone, stripOffset, zonedNaiveToUtcIso } from "./timezones.js";

const API_ROOT = "https://fabtcg.com/api/fab/v1/locator/events/";

// FAB's event-type titles rotate per set/season (e.g. "Usurp the Shadow Throne
// Pre-Release", "Skirmish Season 15"), so we match by keyword rather than exact
// title — unlike Wizards, which has stable category tags.
const TYPE_KEYWORDS: Array<{ keyword: string; eventType: EventType }> = [
  { keyword: "pre-release", eventType: "prerelease" },
  { keyword: "skirmish", eventType: "skirmish" },
  { keyword: "pro quest", eventType: "pro_quest" },
];

function matchEventType(tournamentType: string): EventType | null {
  const lower = tournamentType.toLowerCase();
  return TYPE_KEYWORDS.find(({ keyword }) => lower.includes(keyword))?.eventType ?? null;
}

interface FabRawEvent {
  id: number;
  organiser_name: string;
  tournament_type: string;
  nickname: string;
  start_time: string;
  address: string;
  event_link: string | null;
  status: string;
  format_name: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  distance: number | null;
  distance_unit: string | null;
}

interface FabEventsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FabRawEvent[];
}

const REQUEST_HEADERS = {
  "Accept-Language": "en",
  // The API 403s without a browser-like UA.
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

// fabtcg.com's origin blocks known hosting/datacenter IP ranges outright
// (bare 403 at the load balancer — confirmed this isn't a header issue).
// If FAB_PROXY_URL is set, route through it instead of connecting directly.
// Uses undici's own fetch rather than Node's global fetch here — Node's
// global fetch runs on its own bundled/vendored undici internals, which
// don't reliably accept a dispatcher built by the separately-installed
// undici package (mismatched internal request/dispatcher protocol versions).
const proxyAgent = config.fabProxyUrl ? new ProxyAgent(config.fabProxyUrl) : undefined;

async function fetchJson(url: string): Promise<FabEventsResponse> {
  const res = await undiciFetch(url, { headers: REQUEST_HEADERS, dispatcher: proxyAgent });
  if (!res.ok) {
    throw new Error(`FAB locator responded ${res.status} for ${url}`);
  }
  return res.json() as Promise<FabEventsResponse>;
}

function toDistanceKm(distance: number | null, unit: string | null): number | null {
  if (distance == null) return null;
  if (unit === "mi") return distance * 1.60934;
  return distance; // API has only ever been observed to return "km"
}

// The locator has no per-event permalink page, but its client-side router
// will deep-link straight to an event's detail modal given tab=event +
// eventId — as long as `search` also returns that event in its result set
// (eventId alone, with no search term, silently falls back to the generic
// "near you" list). The event's own address reliably surfaces it.
function buildLocatorUrl(ev: FabRawEvent): string {
  const params = new URLSearchParams({
    tab: "event",
    privateMode: "false",
    search: ev.address,
    eventId: String(ev.id),
  });
  return `https://fabtcg.com/locator/?${params}`;
}

function normalize(ev: FabRawEvent, eventType: EventType): NormalizedEvent {
  const timezone = resolveTimeZone(ev.country);
  const naiveStart = stripOffset(ev.start_time);
  return {
    id: `fab-${ev.id}`,
    game: "fab",
    eventType,
    title: ev.nickname || ev.tournament_type,
    storeName: ev.organiser_name,
    address: ev.address,
    country: ev.country,
    lat: ev.lat,
    lng: ev.lon,
    startTime: zonedNaiveToUtcIso(naiveStart, timezone),
    timezone,
    distanceKm: toDistanceKm(ev.distance, ev.distance_unit),
    priceAmount: null,
    priceCurrency: null,
    format: ev.format_name,
    // Prefer the organizer's own listing (often a Facebook event) when the
    // source gives us one — otherwise fall back to a deep link into the
    // locator itself, which always works (see buildLocatorUrl above).
    sourceUrl: ev.event_link ?? buildLocatorUrl(ev),
  };
}

export async function fetchFabEvents(): Promise<NormalizedEvent[]> {
  const first = new URL(API_ROOT);
  first.searchParams.set("search", config.originQuery);
  first.searchParams.set("mode", "event");
  first.searchParams.set("distance", String(config.radiusKm));
  first.searchParams.set("page", "1");

  const rawEvents: FabRawEvent[] = [];
  let nextUrl: string | null = first.toString();
  while (nextUrl) {
    const data: FabEventsResponse = await fetchJson(nextUrl);
    rawEvents.push(...data.results);
    nextUrl = data.next;
  }

  const normalized: NormalizedEvent[] = [];
  for (const ev of rawEvents) {
    const eventType = matchEventType(ev.tournament_type);
    if (!eventType) continue;
    normalized.push(normalize(ev, eventType));
  }
  return normalized;
}
