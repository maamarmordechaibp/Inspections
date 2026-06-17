import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

interface BarcodeScannerProps {
  onDetected: (value: string) => void;
  onClose: () => void;
  title?: string;
}

/**
 * Full-screen camera scanner for QR codes and 1D barcodes (asset tags,
 * serial numbers). Uses the device's rear camera when available.
 */
export default function BarcodeScanner({ onDetected, onClose, title = 'Scan Asset Tag' }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera not supported on this device or browser.');
        }
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current!,
          (result) => {
            if (result && !detectedRef.current) {
              detectedRef.current = true;
              onDetected(result.getText().trim());
            }
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStarting(false);
      } catch (err) {
        if (!cancelled) {
          const msg = (err as Error)?.message || '';
          setError(
            msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
              ? 'Camera permission was denied. Please allow camera access and try again.'
              : msg || 'Unable to start the camera.'
          );
          setStarting(false);
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[9998] bg-black/90 flex flex-col" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between px-4 h-14 text-white">
        <span className="text-sm font-semibold">{title}</span>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
        >
          <i className="ri-close-line text-xl"></i>
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

        {/* Scan reticle */}
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 max-w-[70vw] max-h-[70vw] border-2 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"></div>
          </div>
        )}

        {starting && !error && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <i className="ri-loader-4-line animate-spin text-3xl"></i>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl p-5 max-w-sm text-center">
              <i className="ri-camera-off-line text-2xl text-red-400"></i>
              <p className="text-sm text-gray-700 mt-2">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 rounded-lg bg-brand-navy text-white text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {!error && (
        <p className="text-center text-white/70 text-xs py-3 px-4">
          Point your camera at a QR code or barcode on the asset tag.
        </p>
      )}
    </div>
  );
}
