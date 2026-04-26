"use client";

import { useRef } from "react";
import { Rnd } from "react-rnd";

const TITLEBAR_H = 20;

const chrome: Record<string, React.CSSProperties> = {
  rnd: {
    display: "flex",
  },
  window: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    border: "1px solid #222",
    outline: "1px solid #888",
    outlineOffset: "-2px",
    boxShadow: "inset 1px 1px 0 #e8e8e8, inset -1px 0 0 #888, 3px 3px 8px rgba(0,0,0,0.6)",
    background: "#c0c0c0",
    overflow: "hidden",
    userSelect: "none",
  },
  titlebar: {
    height: TITLEBAR_H,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    padding: "0 4px",
    gap: 4,
    cursor: "default",
    borderBottom: "1px solid #666",
    // The OS 9 Platinum pinstripe
    background: "repeating-linear-gradient(to bottom, #c4c4c4 0px, #c4c4c4 1px, #a0a0a0 1px, #a0a0a0 2px)",
  },
  closeBox: {
    width: 13,
    height: 13,
    flexShrink: 0,
    border: "1px solid #444",
    background: "#c0c0c0",
    boxShadow: "inset 1px 1px 0 #fff, inset -1px -1px 0 #777",
    cursor: "pointer",
  },
  titleText: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "'Chicago', 'Charcoal', system-ui, sans-serif",
    color: "#000",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    pointerEvents: "none",
  },
  // spacer to mirror close box on the right for centering
  spacer: {
    width: 13,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflow: "hidden",
    background: "#f0f0f0",
    position: "relative",
  },
};

type Props = {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  onFocus: () => void;
  onClose: () => void;
  onDragStop: (x: number, y: number) => void;
  onResizeStop: (w: number, h: number, x: number, y: number) => void;
  children: React.ReactNode;
};

export const Window = ({
  title,
  x,
  y,
  width,
  height,
  zIndex,
  onFocus,
  onClose,
  onDragStop,
  onResizeStop,
  children,
}: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <Rnd
      position={{ x, y }}
      size={{ width, height }}
      style={{ ...chrome.rnd, zIndex }}
      dragHandleClassName="win-drag"
      minWidth={180}
      minHeight={100}
      onMouseDown={onFocus}
      onDragStop={(_e, d) => onDragStop(d.x, d.y)}
      onResizeStop={(_e, _dir, ref, _delta, pos) => onResizeStop(ref.offsetWidth, ref.offsetHeight, pos.x, pos.y)}
      enableResizing={{
        bottom: true,
        right: true,
        bottomRight: true,
        top: false,
        left: false,
        topLeft: false,
        topRight: false,
        bottomLeft: false,
      }}
      bounds="parent"
    >
      <div style={chrome.window}>
        {/* Title bar — drag handle */}
        <div className="win-drag" style={chrome.titlebar}>
          <button style={chrome.closeBox} onMouseDown={e => e.stopPropagation()} onClick={onClose} title="Close" />
          <span style={chrome.titleText}>{title}</span>
          <div style={chrome.spacer} />
        </div>

        {/* Content */}
        <div ref={contentRef} style={chrome.content}>
          {children}
        </div>
      </div>
    </Rnd>
  );
};
