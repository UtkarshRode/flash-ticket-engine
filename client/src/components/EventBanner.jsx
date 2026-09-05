import React from 'react';
import { Calendar, MapPin, Sparkles, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const EventBanner = ({ event, availableSeatsCount, totalSeatsCount }) => {
  if (!event) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 via-slate-900/40 to-slate-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
      {/* Background glow accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse">
              <Flame className="h-3.5 w-3.5" />
              <span>FLASH SALE IN PROGRESS</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <Sparkles className="h-3 w-3 text-purple-400" />
              <span>Atomic Redlock Protected</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center space-x-1.5">
              <MapPin className="h-4 w-4 text-purple-400" />
              <span>{event.venue}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span>{new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Live Inventory Counter Card */}
        <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-slate-800 pt-4 md:pt-0">
          <div className="text-left md:text-right">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Remaining Inventory</p>
            <div className="flex items-baseline md:justify-end space-x-2 mt-0.5">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white">
                {availableSeatsCount}
              </span>
              <span className="text-sm font-mono text-slate-500">/ {totalSeatsCount}</span>
            </div>
          </div>

          {/* Tier pricing badges */}
          <div className="flex items-center space-x-2 mt-3 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              VIP $250
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              PREM $140
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              STD $75
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
