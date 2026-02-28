/**
 * thin-shaniwar.js
 * Removes excess incidents within 1.2km of Shaniwar Wada,
 * keeping only 8 incidents in that zone.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL || 'mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0';

// Shaniwar Wada center
const SW_LNG = 73.8553;
const SW_LAT = 18.5196;
const RADIUS_M = 1200;   // 1.2 km radius
const KEEP = 8;          // keep only 8 incidents

async function main() {
  await mongoose.connect(MONGO_URL);
  const col = mongoose.connection.collection('safecity_incidents');

  // Find all incidents within the radius
  const nearby = await col.find({
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [SW_LNG, SW_LAT] },
        $maxDistance: RADIUS_M
      }
    }
  }).toArray();

  console.log(`Found ${nearby.length} incidents within ${RADIUS_M}m of Shaniwar Wada`);

  if (nearby.length <= KEEP) {
    console.log(`Already ${nearby.length} <= ${KEEP}, nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  // Keep the first KEEP (closest ones), delete the rest
  const toDelete = nearby.slice(KEEP).map(d => d._id);
  const result = await col.deleteMany({ _id: { $in: toDelete } });
  console.log(`Deleted ${result.deletedCount} incidents. Kept ${KEEP} near Shaniwar Wada.`);

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
