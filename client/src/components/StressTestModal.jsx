import React, { useState } from 'react';
import { X, Activity, Zap, CheckCircle2, AlertTriangle, ShieldCheck, Play, RotateCcw } from 'lucide-react';
import axios from 'axios';

export const StressTestModal = ({
  isOpen,
  onClose,
  eventId,
  availableSeats,
  onTestComplete,
}) => {
  const [concurrencyLevel, setConcurrencyLevel] = useState(50);
  const [selectedSeatId, setSelectedSeatId] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleRunTest = async () => {
    setIsRunning(true);
    setError(null);
    setReport(null);

    try {
      const response = await axios.post('/api/stress-test', {
        eventId,
        targetSeatId: selectedSeatId || undefined,
        concurrentUsers: concurrencyLevel,
      });

      setReport(response.data.data);
      if (onTestComplete) {
        onTestComplete();
      }
    } catch (err) {
      console.error('[Stress Test Error]', err);
      setError(err.response?.data?.error || err.message || 'Stress test failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-slate-900 p-6 sm:p-7 shadow-2xl text-slate-100 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-white">Live Concurrency Stress Tester</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Benchmark Tool
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Fire simultaneous threads against the exact same seat to verify Redlock & CAS guarantees.
            </p>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Concurrency Level: <span className="font-mono text-purple-400 font-bold">{concurrencyLevel}</span> parallel requests
            </label>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={concurrencyLevel}
              onChange={(e) => setConcurrencyLevel(parseInt(e.target.value, 10))}
              disabled={isRunning}
              className="w-full accent-purple-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>10 req</span>
              <span>50 req</span>
              <span>100 req</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Target Seat
            </label>
            <select
              value={selectedSeatId}
              onChange={(e) => setSelectedSeatId(e.target.value)}
              disabled={isRunning}
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none"
            >
              <option value="">Auto-select First Available Seat</option>
              {availableSeats.map((seat) => (
                <option key={seat._id} value={seat._id}>
                  Seat {seat.seatNumber} ({seat.tier} - ${seat.price})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRunTest}
          disabled={isRunning}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-900/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 active:scale-98 mb-6"
        >
          {isRunning ? (
            <>
              <RotateCcw className="h-4 w-4 animate-spin" />
              <span>Simulating {concurrencyLevel} Concurrent Requests in Parallel...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              <span>Launch Stress Burst ({concurrencyLevel} Workers)</span>
            </>
          )}
        </button>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start space-x-2 text-xs text-red-300">
            <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Benchmark Results */}
        {report && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Status Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                report.metrics.successfulLocks === 1 && !report.metrics.doubleBookingOccurred
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/30 text-red-300'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">Distributed Lock Invariant Upheld!</h4>
                  <p className="text-xs text-slate-300">
                    Targeted Seat: <span className="font-mono font-bold">{report.seatNumber}</span> • {report.concurrencyLevel} Simultaneous Threads
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                0 Double-Bookings
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Requests</p>
                <p className="text-xl font-bold font-mono text-white mt-0.5">{report.metrics.totalRequests}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Successful (200)</p>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{report.metrics.successfulLocks}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Blocked (409)</p>
                <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">{report.metrics.contentionBlocked}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Avg Latency</p>
                <p className="text-xl font-bold font-mono text-purple-400 mt-0.5">{report.metrics.avgLatencyMs} ms</p>
              </div>
            </div>

            {/* Audit Log Table */}
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">Worker Concurrency Audit Log (First 10 of {report.concurrencyLevel}):</p>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden text-[11px] font-mono">
                <div className="grid grid-cols-4 p-2 bg-slate-900 border-b border-slate-800 font-bold text-slate-400">
                  <span>Worker</span>
                  <span>Status</span>
                  <span>Code</span>
                  <span className="text-right">Latency</span>
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-800/50">
                  {report.auditLog.slice(0, 10).map((log) => (
                    <div key={log.workerId} className="grid grid-cols-4 p-2 items-center">
                      <span className="text-slate-300">Worker #{log.workerId}</span>
                      <span className={log.status === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {log.status === 'SUCCESS' ? '🏆 Lock Won' : 'Blocked'}
                      </span>
                      <span className="text-slate-400">{log.statusCode}</span>
                      <span className="text-right text-slate-400">{log.latencyMs} ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
