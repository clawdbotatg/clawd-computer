"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraView } from "~~/components/desktop/CameraView";
import { Window } from "~~/components/desktop/Window";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { usePeerMesh } from "~~/hooks/usePeerMesh";
import { getOrCreatePeerId } from "~~/utils/peerId";

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "ws://localhost:8080";

let nextId = 1;

type WinContent =
  | { type: "about" }
  | { type: "backstage" }
  | { type: "camera"; stream: MediaStream }
  | { type: "screen"; stream: MediaStream }
  | { type: "remote"; peerId: string; stream: MediaStream };

type WinDef = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  content: WinContent;
};

const INITIAL_WINDOWS: WinDef[] = [
  {
    id: "about",
    title: "About clawd-computer",
    x: 60,
    y: 60,
    width: 380,
    height: 220,
    zIndex: 1,
    content: { type: "about" },
  },
  {
    id: "backstage",
    title: "Backstage",
    x: 480,
    y: 80,
    width: 300,
    height: 280,
    zIndex: 2,
    content: { type: "backstage" },
  },
];

const desktopStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "radial-gradient(ellipse at 30% 40%, #3a1a6e 0%, #1a0a3a 40%, #0a0520 100%)",
  overflow: "hidden",
};

const menubarStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 32,
  background: "#c0c0c0",
  borderBottom: "1px solid #888",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 12px",
  zIndex: 9999,
  fontSize: 14,
  fontFamily: "'Chicago', 'Charcoal', system-ui, sans-serif",
  fontWeight: "bold",
  userSelect: "none",
};

export default function Desktop() {
  const [windows, setWindows] = useState<WinDef[]>(INITIAL_WINDOWS);
  const [myId, setMyId] = useState("");
  const topZRef = useRef(INITIAL_WINDOWS.length + 1);

  useEffect(() => setMyId(getOrCreatePeerId()), []);

  const { remotes, connected, addLocalStream, removeLocalStream } = usePeerMesh({
    url: SIGNALING_URL,
    myId,
    enabled: !!myId,
  });

  const focus = useCallback((id: string) => {
    topZRef.current += 1;
    const z = topZRef.current;
    setWindows(ws => ws.map(w => (w.id === id ? { ...w, zIndex: z } : w)));
  }, []);

  const close = useCallback(
    (id: string) => {
      setWindows(ws => {
        const win = ws.find(w => w.id === id);
        if (win?.content.type === "camera" || win?.content.type === "screen") {
          removeLocalStream(win.content.stream);
          win.content.stream.getTracks().forEach(t => t.stop());
        }
        return ws.filter(w => w.id !== id);
      });
    },
    [removeLocalStream],
  );

  const updatePos = useCallback((id: string, x: number, y: number) => {
    setWindows(ws => ws.map(w => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  const updateSize = useCallback((id: string, width: number, height: number, x: number, y: number) => {
    setWindows(ws => ws.map(w => (w.id === id ? { ...w, width, height, x, y } : w)));
  }, []);

  const openCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      topZRef.current += 1;
      const id = `camera-${nextId++}`;
      setWindows(ws => [
        ...ws,
        {
          id,
          title: "Camera (you)",
          x: 80 + (ws.length % 5) * 30,
          y: 80 + (ws.length % 5) * 20,
          width: 320,
          height: 260,
          zIndex: topZRef.current,
          content: { type: "camera", stream },
        },
      ]);
      addLocalStream(stream);
    } catch {
      alert("Could not access camera/mic — check browser permissions.");
    }
  }, [addLocalStream]);

  const openScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      topZRef.current += 1;
      const id = `screen-${nextId++}`;
      const track = stream.getVideoTracks()[0];
      const label = track?.label ? `Screen — ${track.label}` : "Screen";
      track?.addEventListener("ended", () => {
        setWindows(ws => {
          const win = ws.find(w => w.id === id);
          if (win?.content.type === "screen") {
            removeLocalStream(win.content.stream);
            win.content.stream.getTracks().forEach(t => t.stop());
          }
          return ws.filter(w => w.id !== id);
        });
      });
      setWindows(ws => [
        ...ws,
        {
          id,
          title: label,
          x: 120 + (ws.length % 5) * 30,
          y: 100 + (ws.length % 5) * 20,
          width: 560,
          height: 360,
          zIndex: topZRef.current,
          content: { type: "screen", stream },
        },
      ]);
      addLocalStream(stream);
    } catch {
      // user cancelled the picker — no-op
    }
  }, [addLocalStream, removeLocalStream]);

  const openWindow = useCallback(
    (type: "about" | "backstage") => {
      const defaults =
        type === "about"
          ? { title: "About clawd-computer", width: 380, height: 220 }
          : { title: "Backstage", width: 300, height: 280 };
      topZRef.current += 1;
      const z = topZRef.current;
      const existing = windows.find(w => w.content.type === type);
      if (existing) {
        setWindows(ws => ws.map(w => (w.id === existing.id ? { ...w, zIndex: z, x: 80, y: 60 } : w)));
        return;
      }
      const id = `${type}-${nextId++}`;
      setWindows(ws => [...ws, { id, x: 80, y: 60, zIndex: z, content: { type }, ...defaults }]);
    },
    [windows],
  );

  // Sync remote streams from the mesh into the windows list.
  useEffect(() => {
    setWindows(ws => {
      const remoteStreamIds = new Set(remotes.map(r => r.stream.id));
      const kept = ws.filter(w => w.content.type !== "remote" || remoteStreamIds.has(w.content.stream.id));
      const presentIds = new Set(
        kept.filter(w => w.content.type === "remote").map(w => (w.content as { stream: MediaStream }).stream.id),
      );
      const additions: WinDef[] = [];
      for (const r of remotes) {
        if (presentIds.has(r.stream.id)) continue;
        topZRef.current += 1;
        additions.push({
          id: `remote-${r.stream.id}`,
          title: `Peer — ${r.peerId.slice(0, 6)}`,
          x: 240 + ((additions.length * 32) % 240),
          y: 160 + ((additions.length * 24) % 200),
          width: 360,
          height: 280,
          zIndex: topZRef.current,
          content: { type: "remote", peerId: r.peerId, stream: r.stream },
        });
      }
      return [...kept, ...additions];
    });
  }, [remotes]);

  return (
    <div style={desktopStyle}>
      <div style={menubarStyle}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 14 }}>🍎</span>
          <span style={{ cursor: "pointer", padding: "0 4px" }} onClick={() => openWindow("about")}>
            File
          </span>
          <span style={{ cursor: "pointer", padding: "0 4px" }} onClick={() => openWindow("backstage")}>
            Backstage
          </span>
          <span style={{ cursor: "pointer", padding: "0 4px" }} onClick={openScreen}>
            Share Screen
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: "normal", color: connected ? "#1a6e1a" : "#888" }}>
            {connected ? `● live · ${remotes.length} peer${remotes.length === 1 ? "" : "s"}` : "○ offline"}
          </span>
          <RainbowKitCustomConnectButton />
        </div>
      </div>

      <div style={{ position: "absolute", inset: "32px 0 0 0", overflow: "hidden" }}>
        {windows.map(win => (
          <Window
            key={win.id}
            title={win.title}
            x={win.x}
            y={win.y}
            width={win.width}
            height={win.height}
            zIndex={win.zIndex}
            onFocus={() => focus(win.id)}
            onClose={() => close(win.id)}
            onDragStop={(x, y) => updatePos(win.id, x, y)}
            onResizeStop={(w, h, x, y) => updateSize(win.id, w, h, x, y)}
          >
            <WindowContent
              content={win.content}
              myId={myId}
              connected={connected}
              peerCount={remotes.length}
              onOpenCamera={openCamera}
              onOpenScreen={openScreen}
              onOpenWindow={openWindow}
            />
          </Window>
        ))}
      </div>
    </div>
  );
}

