import { Router } from "express";

export const geocodeRouter = Router();

// Proxies OpenStreetMap's free Nominatim search — no API key/billing needed,
// unlike Google Places Autocomplete. Nominatim's usage policy asks for a
// real identifying User-Agent and modest request volume; the app debounces
// and requires 3+ characters before searching, which keeps us well within
// that on a personal-scale app.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "tcg-calendar-app/1.0 (personal project; address autocomplete)";

interface NominatimResult {
  display_name: string;
}

geocodeRouter.get("/", async (req, res) => {
  const q = req.query.q;
  if (typeof q !== "string" || q.trim().length < 3) {
    res.json([]);
    return;
  }

  try {
    const params = new URLSearchParams({ format: "json", addressdetails: "0", limit: "5", q });
    const upstream = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!upstream.ok) {
      throw new Error(`Nominatim responded ${upstream.status}`);
    }
    const results = (await upstream.json()) as NominatimResult[];
    res.json(results.map((r) => ({ label: r.display_name })));
  } catch (err) {
    console.error("[api] GET /api/geocode failed:", err);
    res.status(502).json({ error: "Address lookup failed" });
  }
});
