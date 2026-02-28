import mongoose from "mongoose";

const SafeCityIncidentSchema = new mongoose.Schema({
  // SafeCity's own incident ID (e.g. 40691)
  scId: { type: String, required: true, unique: true, index: true },

  // Categories / type of incident (e.g. "Stalking | Online Harassment")
  categories: { type: String, default: "" },

  // Full description text
  description: { type: String, default: "" },

  // Coordinates — with 2dsphere index for geo queries
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },

  // Human-readable location string (e.g. "nivdunge, Madhi")
  locationText: { type: String, default: "" },

  // Date & time fields as they come from SafeCity
  dateText: { type: String, default: "" },
  timeText: { type: String, default: "" },

  // Person info
  age: { type: String, default: "" },
  gender: { type: String, default: "" },

  // Computed severity 1-3
  severity: { type: Number, default: 2, min: 1, max: 3 },

  // Original timestamp from SafeCity
  timestamp: { type: Date, default: Date.now },

  // When we scraped/cached this record
  scrapedAt: { type: Date, default: Date.now },

  // Raw JSON blob from SafeCity (for future use)
  raw: { type: mongoose.Schema.Types.Mixed, default: {} },
});

SafeCityIncidentSchema.index({ location: "2dsphere" });
SafeCityIncidentSchema.index({ scrapedAt: 1 });

const SafeCityIncident = mongoose.model(
  "SafeCityIncident",
  SafeCityIncidentSchema,
  "safecity_incidents"
);

export default SafeCityIncident;
