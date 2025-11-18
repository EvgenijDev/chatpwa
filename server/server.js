import fs from "fs";
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import http from "http";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------- CONFIG ----------------------
const PORT = process.env.PORT || 3001;
const FAMILY_PASSWORD = process.env.FAMILY_PASSWORD || "family-secret";
const TURN_SECRET = process.env.TURN_SECRET || "MY_SECRET_KEY";

// ---------------------- APP + SERVER ----------------------
const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" }
});

// ---------------------- USERS ----------------------
const users = {}; // name -> socket

io.on("connection", (socket) => {
  console.log("New socket:", socket.id);

  socket.on("register", ({ name, password }) => {
    if (!password || password !== FAMILY_PASSWORD) {
      socket.emit("register_failed", { message: "Invalid family password" });
      return;
    }
    if (!name) {
      socket.emit("register_failed", { message: "Name required" });
      return;
    }

    socket.username = name;
    users[name] = socket;

    console.log("Registered:", name);
    io.emit("user_list", Object.keys(users));
    socket.emit("register_ok", { name });
  });

  socket.on("request_user_list", () => {
    socket.emit("user_list", Object.keys(users));
  });

  socket.on("chat_message", ({ to, text }) => {
    if (to && users[to]) {
      users[to].emit("chat_message", { from: socket.username, text });
    }
  });

  // --- WebRTC signaling ---
  socket.on("call_offer", ({ to, offer, from }) => {
    console.log("Call offer:", from, "→", to);
    if (users[to]) users[to].emit("call_offer", { from, offer });
  });

  socket.on("call_answer", ({ to, answer, from }) => {
    if (users[to]) users[to].emit("call_answer", { from, answer });
  });

  socket.on("ice_candidate", ({ to, candidate, from }) => {
    if (users[to]) users[to].emit("ice_candidate", { from, candidate });
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      delete users[socket.username];
      io.emit("user_list", Object.keys(users));
      console.log("Disconnected:", socket.username);
    }
  });
});

// ---------------------- TURN CREDENTIALS ----------------------
function generateTurnCredentials(name) {
  const ttl = 3600; // 1 час
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:${name}`;

  const hmac = crypto
    .createHmac("sha1", TURN_SECRET)
    .update(username)
    .digest("base64");

  return { username, credential: hmac, ttl };
}

app.get("/turn", (req, res) => {
  const name = req.query.name || "guest";
  res.json(generateTurnCredentials(name));
});

// ---------------------- STATIC FILES ----------------------
app.use(express.static(path.join(__dirname, "../web/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/build/index.html"));
});

// ---------------------- START SERVER ----------------------
httpServer.listen(PORT, () => {
  console.log(`💡 DEV server running on http://localhost:${PORT}`);
  console.log(`TURN_SECRET = ${TURN_SECRET}`);
});
