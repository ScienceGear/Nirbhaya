import http from "node:http";
import { Server } from "socket.io";
import express from "express";

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8083",
    "http://localhost:8084",
    process.env.FRONTEND_ORIGIN,
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }});

const socketMap = {};

io.on("connection",(socket)=>{
    console.log("Socket connected:", socket.id);
    const userId = socket.handshake.query.userId;
    socketMap[socket.id] = userId;
    // Join a room named after the userId so we can emit directly via io.to(userId)
    if (userId) socket.join(userId);
    io.emit("update", { message: "A new user has connected!", socketMap});
        socket.on("updateLocation", (data)=>{
            console.log("Received location update:", data);
            const { lat, lng, username, to } = data;
            if (!Array.isArray(to)) return;

            to.forEach((userId)=>{
                const targetSocketId = Object.keys(socketMap).find(key => socketMap[key] === userId);
                if(targetSocketId){
                    io.to(targetSocketId).emit("visibleAccountUpdate", { lat, lng, username });
                }
            });
        })
    socket.on("disconnect",()=>{
        console.log("Socket disconnected:", socket.id);
        delete socketMap[socket.id];
    io.emit("update", { message: "A new user has connected!", socketMap});
    });
})

export {server,io,app};