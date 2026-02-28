import Report from '../model/report.model.js';
import User from '../model/user.model.js';
import { updateHex } from './hex.controller.js';

function calcPoints(severity, hasImage, hasDescription) {
  let pts = severity === "High" ? 15 : severity === "Medium" ? 10 : 5;
  if (hasImage) pts += 3;
  if (hasDescription) pts += 2;
  return pts;
}

export const createReport = async (req, res) => {
  try {
    let { description, lat, lng, severity, type, location, anonymous, areaRating, imageUrl, reporterId } = req.body;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: "Valid latitude and longitude are required" });
    }

    if (!["Low", "Medium", "High"].includes(severity)) {
      severity = "Low";
    }

    const pointsAwarded = calcPoints(severity, !!imageUrl, !!description);
    const isGuest = !req.user;

    const report = new Report({
      userID: isGuest ? undefined : req.user._id,
      description,
      latitude,
      longitude,
      severity,
      incidentType: type || "unsafe_area",
      locationText: location || "",
      anonymous: anonymous !== false,
      areaRating: typeof areaRating === "number" ? areaRating : 3,
      imageUrl: imageUrl || "",
      pointsAwarded,
      reporterKey: reporterId || (req.user?.email) || "guest",
    });

    await report.save();

    // Award community points to the user (only if logged in)
    let totalPoints = pointsAwarded;
    if (!isGuest) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { points: pointsAwarded } },
        { new: true }
      );
      totalPoints = updatedUser?.points || pointsAwarded;
    }

    await updateHex(latitude, longitude, severity === "Low" ? 1 : severity === "Medium" ? 3 : 5);
    res.status(201).json({
      success: true,
      pointsAwarded,
      totalPoints,
      report,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find({ userID: req.user._id }).sort({ timestamp: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserPoints = async (req, res) => {
  try {
    if (!req.user) return res.json({ userId: "guest", totalPoints: 0 });
    const user = await User.findById(req.user._id).select('points email');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ userId: user.email, totalPoints: user.points || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ timestamp: -1 }).limit(200);
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

