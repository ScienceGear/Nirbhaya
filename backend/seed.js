import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URL = process.env.MONGODB_URL || "mongodb+srv://selida2652_db_user:tqnJt2uaMdp0k4pd@cluster0.d7zfty5.mongodb.net/nirbhaya?appName=Cluster0";

async function seed() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to MongoDB for seeding...");

  // Import User model AFTER connection
  const { default: User } = await import("./model/user.model.js");

  const salt = await bcrypt.genSalt(10);

  // Demo User
  const demoUserEmail = "priya@nirbhaya.app";
  let demoUser = await User.findOne({ email: demoUserEmail });
  if (!demoUser) {
    demoUser = new User({
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
        location: true,
        routeInfo: true,
        sosAlerts: true,
        batteryLevel: true,
        checkpoints: true,
        incidentReports: false,
      },
      lastLocation: { lat: 18.5204, lng: 73.8567, accuracy: 10, updatedAt: new Date() },
      batteryLevel: 72,
    });
    await demoUser.save();
    console.log(`Created demo user: ${demoUserEmail} / demo123  (linkCode: ${demoUser.linkCode})`);
  } else {
    console.log(`Demo user already exists: ${demoUserEmail} (linkCode: ${demoUser.linkCode})`);
  }

  // Demo Guardian
  const demoGuardianEmail = "guardian@nirbhaya.app";
  let demoGuardian = await User.findOne({ email: demoGuardianEmail });
  if (!demoGuardian) {
    demoGuardian = new User({
      username: "Arun Sharma",
      email: demoGuardianEmail,
      password: await bcrypt.hash("demo123", salt),
      role: "guardian",
      phone: "+91 99000 11222",
      points: 120,
      guardianOf: [demoUser._id],
    });
    await demoGuardian.save();

    // Link back
    demoUser.myGuardians.push(demoGuardian._id);
    await demoUser.save();

    console.log(`Created demo guardian: ${demoGuardianEmail} / demo123`);
    console.log(`Linked guardian -> user (${demoUser.username})`);
  } else {
    console.log(`Demo guardian already exists: ${demoGuardianEmail}`);
  }

  console.log("\n── Demo Accounts ──");
  console.log(`User:     ${demoUserEmail} / demo123`);
  console.log(`Guardian: ${demoGuardianEmail} / demo123`);
  console.log(`User link code: ${demoUser.linkCode}`);

  await mongoose.disconnect();
  console.log("Seeding complete.");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
