import mongoose from 'mongoose';
import { isDbConnected } from '../config/db.js';
import { MockOrderModel } from '../config/inMemoryStore.js';

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    seatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seat',
      required: true,
    },
    seatNumber: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'FAILED', 'REFUNDED'],
      default: 'CONFIRMED',
    },
    transactionDetails: {
      paymentGateway: { type: String, default: 'Stripe_Simulated' },
      paymentId: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

const MongooseOrder = mongoose.model('Order', orderSchema);

export const Order = new Proxy(MongooseOrder, {
  get(target, prop) {
    if (!isDbConnected()) {
      return MockOrderModel[prop] || target[prop];
    }
    return target[prop];
  },
});

