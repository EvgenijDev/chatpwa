import fs from "fs";
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

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

// serve static web build (after you run `npm run build` in web/)
app.use(express.static(path.join(__dirname, "../web/build")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/build/index.html"));
});

server.listen(HTTP_PORT, () => {
  console.log(`Server listening on port ${HTTP_PORT}  (USE_HTTPS=${USE_HTTPS})`);
  console.log("Set FAMILY_PASSWORD env var to override default family password.");
});
