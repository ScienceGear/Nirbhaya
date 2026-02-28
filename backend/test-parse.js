import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const SAFECITY_BASE = "https://webapp.safecity.in";

function toFormBody(p) {
  return new URLSearchParams(Object.entries(p).reduce((a, [k, v]) => { a[k] = String(v); return a; }, {}));
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URL);
  const { default: SC } = await import("./model/safecityIncident.model.js");

  const sample = await SC.findOne({ categories: "", description: "" }).lean();
  console.log("Testing scId:", sample.scId);

  const r = await fetch(`${SAFECITY_BASE}/api/reported-incident/details`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "*/*", "X-Requested-With": "XMLHttpRequest", Referer: "https://webapp.safecity.in/" },
    body: toFormBody({ incident_id: sample.scId }),
  });
  const json = await r.json();
  const raw = json?.data ?? json ?? {};

  console.log("\n--- Full response.data keys ---");
  console.log(Object.keys(raw));
  console.log("\n--- categories field ---");
  console.log("type:", typeof raw.categories);
  console.log("value:", JSON.stringify(raw.categories, null, 2));
  console.log("\n--- category field ---");
  console.log("type:", typeof raw.category);
  console.log("value:", JSON.stringify(raw.category));
  console.log("\n--- description ---");
  console.log(raw.description);
  console.log("\n--- incident_date ---");
  console.log(raw.incident_date, raw.created_on);
  console.log("\n--- time_from/time_to ---");
  console.log(raw.time_from, raw.time_to);

  await mongoose.disconnect();
}
main().catch(console.error);
