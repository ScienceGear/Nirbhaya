/**
 * Enrich bare SafeCity incidents — fetch full details from the API
 * Run: node enrich-bare.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL || "mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0";
const SAFECITY_BASE = "https://webapp.safecity.in";
const BATCH = 50;
const DELAY = 350;
const MAX_ROUNDS = 40; // 40 × 50 = 2000 max

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
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

function parseDetailResponse(raw) {
  let categories = "";
  if (typeof raw?.categories === "string" && raw.categories.trim()) categories = raw.categories.trim();
  else if (Array.isArray(raw?.categories)) categories = raw.categories.map(c => c?.name ?? c?.category_name ?? c).filter(Boolean).join(" | ");
  else if (raw?.category) categories = String(raw.category);
  const locParts = [raw?.area, raw?.city, raw?.state].filter(Boolean);
  let dateText = "";
  if (raw?.incident_date) { try { const d = new Date(raw.incident_date); dateText = !isNaN(d.getTime()) ? d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : raw.incident_date; } catch { dateText = raw.incident_date; } }
  else if (raw?.date) dateText = raw.date;
  let timeText = "";
  const tf = raw?.time_from ?? "", tt = raw?.time_to ?? "";
  if (tf && tt) timeText = `${tf} - ${tt}`; else if (tf) timeText = tf; else if (raw?.time) timeText = raw.time;
  return { categories, description: String(raw?.description ?? raw?.incident_text ?? ""), locationText: locParts.join(", ") || raw?.location || "", dateText, timeText, age: String(raw?.age ?? raw?.person_age ?? ""), gender: String(raw?.gender ?? "") };
}

async function main() {
  await mongoose.connect(MONGO_URL);
  const { default: SC } = await import("./model/safecityIncident.model.js");
  let totalEnriched = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const bare = await SC.find({ $or: [{ categories: "" }, { categories: { $exists: false } }], description: "" }).sort({ scrapedAt: -1 }).limit(BATCH).lean();
    if (!bare.length) break;

    let ok = 0;
    for (const doc of bare) {
      try {
        const data = await postSafeCity("/api/reported-incident/details", { incident_id: doc.scId });
        const raw = data?.data ?? data ?? {};
        const updates = parseDetailResponse(raw);
        await SC.updateOne({ _id: doc._id }, { $set: { ...updates, raw } });
        ok++;
      } catch { /* skip */ }
      await sleep(DELAY);
    }
    totalEnriched += ok;
    process.stdout.write(`\r  Round ${round + 1}: enriched ${totalEnriched} total (${ok}/${bare.length} this batch)`);
  }

  const total = await SC.countDocuments();
  const enriched = await SC.countDocuments({ categories: { $ne: "" } });
  console.log(`\n\n═══ Done ═══`);
  console.log(`  Total: ${total}  |  Enriched: ${enriched}  |  Bare: ${total - enriched}`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
