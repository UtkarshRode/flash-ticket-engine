import React from 'react';
import { Zap, Activity, Cpu, RotateCcw, ShieldCheck, User } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export const Navbar = ({ onOpenStressTest, onOpenArchitecture, onResetInventory, isResetting, currentUserId }) => {
  const { isConnected } = useSocket();

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Zap className="h-5 w-5 text-white fill-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">FlashTicket</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Concurrency Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Distributed Locking • Atomic CAS • Zero Double-Booking</p>
          </div>
        </div>

        {/* Actions & Status */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Socket status */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="hidden md:inline font-mono">
              {isConnected ? 'Real-Time Sync' : 'Reconnecting...'}
            </span>
          </div>

          {/* User Session */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
            <User className="h-3.5 w-3.5 text-purple-400" />
            <span>{currentUserId.slice(0, 14)}...</span>
          </div>

          {/* Architecture Modal Trigger */}
          <button
            onClick={onOpenArchitecture}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-all hover:border-slate-700"
            title="View System Architecture & Concurrency Primitives"
          >
            <Cpu className="h-4 w-4 text-indigo-400" />
            <span className="hidden sm:inline">Architecture</span>
          </button>

          {/* Concurrency Simulator */}
          <button
            onClick={onOpenStressTest}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-900/30 transition-all active:scale-95"
          >
            <Activity className="h-4 w-4 text-white animate-pulse" />
            <span>Stress Test (50x)</span>
          </button>

          {/* Reset Inventory */}
          <button
            onClick={onResetInventory}
            disabled={isResetting}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50"
            title="Reset All Seats to Available"
          >
            <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin text-purple-400' : ''}`} />
            <span className="hidden sm:inline ml-1.5">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
};
