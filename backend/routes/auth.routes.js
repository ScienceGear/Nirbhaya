import { Router } from "express";
import {
  checkAuth, login, logout, signup,
  linkGuardian, getWatchedUsers, updateSharingPrefs,
  updateLocation, logSOS, saveTripHistory,
  adminGetAllReports, adminGetAllUsers, adminGetAlerts,
  getAllReportsPublic,
} from "../controller/auth.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";

const authRouter = Router();

authRouter.post("/signup", signup);
authRouter.post("/login", login);
authRouter.post("/logout", logout);
authRouter.get("/check", protectedRoute, checkAuth);

// Guardian linking
authRouter.post("/link-guardian", protectedRoute, linkGuardian);
authRouter.get("/watched-users", protectedRoute, getWatchedUsers);

// Sharing preferences
authRouter.put("/sharing-prefs", protectedRoute, updateSharingPrefs);

// Live state updates
authRouter.post("/update-location", protectedRoute, updateLocation);
authRouter.post("/log-sos", protectedRoute, logSOS);
authRouter.post("/save-trip", protectedRoute, saveTripHistory);

// Admin endpoints
authRouter.get("/admin/reports", protectedRoute, adminGetAllReports);
authRouter.get("/admin/users", protectedRoute, adminGetAllUsers);
authRouter.get("/admin/alerts", protectedRoute, adminGetAlerts);

// Public: all reports for map
authRouter.get("/all-reports", getAllReportsPublic);

export default authRouter;