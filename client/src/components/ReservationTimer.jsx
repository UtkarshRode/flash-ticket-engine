import React, { useEffect, useState } from 'react';
import { Clock, ShieldCheck, ArrowRight, X, AlertTriangle } from 'lucide-react';

export const ReservationTimer = ({
  heldSeat,
  onProceedToCheckout,
  onReleaseHold,
  isReleasing,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(120);

  useEffect(() => {
    if (!heldSeat || !heldSeat.heldUntil) return;

    const calculateRemaining = () => {
      const remainingMs = new Date(heldSeat.heldUntil).getTime() - Date.now();
      return Math.max(0, Math.floor(remainingMs / 1000));
    };

    setSecondsLeft(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [heldSeat]);

  if (!heldSeat) return null;

  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / 120) * 100));
  const isUrgent = secondsLeft < 30;

  return (
    <div className="fixed bottom-6 inset-x-4 max-w-2xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-purple-500/30 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 sm:p-5 text-white overflow-hidden relative">
        {/* Animated Progress bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-slate-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${
              isUrgent ? 'bg-red-500' : 'bg-gradient-to-r from-purple-500 to-amber-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Seat details and countdown */}
          <div className="flex items-center space-x-3.5 w-full sm:w-auto">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center font-mono font-bold text-sm ${
                isUrgent ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {heldSeat.seatNumber}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {heldSeat.tier} Section
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  ${heldSeat.price}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Clock className={`h-3.5 w-3.5 ${isUrgent ? 'text-red-400' : 'text-amber-400'}`} />
                <span className={`text-xs font-mono font-bold ${isUrgent ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                  Holding for {Math.floor(secondsLeft / 60)}:
                  {String(secondsLeft % 60).padStart(2, '0')} min
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">(Atomic TTL)</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onReleaseHold}
              disabled={isReleasing}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-all"
            >
              {isReleasing ? 'Releasing...' : 'Release'}
            </button>

            <button
              onClick={onProceedToCheckout}
              disabled={secondsLeft <= 0}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>Confirm & Pay</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
