import { v4 as uuidv4 } from 'uuid';
import { Seat } from '../models/Seat.js';
import { Event } from '../models/Event.js';
import { Order } from '../models/Order.js';
import LockService from './lockService.js';
import redisClient from '../config/redis.js';
import { broadcastSeatUpdate } from './socketService.js';

const HOLD_TTL_SECONDS = parseInt(process.env.SEAT_HOLD_TTL_SECONDS || '120', 10);

export class TicketService {
  /**
   * Phase 1: Atomically hold a seat for checkout with a TTL.
   * Utilizes Redis Distributed Lock + MongoDB Optimistic Concurrency Control.
   */
  static async holdSeat(eventId, seatId, userId) {
    const lockToken = uuidv4();
    const lockResource = `seat:${seatId}`;

    // Acquire distributed lock for 3000ms to eliminate concurrent race conditions
    const lockAcquired = await LockService.acquireLock(lockResource, lockToken, 3000);
    if (!lockAcquired) {
      const err = new Error('Seat is currently under active contention. Please try again.');
      err.status = 409;
      err.code = 'LOCK_CONTENTION';
      throw err;
    }

    try {
      const seat = await Seat.findById(seatId);
      if (!seat) {
        const err = new Error('Seat not found');
        err.status = 404;
        throw err;
      }

      const now = new Date();

      // Check if already permanently booked
      if (seat.status === 'BOOKED') {
        const err = new Error(`Seat ${seat.seatNumber} is already permanently booked.`);
        err.status = 400;
        err.code = 'ALREADY_BOOKED';
        throw err;
      }

      // Check if currently held by another user and not expired
      if (seat.status === 'HELD' && seat.heldUntil && seat.heldUntil > now && seat.heldBy !== userId) {
        const err = new Error(`Seat ${seat.seatNumber} is currently held by another user.`);
        err.status = 409;
        err.code = 'SEAT_HELD';
        throw err;
      }

      // Calculate hold expiry
      const heldUntil = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

      // Atomic MongoDB update using version-based optimistic locking
      const updatedSeat = await Seat.findOneAndUpdate(
        {
          _id: seatId,
          version: seat.version,
          status: { $ne: 'BOOKED' },
        },
        {
          $set: {
            status: 'HELD',
            heldBy: userId,
            heldUntil: heldUntil,
          },
          $inc: { version: 1 },
        },
        { new: true }
      );

      if (!updatedSeat) {
        const err = new Error('Optimistic concurrency collision: seat state changed during hold attempt.');
        err.status = 409;
        err.code = 'VERSION_COLLISION';
        throw err;
      }

      // Track hold in Redis with TTL
      await redisClient.set(`hold:seat:${seatId}`, userId, 'EX', HOLD_TTL_SECONDS);

      // Broadcast real-time update to all connected clients
      broadcastSeatUpdate(eventId, 'seat_held', {
        seatId: updatedSeat._id,
        seatNumber: updatedSeat.seatNumber,
        heldBy: userId,
        heldUntil: updatedSeat.heldUntil,
        ttlSeconds: HOLD_TTL_SECONDS,
      });

      return updatedSeat;
    } finally {
      // Safely release the acquisition lock
      await LockService.releaseLock(lockResource, lockToken);
    }
  }

