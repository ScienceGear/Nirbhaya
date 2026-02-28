import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL || "mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0";

/* ── Helpers ── */
const ago = (min) => new Date(Date.now() - min * 60_000);

async function seed() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to MongoDB for seeding...");

  const { default: User } = await import("./model/user.model.js");
  const salt = await bcrypt.genSalt(10);

  const demoUserEmail       = "priya@nirbhaya.app";
  const demoUser2Email      = "meera@nirbhaya.app";
  const demoUser3Email      = "sneha@nirbhaya.app";
  const demoGuardianEmail   = "guardian@nirbhaya.app";
  const demoAdminEmail      = "admin@nirbhaya.app";

  // Reset demo users
  await User.deleteMany({
    email: { $in: [demoUserEmail, demoUser2Email, demoUser3Email, demoGuardianEmail, demoAdminEmail] },
  });
  console.log("Removed existing demo users (if any).");

  /* ─────────────────────────────────────────────── */
  /* ── Demo User 1 — Priya (actively navigating) ── */
  /* ─────────────────────────────────────────────── */
  const demoUser = new User({
    username: "Priya Sharma",
    email: demoUserEmail,
    password: await bcrypt.hash("demo123", salt),
    role: "user",
    phone: "+91 98765 43210",
    points: 340,
    emergencyContacts: [
      { name: "Mom", phone: "+91 99887 76655", email: "mom@example.com" },
      { name: "Anita (Friend)", phone: "+91 88776 65544", email: "anita@example.com" },
    ],
    sharingPrefs: {
      location: true, routeInfo: true, sosAlerts: true,
      batteryLevel: true, checkpoints: true, incidentReports: false,
    },
    lastLocation: { lat: 18.5204, lng: 73.8567, accuracy: 10, updatedAt: ago(1) },
    batteryLevel: 72,

    // ── Active navigation state ──
    isNavigating: true,
    currentRoute: {
      origin: "Shivajinagar, Pune",
      destination: "Koregaon Park, Pune",
      rsi: 74,
      eta: "18 min",
      distance: "5.2 km",
    },
    checkpointsPassed: 2,
    checkpointsTotal: 4,
    checkpoints: [
      { name: "Shivajinagar PS",         type: "police",    lat: 18.5312, lng: 73.8498, eta: "passed",  passed: true  },
      { name: "Sassoon General Hospital", type: "hospital",  lat: 18.5247, lng: 73.8580, eta: "passed",  passed: true  },
      { name: "Koregaon Park PS",         type: "police",    lat: 18.5360, lng: 73.8920, eta: "~8 min",  passed: false },
      { name: "Ruby Hall Clinic",         type: "hospital",  lat: 18.5350, lng: 73.8890, eta: "~12 min", passed: false },
    ],

    // ── Past trip history ──
    tripHistory: [
      {
        origin: "Deccan Gymkhana", destination: "FC Road",
        rsi: 82, eta: "12 min", distance: "3.1 km",
        checkpoints: [
          { name: "Deccan PS",        type: "police", passed: true  },
          { name: "Sahyadri Hospital", type: "hospital", passed: true  },
          { name: "FC Road PS",        type: "police", passed: true  },
        ],
        startedAt: ago(120), endedAt: ago(105),
      },
      {
        origin: "Hinjewadi IT Park", destination: "Baner",
        rsi: 65, eta: "22 min", distance: "7.8 km",
        checkpoints: [
          { name: "Hinjewadi PS",      type: "police",   passed: true  },
          { name: "Medipoint Hospital", type: "hospital", passed: true  },
          { name: "Baner PS",           type: "police",   passed: false },
        ],
        startedAt: ago(300), endedAt: ago(270),
      },
      {
        origin: "Kothrud", destination: "Swargate Bus Stand",
        rsi: 91, eta: "15 min", distance: "6.0 km",
        checkpoints: [
          { name: "Kothrud PS",        type: "police",   passed: true  },
          { name: "Bharati Hospital",   type: "hospital", passed: true  },
        ],
        startedAt: ago(1500), endedAt: ago(1480),
      },
    ],

    // ── SOS history ──
    emergencyLogs: [
      { type: "Followed",     timestamp: ago(2880), location: "JM Road, Pune",      lat: 18.5185, lng: 73.8410 },
      { type: "Unsafe Area",  timestamp: ago(8640), location: "Camp Area, Pune",     lat: 18.5120, lng: 73.8800 },
    ],
  });
  await demoUser.save();
  console.log(`Created demo user 1 (navigating): ${demoUserEmail} / demo123  (linkCode: ${demoUser.linkCode})`);

  /* ──────────────────────────────────────────── */
  /* ── Demo User 2 — Meera (idle, online)      ── */
  /* ──────────────────────────────────────────── */
  const demoUser2 = new User({
    username: "Meera Desai",
    email: demoUser2Email,
    password: await bcrypt.hash("demo123", salt),
    role: "user",
    phone: "+91 97654 32100",
    points: 180,
    emergencyContacts: [
      { name: "Dad", phone: "+91 98765 00001", email: "dad@example.com" },
    ],
    sharingPrefs: {
      location: true, routeInfo: true, sosAlerts: true,
      batteryLevel: true, checkpoints: true, incidentReports: false,
    },
    lastLocation: { lat: 18.5074, lng: 73.8077, accuracy: 12, updatedAt: ago(2) },
    batteryLevel: 45,
    isNavigating: false,

    tripHistory: [
      {
        origin: "Karve Nagar", destination: "SP College",
        rsi: 88, eta: "10 min", distance: "2.4 km",
        checkpoints: [
          { name: "Karve Nagar PS",  type: "police",   passed: true },
          { name: "KEM Hospital",    type: "hospital",  passed: true },
        ],
        startedAt: ago(200), endedAt: ago(185),
      },
    ],
    emergencyLogs: [
      { type: "Harassment",  timestamp: ago(4320), location: "Mahatma Phule Road, Pune", lat: 18.5130, lng: 73.8660 },
    ],
  });
  await demoUser2.save();
  console.log(`Created demo user 2 (idle): ${demoUser2Email} / demo123  (linkCode: ${demoUser2.linkCode})`);

  /* ──────────────────────────────────────────── */
  /* ── Demo User 3 — Sneha (offline, low batt) ── */
  /* ──────────────────────────────────────────── */
  const demoUser3 = new User({
    username: "Sneha Joshi",
    email: demoUser3Email,
    password: await bcrypt.hash("demo123", salt),
    role: "user",
    phone: "+91 91234 56789",
    points: 60,
    emergencyContacts: [
      { name: "Brother", phone: "+91 88888 77777", email: "bro@example.com" },
    ],
    sharingPrefs: {
      location: true, routeInfo: true, sosAlerts: true,
      batteryLevel: true, checkpoints: true, incidentReports: false,
    },
    lastLocation: { lat: 18.4602, lng: 73.8680, accuracy: 20, updatedAt: ago(45) },
    batteryLevel: 12,
    isNavigating: false,

    tripHistory: [
      {
        origin: "Sinhagad Road", destination: "Katraj",
        rsi: 55, eta: "25 min", distance: "8.5 km",
        checkpoints: [
          { name: "Sinhagad Road PS", type: "police",   passed: true  },
          { name: "Sahyadri Hospital", type: "hospital", passed: true  },
          { name: "Katraj PS",         type: "police",   passed: false },
        ],
        startedAt: ago(600), endedAt: ago(570),
      },
      {
        origin: "NIBM Road", destination: "Magarpatta",
        rsi: 78, eta: "14 min", distance: "4.2 km",
        checkpoints: [
          { name: "Kondhwa PS",        type: "police",   passed: true },
          { name: "Noble Hospital",    type: "hospital",  passed: true },
        ],
        startedAt: ago(1800), endedAt: ago(1785),
      },
    ],
    emergencyLogs: [
      { type: "Stalking", timestamp: ago(720), location: "Bibwewadi, Pune", lat: 18.4780, lng: 73.8620 },
    ],
  });
  await demoUser3.save();
  console.log(`Created demo user 3 (offline/low batt): ${demoUser3Email} / demo123  (linkCode: ${demoUser3.linkCode})`);

  /* ──────────────────────────────────────── */
  /* ── Demo Guardian — watches all 3 users ── */
  /* ──────────────────────────────────────── */
  const demoGuardian = new User({
    username: "Arun Sharma",
    email: demoGuardianEmail,
    password: await bcrypt.hash("demo123", salt),
    role: "guardian",
    phone: "+91 99000 11222",
    points: 120,
    guardianOf: [demoUser._id, demoUser2._id, demoUser3._id],
  });
  await demoGuardian.save();

  // Link back
  demoUser.myGuardians.push(demoGuardian._id);
  demoUser2.myGuardians.push(demoGuardian._id);
  demoUser3.myGuardians.push(demoGuardian._id);
  await demoUser.save();
  await demoUser2.save();
  await demoUser3.save();

  console.log(`Created demo guardian: ${demoGuardianEmail} / demo123`);
  console.log(`Linked guardian -> ${demoUser.username}, ${demoUser2.username}, ${demoUser3.username}`);

  /* ──────────────── */
  /* ── Demo Admin  ── */
  /* ──────────────── */
  const demoAdmin = new User({
    username: "Neha Kapoor",
    email: demoAdminEmail,
    password: await bcrypt.hash("demo123", salt),
    role: "admin",
    phone: "+91 90000 55555",
    points: 800,
  });
  await demoAdmin.save();
  console.log(`Created demo admin: ${demoAdminEmail} / demo123`);

  /* ──────────────────────────── */
  /* ── Hex Zones (H3 res 7)  ── */
  /* ──────────────────────────── */
  const { default: HexZone } = await import("./model/hex.model.js");
  const { latLngToCell, gridDisk, cellToLatLng } = await import("h3-js");
  await HexZone.deleteMany({});
  console.log("Cleared old hex zones.");

  // Generate hex grid around Pune center (5km radius = gridDisk k=4 at res 7)
  const puneCenter = latLngToCell(18.5204, 73.8567, 7);
  const allHexes = gridDisk(puneCenter, 4);

  // Known risky locations in Pune (areas with higher incident reports)
  const riskySpots = [
    { lat: 18.5018, lng: 73.8636, score: 12 },  // Swargate (crowded bus stand)
    { lat: 18.5286, lng: 73.8746, score: 10 },  // Pune Station area
    { lat: 18.5112, lng: 73.8882, score: 8  },  // Camp area (nightlife)
    { lat: 18.4883, lng: 73.8926, score: 6  },  // Wanowrie
    { lat: 18.5362, lng: 73.8930, score: 5  },  // Koregaon Park (late night)
    { lat: 18.5509, lng: 73.8954, score: 7  },  // Yerawada
    { lat: 18.4786, lng: 73.8647, score: 4  },  // Bibwewadi
    { lat: 18.5308, lng: 73.8475, score: 3  },  // Shivajinagar
    { lat: 18.5089, lng: 73.9260, score: 9  },  // Hadapsar
  ];

  // For each hex, compute danger score based on proximity to risky spots
  const hexDocs = allHexes.map(hexId => {
    const [hexLat, hexLng] = cellToLatLng(hexId);
    let dangerScore = 0;
    let reportCount = 0;

    for (const spot of riskySpots) {
      const dist = Math.sqrt((hexLat - spot.lat) ** 2 + (hexLng - spot.lng) ** 2) * 111; // rough km
      if (dist < 1.5) {
        dangerScore += Math.round(spot.score * Math.max(0, 1 - dist / 1.5));
        reportCount += Math.ceil(spot.score / 3);
      }
    }

    return { hexId, dangerScore, reportCount, updatedAt: new Date() };
  });

  // Only insert hexes that have a danger score (the rest default to 0 when queried)
  const dangerousHexes = hexDocs.filter(h => h.dangerScore > 0);
  if (dangerousHexes.length > 0) {
    await HexZone.insertMany(dangerousHexes);
  }
  console.log(`Seeded ${dangerousHexes.length} hex zones with danger scores (out of ${allHexes.length} total).`);

  console.log("\n── Demo Accounts ──");
  console.log(`User 1 (navigating): ${demoUserEmail} / demo123  linkCode: ${demoUser.linkCode}`);
  console.log(`User 2 (idle):       ${demoUser2Email} / demo123  linkCode: ${demoUser2.linkCode}`);
  console.log(`User 3 (offline):    ${demoUser3Email} / demo123  linkCode: ${demoUser3.linkCode}`);
  console.log(`Guardian:            ${demoGuardianEmail} / demo123`);
  console.log(`Admin:               ${demoAdminEmail} / demo123`);

  await mongoose.disconnect();
  console.log("Seeding complete.");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
