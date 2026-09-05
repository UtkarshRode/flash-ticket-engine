import redisClient from '../config/redis.js';

const WINDOW_SIZE_IN_SECONDS = parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10);
const MAX_WINDOW_REQUEST_COUNT = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

/**
 * Sliding Window Counter Rate Limiter using Redis.
 * Protects checkout and reservation endpoints from bot farms and automated scrapers.
 */
export const rateLimiter = async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const key = `ratelimit:${ip}`;

  try {
    const current = await redisClient.get(key);

    if (current && parseInt(current, 10) >= MAX_WINDOW_REQUEST_COUNT) {
      const ttl = await redisClient.ttl(key);
      res.setHeader('Retry-After', ttl > 0 ? ttl : WINDOW_SIZE_IN_SECONDS);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Flash-sale bot protection active: rate limit exceeded. Please try again shortly.',
        retryAfterSeconds: ttl > 0 ? ttl : WINDOW_SIZE_IN_SECONDS,
      });
    }

    if (!current) {
      await redisClient.set(key, 1, 'EX', WINDOW_SIZE_IN_SECONDS);
      res.setHeader('X-RateLimit-Remaining', MAX_WINDOW_REQUEST_COUNT - 1);
    } else {
      const newCount = parseInt(current, 10) + 1;
      const ttl = await redisClient.ttl(key);
      await redisClient.set(key, newCount, 'EX', ttl > 0 ? ttl : WINDOW_SIZE_IN_SECONDS);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_WINDOW_REQUEST_COUNT - newCount));
    }

    res.setHeader('X-RateLimit-Limit', MAX_WINDOW_REQUEST_COUNT);
    next();
  } catch (err) {
    // Fail open in case of rate-limiter failure so users can still transact
    console.error('[RateLimiter Error]', err.message);
    next();
  }
};
