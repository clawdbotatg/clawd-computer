"use client";

import { useCallback, useRef, useState } from "react";
import { CameraView } from "~~/components/desktop/CameraView";
import { Window } from "~~/components/desktop/Window";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

let nextId = 1;

type WinContent = { type: "about" } | { type: "backstage" } | { type: "camera"; stream: MediaStream };

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
    height: 260,
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
  height: 20,
  background: "#c0c0c0",
  borderBottom: "1px solid #888",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 8px",
  zIndex: 9999,
  fontSize: 12,
  fontFamily: "'Chicago', 'Charcoal', system-ui, sans-serif",
  fontWeight: "bold",
  userSelect: "none",
};

export default function Desktop() {
  const [windows, setWindows] = useState<WinDef[]>(INITIAL_WINDOWS);
  const topZRef = useRef(INITIAL_WINDOWS.length + 1);

  const focus = useCallback((id: string) => {
    topZRef.current += 1;
    const z = topZRef.current;
    setWindows(ws => ws.map(w => (w.id === id ? { ...w, zIndex: z } : w)));
  }, []);

  const close = useCallback((id: string) => {
    setWindows(ws => {
      const win = ws.find(w => w.id === id);
      if (win?.content.type === "camera") win.content.stream.getTracks().forEach(t => t.stop());
      return ws.filter(w => w.id !== id);
    });
  }, []);

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
          title: "Camera",
          x: 80 + (ws.length % 5) * 30,
          y: 80 + (ws.length % 5) * 20,
          width: 320,
          height: 260,
          zIndex: topZRef.current,
          content: { type: "camera", stream },
        },
      ]);
    } catch {
      alert("Could not access camera/mic — check browser permissions.");
    }
  }, []);

  const openWindow = useCallback(
    (type: "about" | "backstage") => {
      const existing = windows.find(w => w.content.type === type);
      if (existing) {
        focus(existing.id);
        return;
      }
      topZRef.current += 1;
      const id = `${type}-${nextId++}`;
      const defaults =
        type === "about"
          ? { title: "About clawd-computer", width: 380, height: 220 }
          : { title: "Backstage", width: 300, height: 260 };
      setWindows(ws => [...ws, { id, x: 80, y: 80, zIndex: topZRef.current, content: { type }, ...defaults }]);
    },
    [windows, focus],
  );

  return (
    <div style={desktopStyle}>
      {/* Menu bar */}
      <div style={menubarStyle}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ fontSize: 14 }}>🍎</span>
          <span style={{ cursor: "pointer", padding: "0 4px" }} onClick={() => openWindow("about")}>
            File
          </span>
          <span style={{ cursor: "pointer", padding: "0 4px" }} onClick={() => openWindow("backstage")}>
            Backstage
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <RainbowKitCustomConnectButton />
        </div>
      </div>

      {/* Window layer */}
      <div style={{ position: "absolute", inset: "20px 0 0 0", overflow: "hidden" }}>
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
            <WindowContent content={win.content} onOpenCamera={openCamera} onOpenWindow={openWindow} />
          </Window>
        ))}
      </div>
    </div>
  );
}

function WindowContent({
  content,
  onOpenCamera,
  onOpenWindow,
}: {
  content: WinContent;
  onOpenCamera: () => void;
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
          Connect your camera and mic. Your feed will appear as a draggable window on the desktop.
        </p>
        <button style={btnStyle} onClick={onOpenCamera}>
          Connect Camera
        </button>
        <p style={{ margin: "12px 0 4px", color: "#555" }}>
          <em>WebRTC guests coming soon.</em>
        </p>
      </div>
    );
  }

  if (content.type === "camera") {
    return <CameraView stream={content.stream} />;
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
