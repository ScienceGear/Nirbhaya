import { latLngToCell, gridDisk } from "h3-js";
import HexZone from "../model/hex.model.js";

export const getHex =  async (req, res) => {
  const { lat, lng } = req.query;

  const centerHex = latLngToCell(lat, lng, 9);
  const nearbyHexes = gridDisk(centerHex, 5);

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
};

export const updateHex = async (lat, lng, severity) => {
  const hexId = latLngToCell(lat, lng, 9);
  const hex = await HexZone.findOne({ hexId });
  if (hex) {
    hex.dangerScore += severity;
    hex.reportCount += 1;
    await hex.save();
  } else {
    const newHex = new HexZone({ hexId, dangerScore: severity, reportCount: 1 });
    await newHex.save();
  }
}
  