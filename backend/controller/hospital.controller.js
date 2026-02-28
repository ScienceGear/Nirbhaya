import Hospital from "../model/hospital.model.js";

/**
 * GET /api/hospitals/near?lat=&lng=&radiusKm=&limit=
 * Returns hospitals near a given point using $nearSphere
 */
export async function getHospitalsNear(req, res) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radiusKm) || 10;
    const limit = parseInt(req.query.limit) || 100;

    console.log(`[Hospitals] near request: lat=${lat}, lng=${lng}, radiusKm=${radiusKm}, limit=${limit}`);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "lat and lng required" });
    }

    const hospitals = await Hospital.find({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    })
      .limit(limit)
      .lean();

    const results = hospitals.map((h) => ({
      id: h._id,
      name: h.name,
      facilityType: h.facilityType,
      wardNo: h.wardNo,
      wardName: h.wardName,
      cityName: h.cityName,
      lat: h.location.coordinates[1],
      lng: h.location.coordinates[0],
    }));

    return res.json({ hospitals: results });
  } catch (err) {
    console.error("getHospitalsNear error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/hospitals/all
 * Returns all hospitals (small dataset — fine to return everything)
 */
export async function getAllHospitals(_req, res) {
  try {
    const hospitals = await Hospital.find({}).lean();
    const results = hospitals.map((h) => ({
      id: h._id,
      name: h.name,
      facilityType: h.facilityType,
      wardNo: h.wardNo,
      wardName: h.wardName,
      cityName: h.cityName,
      lat: h.location.coordinates[1],
      lng: h.location.coordinates[0],
    }));
    return res.json({ hospitals: results });
  } catch (err) {
    console.error("getAllHospitals error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}