function WindowContent({
  content,
  myId,
  connected,
  peerCount,
  onOpenCamera,
  onOpenScreen,
  onOpenWindow,
}: {
  content: WinContent;
  myId: string;
  connected: boolean;
  peerCount: number;
  onOpenCamera: () => void;
  onOpenScreen: () => void;
  onOpenWindow: (type: "about" | "backstage") => void;
}) {
  const prose: React.CSSProperties = {
    padding: 16,
    fontSize: 12,
    fontFamily: "'Geneva', system-ui, sans-serif",
    lineHeight: 1.6,
    color: "#000",
  };

  if (content.type === "about") {
    return (
      <div style={prose}>
        <strong style={{ fontSize: 14 }}>clawd-computer</strong>
        <p style={{ margin: "8px 0" }}>
          A crypto + AI desktop environment. Every app is a draggable window. Guests join via WebRTC. Apps are
          iframe&apos;d SE2 dApps.
        </p>
        <p style={{ margin: "8px 0" }}>Connect your wallet to get started.</p>
        <button style={btnStyle} onClick={() => onOpenWindow("backstage")}>
          Open Backstage
        </button>
      </div>
    );
  }

  if (content.type === "backstage") {
    return (
      <div style={prose}>
        <strong>Backstage</strong>
        <p style={{ margin: "8px 0" }}>
          Connect your camera and mic, or share a window/screen. Each feed appears as a draggable window — for you and
          for every peer connected to this room.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btnStyle} onClick={onOpenCamera}>
            Connect Camera
          </button>
          <button style={btnStyle} onClick={onOpenScreen}>
            Share Screen
          </button>
        </div>
        <p style={{ margin: "12px 0 0", color: "#555", fontSize: 11 }}>
          you: <code>{myId.slice(0, 8) || "…"}</code>
          <br />
          status: {connected ? `live · ${peerCount} peer${peerCount === 1 ? "" : "s"}` : "connecting…"}
        </p>
      </div>
    );
  }

  if (content.type === "camera") {
    return <CameraView stream={content.stream} />;
  }

  if (content.type === "screen") {
    return <CameraView stream={content.stream} fit="contain" />;
  }

  if (content.type === "remote") {
    return <CameraView stream={content.stream} fit="contain" />;
  }

  return null;
}

const btnStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 4,
  padding: "4px 14px",
  fontSize: 11,
  fontFamily: "system-ui",
  background: "#c0c0c0",
  border: "1px solid #444",
  boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #888",
  cursor: "pointer",
  borderRadius: 0,
};
