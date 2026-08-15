import { decode } from "turbo-stream";
import { config } from "../config.js";
import type { EventType, NormalizedEvent } from "./normalize.js";

// Server clamps pageSize to 100 regardless of what's requested (observed empirically).
const PAGE_SIZE = 100;

const KM_TO_MILES = 0.621371;

// Wizards' locator API takes miles; config.radiusKm is always km, so convert
// here at the call site rather than exposing two units in config.
function radiusMilesForWizards(): number {
  return Math.round(config.radiusKm * KM_TO_MILES);
}

const TARGET_TYPE_NAMES: Record<string, EventType> = {
  Prerelease: "prerelease",
  "Regional Championship Qualifier": "rcq",
  "Store Championship": "store_championship",
};

// Fallback slugs in case the taxonomy lookup below ever fails to resolve one of
// TARGET_TYPE_NAMES (e.g. Wizards renames a category) — keeps the sync alive
// with best-effort filtering instead of silently returning zero events.
const FALLBACK_TAG_TO_TYPE: Record<string, EventType> = {
  magic_prerelease: "prerelease",
  regional_championship_qualifier: "rcq",
  store_championship: "store_championship",
};

interface WizardsRawEvent {
  id: string;
  title: string;
  description?: string | null;
  scheduledStartTime: string;
  timeZone: string;
  tags: string[];
  entryFee: { amount: number; currency: string } | null;
  eventFormat: { id: string; name: string } | null;
  organization: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    website: string | null;
  };
  latitude: number | null;
  longitude: number | null;
  distance: number | null; // meters, from the search origin
}

interface EventTypeTaxonomyEntry {
  typeName: string;
  typeTag: { tag: string };
}

interface WizardsSearchData {
  taxonomy: { eventTypes: { eventTypes: EventTypeTaxonomyEntry[] } };
  events: {
    advancedSearchEvents: {
      events: WizardsRawEvent[];
      pageInfo: { page: number; pageSize: number; totalResults: number };
    };
  };
}

async function fetchPage(page: number): Promise<WizardsSearchData> {
  const params = new URLSearchParams({
    query: config.originQuery,
    searchType: "magic-events",
    sortBy: "date",
    sortDirection: "Asc",
    distance: String(radiusMilesForWizards()),
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  const res = await fetch(`https://locator.wizards.com/search.data?${params}`);
  if (!res.ok || !res.body) {
    throw new Error(`Wizards locator responded ${res.status}`);
  }
  const { value, done } = await decode(res.body as unknown as ReadableStream<Uint8Array>);
  await done;

  const root = value as Record<string, { data: WizardsSearchData }>;
  const routeKey = Object.keys(root).find((k) => k.endsWith(").search"));
  if (!routeKey) {
    throw new Error("Wizards locator response shape changed: could not find search route data");
  }
  return root[routeKey].data;
}

function resolveTagToType(taxonomy: EventTypeTaxonomyEntry[]): Map<string, EventType> {
  const tagToType = new Map<string, EventType>();
  for (const [typeName, eventType] of Object.entries(TARGET_TYPE_NAMES)) {
    const entry = taxonomy.find((t) => t.typeName === typeName);
    if (entry) tagToType.set(entry.typeTag.tag, eventType);
  }
  if (tagToType.size < Object.keys(TARGET_TYPE_NAMES).length) {
    console.warn(
      "[wizardsLocator] Taxonomy is missing one or more target event types; falling back to hardcoded tag slugs for the rest"
    );
    for (const [tag, eventType] of Object.entries(FALLBACK_TAG_TO_TYPE)) {
      if (![...tagToType.keys()].includes(tag)) tagToType.set(tag, eventType);
    }
  }
  return tagToType;
}

function normalize(ev: WizardsRawEvent, eventType: EventType): NormalizedEvent {
  const org = ev.organization;
  return {
    id: `wizards-${ev.id}`,
    game: "mtg",
    eventType,
    title: ev.title,
    storeName: org?.name ?? "Unknown store",
    address: [org?.address, org?.city, org?.state, org?.postalCode].filter(Boolean).join(", "),
    country: null,
    lat: ev.latitude ?? null,
    lng: ev.longitude ?? null,
    startTime: ev.scheduledStartTime,
    timezone: ev.timeZone ?? null,
    distanceKm: ev.distance != null ? ev.distance / 1000 : null,
    priceAmount: ev.entryFee ? ev.entryFee.amount / 100 : null,
    priceCurrency: ev.entryFee?.currency ?? null,
    format: ev.eventFormat?.name ?? null,
    sourceUrl: `https://locator.wizards.com/search?searchType=magic-events&eventId=${ev.id}`,
  };
}

export async function fetchWizardsEvents(): Promise<NormalizedEvent[]> {
  const first = await fetchPage(1);
  const tagToType = resolveTagToType(first.taxonomy.eventTypes.eventTypes);

  const { totalResults } = first.events.advancedSearchEvents.pageInfo;
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  const rawEvents = [...first.events.advancedSearchEvents.events];
  for (let page = 2; page <= totalPages; page++) {
    const data = await fetchPage(page);
    rawEvents.push(...data.events.advancedSearchEvents.events);
  }

  const normalized: NormalizedEvent[] = [];
  for (const ev of rawEvents) {
    const matchedTag = ev.tags.find((t) => tagToType.has(t));
    if (!matchedTag) continue;
    normalized.push(normalize(ev, tagToType.get(matchedTag)!));
  }
  return normalized;
}
