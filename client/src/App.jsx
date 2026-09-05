import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { EventBanner } from './components/EventBanner';
import { SeatGrid } from './components/SeatGrid';
import { ReservationTimer } from './components/ReservationTimer';
import { CheckoutModal } from './components/CheckoutModal';
import { StressTestModal } from './components/StressTestModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { useSocket } from './context/SocketContext';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_BASE;

export function App() {
  const { socket, isConnected } = useSocket();

  // Persistent User Session ID for this browser tab
  const [currentUserId] = useState(() => {
    let savedId = localStorage.getItem('flash_ticket_user_id');
    if (!savedId) {
      savedId = `user_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('flash_ticket_user_id', savedId);
    }
    return savedId;
  });

  const [event, setEvent] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [heldSeat, setHeldSeat] = useState(null); // The seat currently held by this user
  const [isLoading, setIsLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isStressTestOpen, setIsStressTestOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);

  // Live Toast Notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch initial event and seat data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const eventsRes = await axios.get('/api/events');
      if (eventsRes.data.data && eventsRes.data.data.length > 0) {
        const activeEvent = eventsRes.data.data[0];
        setEvent(activeEvent);

        const seatsRes = await axios.get(`/api/events/${activeEvent._id}/seats`);
        const seatsData = seatsRes.data.data;
        setSeats(seatsData);

        // Check if current user already has an active hold
        const myActiveHold = seatsData.find(
          (s) => s.status === 'HELD' && s.heldBy === currentUserId
        );
        if (myActiveHold) {
          setHeldSeat(myActiveHold);
        }
      }
    } catch (err) {
      console.error('Error loading initial event data:', err);
      showToast('Failed to load event data. Verify backend is running.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to real-time WebSocket updates
  useEffect(() => {
    if (!socket || !event) return;

    socket.emit('join_event', event._id);

    // When another client or this client holds a seat
    const handleSeatHeld = (data) => {
      setSeats((prevSeats) =>
        prevSeats.map((s) =>
          s._id === data.seatId
            ? { ...s, status: 'HELD', heldBy: data.heldBy, heldUntil: data.heldUntil }
            : s
        )
      );

      if (data.heldBy !== currentUserId) {
        showToast(`Seat ${data.seatNumber} was reserved by another user.`, 'info');
      }
    };

    // When a hold expires or is voluntarily released
    const handleSeatReleased = (data) => {
      setSeats((prevSeats) =>
        prevSeats.map((s) =>
          s._id === data.seatId
            ? { ...s, status: 'AVAILABLE', heldBy: null, heldUntil: null }
            : s
        )
      );

      setHeldSeat((prev) => {
        if (prev && prev._id === data.seatId) {
          showToast(`Hold on seat ${data.seatNumber} expired or released.`, 'info');
          return null;
        }
        return prev;
      });
    };

    // When a seat is permanently booked
    const handleSeatBooked = (data) => {
      setSeats((prevSeats) =>
        prevSeats.map((s) =>
          s._id === data.seatId
            ? { ...s, status: 'BOOKED', bookedBy: data.bookedBy, heldBy: null, heldUntil: null }
            : s
        )
      );

      setEvent((prev) => (prev ? { ...prev, availableSeats: Math.max(0, prev.availableSeats - 1) } : prev));

      if (data.bookedBy !== currentUserId) {
        showToast(`Seat ${data.seatNumber} was just purchased!`, 'info');
      }
    };

    // When inventory is reset
    const handleInventoryReset = () => {
      fetchData();
      setHeldSeat(null);
      setSelectedSeat(null);
      showToast('Inventory reset to available.', 'success');
    };

    socket.on('seat_held', handleSeatHeld);
    socket.on('seat_released', handleSeatReleased);
    socket.on('seat_booked', handleSeatBooked);
    socket.on('inventory_reset', handleInventoryReset);

    return () => {
      socket.emit('leave_event', event._id);
      socket.off('seat_held', handleSeatHeld);
      socket.off('seat_released', handleSeatReleased);
      socket.off('seat_booked', handleSeatBooked);
      socket.off('inventory_reset', handleInventoryReset);
    };
  }, [socket, event, currentUserId, fetchData]);

  // Handle seat click -> Trigger atomic hold
  const handleSelectSeat = async (seat) => {
    if (seat.status === 'BOOKED') return;

    // If clicking own currently held seat, open checkout
    if (seat.status === 'HELD' && seat.heldBy === currentUserId) {
      setIsCheckoutOpen(true);
      return;
    }

    if (seat.status === 'HELD' && seat.heldBy !== currentUserId) {
      showToast(`Seat ${seat.seatNumber} is currently held by someone else.`, 'error');
      return;
    }

    setIsHolding(true);
    setSelectedSeat(seat);

    try {
      const response = await axios.post(
        `/api/events/${event._id}/seats/${seat._id}/hold`,
        { userId: currentUserId }
      );

      const updated = response.data.data;
      setHeldSeat(updated);
      showToast(`Lock acquired! Seat ${seat.seatNumber} held for 2 minutes.`, 'success');
    } catch (err) {
      console.error('[Hold Error]', err);
      const msg = err.response?.data?.message || 'Failed to hold seat';
      showToast(msg, 'error');
    } finally {
      setIsHolding(false);
    }
  };

  // Release hold manually
  const handleReleaseHold = async () => {
    if (!heldSeat || !event) return;
    setIsReleasing(true);

    try {
      await axios.post(`/api/events/${event._id}/seats/${heldSeat._id}/release`, {
        userId: currentUserId,
      });
      setHeldSeat(null);
      setSelectedSeat(null);
      showToast(`Released hold on seat ${heldSeat.seatNumber}.`, 'info');
    } catch (err) {
      console.error('[Release Error]', err);
      showToast('Failed to release hold', 'error');
    } finally {
      setIsReleasing(false);
    }
  };

  // Reset inventory
  const handleResetInventory = async () => {
    if (!event) return;
    setIsResetting(true);
    try {
      await axios.post(`/api/events/${event._id}/reset`);
      await fetchData();
      setHeldSeat(null);
      setSelectedSeat(null);
      showToast('Reset all seats to AVAILABLE.', 'success');
    } catch (err) {
      console.error('[Reset Error]', err);
      showToast('Failed to reset inventory', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleBookingSuccess = (seatId) => {
    setHeldSeat(null);
    setSelectedSeat(null);
    setSeats((prev) =>
      prev.map((s) =>
        s._id === seatId
          ? { ...s, status: 'BOOKED', bookedBy: currentUserId, heldBy: null }
          : s
      )
    );
  };

  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* Navbar */}
      <Navbar
        onOpenStressTest={() => setIsStressTestOpen(true)}
        onOpenArchitecture={() => setIsArchitectureOpen(true)}
        onResetInventory={handleResetInventory}
        isResetting={isResetting}
        currentUserId={currentUserId}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl border shadow-xl flex items-center space-x-2 text-xs font-medium backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-red-950/80 border-red-500/30 text-red-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
            {toast.type === 'info' && <Info className="h-4 w-4 text-purple-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-400">Loading live seat inventory & engine state...</p>
          </div>
        ) : (
          <>
            <EventBanner
              event={event}
              availableSeatsCount={availableCount}
              totalSeatsCount={seats.length}
            />

            <SeatGrid
              seats={seats}
              selectedSeat={selectedSeat}
              onSelectSeat={handleSelectSeat}
              currentUserId={currentUserId}
              isHolding={isHolding}
            />
          </>
        )}
      </main>

      {/* Reservation Countdown Dock */}
      <ReservationTimer
        heldSeat={heldSeat}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        onReleaseHold={handleReleaseHold}
        isReleasing={isReleasing}
      />

      {/* Checkout Modal with Idempotency */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        seat={heldSeat}
        eventId={event?._id}
        currentUserId={currentUserId}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* Concurrency Stress Test Simulator */}
      <StressTestModal
        isOpen={isStressTestOpen}
        onClose={() => setIsStressTestOpen(false)}
        eventId={event?._id}
        availableSeats={seats.filter((s) => s.status === 'AVAILABLE')}
        onTestComplete={fetchData}
      />

      {/* Architecture & Engineering Design Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>FlashTicket Concurrency Engine • Production Full-Stack MERN + Redis Portfolio Project</p>
      </footer>
    </div>
  );
}

export default App;
