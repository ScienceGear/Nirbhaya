
import { generateToken } from "../library/utills.js"
import User from "../model/user.model.js"
import bcrypt, { genSalt } from "bcrypt"

export const signup = async (req, res) => {
  const { username, email, password, role, phone } = req.body;
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
    const newUser = new User({
      username,
      email,
      password: encryptedPassword,
      role: role || "user",
      phone: phone || "",
    });
    if (newUser) {
      const token = await generateToken({ userId: newUser._id }, res);
      await newUser.save();
      const safeUser = {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
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
    // Optionally update role if user switches
    if (role && role !== user.role) {
      user.role = role;
      await user.save();
    }
    const token = await generateToken({ userId: user._id }, res);
    const safeUser = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone,
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
      "username email phone lastLocation batteryLevel isNavigating currentRoute checkpointsPassed checkpointsTotal emergencyLogs sharingPrefs linkCode"
    );
    if (!guardian) return res.status(404).json({ message: "User not found" });

    // Filter data based on each user's sharing preferences
    const watched = (guardian.guardianOf || []).map((u) => {
      const prefs = u.sharingPrefs || {};
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
        lastSOS:           prefs.sosAlerts       ? (u.emergencyLogs?.slice(-1)[0] || null) : null,
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
    const { lat, lng, accuracy, batteryLevel, isNavigating, currentRoute, checkpointsPassed, checkpointsTotal } = req.body;
    const update = {};
    if (lat != null && lng != null) {
      update.lastLocation = { lat, lng, accuracy, updatedAt: new Date() };
    }
    if (batteryLevel != null) update.batteryLevel = batteryLevel;
    if (isNavigating != null) update.isNavigating = isNavigating;
    if (currentRoute) update.currentRoute = currentRoute;
    if (checkpointsPassed != null) update.checkpointsPassed = checkpointsPassed;
    if (checkpointsTotal != null) update.checkpointsTotal = checkpointsTotal;

    await User.findByIdAndUpdate(req.user._id, { $set: update });
    res.json({ message: "Location updated" });
  } catch (err) {
    console.log(`Error in updateLocation: ${err}`);
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
    for (const gId of user.myGuardians) {
      io.to(String(gId)).emit("sosAlert", {
        userId: user._id,
        username: user.username,
        type,
        lat, lng,
        timestamp: new Date(),
      });
    }

    res.json({ message: "SOS logged", points: user.points });
  } catch (err) {
    console.log(`Error in logSOS: ${err}`);
    res.status(500).json({ message: "Internal server error" });
  }
};

