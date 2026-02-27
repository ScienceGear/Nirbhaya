import Report from '../model/report.model.js';
import { updateHex } from './hex.controller.js';
export const createReport = async (req, res) => {
  try {
    let { description, lat, lng, severity } = req.body;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const report = new Report({
      userID: req.user._id,
      description,
      latitude,
      longitude,
      severity
    });
    console.log(latitude, longitude, severity);
    await report.save();
    await updateHex(latitude, longitude, severity=== "Low" ? 1 : severity === "Medium" ? 3 : 5);
    res.status(201).json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find({ userID: req.user._id });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


