import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URL || 'mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0';

mongoose.connect(MONGO_URI).then(async () => {
  const col = mongoose.connection.collection('safecity_incidents');

  console.log('Scanning for incidents with duplicate coordinates...\n');

  // Step 1: Find all coordinate groups that have more than 1 incident
  const dupes = await col.aggregate([
    {
      $group: {
        _id: {
          lng: { $arrayElemAt: ['$location.coordinates', 0] },
          lat: { $arrayElemAt: ['$location.coordinates', 1] }
        },
        ids: { $push: '$_id' },
        count: { $sum: 1 }
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  if (dupes.length === 0) {
    console.log('No duplicate coordinates found. Nothing to delete.');
    await mongoose.disconnect();
    return;
  }

  let totalGroups = dupes.length;
  let totalToDelete = 0;
  const idsToDelete = [];

  for (const group of dupes) {
    // Keep the first _id, delete the rest
    const [keep, ...remove] = group.ids;
    totalToDelete += remove.length;
    idsToDelete.push(...remove);
    console.log(`  Coords [${group._id.lng}, ${group._id.lat}] => ${group.count} incidents — keeping 1, deleting ${remove.length}`);
  }

  console.log(`\nTotal coordinate groups with duplicates: ${totalGroups}`);
  console.log(`Total incidents to delete:               ${totalToDelete}`);

  if (totalToDelete === 0) {
    console.log('Nothing to delete.');
    await mongoose.disconnect();
    return;
  }

  // Step 2: Delete all duplicates in one operation
  const result = await col.deleteMany({ _id: { $in: idsToDelete } });

  console.log(`\nDeleted ${result.deletedCount} duplicate incidents.`);

  // Step 3: Print final count
  const remaining = await col.countDocuments();
  console.log(`Remaining incidents in DB: ${remaining}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}).catch(e => { console.error('Error:', e); process.exit(1); });
