import React from 'react';
import { Lock, Check, Clock, User, Sparkles } from 'lucide-react';

export const SeatGrid = ({
  seats,
  selectedSeat,
  onSelectSeat,
  currentUserId,
  isHolding,
}) => {
  // Group seats by row
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];

  const getSeatColor = (seat) => {
    // Is selected by current user right now
    if (selectedSeat && selectedSeat._id === seat._id) {
      return 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/50 scale-105 ring-2 ring-purple-300';
    }

    // Permanently booked
    if (seat.status === 'BOOKED') {
      return 'bg-red-950/40 text-red-500/40 border-red-900/30 cursor-not-allowed';
    }

    // Currently held
    if (seat.status === 'HELD') {
      if (seat.heldBy === currentUserId) {
        return 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-md shadow-amber-500/30 animate-pulse';
      }
      return 'bg-amber-950/40 text-amber-500/60 border-amber-900/40 cursor-not-allowed';
    }

    // Available by tier
    if (seat.tier === 'VIP') {
      return 'bg-purple-950/40 hover:bg-purple-600/70 text-purple-300 border-purple-700/50 hover:border-purple-400 hover:text-white hover:scale-105';
    }
    if (seat.tier === 'PREMIUM') {
      return 'bg-blue-950/40 hover:bg-blue-600/70 text-blue-300 border-blue-700/50 hover:border-blue-400 hover:text-white hover:scale-105';
    }
    return 'bg-emerald-950/30 hover:bg-emerald-600/70 text-emerald-300 border-emerald-700/40 hover:border-emerald-400 hover:text-white hover:scale-105';
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-md shadow-xl flex flex-col items-center">
      {/* Curved Stage */}
      <div className="w-full max-w-xl mb-10 flex flex-col items-center">
        <div className="w-full h-12 rounded-t-full border-t-2 border-x-2 border-indigo-500/40 bg-gradient-to-b from-indigo-500/20 to-transparent flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <span className="text-xs font-bold tracking-[0.25em] text-indigo-300 uppercase">
            STAGE / PERFORMANCE AREA
          </span>
        </div>
        <div className="w-2/3 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent blur-sm" />
      </div>

      {/* Seating Grid */}
      <div className="w-full overflow-x-auto pb-4 flex flex-col items-center">
        <div className="min-w-[620px] space-y-3.5">
          {rows.map((rowLetter) => {
            const rowSeats = seats.filter((s) => s.row === rowLetter).sort((a, b) => a.col - b.col);
            const rowTier = rowLetter === 'A' || rowLetter === 'B' ? 'VIP' : rowLetter === 'C' || rowLetter === 'D' ? 'PREMIUM' : 'STANDARD';

            return (
              <div key={rowLetter} className="flex items-center justify-center space-x-3">
                {/* Row label */}
                <div className="w-6 text-center font-mono text-xs font-bold text-slate-400">
                  {rowLetter}
                </div>

                {/* Left block (5 seats) */}
                <div className="flex space-x-2">
                  {rowSeats.slice(0, 5).map((seat) => (
                    <SeatButton
                      key={seat._id}
                      seat={seat}
                      currentUserId={currentUserId}
                      seatColorClass={getSeatColor(seat)}
                      onSelect={() => onSelectSeat(seat)}
                      disabled={seat.status === 'BOOKED' || (seat.status === 'HELD' && seat.heldBy !== currentUserId) || isHolding}
                    />
                  ))}
                </div>

                {/* Center Aisle */}
                <div className="w-8 flex items-center justify-center">
                  <div className="h-full w-[1px] bg-slate-800" />
                </div>

                {/* Right block (5 seats) */}
                <div className="flex space-x-2">
                  {rowSeats.slice(5, 10).map((seat) => (
                    <SeatButton
                      key={seat._id}
                      seat={seat}
                      currentUserId={currentUserId}
                      seatColorClass={getSeatColor(seat)}
                      onSelect={() => onSelectSeat(seat)}
                      disabled={seat.status === 'BOOKED' || (seat.status === 'HELD' && seat.heldBy !== currentUserId) || isHolding}
                    />
                  ))}
                </div>

                {/* Row Tier Indicator */}
                <div className="w-16 text-right font-mono text-[10px] text-slate-500 uppercase">
                  {rowTier}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-md bg-emerald-950/60 border border-emerald-600/50" />
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-md bg-amber-500 border border-amber-300 shadow-sm" />
          <span>Reserved (You)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-md bg-amber-950/40 border border-amber-900/40" />
          <span>Held by Other</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-md bg-red-950/40 border border-red-900/40" />
          <span>Sold Out</span>
        </div>
      </div>
    </div>
  );
};

const SeatButton = ({ seat, currentUserId, seatColorClass, onSelect, disabled }) => {
  const isHeldByMe = seat.status === 'HELD' && seat.heldBy === currentUserId;

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      title={`Seat ${seat.seatNumber} • ${seat.tier} • $${seat.price} • Status: ${seat.status}${isHeldByMe ? ' (Held by You)' : ''}`}
      className={`relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex flex-col items-center justify-center text-xs font-semibold font-mono transition-all duration-150 ${seatColorClass}`}
    >
      <span>{seat.seatNumber}</span>
      {seat.status === 'BOOKED' && <Lock className="h-2.5 w-2.5 opacity-50 -mt-0.5" />}
      {isHeldByMe && <Clock className="h-2.5 w-2.5 -mt-0.5" />}
    </button>
  );
};
