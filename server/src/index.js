import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './services/socketService.js';
import TicketService from './services/ticketService.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io real-time layer
initSocket(server);

// Start server after connecting to database
const startServer = async () => {
  await connectDB();

  // Background worker: periodically inspects and auto-reclaims expired holds
  setInterval(() => {
    TicketService.cleanupExpiredHolds();
  }, 4000);

  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 FlashTicket Concurrency Engine Server Running`);
    console.log(`📡 Port: http://localhost:${PORT}`);
    console.log(`⚡ WebSocket Server: Initialized and broadcasting`);
    console.log(`🔒 Concurrency Primitives: Redlock + Optimistic Locks`);
    console.log(`⏱️  Auto-Reclaim Background Worker: Active (every 4s)`);
    console.log(`====================================================`);
  });
};

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
});
