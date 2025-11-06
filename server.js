import express from "express";
import cors from "cors";
import { createServer } from "http";
import { ExpressPeerServer } from "peer";

const PORT = process.env.PORT || 9000;
const PEER_PATH = process.env.PEER_PATH || "/pg"; // bạn có thể đổi

const app = express();

// CORS: cho phép local dev + domain của bạn
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://<domain-app-cua-ban>" // thêm domain app thật nếu có
  ],
  credentials: true
}));

// Healthcheck đơn giản (Render dùng được)
app.get("/", (_req, res) => {
  res.send("PeerJS signaling server is running.");
});

// Tạo HTTP server + gắn Peer server
const httpServer = createServer(app);

// Quan trọng: proxied:true để Render (reverse proxy) báo đúng scheme wss
const peerServer = ExpressPeerServer(httpServer, {
  path: "/",
  proxied: true,
  // default pingInterval/pingTimeout ổn; có thể chỉnh nếu cần:
  // pingInterval: 25000,
  // pingTimeout: 5000
});

// Mount peer server ở đường dẫn cố định (ví dụ /pg)
app.use(PEER_PATH, peerServer);

// Log sự kiện hữu ích khi debug
peerServer.on("connection", (client) => {
  console.log("Peer connected:", client.getId());
});
peerServer.on("disconnect", (client) => {
  console.log("Peer disconnected:", client.getId());
});

httpServer.listen(PORT, () => {
  console.log(`PeerJS server on Render listening at :${PORT}${PEER_PATH}`);
});
