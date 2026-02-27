import http from "node:http";
import { Server } from "socket.io";
import express from "express";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173","*"],
        methods: ["GET", "POST"],
        credentials: true
    }});

const socketMap = {};

io.on("connection",(socket)=>{
    console.log("Socket connected:", socket.id);
        socketMap[socket.id] = socket.handshake.query.userId;
    io.emit("update", { message: "A new user has connected!", socketMap});
        socket.on("updateLocation", (data)=>{
            console.log("Received location update:", data);
            const { lat, lng, username, to } = data;
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