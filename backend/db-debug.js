import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL || "mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0";

async function debug() {
  await mongoose.connect(MONGO_URL);
  const { default: SC } = await import("./model/safecityIncident.model.js");

  const total = await SC.countDocuments();
  const withRaw = await SC.countDocuments({ raw: { $exists: true, $ne: null } });
  const withCat = await SC.countDocuments({ categories: { $ne: "" } });
  const withDesc = await SC.countDocuments({ description: { $ne: "" } });
  const emptyBoth = await SC.countDocuments({ categories: "", description: "" });
  const hasRawNoCat = await SC.countDocuments({ raw: { $exists: true, $ne: null }, categories: "" });

  // Check a sample bare-but-has-raw record
  const sample = await SC.findOne({ raw: { $exists: true, $ne: null }, categories: "" }).lean();

  console.log("Total:", total);
  console.log("With raw field:", withRaw);
  console.log("With categories:", withCat);
  console.log("With description:", withDesc);
  console.log("Empty both (cat+desc):", emptyBoth);
  console.log("Has raw but no categories:", hasRawNoCat);

  if (sample) {
    console.log("\nSample bare-with-raw record:");
    console.log("  scId:", sample.scId);
    console.log("  categories:", JSON.stringify(sample.categories));
    console.log("  description:", JSON.stringify(sample.description?.slice(0, 100)));
    console.log("  raw keys:", Object.keys(sample.raw || {}));
    console.log("  raw.categories:", JSON.stringify(sample.raw?.categories));
    console.log("  raw.description:", JSON.stringify(sample.raw?.description?.slice(0, 100)));
  }

  // Also check: how many have description set to something but empty categories?
  const descNoCat = await SC.countDocuments({ categories: "", description: { $ne: "" } });
  console.log("\nHas description but no categories:", descNoCat);

  await mongoose.disconnect();
}
debug();
