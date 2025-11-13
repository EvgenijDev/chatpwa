import fs from "fs";
import https from "https";
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
// For initial testing you can use self-signed certs (mkcert) or use reverse proxy (nginx) with LetsEncrypt.
// Put cert files in ../certs/key.pem and ../certs/cert.pem when using HTTPS directly.
const USE_HTTPS = false; // set to true if you placed certs in ../certs/
const HTTP_PORT = process.env.PORT || 3000;
const FAMILY_PASSWORD = process.env.FAMILY_PASSWORD || "family-secret"; // change before production

const app = express();

let server;
if (USE_HTTPS) {
  const keyPath = path.resolve(__dirname, "../certs/key.pem");
  const certPath = path.resolve(__dirname, "../certs/cert.pem");
  const key = fs.readFileSync(keyPath);
  const cert = fs.readFileSync(certPath);
  server = https.createServer({ key, cert }, app);
} else {
  server = (await import('http')).createServer(app);
}

const io = new Server(server, { cors: { origin: "*" } });
const users = {}; // username -> socket

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

  socket.on("chat_message", ({ to, text }) => {
    if (!socket.username) return;
    if (to && users[to]) {
      users[to].emit("chat_message", { from: socket.username, text });
    }
  });

  // placeholders for future WebRTC signaling
// Звонок (offer)
socket.on("call_offer", ({ to, offer, from }) => {
  console.log("Call offer to:", to, "from:", from);
  if (to && users[to]) {
    users[to].emit("call_offer", { from, offer });
  }
});

// Ответ на звонок (answer)
socket.on("call_answer", ({ to, answer, from }) => {
  if (to && users[to]) users[to].emit("call_answer", { from, answer });
});

// ICE кандидаты
socket.on("ice_candidate", ({ to, candidate, from }) => {
  if (to && users[to]) users[to].emit("ice_candidate", { from, candidate });
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
