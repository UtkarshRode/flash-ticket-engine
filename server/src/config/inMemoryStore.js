import { v4 as uuidv4 } from 'uuid';

class InMemoryStore {
  constructor() {
    this.events = [];
    this.seats = [];
    this.orders = [];
    this.isActive = false;
  }

  activate() {
    this.isActive = true;
    console.log('[In-Memory DB] Running in Zero-Dependency In-Memory Database Mode.');
  }
}

export const inMemoryStore = new InMemoryStore();

// Chainable mock query
class MockQuery {
  constructor(data) {
    this.data = data;
  }
  sort(criteria) {
    return this;
  }
  lean() {
    return this;
  }
  then(resolve, reject) {
    return Promise.resolve(this.data).then(resolve, reject);
  }
  catch(reject) {
    return Promise.resolve(this.data).catch(reject);
  }
}

export class MockEventModel {
  static find(query = {}) {
    return new MockQuery([...inMemoryStore.events]);
  }


  static async findById(id) {
    return inMemoryStore.events.find((e) => String(e._id) === String(id)) || null;
  }

  static async create(doc) {
    const newDoc = {
      ...doc,
      _id: `evt_${uuidv4().substring(0, 8)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryStore.events.push(newDoc);
    return newDoc;
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    const event = inMemoryStore.events.find((e) => String(e._id) === String(id));
    if (!event) return null;

    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        event[key] = (event[key] || 0) + val;
      }
    }
    if (update.$set) {
      Object.assign(event, update.$set);
    }
    event.updatedAt = new Date();
    return event;
  }

  static async deleteMany() {
    const count = inMemoryStore.events.length;
    inMemoryStore.events = [];
    return { deletedCount: count };
  }
}

export class MockSeatModel {
  static find(query = {}) {
    let filtered = [...inMemoryStore.seats];

    if (query.eventId) {
      filtered = filtered.filter((s) => String(s.eventId) === String(query.eventId));
    }
    if (query.status) {
      if (typeof query.status === 'object' && query.status.$lt) {
        filtered = filtered.filter((s) => s.status === 'HELD' && s.heldUntil && s.heldUntil < query.status.$lt);
      } else {
        filtered = filtered.filter((s) => s.status === query.status);
      }
    }
    return new MockQuery(filtered);
  }

  static async findOne(query = {}) {
    const q = this.find(query);
    return q.data.length > 0 ? { ...q.data[0] } : null;
  }


  static async findById(id) {
    const seat = inMemoryStore.seats.find((s) => String(s._id) === String(id));
    return seat ? { ...seat } : null;
  }

  static async insertMany(seats) {
    const inserted = seats.map((s) => ({
      ...s,
      _id: `seat_${uuidv4().substring(0, 8)}`,
      version: s.version || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    inMemoryStore.seats.push(...inserted);
    return inserted;
  }

  static async findOneAndUpdate(filter, update, options = {}) {
    const seatIndex = inMemoryStore.seats.findIndex((s) => {
      if (String(s._id) !== String(filter._id)) return false;
      if (filter.version !== undefined && s.version !== filter.version) return false;
      if (filter.status) {
        if (typeof filter.status === 'object' && filter.status.$ne) {
          if (s.status === filter.status.$ne) return false;
        } else if (s.status !== filter.status) {
          return false;
        }
      }
      return true;
    });

    if (seatIndex === -1) return null; // Optimistic concurrency lock failure

    const seat = inMemoryStore.seats[seatIndex];

    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        seat[key] = (seat[key] || 0) + val;
      }
    }
    if (update.$set) {
      Object.assign(seat, update.$set);
    }
    seat.updatedAt = new Date();
    return { ...seat };
  }

  static async updateMany(filter, update) {
    let modified = 0;
    for (const seat of inMemoryStore.seats) {
      if (!filter.eventId || String(seat.eventId) === String(filter.eventId)) {
        if (update.$set) Object.assign(seat, update.$set);
        if (update.$inc) {
          for (const [k, v] of Object.entries(update.$inc)) seat[k] = (seat[k] || 0) + v;
        }
        modified++;
      }
    }
    return { modifiedCount: modified };
  }

  static async countDocuments(filter = {}) {
    let count = 0;
    for (const seat of inMemoryStore.seats) {
      if (!filter.eventId || String(seat.eventId) === String(filter.eventId)) {
        count++;
      }
    }
    return count;
  }

  static async deleteMany() {
    const count = inMemoryStore.seats.length;
    inMemoryStore.seats = [];
    return { deletedCount: count };
  }
}

export class MockOrderModel {
  static find(query = {}) {
    return new MockQuery([...inMemoryStore.orders]);
  }


  static async findOne(query = {}) {
    if (query.idempotencyKey) {
      return inMemoryStore.orders.find((o) => o.idempotencyKey === query.idempotencyKey) || null;
    }
    return inMemoryStore.orders[0] || null;
  }

  static async create(doc) {
    const order = {
      ...doc,
      _id: `ord_${uuidv4().substring(0, 8)}`,
      createdAt: new Date(),
    };
    inMemoryStore.orders.push(order);
    return order;
  }

  static async deleteMany() {
    const count = inMemoryStore.orders.length;
    inMemoryStore.orders = [];
    return { deletedCount: count };
  }
}
