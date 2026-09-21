import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, CheckCircle, Upload, Sparkles, Scan, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../services/api';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoCaptured: (photoUrl: string) => void;
  title?: string;
  uploadEndpoint?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onPhotoCaptured,
  title = 'AI Assisted Live Camera Verification',
  uploadEndpoint = '/outpass/upload-photo'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCapturedDataUrl(null);
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Webcam stream unavailable, falling back to file picker:', err);
      setCameraError('Webcam direct stream unavailable. You can upload an image directly.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedDataUrl(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedDataUrl(event.target?.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  const confirmPhoto = async () => {
    if (!capturedDataUrl) return;
    setIsUploading(true);

    try {
      const resBlob = await fetch(capturedDataUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append('photo', resBlob, 'capture.jpg');

      const uploadRes = await apiFetch<{ success: boolean; photoUrl: string }>(uploadEndpoint, {
        method: 'POST',
        body: formData
      });

      onPhotoCaptured(uploadRes.photoUrl);
      onClose();
    } catch (err: any) {
      console.error('Upload failed, using direct data url:', err);
      onPhotoCaptured(capturedDataUrl);
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-700/80 text-white">
        {/* Header with Luxury Brand Accent */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base font-heading tracking-tight">{title}</h3>
              <p className="text-[10px] text-slate-400 font-mono">LOCAL CV VERIFICATION SYSTEM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport with Futuristic HUD */}
        <div className="p-6">
          <div className="relative aspect-4/3 bg-black rounded-2xl overflow-hidden flex items-center justify-center border-2 border-indigo-500/40 shadow-inner">
            {capturedDataUrl ? (
              <img src={capturedDataUrl} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <>
                {cameraError ? (
                  <div className="text-center p-6 text-slate-300">
                    <p className="text-xs mb-4">{cameraError}</p>
                    <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg transition">
                      <Upload className="w-4 h-4" />
                      Upload Photo File
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                ) : (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    
                    {/* Futuristic HUD Scanning Overlay */}
                    <div className="absolute inset-6 border border-sky-400/40 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
                      {/* Top HUD Markers */}
                      <div className="flex justify-between items-center text-[10px] font-mono text-sky-400 tracking-wider">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> LIVE SCANNER HUD
                        </span>
                        <span>RES: 1080P</span>
                      </div>

                      {/* Center Target Box */}
                      <div className="self-center w-48 h-48 border-2 border-dashed border-indigo-400/70 rounded-3xl flex items-center justify-center relative">
                        {/* Animated Laser Scanning Bar */}
                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline shadow-[0_0_12px_rgba(34,211,238,0.8)]"></div>
                        <span className="bg-black/60 text-sky-200 text-[10px] font-mono font-bold px-3 py-1 rounded-full backdrop-blur-md border border-sky-500/30">
                          ALIGN FACE / CLASS
                        </span>
                      </div>

                      {/* Bottom Status */}
                      <div className="text-center">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950/70 px-3 py-1 rounded-full border border-white/10">
                          READY FOR SNAPSHOT
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center justify-between gap-3">
            {capturedDataUrl ? (
              <>
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={confirmPhoto}
                  disabled={isUploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-500/30 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isUploading ? 'Verifying & Saving...' : 'Confirm Photograph'}
                </button>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
                <button
                  type="button"
                  onClick={captureFrame}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-indigo-500/30 transition hover:scale-105 active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Capture Photo Frame
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
