import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URL || 'mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0';

// Lonavala bounding box (roughly 15 km around Lonavala)
const LONAVALA_LAT = 18.7481;
const LONAVALA_LNG = 73.4069;
const RADIUS_DEG = 0.15; // ~15 km

await mongoose.connect(MONGO_URI);
const { default: Report } = await import('./model/report.model.js');

// ── Step 1: Show existing Lonavala reports ────────────────────────────────
const existing = await Report.find({
  latitude:  { $gte: LONAVALA_LAT - RADIUS_DEG, $lte: LONAVALA_LAT + RADIUS_DEG },
  longitude: { $gte: LONAVALA_LNG - RADIUS_DEG, $lte: LONAVALA_LNG + RADIUS_DEG },
});

console.log(`Found ${existing.length} existing Lonavala reports:`);
existing.forEach(r => console.log(`  [${r._id}] ${r.incidentType} | ${r.severity} | "${r.description?.slice(0,60)}" | ${r.timestamp?.toLocaleDateString()}`));

// ── Step 2: Delete all of them ────────────────────────────────────────────
const del = await Report.deleteMany({
  latitude:  { $gte: LONAVALA_LAT - RADIUS_DEG, $lte: LONAVALA_LAT + RADIUS_DEG },
  longitude: { $gte: LONAVALA_LNG - RADIUS_DEG, $lte: LONAVALA_LNG + RADIUS_DEG },
});
console.log(`\nDeleted ${del.deletedCount} Lonavala report(s).`);

// ── Step 3: Insert realistic Lonavala incidents ───────────────────────────
// Based on real patterns from Lonavala — a popular hill station with tourists
// Common real incidents: petty theft near Tiger Point, eve-teasing at Bhushi Dam,
// bag snatching near bus stand, unsafe roads at night, drunk driving near pubs,
// suspicious activity near isolated viewpoints, mobile snatching, road accidents

const now = new Date('2026-02-28T00:00:00Z');
const daysAgo = (d) => new Date(now - d * 86400000);

const lonavalaReports = [
  {
    description: 'Bag snatching reported near Lonavala bus stand. Two men on a bike snatched handbag from a tourist.',
    latitude:  18.7514,
    longitude: 73.4053,
    severity:  'High',
    incidentType: 'theft',
    locationText:  'Lonavala Bus Stand',
    anonymous: true,
    areaRating: 2,
    timestamp: daysAgo(3),
    reporterKey: 'guest',
  },
  {
    description: 'Eve-teasing and catcalling reported near Bhushi Dam by a group of men towards female tourists.',
    latitude:  18.7550,
    longitude: 73.3800,
    severity:  'Medium',
    incidentType: 'harassment',
    locationText:  'Bhushi Dam, Lonavala',
    anonymous: true,
    areaRating: 2,
    timestamp: daysAgo(7),
    reporterKey: 'guest',
  },
  {
    description: 'Mobile phone snatched at Tiger Point viewpoint. Perpetrator fled on foot into the forest trail.',
    latitude:  18.7640,
    longitude: 73.4020,
    severity:  'High',
    incidentType: 'theft',
    locationText:  'Tiger Point, Lonavala',
    anonymous: true,
    areaRating: 2,
    timestamp: daysAgo(12),
    reporterKey: 'guest',
  },
  {
    description: 'Drunk driving incident on Mumbai-Pune expressway near Lonavala exit. Vehicle weaving dangerously at night.',
    latitude:  18.7430,
    longitude: 73.4200,
    severity:  'High',
    incidentType: 'unsafe_area',
    locationText:  'NH48 Lonavala Exit, Mumbai-Pune Expressway',
    anonymous: true,
    areaRating: 2,
    timestamp: daysAgo(5),
    reporterKey: 'guest',
  },
  {
    description: 'Suspicious group of men following solo female traveller near Rajmachi trail entry after dusk.',
    latitude:  18.7700,
    longitude: 73.4150,
    severity:  'Medium',
    incidentType: 'stalking',
    locationText:  'Rajmachi Trail, Lonavala',
    anonymous: true,
    areaRating: 2,
    timestamp: daysAgo(18),
    reporterKey: 'guest',
  },
  {
    description: 'Vendor overcharging and intimidating tourists near chikki shops on Main Bazaar Road.',
    latitude:  18.7490,
    longitude: 73.4060,
    severity:  'Low',
    incidentType: 'unsafe_area',
    locationText:  'Main Bazaar Road, Lonavala',
    anonymous: true,
    areaRating: 3,
    timestamp: daysAgo(22),
    reporterKey: 'guest',
  },
  {
    description: 'Poorly lit road between Lonavala and Khandala caused near-miss accident. No streetlights on the stretch.',
    latitude:  18.7571,
    longitude: 73.3984,
    severity:  'Medium',
    incidentType: 'unsafe_area',
    locationText:  'Lonavala-Khandala Road',
    anonymous: true,
    areaRating: 2,
    timestamp: daysAgo(30),
    reporterKey: 'guest',
  },
  {
    description: 'Wallet stolen from parked car boot near Lion\'s Point. Car window was smashed.',
    latitude:  18.7682,
    longitude: 73.3860,
    severity:  'High',
    incidentType: 'theft',
    locationText:  "Lion's Point, Lonavala",
    anonymous: true,
    areaRating: 2,
    timestamp: daysAgo(45),
    reporterKey: 'guest',
  },
];

const inserted = await Report.insertMany(lonavalaReports);
console.log(`\nInserted ${inserted.length} realistic Lonavala incidents:`);
inserted.forEach(r => console.log(`  [${r._id}] ${r.incidentType} | ${r.severity} | ${r.locationText}`));

await mongoose.disconnect();
console.log('\nDone.');
