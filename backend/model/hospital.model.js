import mongoose from "mongoose";

const HospitalSchema = new mongoose.Schema({
  cityName: { type: String, default: "Pune" },
  wardNo: { type: Number },
  wardName: { type: String },
  name: { type: String, required: true },
  facilityType: { type: String, default: "Government hospital(PMC)" },
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
});

HospitalSchema.index({ location: "2dsphere" });

const Hospital = mongoose.model("Hospital", HospitalSchema, "hospitals_pune");
export default Hospital;
