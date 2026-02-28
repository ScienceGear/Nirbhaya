import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const SAFECITY_BASE = "https://webapp.safecity.in";

function toFormBody(p) {
  return new URLSearchParams(Object.entries(p).reduce((a, [k, v]) => { a[k] = String(v); return a; }, {}));
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
  await mongoose.connect(process.env.MONGODB_URL);
  const { default: SC } = await import("./model/safecityIncident.model.js");

  // Get one bare record
  const doc = await SC.findOne({ categories: "", description: "" }).lean();
  console.log("Before: scId:", doc.scId, "categories:", JSON.stringify(doc.categories), "description:", JSON.stringify(doc.description?.slice(0, 50)));

  // Fetch from API
  const r = await fetch(`${SAFECITY_BASE}/api/reported-incident/details`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*", "X-Requested-With": "XMLHttpRequest", Referer: "https://webapp.safecity.in/" },
    body: toFormBody({ incident_id: doc.scId }),
  });
  const data = await r.json();
  const raw = data?.data ?? data ?? {};

  console.log("\nAPI raw.categories:", JSON.stringify(raw.categories));
  console.log("API raw.description:", JSON.stringify(raw.description?.slice(0, 80)));

  const updates = parseDetailResponse(raw);
  console.log("\nParsed updates:", JSON.stringify(updates, null, 2));

  // Update
  const result = await SC.updateOne({ _id: doc._id }, { $set: { ...updates, raw } });
  console.log("\nUpdate result:", JSON.stringify(result));

  // Re-read
  const after = await SC.findOne({ _id: doc._id }).lean();
  console.log("\nAfter: categories:", JSON.stringify(after.categories), "description:", JSON.stringify(after.description?.slice(0, 80)));

  await mongoose.disconnect();
}
main().catch(console.error);
