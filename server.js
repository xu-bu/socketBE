import { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer();
const wss = new WebSocketServer({ server });

const rooms = new Map();

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    let msg = JSON.parse(data);

    if (msg.type === "join") {
      if (!rooms.has(msg.roomId)) rooms.set(msg.roomId, []);
      rooms.get(msg.roomId).push(ws);
      ws.roomId = msg.roomId;
      return;
    }

    // relay to peers in same room
    rooms.get(ws.roomId)?.forEach((client) => {
      if (client !== ws && client.readyState === 1) {
        client.send(JSON.stringify(msg));
      }
    });
  });

  ws.on("close", () => {
    if (ws.roomId && rooms.has(ws.roomId)) {
      rooms.set(ws.roomId, rooms.get(ws.roomId).filter((c) => c !== ws));
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log("WebRTC Signaling Server on port " + PORT);
});
