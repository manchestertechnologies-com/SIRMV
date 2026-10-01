import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, AlertCircle } from 'lucide-react';

// A continuous, always-on camera QR scanner (PhonePe/GPay style) — no "take a
// photo" step. Opens the device camera once, then decodes frames in a
// requestAnimationFrame loop until a code is found, debouncing repeat fires
// of the same code for a few seconds so one scan doesn't trigger twice.
export const LiveQrScanner: React.FC<{
  onScan: (data: string) => void;
  active?: boolean;
  heightPx?: number;
}> = ({ onScan, active = true, heightPx = 320 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ data: string; at: number } | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsReady(true);
        tick();
      } catch (err: any) {
        setPermissionError(
          err?.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow camera permission for this site and reload.'
            : 'Could not access the camera on this device.'
        );
      }
    };

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imageData.data, imageData.width, imageData.height);
          if (decoded && decoded.data) {
            const now = Date.now();
            const last = lastScanRef.current;
            // Ignore the same code re-fired within 4s (holding the phone
            // steady on an already-scanned QR shouldn't spam the callback).
            if (!last || last.data !== decoded.data || now - last.at > 4000) {
              lastScanRef.current = { data: decoded.data, at: now };
              onScan(decoded.data);
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (permissionError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 bg-slate-900 rounded-2xl p-8 text-center" style={{ height: heightPx }}>
        <AlertCircle className="w-6 h-6 text-amber-400" />
        <p className="text-xs text-slate-300 max-w-xs">{permissionError}</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black" style={{ height: heightPx }}>
      <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />
      {/* Viewfinder overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-48 h-48 sm:w-56 sm:h-56 border-4 border-white/80 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
      </div>
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="flex items-center gap-2 text-white text-xs font-semibold">
            <Camera className="w-4 h-4" /> Starting camera…
          </div>
        </div>
      )}
      {isReady && (
        <div className="absolute bottom-3 left-0 right-0 text-center">
          <span className="text-[11px] font-semibold text-white bg-black/50 px-3 py-1 rounded-full">
            Align the QR code within the frame
          </span>
        </div>
      )}
    </div>
  );
};
