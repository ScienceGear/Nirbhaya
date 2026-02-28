
import { generateToken } from "../library/utills.js"
import User from "../model/user.model.js"
import Report from "../model/report.model.js"
import bcrypt, { genSalt } from "bcrypt"

export const signup = async (req, res) => {
  const { username, email, password, role, phone, age, address, guardianName, guardianPhone, profilePic } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const prevUser = await User.findOne({ email });
    if (prevUser) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const salt = await genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);
    const parsedAge = age ? Number(age) : null;
    const newUser = new User({
      username,
      email,
      password: encryptedPassword,
      role: role || "user",
      phone: phone || "",
      age: parsedAge,
      address: address || "",
      guardianName: guardianName || "",
      guardianPhone: guardianPhone || "",
      profilePic: profilePic || "",
      isMinor: parsedAge ? parsedAge < 18 : false,
      onboardingDone: !!(age && address),
    });
    if (newUser) {
      const token = await generateToken({ userId: newUser._id }, res);
      await newUser.save();
      const safeUser = {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        age: newUser.age,
        address: newUser.address,
        profilePic: newUser.profilePic,
        guardianName: newUser.guardianName,
        guardianPhone: newUser.guardianPhone,
        isMinor: newUser.isMinor,
        onboardingDone: newUser.onboardingDone,
        linkCode: newUser.linkCode,
        points: newUser.points,
        sharingPrefs: newUser.sharingPrefs,
        createdAt: newUser.createdAt,
      };
      return res.status(201).json({ message: "signup successful", user: safeUser, token });
    } else {
      return res.status(400).json({ message: "Invalid user details" });
    }
  } catch (err) {
    console.log(`Error in signup ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password, role } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email not found" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid Password" });
    }
    // Role must match the account's assigned role
    if (role && role !== user.role) {
      return res.status(403).json({ message: `This account is registered as "${user.role}". Please select the correct role.` });
    }
    const token = await generateToken({ userId: user._id }, res);
    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone,
      age: user.age,
      address: user.address,
      profilePic: user.profilePic,
      guardianName: user.guardianName,
      guardianPhone: user.guardianPhone,
      isMinor: user.isMinor,
      onboardingDone: user.onboardingDone,
      linkCode: user.linkCode,
      points: user.points,
      sharingPrefs: user.sharingPrefs,
      guardianOf: user.guardianOf,
      myGuardians: user.myGuardians,
      emergencyContacts: user.emergencyContacts,
      createdAt: user.createdAt,
    };
    return res.status(200).json({ message: "login successful", user: safeUser, token });
  } catch (err) {
    console.log(`Error in login : ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.clearCookie("jwt", { path: "/" });
    res.status(200).json({ message: "Logout successful" });
  } catch (err) {
    console.log(`Error in logout controller : ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone,
      age: user.age,
      address: user.address,
      profilePic: user.profilePic,
      guardianName: user.guardianName,
      guardianPhone: user.guardianPhone,
      isMinor: user.isMinor,
      onboardingDone: user.onboardingDone,
      linkCode: user.linkCode,
      points: user.points,
      sharingPrefs: user.sharingPrefs,
      guardianOf: user.guardianOf,
      myGuardians: user.myGuardians,
      emergencyContacts: user.emergencyContacts,
    });
  } catch (err) {
    console.log(`Error in checkAuth : ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Guardian linking: user shares their linkCode, guardian enters it ── */
export const linkGuardian = async (req, res) => {
  try {
    const guardianId = req.user._id;
    const { linkCode } = req.body;
    if (!linkCode) return res.status(400).json({ message: "Link code required" });

    const target = await User.findOne({ linkCode: linkCode.toUpperCase() });
    if (!target) return res.status(404).json({ message: "Invalid link code" });
    if (String(target._id) === String(guardianId)) return res.status(400).json({ message: "Cannot link to yourself" });

    // Add links (idempotent)
    if (!target.myGuardians.includes(guardianId)) target.myGuardians.push(guardianId);
    if (!req.user.guardianOf.includes(target._id)) req.user.guardianOf.push(target._id);
    await target.save();
    await req.user.save();

    res.json({
      message: "Linked successfully",
      linkedUser: { _id: target._id, username: target.username, email: target.email },
    });
  } catch (err) {
    console.log(`Error in linkGuardian: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Get users a guardian is watching ── */
export const getWatchedUsers = async (req, res) => {
  try {
    const guardian = await User.findById(req.user._id).populate(
      "guardianOf",
      "username email phone lastLocation batteryLevel isNavigating currentRoute checkpointsPassed checkpointsTotal checkpoints emergencyLogs sharingPrefs linkCode tripHistory"
    );
    if (!guardian) return res.status(404).json({ message: "User not found" });

    // Filter data based on each user's sharing preferences
    const watched = (guardian.guardianOf || []).map((u) => {
      const prefs = u.sharingPrefs || {};
      const allSOS = prefs.sosAlerts ? (u.emergencyLogs || []).map(e => ({
        type: e.type, timestamp: e.timestamp, location: e.location, lat: e.lat, lng: e.lng,
      })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];
      return {
        _id: u._id,
        username: u.username,
        email: u.email,
        phone: u.phone,
        lastLocation:      prefs.location      ? u.lastLocation : null,
        batteryLevel:      prefs.batteryLevel   ? u.batteryLevel : null,
        isNavigating:      prefs.routeInfo      ? u.isNavigating : null,
        currentRoute:      prefs.routeInfo      ? u.currentRoute : null,
        checkpointsPassed: prefs.checkpoints    ? u.checkpointsPassed : null,
        checkpointsTotal:  prefs.checkpoints    ? u.checkpointsTotal  : null,
        checkpoints:       prefs.checkpoints    ? (u.checkpoints || []) : [],
        lastSOS:           allSOS[0] || null,
        sosAlerts:         allSOS.slice(0, 20),
        tripHistory:       prefs.routeInfo      ? (u.tripHistory || []).slice(-20).reverse() : [],
        sharingPrefs:      u.sharingPrefs,
      };
    });
    res.json({ watched });
  } catch (err) {
    console.log(`Error in getWatchedUsers: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Update sharing preferences ── */
export const updateSharingPrefs = async (req, res) => {
  try {
    const { sharingPrefs } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.sharingPrefs = { ...user.sharingPrefs.toObject?.() || {}, ...sharingPrefs };
    await user.save();
    res.json({ message: "Sharing preferences updated", sharingPrefs: user.sharingPrefs });
  } catch (err) {
    console.log(`Error in updateSharingPrefs: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Update live location (called from frontend periodically) ── */
export const updateLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy, batteryLevel, isNavigating, currentRoute, checkpointsPassed, checkpointsTotal, checkpoints } = req.body;
    const update = {};
    if (lat != null && lng != null) {
      update.lastLocation = { lat, lng, accuracy, updatedAt: new Date() };
    }
    if (batteryLevel != null) update.batteryLevel = batteryLevel;
    if (isNavigating != null) update.isNavigating = isNavigating;

    // When navigation ends, clear route fields
    if (isNavigating === false) {
      update.currentRoute = { origin: "", destination: "", rsi: 0, eta: "", distance: "" };
      update.checkpointsPassed = 0;
      update.checkpointsTotal = 0;
      update.checkpoints = [];
    } else {
      if (currentRoute) update.currentRoute = currentRoute;
      if (checkpointsPassed != null) update.checkpointsPassed = checkpointsPassed;
      if (checkpointsTotal != null) update.checkpointsTotal = checkpointsTotal;
      if (Array.isArray(checkpoints)) update.checkpoints = checkpoints;
    }

    await User.findByIdAndUpdate(req.user._id, { $set: update });

    // Real-time: notify all guardians of this user
    try {
      const user = await User.findById(req.user._id).select("myGuardians username");
      if (user && user.myGuardians?.length) {
        const { io } = await import("../library/socket.js");
        const payload = { userId: user._id, username: user.username, ...update };
        for (const gId of user.myGuardians) {
          io.to(String(gId)).emit("watchedUserUpdate", payload);
        }
      }
    } catch (socketErr) {
      console.log("Socket notify error (non-fatal):", socketErr.message);
    }

    res.json({ message: "Location updated" });
  } catch (err) {
    console.log(`Error in updateLocation: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Save completed trip to history ── */
export const saveTripHistory = async (req, res) => {
  try {
    const { origin, destination, rsi, eta, distance, checkpoints, startedAt } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.tripHistory = user.tripHistory || [];
    user.tripHistory.push({
      origin, destination, rsi, eta, distance,
      checkpoints: (checkpoints || []).map(c => ({ name: c.name, type: c.type, passed: !!c.passed })),
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      endedAt: new Date(),
    });
    // Keep only last 50 trips
    if (user.tripHistory.length > 50) user.tripHistory = user.tripHistory.slice(-50);
    await user.save();
    res.json({ message: "Trip saved", count: user.tripHistory.length });
  } catch (err) {
    console.log(`Error in saveTripHistory: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Log SOS event ── */
export const logSOS = async (req, res) => {
  try {
    const { type, lat, lng, location } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.emergencyLogs.push({ type: type || "SOS", timestamp: new Date(), location: location || `${lat},${lng}`, lat, lng });
    await user.save();

    // Notify guardians via socket
    const { io } = await import("../library/socket.js");
    const alertPayload = {
      userId: user._id,
      username: user.username,
      type,
      lat, lng,
      location: location || `${lat},${lng}`,
      phone: user.phone,
      timestamp: new Date(),
    };

    for (const gId of user.myGuardians) {
      io.to(String(gId)).emit("sosAlert", alertPayload);
    }

    // Also notify all admin users via socket
    const admins = await User.find({ role: "admin" }).select("_id");
    for (const admin of admins) {
      io.to(String(admin._id)).emit("sosAlert", alertPayload);
    }

    res.json({ message: "SOS logged", points: user.points });
  } catch (err) {
    console.log(`Error in logSOS: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Admin: get all reports ── */
export const adminGetAllReports = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const reports = await Report.find().sort({ timestamp: -1 }).limit(500).populate("userID", "username email");
    res.json(reports);
  } catch (err) {
    console.log(`Error in adminGetAllReports: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Admin: get all users ── */
export const adminGetAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const users = await User.find().select("-password").sort({ createdAt: -1 }).limit(200);
    res.json(users);
  } catch (err) {
    console.log(`Error in adminGetAllUsers: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Admin: get SOS alerts (from all users' emergency logs) ── */
export const adminGetAlerts = async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    const users = await User.find({ "emergencyLogs.0": { $exists: true } })
      .select("username email phone emergencyLogs lastLocation")
      .sort({ "emergencyLogs.timestamp": -1 });
    const alerts = [];
    for (const u of users) {
      for (const log of u.emergencyLogs) {
        alerts.push({
          _id: log._id,
          userId: u._id,
          username: u.username,
          email: u.email,
          phone: u.phone,
          type: log.type,
          location: log.location,
          lat: log.lat,
          lng: log.lng,
          timestamp: log.timestamp,
          userLastLocation: u.lastLocation,
        });
      }
    }
    alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(alerts.slice(0, 200));
  } catch (err) {
    console.log(`Error in adminGetAlerts: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* ── Public: get all reports (for map display) ── */
export const getAllReportsPublic = async (req, res) => {
  try {
    const reports = await Report.find()
      .select("latitude longitude severity incidentType description timestamp areaRating")
      .sort({ timestamp: -1 })
      .limit(500);
    res.json(reports);
  } catch (err) {
    console.log(`Error in getAllReportsPublic: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

