import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { MockSeatModel } from '../config/inMemoryStore.js';

const seatSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },
    seatNumber: {
      type: String,
      required: true,
    },
    row: {
      type: String,
      required: true,
    },
    col: {
      type: Number,
      required: true,
    },
    tier: {
      type: String,
      enum: ['VIP', 'PREMIUM', 'STANDARD'],
      default: 'STANDARD',
    },
    price: {
      type: Number,
      required: true,
      default: 50,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'HELD', 'BOOKED'],
      default: 'AVAILABLE',
      index: true,
    },
    heldBy: {
      type: String,
      default: null,
    },
    heldUntil: {
      type: Date,
      default: null,
    },
    bookedBy: {
      type: String,
      default: null,
    },
    version: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const MongooseSeat = mongoose.model('Seat', seatSchema);

export const Seat = new Proxy(MongooseSeat, {
  get(target, prop) {
    if (!isDbConnected()) {
      return MockSeatModel[prop] || target[prop];
    }
    return target[prop];
  },
});

