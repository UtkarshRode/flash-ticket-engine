import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';
const CONCURRENT_WORKERS = 50;

async function runCliStressTest() {
  console.log(`\n================================================================`);
  console.log(`⚡ FLASH-TICKET ENGINE: CONCURRENCY STRESS TEST (CLI)`);
  console.log(`🎯 Testing Distributed Locking & Race Condition Prevention`);
  console.log(`================================================================\n`);

  try {
    // 1. Fetch available events
    console.log(`[1/4] Fetching active flash-sale events from ${API_BASE}/events...`);
    const eventsRes = await axios.get(`${API_BASE}/events`);
    const events = eventsRes.data.data;

    if (!events || events.length === 0) {
      console.error('❌ No active events found. Run "npm run seed" or start the server.');
      process.exit(1);
    }

    const event = events[0];
    console.log(`✔ Found event: "${event.title}" (ID: ${event._id})`);

    // 2. Fetch seats
    console.log(`[2/4] Querying seat inventory...`);
    const seatsRes = await axios.get(`${API_BASE}/events/${event._id}/seats`);
    const availableSeats = seatsRes.data.data.filter((s) => s.status === 'AVAILABLE');

    if (availableSeats.length === 0) {
      console.log('⚠️  No available seats found. Resetting event inventory for test...');
      await axios.post(`${API_BASE}/events/${event._id}/reset`);
      const refreshed = await axios.get(`${API_BASE}/events/${event._id}/seats`);
      availableSeats.push(...refreshed.data.data.filter((s) => s.status === 'AVAILABLE'));
    }

    const targetSeat = availableSeats[0];
    console.log(`✔ Target Seat Selected: ${targetSeat.seatNumber} (${targetSeat.tier} - $${targetSeat.price}) [ID: ${targetSeat._id}]`);

    // 3. Fire concurrent bursts
    console.log(`\n[3/4] Firing ${CONCURRENT_WORKERS} simultaneous requests against seat ${targetSeat.seatNumber}...`);
    const startTime = Date.now();

    const promises = Array.from({ length: CONCURRENT_WORKERS }, (_, i) => {
      const simulatedUserId = `cli-worker-${i + 1}`;
      const reqStart = Date.now();
      return axios
        .post(
          `${API_BASE}/events/${event._id}/seats/${targetSeat._id}/hold`,
          { userId: simulatedUserId },
          { headers: { 'Content-Type': 'application/json' } }
        )
        .then((res) => ({
          worker: simulatedUserId,
          status: 'SUCCESS',
          code: res.status,
          latency: Date.now() - reqStart,
          message: res.data.message,
        }))
        .catch((err) => ({
          worker: simulatedUserId,
          status: 'BLOCKED',
          code: err.response?.status || 500,
          latency: Date.now() - reqStart,
          error: err.response?.data?.message || err.message,
        }));
    });

    const results = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;

    // 4. Analyze results
    const successful = results.filter((r) => r.status === 'SUCCESS');
    const blocked = results.filter((r) => r.status === 'BLOCKED');

    console.log(`\n================================================================`);
    console.log(`📊 STRESS TEST AUDIT REPORT`);
    console.log(`================================================================`);
    console.log(`Total Requests Sent    : ${CONCURRENT_WORKERS}`);
    console.log(`Total Elapsed Time     : ${totalDuration} ms`);
    console.log(`Successful Holds (200) : ${successful.length} (Expected: 1)`);
    console.log(`Blocked Requests (409) : ${blocked.length} (Expected: ${CONCURRENT_WORKERS - 1})`);

    if (successful.length === 1 && blocked.length === CONCURRENT_WORKERS - 1) {
      console.log(`\n✅ TEST PASSED: Zero double-booking detected.`);
      console.log(`🔒 Distributed lock & atomic CAS successfully isolated the winning transaction.`);
      console.log(`🏆 Winning User: ${successful[0].worker} (Latency: ${successful[0].latency} ms)`);
    } else {
      console.log(`\n❌ TEST ANOMALY: Expected exactly 1 winner, got ${successful.length}`);
    }
    console.log(`================================================================\n`);
  } catch (err) {
    console.error('Fatal test error:', err.message);
  }
}

runCliStressTest();
