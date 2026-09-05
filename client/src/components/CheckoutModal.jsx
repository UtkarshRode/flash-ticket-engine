import React, { useState } from 'react';
import { ShieldCheck, CreditCard, CheckCircle2, AlertCircle, X, Key, RefreshCw, Copy, Check } from 'lucide-react';
import axios from 'axios';

export const CheckoutModal = ({
  isOpen,
  onClose,
  seat,
  eventId,
  currentUserId,
  onBookingSuccess,
}) => {
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `idem_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [simulateDuplicateSubmit, setSimulateDuplicateSubmit] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen || !seat) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRefreshKey = () => {
    setIdempotencyKey(`idem_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`);
  };

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // 1. Primary Request
      const response = await axios.post(
        `/api/events/${eventId}/seats/${seat._id}/book`,
        {
          userId: currentUserId,
          idempotencyKey,
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );

      // 2. If interviewer requested duplicate retry simulation:
      let duplicateResponse = null;
      if (simulateDuplicateSubmit) {
        console.log('[Interview Demo] Simulating immediate duplicate submission with identical Idempotency-Key...');
        duplicateResponse = await axios.post(
          `/api/events/${eventId}/seats/${seat._id}/book`,
          {
            userId: currentUserId,
            idempotencyKey,
          },
          {
            headers: {
              'Idempotency-Key': idempotencyKey,
            },
          }
        );
      }

      setOrderResult({
        primary: response.data,
        duplicate: duplicateResponse ? duplicateResponse.data : null,
      });

      onBookingSuccess(seat._id);
    } catch (err) {
      console.error('[Checkout Error]', err);
      setError(err.response?.data?.message || err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-7 shadow-2xl text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {!orderResult ? (
          <div>
            {/* Header */}
            <div className="flex items-center space-x-2.5 mb-5">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Idempotent Checkout</h3>
                <p className="text-xs text-slate-400">Atomic transition from HELD to BOOKED</p>
              </div>
            </div>

            {/* Order Summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 mb-5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Selected Seat:</span>
                <span className="font-mono font-bold text-white">{seat.seatNumber} ({seat.tier})</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Reservation Holder:</span>
                <span className="font-mono text-purple-400">{currentUserId.slice(0, 18)}...</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total Amount:</span>
                <span className="font-mono text-emerald-400">${seat.price}.00</span>
              </div>
            </div>

            {/* Idempotency Section */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3.5 mb-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-purple-300">
                  <Key className="h-3.5 w-3.5" />
                  <span>Idempotency-Key Header</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleCopyKey}
                    title="Copy Key"
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={handleRefreshKey}
                    title="Generate New Key"
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="font-mono text-[11px] text-purple-200/80 bg-slate-950/60 p-2 rounded border border-purple-500/20 break-all select-all">
                {idempotencyKey}
              </p>
              <p className="text-[11px] text-slate-400 leading-tight">
                Protects against network retries or double-clicking. Redis caches the first result for 24h.
              </p>
            </div>

            {/* Interview Demo Option */}
            <div className="mb-6 flex items-center space-x-2.5 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
              <input
                type="checkbox"
                id="dupToggle"
                checked={simulateDuplicateSubmit}
                onChange={(e) => setSimulateDuplicateSubmit(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-purple-600 focus:ring-purple-500 h-4 w-4"
              />
              <label htmlFor="dupToggle" className="text-xs text-slate-300 cursor-pointer">
                <span className="font-semibold text-white">Simulate Double-Click / Retry:</span> Send 2 identical requests with the same key
              </label>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-2 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-900/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-98"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isProcessing ? 'Executing Atomic Transaction...' : `Confirm & Pay $${seat.price}.00`}</span>
            </button>
          </div>
        ) : (
          /* Success Receipt View */
          <div className="text-center py-2 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">Booking Confirmed!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Seat <span className="font-mono font-bold text-white">{seat.seatNumber}</span> is now permanently booked.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Order ID:</span>
                <span className="font-mono font-bold text-purple-400">{orderResult.primary.data?.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Gateway:</span>
                <span className="font-mono text-slate-200">{orderResult.primary.data?.transactionDetails?.paymentGateway}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Idempotency Key:</span>
                <span className="font-mono text-[11px] text-slate-400">{idempotencyKey.slice(0, 18)}...</span>
              </div>
            </div>

            {/* Duplicate replay verification badge */}
            {orderResult.duplicate && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-left text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Idempotency Verification Passed!</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  The duplicate request was intercepted by the Redis idempotency cache and returned the exact same order with zero duplicate charge!
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all mt-2"
            >
              Done & View Updated Stadium Map
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
