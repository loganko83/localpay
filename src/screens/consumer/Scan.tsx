import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Scan: React.FC = () => {
  const navigate = useNavigate();
  const [showMyCode, setShowMyCode] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Camera Placeholder */}
      <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=687&auto=format&fit=crop"
          alt="Camera Feed"
          className="w-full h-full object-cover opacity-40"
        />

        {/* Scanning Overlay */}
        {!showMyCode && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-primary rounded-3xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_rgba(237,38,48,0.8)] animate-[scan_2s_infinite]" />

              {/* Corners */}
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
            </div>
          </div>
        )}
      </div>

      {/* Scanner UI */}
      {!showMyCode && (
        <div className="relative z-10 flex flex-col justify-between h-full pt-10 pb-28 px-6">
          <div className="flex justify-between items-center text-white">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10">
              <span className="text-sm font-medium">Scan to Pay</span>
            </div>
            <button
              onClick={() => setFlashOn(!flashOn)}
              className={`h-10 w-10 backdrop-blur-md rounded-full flex items-center justify-center transition-colors ${
                flashOn ? 'bg-primary text-background' : 'bg-black/40 hover:bg-black/60'
              }`}
            >
              <span className="material-symbols-outlined">
                {flashOn ? 'flash_on' : 'flash_off'}
              </span>
            </button>
          </div>

          <div className="text-center space-y-6">
            <p className="text-white/80 text-sm">
              Align QR code within the frame
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowMyCode(true)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="h-12 w-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg transition-transform active:scale-95 group-hover:scale-105">
                  <span className="material-symbols-outlined">qr_code_2</span>
                </div>
                <span className="text-xs text-white font-medium">My QR</span>
              </button>

              <button className="flex flex-col items-center gap-2 group">
                <div className="h-12 w-12 rounded-full bg-black/60 text-white border border-white/20 flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 group-hover:bg-black/80">
                  <span className="material-symbols-outlined">image</span>
                </div>
                <span className="text-xs text-white font-medium">Gallery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My QR Code Overlay */}
      {showMyCode && (
        <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="w-full max-w-sm bg-surface border border-surface-highlight rounded-3xl p-6 flex flex-col items-center shadow-2xl relative">
            <button
              onClick={() => setShowMyCode(false)}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-surface-highlight flex items-center justify-center text-text-secondary hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center mb-4 ring-4 ring-primary/10">
              <span className="material-symbols-outlined text-primary text-3xl">person</span>
            </div>

            <h2 className="text-xl font-bold text-white">My Payment QR</h2>
            <p className="text-sm text-text-secondary mb-8">Scan to receive payment</p>

            <div className="bg-white p-4 rounded-2xl mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=jeonbuk-localpay-user-payment&color=221011&bgcolor=ffffff&margin=10"
                alt="My QR Code"
                className="w-48 h-48"
              />
            </div>

            <p className="text-sm text-center text-text-secondary mb-6 px-4">
              Show this code to merchants to make a payment
            </p>

            <div className="flex gap-3 w-full">
              <button className="flex-1 py-3 rounded-xl bg-surface-highlight text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">share</span>
                Share
              </button>
              <button className="flex-1 py-3 rounded-xl bg-surface-highlight text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Scan;
