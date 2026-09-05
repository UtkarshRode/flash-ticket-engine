import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { connectDB } from '../config/db.js';
import { Event } from '../models/Event.js';
import { Seat } from '../models/Seat.js';
import { Order } from '../models/Order.js';

const seed = async () => {
  console.log('[Seed] Initializing database connection...');
  await connectDB();

  console.log('[Seed] Purging existing collections...');
  await Event.deleteMany({});
  await Seat.deleteMany({});
  await Order.deleteMany({});

  console.log('[Seed] Creating flagship flash-sale event...');
  const event = await Event.create({
    title: 'Coldplay: Music of the Spheres World Tour (Flash Sale)',
    description: 'Exclusive high-concurrency ticket drop for Wembley Stadium. Limited seats with atomic lock reservation.',
    venue: 'Wembley Stadium, London',
    date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    bannerUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80',
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
        eventId: event._id,
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
  console.log(`[Seed] Successfully seeded Event ID: ${event._id} with ${seats.length} seats.`);

  await mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
