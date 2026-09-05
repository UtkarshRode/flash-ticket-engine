import express from 'express';
import { getEvents, getEventSeats, resetEvent } from '../controllers/eventController.js';
import { holdSeat, confirmBooking, releaseHold } from '../controllers/ticketController.js';
import { runConcurrencyTest } from '../controllers/stressTestController.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { idempotencyMiddleware } from '../middleware/idempotency.js';

const router = express.Router();

// Event routes
router.get('/events', getEvents);
router.get('/events/:eventId/seats', getEventSeats);
router.post('/events/:eventId/reset', resetEvent);

// Ticket reservation and booking routes
router.post('/events/:eventId/seats/:seatId/hold', rateLimiter, holdSeat);
router.post(
  '/events/:eventId/seats/:seatId/book',
  rateLimiter,
  idempotencyMiddleware,
  confirmBooking
);
router.post('/events/:eventId/seats/:seatId/release', releaseHold);

// Concurrency stress testing route
router.post('/stress-test', runConcurrencyTest);

export default router;
