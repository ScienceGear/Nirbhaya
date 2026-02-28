/**
 * fix-jitter.js
 * Adds a small random coordinate jitter (~50-150m) to any incidents
 * that share the exact same coordinates as another incident.
 * This prevents hundreds of markers from piling on one spot.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL || 'mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0';

// ~0.0009 degrees ≈ 100m. Jitter each duplicate by up to ±JITTER degrees.
const JITTER = 0.0012;

function randJitter() {
  return (Math.random() - 0.5) * 2 * JITTER;
}

async function main() {
  await mongoose.connect(MONGO_URL);
  const col = mongoose.connection.collection('safecity_incidents');

  // Find all coordinate groups with more than 1 incident
  const dupes = await col.aggregate([
    { $group: { 
      _id: { 
        lng: { $arrayElemAt: ['$location.coordinates', 0] }, 
        lat: { $arrayElemAt: ['$location.coordinates', 1] } 
      }, 
      count: { $sum: 1 },
      ids: { $push: '$_id' }
    }},
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log(`Found ${dupes.length} coordinate groups with duplicates`);
  let totalUpdated = 0;

  for (const group of dupes) {
    const { lng, lat } = group._id;
    const ids = group.ids;
    
    // Skip the first one (keep original), jitter all the rest
    const toJitter = ids.slice(1);
    
    for (const id of toJitter) {
      const newLng = lng + randJitter();
      const newLat = lat + randJitter();
      await col.updateOne(
        { _id: id },
        { $set: { 'location.coordinates': [newLng, newLat] } }
      );
      totalUpdated++;
    }

    if (totalUpdated % 100 === 0 && totalUpdated > 0) {
      process.stdout.write(`\r  Jittered ${totalUpdated} incidents...`);
    }
  }

  console.log(`\nDone! Jittered ${totalUpdated} incidents across ${dupes.length} duplicate groups.`);
  
  // Show top clusters after fix
  const after = await col.aggregate([
    { $group: { 
      _id: { 
        // Round to 3 decimal places (~110m grid) to check remaining clusters
        lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 3] }, 
        lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 3] }
      }, 
      count: { $sum: 1 }
    }},
    { $match: { count: { $gt: 3 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]).toArray();

  console.log('\nTop coordinate clusters after jitter (rounded to 3dp ≈ 110m):');
  after.forEach(d => console.log(`  [${d._id.lng}, ${d._id.lat}] => ${d.count} incidents`));

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
