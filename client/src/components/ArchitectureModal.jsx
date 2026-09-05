import React from 'react';
import { X, Cpu, ShieldCheck, Clock, Key, RefreshCw, Layers } from 'lucide-react';

export const ArchitectureModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-indigo-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl text-slate-100 relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">System Architecture & Concurrency Internals</h3>
            <p className="text-xs text-slate-400">How FlashTicket guarantees zero double-booking under extreme load</p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm">
          {/* Component 1: Distributed Lock */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-purple-400 font-bold">
              <ShieldCheck className="h-4 w-4" />
              <span>1. Redis Distributed Locking (Redlock Principle)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              When a user clicks a seat, the engine attempts an atomic Redis command:
              <code className="block my-1.5 p-2 bg-slate-900 rounded font-mono text-[11px] text-purple-200">
                SET lock:seat:&lt;seatId&gt; &lt;lockToken&gt; NX PX 3000
              </code>
              Only the first request acquires the lock; all other concurrent requests are rejected with <code className="text-amber-300">409 Conflict</code>.
              The lock is released safely via an atomic Lua script that compares the token before deletion, preventing race conditions if a slow request's lock expires.
            </p>
          </div>

          {/* Component 2: Optimistic Concurrency Control */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold">
              <Layers className="h-4 w-4" />
              <span>2. Multi-Tier Concurrency: MongoDB Optimistic Locking (CAS)</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              In addition to Redis distributed locking, the database enforces optimistic concurrency control using atomic conditional queries:
              <code className="block my-1.5 p-2 bg-slate-900 rounded font-mono text-[11px] text-indigo-200">
                Seat.findOneAndUpdate(&#123; _id, version: seat.version, status: &#123; $ne: 'BOOKED' &#125; &#125;, &#123; $inc: &#123; version: 1 &#125; &#125;)
              </code>
              Even in the theoretical event of a Redis partition or timeout, MongoDB guarantees that two writes cannot commit against the same seat version.
            </p>
          </div>

          {/* Component 3: Temporary TTL Hold */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold">
              <Clock className="h-4 w-4" />
              <span>3. TTL Reservation Hold & Auto-Reclaim Engine</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Held seats are stored with a 120-second TTL in Redis (<code className="text-amber-200">hold:seat:&lt;id&gt;</code>).
              A background worker scans for expired holds every 4 seconds. If a user abandons their cart, the seat status automatically reverts to <code className="text-emerald-300">AVAILABLE</code> and a WebSocket event broadcasts the release instantly.
            </p>
          </div>

          {/* Component 4: Idempotency */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold">
              <Key className="h-4 w-4" />
              <span>4. Idempotent Payment & Order Execution</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Every checkout request requires an <code className="text-emerald-300">Idempotency-Key</code> header.
              Redis caches the result of the first successful transaction for 24 hours. If an identical request is re-sent due to network timeouts or rapid user clicking, the server returns the cached response without double-charging the user.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
        >
          Close Overview
        </button>
      </div>
    </div>
  );
};
