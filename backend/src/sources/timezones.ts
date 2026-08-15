// FAB's API always serializes start_time with a "+12:00" offset regardless of
// the event's actual country (Legend Story Studios is NZ-based, UTC+12/+13) —
// confirmed empirically across HU/CZ/AT results returning identical bogus offsets.
// We strip that offset and treat the digits as the venue's local wall-clock time,
// then convert to a real UTC instant using the country's actual IANA time zone.
export const COUNTRY_TIMEZONE: Record<string, string> = {
  RO: "Europe/Bucharest",
  HU: "Europe/Budapest",
  RS: "Europe/Belgrade",
  HR: "Europe/Zagreb",
  SI: "Europe/Ljubljana",
  SK: "Europe/Bratislava",
  CZ: "Europe/Prague",
  PL: "Europe/Warsaw",
  AT: "Europe/Vienna",
  BG: "Europe/Sofia",
  UA: "Europe/Kyiv",
  DE: "Europe/Berlin",
  IT: "Europe/Rome",
  BA: "Europe/Sarajevo",
  ME: "Europe/Podgorica",
  MK: "Europe/Skopje",
  MD: "Europe/Chisinau",
};

const DEFAULT_TIMEZONE = "Europe/Bucharest";

export function resolveTimeZone(countryCode: string | null | undefined): string {
  if (countryCode && COUNTRY_TIMEZONE[countryCode]) return COUNTRY_TIMEZONE[countryCode];
  if (countryCode) {
    console.warn(`[timezones] Unmapped country code "${countryCode}", defaulting to ${DEFAULT_TIMEZONE}`);
  }
  return DEFAULT_TIMEZONE;
}

/** Strips any trailing "+HH:MM"/"-HH:MM"/"Z" suffix, leaving a naive local datetime string. */
export function stripOffset(isoLike: string): string {
  return isoLike.replace(/(Z|[+-]\d{2}:\d{2})$/, "");
}

/**
 * Converts a naive "YYYY-MM-DDTHH:mm:ss" wall-clock string in the given IANA
 * time zone into a correct UTC ISO instant, accounting for DST.
 */
export function zonedNaiveToUtcIso(naive: string, timeZone: string): string {
  const guess = new Date(`${naive}Z`);
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(guess).map((p) => [p.type, p.value]));
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = guess.getTime() - asIfUtc;
  return new Date(guess.getTime() + offsetMs).toISOString();
}
