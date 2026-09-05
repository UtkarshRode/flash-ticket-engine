import redisClient from '../config/redis.js';

// Safe Lua script to release lock only if the token matches
const RELEASE_LOCK_LUA = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

/**
 * Distributed Lock Service based on Redlock algorithm principles.
 * Uses atomic SET NX PX and atomic Lua script for safe release.
 */
export class LockService {
  /**
   * Attempts to acquire a distributed lock on a resource.
   * @param {string} resource - The resource identifier (e.g. `seat:664a12...`)
   * @param {string} token - Unique client/request token (UUID) to identify ownership
   * @param {number} ttlMs - Lock expiration in milliseconds (prevents deadlocks on crash)
   * @returns {Promise<boolean>} True if lock acquired, false otherwise
   */
  static async acquireLock(resource, token, ttlMs = 5000) {
    const lockKey = `lock:${resource}`;
    try {
      const result = await redisClient.set(lockKey, token, 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (err) {
      console.error(`[LockService] Failed to acquire lock for ${lockKey}:`, err.message);
      return false;
    }
  }

  /**
   * Safely releases the distributed lock only if the token matches.
   * Prevents deleting another client's lock if TTL expired.
   * @param {string} resource - The resource identifier
   * @param {string} token - The unique token used during acquisition
   * @returns {Promise<boolean>} True if successfully released, false otherwise
   */
  static async releaseLock(resource, token) {
    const lockKey = `lock:${resource}`;
    try {
      const result = await redisClient.eval(RELEASE_LOCK_LUA, 1, lockKey, token);
      return result === 1;
    } catch (err) {
      console.error(`[LockService] Error releasing lock for ${lockKey}:`, err.message);
      return false;
    }
  }

  /**
   * Higher-order helper to execute a task within a distributed lock boundary.
   * Automatically releases the lock when finished or if an error throws.
   */
  static async withLock(resource, token, ttlMs, task) {
    const acquired = await this.acquireLock(resource, token, ttlMs);
    if (!acquired) {
      const error = new Error(`Resource ${resource} is currently locked by another concurrent process.`);
      error.status = 409;
      error.code = 'LOCK_CONTENTION';
      throw error;
    }

    try {
      return await task();
    } finally {
      await this.releaseLock(resource, token);
    }
  }
}

export default LockService;
