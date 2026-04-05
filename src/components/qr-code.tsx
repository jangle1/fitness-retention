"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QRCodeDisplay({ url, size = 200 }: { url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    }
  }, [url, size]);

  function handleDownload() {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "fitbook-booking-qr.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} />
      <button
        onClick={handleDownload}
        className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Download QR Code
      </button>
    </div>
  );
}
