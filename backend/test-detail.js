import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL;
const SAFECITY_BASE = "https://webapp.safecity.in";

function toFormBody(p) {
  return new URLSearchParams(Object.entries(p).reduce((a, [k, v]) => { a[k] = String(v); return a; }, {}));
}

async function testDetail(scId) {
  console.log(`\nTesting scId: ${scId}`);
  const r = await fetch(`${SAFECITY_BASE}/api/reported-incident/details`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*", "X-Requested-With": "XMLHttpRequest", Referer: "https://webapp.safecity.in/" },
    body: toFormBody({ incident_id: scId }),
  });
  console.log("Status:", r.status);
  const json = await r.json();
  console.log("Response:", JSON.stringify(json, null, 2).slice(0, 500));
}

async function main() {
  await mongoose.connect(MONGO_URL);
  const { default: SC } = await import("./model/safecityIncident.model.js");

  // Get 3 bare samples
  const samples = await SC.find({ categories: "", description: "" }).limit(3).lean();
  for (const s of samples) {
    await testDetail(s.scId);
  }

  // Also test one enriched record for comparison
  const enriched = await SC.findOne({ categories: { $ne: "" } }).lean();
  if (enriched) await testDetail(enriched.scId);

  await mongoose.disconnect();
}
main().catch(console.error);
