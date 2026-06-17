import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface GpsCheckInProps {
  inspectionId: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  onUpdate: (data: Partial<{
    checked_in_at: string; checked_out_at: string;
    check_in_lat: number; check_in_lng: number;
    check_out_lat: number; check_out_lng: number;
  }>) => void;
}

function formatCoord(coord: number | null | undefined): string {
  if (coord === null || coord === undefined) return '—';
  return coord.toFixed(6);
}

function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function GpsCheckIn({
  inspectionId,
  checkedInAt,
  checkedOutAt,
  checkInLat,
  checkInLng,
  checkOutLat,
  checkOutLng,
  onUpdate,
}: GpsCheckInProps) {
  const [capturing, setCapturing] = useState<'arrival' | 'departure' | null>(null);
  const [geoError, setGeoError] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const hasCheckedIn = !!(checkedInAt && checkInLat !== null && checkInLng !== null);
  const hasCheckedOut = !!(checkedOutAt && checkOutLat !== null && checkOutLng !== null);

  const captureLocation = useCallback(
    async (type: 'arrival' | 'departure') => {
      setCapturing(type);
      setGeoError('');
      setAccuracy(null);

      if (!navigator.geolocation) {
        setGeoError('Geolocation is not supported by this browser.');
        setCapturing(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy: acc } = position.coords;
          setAccuracy(acc);
          const now = new Date().toISOString();

          try {
            const payload: Record<string, any> = {};
            if (type === 'arrival') {
              payload.checked_in_at = now;
              payload.check_in_lat = latitude;
              payload.check_in_lng = longitude;
            } else {
              payload.checked_out_at = now;
              payload.check_out_lat = latitude;
              payload.check_out_lng = longitude;
            }

            const { error } = await supabase
              .from('inspections')
              .update(payload)
              .eq('id', inspectionId);

            if (error) throw error;

            onUpdate(payload);
          } catch (err: any) {
            setGeoError(err?.message || 'Failed to save location.');
          } finally {
            setCapturing(null);
          }
        },
        (err) => {
          let msg = 'Unable to get location.';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = 'Location permission denied. Please enable GPS access in your browser settings.';
              break;
            case err.POSITION_UNAVAILABLE:
              msg = 'Location information unavailable. Check your device GPS.';
              break;
            case err.TIMEOUT:
              msg = 'Location request timed out. Try moving to an area with better signal.';
              break;
          }
          setGeoError(msg);
          setCapturing(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    },
    [inspectionId, onUpdate]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <i className="ri-map-pin-line text-sm"></i>
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">GPS Attendance Verification</h3>
          <p className="text-[11px] text-gray-400">
            {hasCheckedIn && hasCheckedOut
              ? 'Onsite attendance verified ✓'
              : hasCheckedIn
                ? 'Checked in — capture departure when finished'
                : 'Capture your location to prove onsite attendance'}
          </p>
        </div>
      </div>

      {geoError && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg mb-3 text-xs text-red-700">
          <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i className="ri-error-warning-line"></i>
          </span>
          <span className="flex-1">{geoError}</span>
          <button
            onClick={() => setGeoError('')}
            className="text-red-400 hover:text-red-600 cursor-pointer flex-shrink-0"
          >
            <i className="ri-close-line"></i>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Arrival Card */}
        <div
          className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
            hasCheckedIn
              ? 'border-emerald-200 bg-emerald-50/50'
              : 'border-dashed border-gray-200 bg-gray-50/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  hasCheckedIn ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <i className={hasCheckedIn ? 'ri-check-line text-xs' : 'ri-login-box-line text-xs'}></i>
              </span>
              <span className="text-xs font-semibold text-gray-700">Arrival</span>
            </div>
            {!hasCheckedIn && (
              <button
                onClick={() => captureLocation('arrival')}
                disabled={capturing !== null}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {capturing === 'arrival' ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Capturing...
                  </span>
                ) : (
                  <>
                    <i className="ri-login-box-line mr-1"></i>Check In
                  </>
                )}
              </button>
            )}
          </div>

          {hasCheckedIn ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase w-10 flex-shrink-0">Time</span>
                <span className="text-xs text-gray-700">
                  {checkedInAt
                    ? new Date(checkedInAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase w-10 flex-shrink-0">GPS</span>
                <a
                  href={getGoogleMapsUrl(checkInLat!, checkInLng!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-navy hover:text-brand-gold transition-colors cursor-pointer"
                >
                  {formatCoord(checkInLat)}, {formatCoord(checkInLng)}
                  <i className="ri-external-link-line ml-1 text-[10px]"></i>
                </a>
              </div>
              {accuracy !== null && capturing === 'arrival' && (
                <div className="text-[10px] text-gray-400">
                  Accuracy: ±{accuracy.toFixed(1)}m
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">Tap "Check In" when you arrive at the inspection site.</p>
          )}
        </div>

        {/* Departure Card */}
        <div
          className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
            hasCheckedOut
              ? 'border-brand-navy/20 bg-brand-navy/5'
              : 'border-dashed border-gray-200 bg-gray-50/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  hasCheckedOut ? 'bg-brand-navy text-white' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <i className={hasCheckedOut ? 'ri-check-line text-xs' : 'ri-logout-box-line text-xs'}></i>
              </span>
              <span className="text-xs font-semibold text-gray-700">Departure</span>
            </div>
            {!hasCheckedOut && hasCheckedIn && (
              <button
                onClick={() => captureLocation('departure')}
                disabled={capturing !== null}
                className="px-3 py-1.5 rounded-lg bg-brand-navy hover:bg-brand-navy/90 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {capturing === 'departure' ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Capturing...
                  </span>
                ) : (
                  <>
                    <i className="ri-logout-box-line mr-1"></i>Check Out
                  </>
                )}
              </button>
            )}
            {!hasCheckedIn && (
              <span className="text-[10px] text-gray-400 italic">Check in first</span>
            )}
          </div>

          {hasCheckedOut ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase w-10 flex-shrink-0">Time</span>
                <span className="text-xs text-gray-700">
                  {checkedOutAt
                    ? new Date(checkedOutAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 uppercase w-10 flex-shrink-0">GPS</span>
                <a
                  href={getGoogleMapsUrl(checkOutLat!, checkOutLng!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-navy hover:text-brand-gold transition-colors cursor-pointer"
                >
                  {formatCoord(checkOutLat)}, {formatCoord(checkOutLng)}
                  <i className="ri-external-link-line ml-1 text-[10px]"></i>
                </a>
              </div>
              {hasCheckedIn && hasCheckedOut && (
                <div className="text-[10px] text-emerald-600 font-medium mt-1">
                  <i className="ri-shield-check-line mr-0.5"></i>
                  Attendance verified
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-gray-400">
              {hasCheckedIn
                ? 'After finishing the inspection, capture departure location.'
                : 'You need to check in first before departure can be recorded.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}