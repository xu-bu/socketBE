import { WebSocketServer } from "ws";
import http from "http";

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ok");
});

const wss = new WebSocketServer({ server });

const rooms = new Map();

function broadcastRoomUpdate(roomId) {
  const clients = rooms.get(roomId);
  if (!clients) return;

  const users = clients.map((c) => c.userId).filter(Boolean);
  const updateMsg = JSON.stringify({ type: "roomUpdate", users });

  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(updateMsg);
    }
  });
}

wss.on("connection", (ws) => {
  ws.on("message", (raw, isBinary) => {
    if (isBinary) {
      rooms.get(ws.roomId)?.forEach((client) => {
        if (client !== ws && client.readyState === 1) {
          client.send(raw, { binary: true });
        }
      });
      return;
    }

    const msg = JSON.parse(raw);

    if (msg.type === "join") {
      if (!rooms.has(msg.roomId)) rooms.set(msg.roomId, []);
      rooms.get(msg.roomId).push(ws);
      ws.roomId = msg.roomId;
      ws.userId = msg.userId || "Anonymous";

      // Broadcast updated user list to all in room
      broadcastRoomUpdate(msg.roomId);
      return;
    }

    // Relay other messages
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
      // Broadcast updated user list after someone leaves
      broadcastRoomUpdate(ws.roomId);
    }
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Signaling server running on port " + PORT);
});
