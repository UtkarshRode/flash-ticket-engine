import Redis from 'ioredis';

class InMemoryRedisMock {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
    this.isMock = true;
    console.warn('[Redis] Operating in In-Memory Fallback Mode (Real Redis not reachable). Concurrency primitives remain active in-memory.');
  }

  async get(key) {
    this._checkExpiry(key);
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async set(key, value, ...args) {
    let px = null;
    let nx = false;

    for (let i = 0; i < args.length; i++) {
      const arg = String(args[i]).toUpperCase();
      if (arg === 'NX') nx = true;
      if (arg === 'PX' && args[i + 1]) px = parseInt(args[i + 1], 10);
      if (arg === 'EX' && args[i + 1]) px = parseInt(args[i + 1], 10) * 1000;
    }

    this._checkExpiry(key);

    if (nx && this.store.has(key)) {
      return null; // Key already exists
    }

    this.store.set(key, String(value));
    if (px) {
      const expireAt = Date.now() + px;
      this.ttls.set(key, expireAt);
    } else {
      this.ttls.delete(key);
    }

    return 'OK';
  }

  async del(key) {
    this.ttls.delete(key);
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  async eval(script, numkeys, key, arg) {
    this._checkExpiry(key);
    const current = this.store.get(key);
    // Mimic the Lua release script: if get(key) == arg then del(key) return 1 else 0
    if (current === String(arg)) {
      this.del(key);
      return 1;
    }
    return 0;
  }

  async ttl(key) {
    this._checkExpiry(key);
    if (!this.store.has(key)) return -2;
    if (!this.ttls.has(key)) return -1;
    const remainingMs = this.ttls.get(key) - Date.now();
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  async keys(pattern) {
    const matched = [];
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.store.keys()) {
      this._checkExpiry(key);
      if (this.store.has(key) && regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  _checkExpiry(key) {
    if (this.ttls.has(key)) {
      if (Date.now() > this.ttls.get(key)) {
        this.store.delete(key);
        this.ttls.delete(key);
      }
    }
  }

  on() { return this; }
}

let redisClient;
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

try {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // Do not hang on startup if Redis is down
    enableReadyCheck: false,
    connectTimeout: 3000,
  });

  redisClient.on('connect', () => {
    console.log(`[Redis] Connected successfully to ${redisUrl}`);
  });

  redisClient.on('error', (err) => {
    if (!redisClient.isMock) {
      console.warn(`[Redis Connection Warning] Could not connect to real Redis: ${err.message}. Switching to in-memory store.`);
      redisClient = new InMemoryRedisMock();
    }
  });
} catch (err) {
  console.warn(`[Redis Init Error] ${err.message}. Initializing fallback mock.`);
  redisClient = new InMemoryRedisMock();
}

export const getRedisClient = () => redisClient;
export default redisClient;
