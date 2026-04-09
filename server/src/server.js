import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { connectDb } from "./config/db.js";
import { Message } from "./models/Message.js";
import { messagesRouter } from "./routes/messages.js";
import { broadcastJson } from "./websocket/broadcast.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "../../client/dist");
const clientIndex = path.join(clientDist, "index.html");
const clientBuilt = fs.existsSync(clientIndex);

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI in environment");
  process.exit(1);
}

await connectDb(MONGODB_URI);
console.log("MongoDB connected");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/messages", messagesRouter);

if (clientBuilt) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api")) return next();
    res.sendFile(clientIndex, (err) => (err ? next(err) : undefined));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  socket.send(
    JSON.stringify({ type: "hello", message: "connected to message stream" })
  );

  socket.on("message", async (raw) => {
    let parsed;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", error: "invalid JSON" }));
      return;
    }

    if (parsed?.type === "chat" && typeof parsed.body === "string") {
      const body = parsed.body.trim();
      if (!body) {
        socket.send(JSON.stringify({ type: "error", error: "empty body" }));
        return;
      }
      const roomId =
        typeof parsed.roomId === "string" && parsed.roomId.trim()
          ? parsed.roomId.trim()
          : "default";
      const author =
        typeof parsed.author === "string" && parsed.author.trim()
          ? parsed.author.trim()
          : "anonymous";

      try {
        const doc = await Message.create({ body, author, roomId });
        const payload = { type: "message", message: doc.toObject() };
        broadcastJson(wss, payload);
      } catch (err) {
        socket.send(
          JSON.stringify({
            type: "error",
            error: err instanceof Error ? err.message : "save failed",
          })
        );
      }
      return;
    }

    socket.send(
      JSON.stringify({
        type: "error",
        error: "unknown message type; send { type: \"chat\", body: \"...\" }",
      })
    );
  });
});

server.listen(PORT, () => {
  const where = clientBuilt ? " (serving React app from client/dist)" : "";
  console.log(`HTTP + WebSocket listening on port ${PORT}${where}`);
  console.log(`WebSocket path: /ws`);
});
