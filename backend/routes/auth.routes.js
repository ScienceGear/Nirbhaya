import {Router} from "express";
import { checkAuth, login, logout, signup} from "../controller/auth.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";


const authRouter = Router();

authRouter.post("/signup",signup);
authRouter.post("/login",login);
authRouter.post("/logout",logout);
authRouter.get("/check",protectedRoute,checkAuth)

export default authRouter 