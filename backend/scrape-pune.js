/**
 * ═══════════════════════════════════════════════════════════════
 *  Bulk scraper — scrape ALL Pune SafeCity incident data
 *  and cache into MongoDB.
 *
 *  Strategy:
 *  1. Divide Pune into a grid of overlapping cells (~3 km each)
 *  2. For each cell, POST to SafeCity /api/reported-incidents/map-coordinates
 *  3. Upsert all results into MongoDB (dedup by scId)
 *  4. After all cells done, enrich bare records (fetch full details)
 *
 *  Run:  node scrape-pune.js
 * ═══════════════════════════════════════════════════════════════
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL =
  process.env.MONGODB_URL ||
  "mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0";

const SAFECITY_BASE = "https://webapp.safecity.in";

/* ── Pune bounding box (covers the full PMC area + Pimpri-Chinchwad) ── */
const PUNE_BOUNDS = {
  minLat: 18.40,
  maxLat: 18.65,
  minLng: 73.72,
  maxLng: 74.00,
};

/* ── Grid cell size in degrees (~3 km) ── */
const CELL_SIZE_DEG = 0.03;

/* ── Delay between API calls (ms) ── */
const SCRAPE_DELAY = 500;
const ENRICH_DELAY = 400;
const ENRICH_BATCH = 30;

/* ───────────────────── helpers ───────────────────── */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toFormBody(params) {
  return new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      acc[k] = String(v);
      return acc;
    }, {})
  );
}

