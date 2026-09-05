import { Seat } from '../models/Seat.js';
import TicketService from '../services/ticketService.js';
import { broadcastStressTestMetric } from '../services/socketService.js';

/**
 * Controller to execute simulated high-concurrency burst tests.
 * Fires concurrent requests simultaneously against a single seat to verify atomic lock guarantees.
 */
export const runConcurrencyTest = async (req, res, next) => {
  try {
    const { eventId, targetSeatId, concurrentUsers = 50 } = req.body;

    let seat;
    if (targetSeatId) {
      seat = await Seat.findById(targetSeatId);
    } else {
      // Pick first available seat for the event
      seat = await Seat.findOne({ eventId, status: 'AVAILABLE' });
    }

    if (!seat) {
      return res.status(400).json({
        success: false,
        error: 'No available seat found to run concurrency stress test. Please reset event inventory.',
      });
    }

    const concurrencyCount = Math.min(Math.max(parseInt(concurrentUsers, 10) || 50, 5), 100);
    const testId = `TEST-${Date.now()}`;
    const startTime = performance.now();

    console.log(`[StressTest] Launching ${concurrencyCount} concurrent hold requests targeting seat ${seat.seatNumber}...`);

    // Prepare N simultaneous worker attempts
    const requests = Array.from({ length: concurrencyCount }, (_, index) => {
      const simulatedUserId = `simulated-user-${index + 1}`;
      const reqStart = performance.now();

      return TicketService.holdSeat(eventId, seat._id, simulatedUserId)
        .then((result) => {
          const latency = Math.round(performance.now() - reqStart);
          return {
            workerId: index + 1,
            userId: simulatedUserId,
            status: 'SUCCESS',
            statusCode: 200,
            latencyMs: latency,
            message: `Acquired lock & reserved seat ${seat.seatNumber}`,
          };
        })
        .catch((err) => {
          const latency = Math.round(performance.now() - reqStart);
          return {
            workerId: index + 1,
            userId: simulatedUserId,
            status: 'BLOCKED',
            statusCode: err.status || 409,
            code: err.code || 'CONTENTION',
            latencyMs: latency,
            message: err.message,
          };
        });
    });

    // Execute all requests concurrently
    const results = await Promise.all(requests);
    const totalDurationMs = Math.round(performance.now() - startTime);

    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const blockedCount = results.filter((r) => r.status === 'BLOCKED').length;

    // Fetch actual seat state from database to verify integrity
    const verifiedSeat = await Seat.findById(seat._id);
    const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
    const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];

    const testReport = {
      testId,
      eventId,
      seatId: seat._id,
      seatNumber: seat.seatNumber,
      concurrencyLevel: concurrencyCount,
      totalDurationMs,
      metrics: {
        totalRequests: concurrencyCount,
        successfulLocks: successCount,
        contentionBlocked: blockedCount,
        doubleBookingOccurred: successCount > 1, // Must be FALSE
        avgLatencyMs: avgLatency,
        minLatencyMs: latencies[0],
        maxLatencyMs: latencies[latencies.length - 1],
        p95LatencyMs: p95Latency,
      },
      databaseVerification: {
        seatStatus: verifiedSeat.status,
        heldBy: verifiedSeat.heldBy,
        version: verifiedSeat.version,
        dataIntegrityValid: successCount === 1 && verifiedSeat.status === 'HELD',
      },
      auditLog: results.slice(0, 20), // Return top 20 for UI display
    };

    broadcastStressTestMetric(testReport);

    res.json({
      success: true,
      data: testReport,
    });
  } catch (err) {
    next(err);
  }
};
