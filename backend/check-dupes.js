import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const MONGO_URI = process.env.MONGODB_URL || 'mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0';

mongoose.connect(MONGO_URI).then(async () => {
  const col = mongoose.connection.collection('safecity_incidents');

  // Find coordinates that appear many times
  const dupes = await col.aggregate([
    { $group: { 
      _id: { 
        lng: { $arrayElemAt: ['$location.coordinates', 0] }, 
        lat: { $arrayElemAt: ['$location.coordinates', 1] } 
      }, 
      count: { $sum: 1 } 
    }},
    { $match: { count: { $gt: 5 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();

  console.log('Duplicate coordinate groups (>5 incidents at same spot):');
  dupes.forEach(d => console.log(`  [${d._id.lng}, ${d._id.lat}] => ${d.count} incidents`));

  // Sample a few from the biggest cluster
  if (dupes.length > 0) {
    const biggest = dupes[0];
    const query = {};
    if (biggest._id.lng !== null) {
      query['location.coordinates'] = { $elemMatch: { $eq: biggest._id.lng } };
    }
    const samples = await col.find({}).limit(3).toArray();
    console.log('\nSample raw documents:');
    samples.forEach(s => console.log(`  scId=${s.scId}, coords=${JSON.stringify(s.location?.coordinates)}, locationText=${s.locationText}`));
  }

  mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
