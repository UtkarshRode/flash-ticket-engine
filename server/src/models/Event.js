import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { MockEventModel } from '../config/inMemoryStore.js';

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    venue: { type: String, required: true },
    date: { type: Date, required: true },
    bannerUrl: { type: String, default: '' },
    totalSeats: { type: Number, required: true, default: 60 },
    availableSeats: { type: Number, required: true, default: 60 },
    status: {
      type: String,
      enum: ['UPCOMING', 'FLASH_SALE_LIVE', 'SOLD_OUT'],
      default: 'FLASH_SALE_LIVE',
    },
  },
  { timestamps: true }
);

const MongooseEvent = mongoose.model('Event', eventSchema);

export const Event = new Proxy(MongooseEvent, {
  get(target, prop) {
    if (!isDbConnected()) {
      return MockEventModel[prop] || target[prop];
    }
    return target[prop];
  },
});