  /**
   * Phase 2: Confirm booking and create order.
   * Ensures idempotency and atomically transitions seat from HELD to BOOKED.
   */
  static async confirmBooking(eventId, seatId, userId, idempotencyKey) {
    if (!idempotencyKey) {
      const err = new Error('Missing Idempotency-Key header for financial transaction.');
      err.status = 400;
      throw err;
    }

    // Check if an order already exists with this idempotency key
    const existingOrder = await Order.findOne({ idempotencyKey });
    if (existingOrder) {
      console.log(`[Idempotency] Returning existing order ${existingOrder.orderId} for key ${idempotencyKey}`);
      return { order: existingOrder, replayed: true };
    }

    const lockToken = uuidv4();
    const lockResource = `seat:${seatId}`;

    const lockAcquired = await LockService.acquireLock(lockResource, lockToken, 4000);
    if (!lockAcquired) {
      const err = new Error('Seat is busy processing another transaction. Please retry.');
      err.status = 409;
      err.code = 'LOCK_CONTENTION';
      throw err;
    }

    try {
      const seat = await Seat.findById(seatId);
      if (!seat) {
        const err = new Error('Seat not found');
        err.status = 404;
        throw err;
      }

      if (seat.status === 'BOOKED') {
        const err = new Error(`Seat ${seat.seatNumber} is already booked.`);
        err.status = 400;
        err.code = 'ALREADY_BOOKED';
        throw err;
      }

      // Validate that the user holding the seat is the one purchasing it
      const now = new Date();
      if (seat.status === 'HELD') {
        if (seat.heldBy !== userId) {
          const err = new Error(`You do not have a valid hold on seat ${seat.seatNumber}.`);
          err.status = 403;
          throw err;
        }
        if (seat.heldUntil && seat.heldUntil < now) {
          const err = new Error(`Your hold on seat ${seat.seatNumber} has expired.`);
          err.status = 410; // Gone
          err.code = 'HOLD_EXPIRED';
          throw err;
        }
      }

      // Transition seat state to BOOKED atomically
      const updatedSeat = await Seat.findOneAndUpdate(
        {
          _id: seatId,
          version: seat.version,
          status: { $ne: 'BOOKED' },
        },
        {
          $set: {
            status: 'BOOKED',
            bookedBy: userId,
            heldBy: null,
            heldUntil: null,
          },
          $inc: { version: 1 },
        },
        { new: true }
      );

      if (!updatedSeat) {
        const err = new Error('Seat booking failed due to concurrent modification.');
        err.status = 409;
        throw err;
      }

      // Decrement available seats count on Event
      await Event.findByIdAndUpdate(eventId, { $inc: { availableSeats: -1 } });

      // Create confirmed order record
      const order = await Order.create({
        orderId: `ORD-${uuidv4().substring(0, 8).toUpperCase()}`,
        idempotencyKey,
        eventId,
        seatId,
        seatNumber: updatedSeat.seatNumber,
        userId,
        amount: updatedSeat.price,
        status: 'CONFIRMED',
        transactionDetails: {
          paymentGateway: 'Stripe_Mock',
          paymentId: `PAY-${uuidv4().substring(0, 12)}`,
          timestamp: new Date(),
        },
      });

      // Clear Redis hold key
      await redisClient.del(`hold:seat:${seatId}`);

      // Broadcast real-time permanent booking
      broadcastSeatUpdate(eventId, 'seat_booked', {
        seatId: updatedSeat._id,
        seatNumber: updatedSeat.seatNumber,
        bookedBy: userId,
        orderId: order.orderId,
      });

      return { order, replayed: false };
    } finally {
      await LockService.releaseLock(lockResource, lockToken);
    }
  }

  /**
   * Release an active hold voluntarily (e.g. user closes checkout modal)
   */
  static async releaseHold(eventId, seatId, userId) {
    const lockToken = uuidv4();
    const lockResource = `seat:${seatId}`;

    const lockAcquired = await LockService.acquireLock(lockResource, lockToken, 2000);
    if (!lockAcquired) return false;

    try {
      const seat = await Seat.findById(seatId);
      if (!seat || seat.status !== 'HELD') return false;

      // Only allow holder to release their own hold
      if (seat.heldBy && seat.heldBy !== userId) return false;

      const updated = await Seat.findOneAndUpdate(
        { _id: seatId, status: 'HELD' },
        {
          $set: {
            status: 'AVAILABLE',
            heldBy: null,
            heldUntil: null,
          },
          $inc: { version: 1 },
        },
        { new: true }
      );

      await redisClient.del(`hold:seat:${seatId}`);

      if (updated) {
        broadcastSeatUpdate(eventId, 'seat_released', {
          seatId: updated._id,
          seatNumber: updated.seatNumber,
        });
      }
      return true;
    } finally {
      await LockService.releaseLock(lockResource, lockToken);
    }
  }

  /**
   * Background cleaner that scans for expired holds and releases them.
   */
  static async cleanupExpiredHolds() {
    try {
      const now = new Date();
      const expiredSeats = await Seat.find({
        status: 'HELD',
        heldUntil: { $lt: now },
      });

      for (const seat of expiredSeats) {
        // Also check if Redis key is gone
        const redisHold = await redisClient.get(`hold:seat:${seat._id}`);
        if (!redisHold) {
          const updated = await Seat.findOneAndUpdate(
            { _id: seat._id, status: 'HELD' },
            {
              $set: {
                status: 'AVAILABLE',
                heldBy: null,
                heldUntil: null,
              },
              $inc: { version: 1 },
            },
            { new: true }
          );

          if (updated) {
            console.log(`[Auto-Reclaim] Released expired hold on seat ${seat.seatNumber}`);
            broadcastSeatUpdate(seat.eventId, 'seat_released', {
              seatId: updated._id,
              seatNumber: updated.seatNumber,
              reason: 'TTL_EXPIRED',
            });
          }
        }
      }
    } catch (err) {
      console.error('[Auto-Reclaim Error]', err.message);
    }
  }

  /**
   * Reset all seats for a given event (convenient for demonstrations and stress testing)
   */
  static async resetEventInventory(eventId) {
    await Seat.updateMany(
      { eventId },
      {
        $set: {
          status: 'AVAILABLE',
          heldBy: null,
          heldUntil: null,
          bookedBy: null,
        },
        $inc: { version: 1 },
      }
    );

    const totalSeats = await Seat.countDocuments({ eventId });
    await Event.findByIdAndUpdate(eventId, {
      availableSeats: totalSeats,
      status: 'FLASH_SALE_LIVE',
    });

    await Order.deleteMany({ eventId });

    broadcastSeatUpdate(eventId, 'inventory_reset', { eventId });
    return { success: true, totalReset: totalSeats };
  }
}

export default TicketService;
