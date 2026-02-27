import express from 'express';
import cors from 'cors';
import trackerRouter from './routes/tracker.route.js';
import authRouter from './routes/auth.routes.js';
import hexRouter from './routes/hex.route.js';
import reportRouter from './routes/report.routes.js';
import dotenv from 'dotenv';
import {server,app,io} from './library/socket.js';
import { connectdb } from './library/db.js';
import cookieParser from 'cookie-parser';
dotenv.config();
app.use(cors(({
    origin: "http://localhost:5173",
    credentials: true,
})));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api/tracker",trackerRouter);
app.use("/api/auth",authRouter);
app.use("/api/hex",hexRouter);
app.use("/api/report", reportRouter);
server.listen(3000, () => {
            connectdb();
    console.log('Server is running on port 3000');
});