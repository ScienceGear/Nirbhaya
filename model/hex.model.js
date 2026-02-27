import mongoose from 'mongoose';

const HexZoneSchema = new mongoose.Schema({
  hexId: { type: String, unique: true },

  dangerScore: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },

  updatedAt: { type: Date, default: Date.now }
});

const HexZone = mongoose.model("HexZone", HexZoneSchema);
export default HexZone;