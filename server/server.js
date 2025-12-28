import dotenv from 'dotenv';
import fs from "fs";
import https from "https";
import express from "express";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { GoogleAuth } from "google-auth-library";
import fetch from "node-fetch";
import admin from "./firebase-admin.js";


// ДОЛЖНО БЫТЬ В САМОМ НАЧАЛЕ - инициализация __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем .env файлы как React
const envFiles = [
  '.env',
  '.env.dev'
];

for (const file of envFiles) {
  const envPath = path.resolve(__dirname, file);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Server loaded env from: ${file}`);
    break;
  }
}

const PORT = 3001;
// CONFIG
// For initial testing you can use self-signed certs (mkcert) or use reverse proxy (nginx) with LetsEncrypt.
// Put cert files in ../certs/key.pem and ../certs/cert.pem when using HTTPS directly.
const USE_HTTPS = false; // set to true if you placed certs in ../certs/
const HTTP_PORT = process.env.PORT || 3000;
const FAMILY_PASSWORD = process.env.FAMILY_PASSWORD || "family-secret"; // change before production
const pushTokens = {}; // username -> FCM token

const app = express();

const secret = process.env.TURN_SECRET || "MY_SECRET_KEY";

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
const knownUsers = new Set(); // все, кто когда-либо заходил

const FIREBASE_KEY_PATH = path.resolve(__dirname, "./chat-pwa-j238.json");
// загрузим ключ при старте
let firebaseKey = null;
try {
  firebaseKey = JSON.parse(fs.readFileSync(FIREBASE_KEY_PATH, "utf8"));
} catch (e) {
  console.warn("⚠️ firebase-key.json не найден в", FIREBASE_KEY_PATH);
}

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
    knownUsers.add(name);
    console.log("Registered:", name);
    io.emit("user_list", Object.keys(users));
    socket.emit("register_ok", { name });
  });

  // Запрос актуального списка пользователей
  socket.on("request_user_list", () => {
    io.emit("user_list", {
      all: Array.from(knownUsers),
      online: Object.keys(users)
    });
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
    console.log('users', users);
    console.log('to', to);
    console.log('pushTokens', pushTokens);
    // 🔔 Если пользователь НЕ онлайн → пушим
    if (!users[to] && pushTokens[to]) {
      console.log('Если пользователь НЕ онлайн → пушим');
      admin.messaging().send({
        token: pushTokens[to],
        notification: {
          title: "📞 Входящий звонок",
          body: `${from} вам звонит`,
        },
        data: {
          caller: from
        }
      }).then(console.log('консоль отправленного пуша_')).catch(console.error);
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
      io.emit("user_list", {
        all: Array.from(knownUsers),
        online: Object.keys(users)
      });
      console.log("Disconnected:", socket.username);
    }
  });
});

// serve static web build (after you run `npm run build` in web/)
app.use(express.static(path.join(__dirname, "../web/build")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/build/index.html"));
});

app.post("/api/savePushToken", express.json(), (req, res) => {
  const { username, token } = req.body;
  if (username && token) {
    pushTokens[username] = token;
    console.log("🔥 Saved token for", username);
  }
  res.json({ ok: true });
});

function generateTurnCredentials(name) {
  const ttl = 3600; // 1 час
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:${name}`;
  const hmac = crypto.createHmac('sha1', secret).update(username).digest('base64');

  return { username, credential: hmac, ttl };
}

app.get("/turn", (req, res) => {
  const name = req.query.name || "guest";

  res.json(generateTurnCredentials(name));
});

server.listen(HTTP_PORT, () => {
  console.log(`Server listening on port ${HTTP_PORT}  (USE_HTTPS=${USE_HTTPS})`);
  console.log("Set FAMILY_PASSWORD env var to override default family password.");
});