async function postSafeCity(path, params) {
  const response = await fetch(`${SAFECITY_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Accept: "*/*",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://webapp.safecity.in/",
    },
    body: toFormBody(params),
  });
  if (!response.ok) throw new Error(`SafeCity ${path} → ${response.status}`);
  return response.json();
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseSafeCityItem(item) {
  const lat = toNumber(item?.lat ?? item?.latitude);
  const lng = toNumber(item?.lng ?? item?.longitude);
  if (lat === null || lng === null) return null;
  const severity =
    toNumber(item?.severity) ||
    (toNumber(item?.count) && toNumber(item?.count) > 8 ? 3 : 2);
  let categories = "";
  if (Array.isArray(item?.categories)) {
    categories = item.categories.map((c) => c?.name ?? c?.category_name ?? c).filter(Boolean).join(" | ");
  } else if (typeof item?.categories === "string") {
    categories = item.categories;
  } else if (item?.category) {
    categories = String(item.category);
  }
  const scId = String(item?.id ?? item?._id ?? `sc-${lat.toFixed(5)}-${lng.toFixed(5)}`);
  return {
    scId,
    categories,
    description: String(item?.description || item?.incident_text || ""),
    location: { type: "Point", coordinates: [lng, lat] },
    locationText: item?.location || item?.place || item?.city || "",
    dateText: item?.date || item?.incident_date || "",
    timeText: item?.time || item?.incident_time || "",
    age: String(item?.age || item?.person_age || ""),
    gender: String(item?.gender || item?.person_gender || ""),
    severity: Math.min(3, Math.max(1, Math.round(severity))),
    timestamp: item?.created_at || item?.timestamp || new Date().toISOString(),
    raw: item,
  };
}

function parseDetailResponse(raw) {
  let categories = "";
  if (typeof raw?.categories === "string" && raw.categories.trim()) {
    categories = raw.categories.trim();
  } else if (Array.isArray(raw?.categories)) {
    categories = raw.categories.map((c) => c?.name ?? c?.category_name ?? c).filter(Boolean).join(" | ");
  } else if (raw?.category) {
    categories = String(raw.category);
  }
  const locParts = [raw?.area, raw?.city, raw?.state].filter(Boolean);
  const locationText = locParts.join(", ") || raw?.location || raw?.place || "";
  let dateText = "";
  if (raw?.incident_date) {
    try {
      const d = new Date(raw.incident_date);
      dateText = !isNaN(d.getTime())
        ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        : raw.incident_date;
    } catch { dateText = raw.incident_date; }
  } else if (raw?.date) { dateText = raw.date; }
  let timeText = "";
  const tfrom = raw?.time_from ?? raw?.answers?.primary?.time_from?.answer ?? "";
  const tto   = raw?.time_to   ?? raw?.answers?.primary?.time_to?.answer   ?? "";
  if (tfrom && tto) timeText = `${tfrom} - ${tto}`;
  else if (tfrom) timeText = tfrom;
  else if (raw?.time) timeText = raw.time;
  return {
    categories,
    description: String(raw?.description ?? raw?.incident_text ?? ""),
    locationText,
    dateText,
    timeText,
    age: String(raw?.age ?? raw?.person_age ?? ""),
    gender: String(raw?.gender ?? ""),
  };
}

/* ───────────────────── grid generation ───────────────────── */

function generateGrid() {
  const cells = [];
  for (let lat = PUNE_BOUNDS.minLat; lat < PUNE_BOUNDS.maxLat; lat += CELL_SIZE_DEG) {
    for (let lng = PUNE_BOUNDS.minLng; lng < PUNE_BOUNDS.maxLng; lng += CELL_SIZE_DEG) {
      cells.push({
        centerLat: lat + CELL_SIZE_DEG / 2,
        centerLng: lng + CELL_SIZE_DEG / 2,
        ne: { lat: lat + CELL_SIZE_DEG, lng: lng + CELL_SIZE_DEG },
        sw: { lat, lng },
        nw: { lat: lat + CELL_SIZE_DEG, lng },
        se: { lat, lng: lng + CELL_SIZE_DEG },
      });
    }
  }
  return cells;
}

/* ───────────────────── main ───────────────────── */

async function main() {
  await mongoose.connect(MONGO_URL);
  console.log("✓ Connected to MongoDB");

  const { default: SafeCityIncident } = await import("./model/safecityIncident.model.js");

  // Ensure index
  await SafeCityIncident.collection.createIndex({ location: "2dsphere" }).catch(() => {});
  await SafeCityIncident.collection.createIndex({ scId: 1 }, { unique: true }).catch(() => {});

  const countBefore = await SafeCityIncident.countDocuments();
  console.log(`📊 Incidents in DB before scrape: ${countBefore}`);

  /* ── Phase 1: Grid scrape ── */
  const grid = generateGrid();
  console.log(`\n🗺  Scraping Pune in ${grid.length} grid cells (${CELL_SIZE_DEG}° each)...\n`);

  let totalScraped = 0;
  let cellsDone = 0;

  for (const cell of grid) {
    const params = {
      lang_id: 1,
      client_id: 1,
      city: "Pune",
      map_zoom: 14,
      "map_bound[ne][lat]": cell.ne.lat,
      "map_bound[ne][lng]": cell.ne.lng,
      "map_bound[sw][lat]": cell.sw.lat,
      "map_bound[sw][lng]": cell.sw.lng,
      "map_bound[nw][lat]": cell.nw.lat,
      "map_bound[nw][lng]": cell.nw.lng,
      "map_bound[se][lat]": cell.se.lat,
      "map_bound[se][lng]": cell.se.lng,
    };

    try {
      const resp = await postSafeCity("/api/reported-incidents/map-coordinates", params);
      const rawItems = Array.isArray(resp?.data) ? resp.data : [];

      if (rawItems.length) {
        const ops = rawItems
          .map(parseSafeCityItem)
          .filter(Boolean)
          .map((doc) => ({
            updateOne: {
              filter: { scId: doc.scId },
              update: { $set: { ...doc, scrapedAt: new Date() } },
              upsert: true,
            },
          }));

        if (ops.length) {
          await SafeCityIncident.bulkWrite(ops, { ordered: false });
          totalScraped += ops.length;
        }
      }
    } catch (err) {
      process.stdout.write("✗");
    }

    cellsDone++;
    if (cellsDone % 10 === 0 || cellsDone === grid.length) {
      process.stdout.write(`\r  [${cellsDone}/${grid.length}] cells scraped — ${totalScraped} incidents upserted`);
    }

    await sleep(SCRAPE_DELAY);
  }

  const countAfterScrape = await SafeCityIncident.countDocuments();
  console.log(`\n\n✓ Phase 1 complete — ${countAfterScrape} incidents in DB (was ${countBefore})\n`);

  /* ── Phase 2: Enrich bare records ── */
  const bareCount = await SafeCityIncident.countDocuments({
    $or: [{ categories: "" }, { categories: { $exists: false } }],
    description: "",
  });

  if (bareCount > 0) {
    console.log(`🔍 Phase 2: Enriching up to ${Math.min(bareCount, ENRICH_BATCH * 10)} bare records...\n`);

    let totalEnriched = 0;
    for (let round = 0; round < 10; round++) {
      const bare = await SafeCityIncident.find({
        $or: [{ categories: "" }, { categories: { $exists: false } }],
        description: "",
      })
        .sort({ scrapedAt: -1 })
        .limit(ENRICH_BATCH)
        .lean();

      if (!bare.length) break;

      let enriched = 0;
      for (const doc of bare) {
        try {
          const data = await postSafeCity("/api/reported-incident/details", { incident_id: doc.scId });
          const raw = data?.data ?? data ?? {};
          const updates = parseDetailResponse(raw);
          await SafeCityIncident.updateOne({ _id: doc._id }, { $set: { ...updates, raw } });
          enriched++;
        } catch { /* skip */ }
        await sleep(ENRICH_DELAY);
      }
      totalEnriched += enriched;
      process.stdout.write(`\r  Enriched ${totalEnriched} records...`);
      if (enriched < bare.length) break; // most likely all enriched
    }
    console.log(`\n✓ Phase 2 complete — enriched ${totalEnriched} records`);
  } else {
    console.log("✓ No bare records to enrich");
  }

  /* ── Summary ── */
  const finalCount = await SafeCityIncident.countDocuments();
  const enrichedCount = await SafeCityIncident.countDocuments({
    categories: { $ne: "" },
  });

  console.log(`\n═══════════════════════════════════`);
  console.log(`  Total incidents in DB: ${finalCount}`);
  console.log(`  Enriched (with details): ${enrichedCount}`);
  console.log(`  Bare (coordinates only): ${finalCount - enrichedCount}`);
  console.log(`═══════════════════════════════════\n`);

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
