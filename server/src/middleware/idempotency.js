import redisClient from '../config/redis.js';

const IDEMPOTENCY_EXPIRY_SECONDS = 86400; // 24 hours

/**
 * Idempotency Middleware for Financial Transactions.
 * Guarantees that repeating the exact same HTTP request with the same Idempotency-Key
 * yields the exact same response without re-executing charges or database inserts.
 */
export const idempotencyMiddleware = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;

  if (!idempotencyKey) {
    return res.status(400).json({
      success: false,
      error: 'Missing Header',
      message: 'Requests to this endpoint require an Idempotency-Key header to prevent duplicate processing.',
    });
  }

  const cacheKey = `idempotency:${idempotencyKey}`;

  try {
    const cachedResponse = await redisClient.get(cacheKey);

    if (cachedResponse) {
      console.log(`[Idempotency Hit] Serving cached response for key ${idempotencyKey}`);
      res.setHeader('X-Cache-Lookup', 'HIT');
      res.setHeader('X-Idempotent-Replay', 'true');
      return res.status(200).json(JSON.parse(cachedResponse));
    }

    // Capture standard res.json to cache the final output
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        redisClient.set(cacheKey, JSON.stringify(body), 'EX', IDEMPOTENCY_EXPIRY_SECONDS).catch((err) => {
          console.error('[Idempotency Cache Error]', err.message);
        });
      }
      return originalJson(body);
    };

    req.idempotencyKey = idempotencyKey;
    next();
  } catch (err) {
    console.error('[Idempotency Error]', err.message);
    next();
  }
};
