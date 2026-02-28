import express from 'express';
import cors from 'cors';
import trackerRouter from './routes/tracker.route.js';
import authRouter from './routes/auth.routes.js';
import hexRouter from './routes/hex.route.js';
import reportRouter from './routes/report.routes.js';
import navigationRouter from './routes/navigation.route.js';
import safecityRouter from './routes/safecity.routes.js';
import hospitalRouter from './routes/hospital.route.js';
import dotenv from 'dotenv';
import { server, app } from './library/socket.js';
import { connectdb } from './library/db.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8084",
    "http://localhost:8083",
    "http://10.23.12.219:8080",
    // Production origins from environment
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()) : []),
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) { callback(null, true); return; }
        // Allow any *.railway.app domain
        if (origin.endsWith(".railway.app") || origin.endsWith(".up.railway.app")) {
            callback(null, true); return;
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true); return;
        }
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => res.json({ status: "ok", app: "nirbhaya-backend" }));

app.use("/api/tracker",trackerRouter);
app.use("/api/auth",authRouter);
app.use("/api/hex",hexRouter);
app.use("/api/report", reportRouter);
app.use("/api/safecity", safecityRouter);
app.use("/api/hospitals", hospitalRouter);
app.use("/api", navigationRouter);

server.listen(PORT, () => {
    connectdb();
    console.log(`Server is running on port ${PORT}`);
});