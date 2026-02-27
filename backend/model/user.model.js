import mongoose from "mongoose";

const sharingPrefsSchema = new mongoose.Schema({
  location:       { type: Boolean, default: true },
  routeInfo:      { type: Boolean, default: true },
  sosAlerts:      { type: Boolean, default: true },
  batteryLevel:   { type: Boolean, default: true },
  checkpoints:    { type: Boolean, default: true },
  incidentReports:{ type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ["user", "guardian"], default: "user" },
  phone:     { type: String, default: "" },

  // Guardian linking
  guardianOf: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],   // guardian watches these users
  myGuardians: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],  // user is watched by these guardians
  linkCode:    { type: String, unique: true, sparse: true },             // 6-char code for pairing

  // What the user shares with guardians
  sharingPrefs: { type: sharingPrefsSchema, default: () => ({}) },

  // Live state (updated via socket / API)
  lastLocation: {
    lat:       { type: Number },
    lng:       { type: Number },
    accuracy:  { type: Number },
    updatedAt: { type: Date },
  },
  batteryLevel:   { type: Number },
  isNavigating:   { type: Boolean, default: false },
  currentRoute: {
    origin:      { type: String },
    destination: { type: String },
    rsi:         { type: Number },
    eta:         { type: String },
    distance:    { type: String },
  },
  checkpointsPassed: { type: Number, default: 0 },
  checkpointsTotal:  { type: Number, default: 0 },

  // Community points
  points: { type: Number, default: 0 },

  // Existing fields
  emergencyContacts: [{
    name:  { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
  }],
  emergencyLogs: [{
    type:      { type: String },
    timestamp: { type: Date, default: Date.now },
    location:  { type: String },
    lat:       { type: Number },
    lng:       { type: Number },
  }],

  createdAt: { type: Date, default: Date.now },
});

// Generate a random 6-char link code before saving (if missing)
userSchema.pre("save", function () {
  if (!this.linkCode) {
    this.linkCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
});

const User = mongoose.model("User", userSchema);
export default User;