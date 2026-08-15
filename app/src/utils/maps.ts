import type { TcgEvent } from "../types";

/**
 * Builds a Google Maps multi-stop driving directions URL from a home address
 * through every store in the trip. Stops are ordered by event start time
 * (not distance-optimized) since these are scheduled events — you generally
 * can't visit a later event before an earlier one, so chronological order is
 * both the free option (no Directions API key) and the correct one.
 */
export function buildDriveThereUrl(homeAddress: string, events: TcgEvent[]): string | null {
  if (!homeAddress || events.length === 0) return null;

  const sorted = [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const stops: string[] = [];
  for (const event of sorted) {
    if (!stops.includes(event.address)) stops.push(event.address);
  }
  if (stops.length === 0) return null;

  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    origin: homeAddress,
    destination,
    travelmode: "driving",
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
