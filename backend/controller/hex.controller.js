import { latLngToCell, gridDisk } from "h3-js";
import HexZone from "../model/hex.model.js";

// H3 resolution 7: ~1.2 km edge length, clearly visible hexagons on the map
// gridDisk k=4 at res 7 covers ~5 km radius (61 hexes)
const H3_RESOLUTION = 7;
const GRID_RING_K = 4;

export const getHex =  async (req, res) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Valid lat and lng query params are required" });
    }

    const centerHex = latLngToCell(latitude, longitude, H3_RESOLUTION);
    const nearbyHexes = gridDisk(centerHex, GRID_RING_K);

    const dbHexes = await HexZone.find({
      hexId: { $in: nearbyHexes }
    });

    const dbMap = Object.fromEntries(
      dbHexes.map(h => [h.hexId, h])
    );

    const result = nearbyHexes.map(hexId => ({
      hexId,
      dangerScore: dbMap[hexId]?.dangerScore ?? 0
    }));

    return res.json(result);
  } catch (error) {
    console.error("Hex fetch error:", error);
    return res.status(500).json({ message: "Failed to fetch hex safety data" });
  }
};

export const updateHex = async (lat, lng, severity) => {
  const hexId = latLngToCell(lat, lng, H3_RESOLUTION);
  const hex = await HexZone.findOne({ hexId });
  if (hex) {
    hex.dangerScore += Number(severity) || 0;
    hex.reportCount += 1;
    await hex.save();
  } else {
    const newHex = new HexZone({ hexId, dangerScore: Number(severity) || 0, reportCount: 1 });
    await newHex.save();
  }
}
  