/**
 * Enrich bare SafeCity incidents v2 — improved logging & error handling
 * Run: node enrich-v2.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL;
const SAFECITY_BASE = "https://webapp.safecity.in";
const BATCH = 30;       // smaller batch = less likely to hit rate limits
const DELAY = 500;      // slower = safer
const MAX_ROUNDS = 60;  // 60 × 30 = 1800 max

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function toFormBody(p) {
  return new URLSearchParams(Object.entries(p).reduce((a, [k, v]) => { a[k] = String(v); return a; }, {}));
}

async function postSafeCity(path, params) {
  const r = await fetch(`${SAFECITY_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*", "X-Requested-With": "XMLHttpRequest", Referer: "https://webapp.safecity.in/" },
    body: toFormBody(params),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function parseDetailResponse(raw) {
  let categories = "";
  if (typeof raw?.categories === "string" && raw.categories.trim()) categories = raw.categories.trim();
  else if (Array.isArray(raw?.categories)) categories = raw.categories.map(c => c?.name ?? c?.category_name ?? c).filter(Boolean).join(" | ");
  else if (raw?.category) categories = String(raw.category);

  const locParts = [raw?.area, raw?.city, raw?.state].filter(Boolean);

  let dateText = "";
  if (raw?.incident_date) {
    try { const d = new Date(raw.incident_date); dateText = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : raw.incident_date; }
    catch { dateText = raw.incident_date; }
  } else if (raw?.date) dateText = raw.date;

  let timeText = "";
  const tf = raw?.time_from ?? "", tt = raw?.time_to ?? "";
  if (tf && tt) timeText = `${tf} - ${tt}`; else if (tf) timeText = tf; else if (raw?.time) timeText = raw.time;

  return {
    categories,
    description: String(raw?.description ?? raw?.incident_text ?? ""),
    locationText: locParts.join(", ") || raw?.location || "",
    dateText,
    timeText,
    age: String(raw?.age ?? raw?.person_age ?? ""),
    gender: String(raw?.gender ?? ""),
  };
}

async function main() {
  await mongoose.connect(MONGO_URL);
  const { default: SC } = await import("./model/safecityIncident.model.js");

  const totalBare = await SC.countDocuments({ categories: "", description: "" });
  console.log(`Starting enrichment: ${totalBare} bare records\n`);

  let totalOk = 0, totalFail = 0, totalEmpty = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const bare = await SC.find({ categories: "", description: "" }).sort({ scrapedAt: -1 }).limit(BATCH).lean();
    if (!bare.length) { console.log(`\nNo more bare records at round ${round + 1}`); break; }

    let ok = 0, fail = 0, empty = 0;
    for (const doc of bare) {
      try {
        const data = await postSafeCity("/api/reported-incident/details", { incident_id: doc.scId });
        const raw = data?.data ?? data ?? {};
        const updates = parseDetailResponse(raw);

        // Only update if we got meaningful data
        if (updates.categories || updates.description) {
          await SC.updateOne({ _id: doc._id }, { $set: { ...updates, raw } });
          ok++;
        } else {
          // Mark as processed even if empty (to avoid re-processing)
          await SC.updateOne({ _id: doc._id }, { $set: { description: "(no data)", raw } });
          empty++;
        }
      } catch (err) {
        fail++;
        // If rate limited, pause longer
        if (err.message.includes("429")) {
          console.log(`\n  Rate limited! Pausing 10s...`);
          await sleep(10000);
        }
      }
      await sleep(DELAY);
    }

    totalOk += ok; totalFail += fail; totalEmpty += empty;
    const elapsed = Math.round(process.uptime());
    console.log(`  Round ${round + 1}: +${ok} enriched, +${empty} empty, +${fail} failed | Total: ${totalOk} ok, ${totalEmpty} empty, ${totalFail} failed [${elapsed}s]`);
  }

  const total = await SC.countDocuments();
  const enriched = await SC.countDocuments({ categories: { $ne: "" } });
  const withDesc = await SC.countDocuments({ description: { $ne: "" } });
  console.log(`\n═══════════════════════════════════`);
  console.log(`  Total: ${total}  |  Enriched: ${enriched}  |  WithDesc: ${withDesc}`);
  console.log(`═══════════════════════════════════`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
