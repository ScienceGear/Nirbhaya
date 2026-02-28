import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL || "mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0";

async function stats() {
  await mongoose.connect(MONGO_URL);
  const { default: SC } = await import("./model/safecityIncident.model.js");
  const total = await SC.countDocuments();
  const enriched = await SC.countDocuments({ categories: { $ne: "" } });
  const withDesc = await SC.countDocuments({ description: { $ne: "" } });
  console.log("═══════════════════════════════════");
  console.log("  SafeCity DB Stats");
  console.log("═══════════════════════════════════");
  console.log(`  Total incidents:         ${total}`);
  console.log(`  Enriched (categories):   ${enriched}`);
  console.log(`  With description:        ${withDesc}`);
  console.log(`  Bare (no details):       ${total - enriched}`);
  console.log("═══════════════════════════════════");
  await mongoose.disconnect();
}
stats();
