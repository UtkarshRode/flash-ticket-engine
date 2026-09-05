import { Event } from '../models/Event.js';
import { Seat } from '../models/Seat.js';
import redisClient from '../config/redis.js';
import TicketService from '../services/ticketService.js';

export const getEvents = async (req, res, next) => {
  try {
    let events = await Event.find().sort({ createdAt: -1 });

    // Auto-seed if database is empty for seamless out-of-the-box demo
    if (events.length === 0) {
      const defaultEvent = await Event.create({
        title: 'Coldplay: Music of the Spheres World Tour (Flash Sale)',
        description: 'Exclusive Flash Sale for Wembley Stadium. High concurrency test event.',
        venue: 'Wembley Stadium, London',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalSeats: 60,
        availableSeats: 60,
        status: 'FLASH_SALE_LIVE',
      });

      const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
      const seats = [];

      for (const row of rows) {
        for (let col = 1; col <= 10; col++) {
          const tier = row === 'A' || row === 'B' ? 'VIP' : row === 'C' || row === 'D' ? 'PREMIUM' : 'STANDARD';
          const price = tier === 'VIP' ? 250 : tier === 'PREMIUM' ? 140 : 75;
          seats.push({
            eventId: defaultEvent._id,
            seatNumber: `${row}${col}`,
            row,
            col,
            tier,
            price,
            status: 'AVAILABLE',
            version: 0,
          });
        }
      }

      await Seat.insertMany(seats);
      events = [defaultEvent];
    }

    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    next(err);
  }
};

export const getEventSeats = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const seats = await Seat.find({ eventId }).sort({ row: 1, col: 1 }).lean();

    // Enrich held seats with accurate real-time remaining TTL from Redis
    const enrichedSeats = await Promise.all(
      seats.map(async (seat) => {
        if (seat.status === 'HELD') {
          const ttl = await redisClient.ttl(`hold:seat:${seat._id}`);
          return {
            ...seat,
            remainingTtlSeconds: ttl > 0 ? ttl : 0,
          };
        }
        return seat;
      })
    );

    res.json({ success: true, count: enrichedSeats.length, data: enrichedSeats });
  } catch (err) {
    next(err);
  }
};

export const resetEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const result = await TicketService.resetEventInventory(eventId);
    res.json({
      success: true,
      message: `Reset ${result.totalReset} seats to AVAILABLE. All orders purged.`,
    });
  } catch (err) {
    next(err);
  }
};
