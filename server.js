import { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ok");
});

// websocket server
const wss = new WebSocketServer({ server });

const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (raw, isBinary) => {
  // 如果是二进制，不要 JSON.parse，直接广播
  if (isBinary) {
    rooms.get(ws.roomId)?.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(raw, { binary: true });
      }
    });
    return;
  }

  // 否则是文本消息
  const msg = JSON.parse(raw);

  if (msg.type === "join") {
    if (!rooms.has(msg.roomId)) rooms.set(msg.roomId, []);
    rooms.get(msg.roomId).push(ws);
    ws.roomId = msg.roomId;
    return;
  }

  // 普通文本 relay
  rooms.get(ws.roomId)?.forEach((client) => {
    if (client !== ws && client.readyState === 1) {
      client.send(JSON.stringify(msg));
    }
  });
});

  ws.on("close", () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.set(
        ws.roomId,
        rooms.get(ws.roomId).filter((c) => c !== ws)
      );
    }
  });
});

const PORT = process.env.PORT || 10000;

// MUST LISTEN ON 0.0.0.0
server.listen(PORT, "0.0.0.0", () => {
  console.log("Signaling server running on port " + PORT);
});
