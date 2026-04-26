"use client";

import { useEffect, useRef, useState } from "react";

export const CameraView = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
    videoRef.current.onloadedmetadata = () => setReady(true);
  }, [stream]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#000", position: "relative" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: ready ? "block" : "none",
        }}
      />
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#888",
            fontSize: 12,
            fontFamily: "system-ui",
          }}
        >
          connecting…
        </div>
      )}
    </div>
  );
};
