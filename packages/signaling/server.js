// clawd-computer signaling server
//
// Tiny WebSocket relay for WebRTC peer setup. The server never sees media
// streams — it only forwards offer/answer/ice messages between named peers.
//
// Protocol (all JSON):
//   client → server  { type: "hello",  id: "<peer-id>" }              announce self
//   client → server  { type: "signal", to: "<peer>", payload: any }   relay to one peer
//   server → client  { type: "peers",  peers: ["<id>", ...] }         on hello, list of others
//   server → client  { type: "peer_join",  id: "<peer-id>" }
//   server → client  { type: "peer_leave", id: "<peer-id>" }
//   server → client  { type: "signal", from: "<peer>", payload: any }
//
// Peer IDs come from the client (later: SIWE-signed wallet address).
// First-write-wins on a given ID; collisions reject the new socket.

import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT ?? 8080);
const HEARTBEAT_MS = 30_000;

const peers = new Map(); // id -> ws

const send = (ws, msg) => {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
};

const broadcast = (msg, exceptId) => {
  for (const [id, ws] of peers) {
    if (id !== exceptId) send(ws, msg);
  }
};

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", ws => {
  ws.isAlive = true;
  ws.peerId = null;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", raw => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, { type: "error", error: "invalid_json" });
    }

    if (msg.type === "hello") {
      if (typeof msg.id !== "string" || !msg.id) {
        return send(ws, { type: "error", error: "missing_id" });
      }
      if (peers.has(msg.id)) {
        send(ws, { type: "error", error: "id_taken" });
        return ws.close(4001, "id_taken");
      }
      ws.peerId = msg.id;
      peers.set(msg.id, ws);
      send(ws, { type: "peers", peers: [...peers.keys()].filter(id => id !== msg.id) });
      broadcast({ type: "peer_join", id: msg.id }, msg.id);
      return;
    }

    if (msg.type === "signal") {
      if (!ws.peerId) return send(ws, { type: "error", error: "not_announced" });
      if (typeof msg.to !== "string") return send(ws, { type: "error", error: "missing_to" });
      const target = peers.get(msg.to);
      if (!target) return send(ws, { type: "error", error: "peer_not_found", to: msg.to });
      send(target, { type: "signal", from: ws.peerId, payload: msg.payload });
      return;
    }

    send(ws, { type: "error", error: "unknown_type" });
  });

  ws.on("close", () => {
    if (!ws.peerId) return;
    peers.delete(ws.peerId);
    broadcast({ type: "peer_leave", id: ws.peerId });
  });
});

// Drop dead sockets on a fixed interval.
const interval = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, HEARTBEAT_MS);

wss.on("close", () => clearInterval(interval));

console.log(`signaling listening on :${PORT}`);
