import { Server } from 'socket.io';

let io = null;

export const initSocket = (httpServer) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  
  io = new Server(httpServer, {
    cors: {
      origin: [clientUrl, 'http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on('join_event', (eventId) => {
      socket.join(`event:${eventId}`);
      console.log(`[WebSocket] Socket ${socket.id} joined room event:${eventId}`);
    });

    socket.on('leave_event', (eventId) => {
      socket.leave(`event:${eventId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

/**
 * Broadcast seat state change to all connected clients in real-time
 */
export const broadcastSeatUpdate = (eventId, eventType, data) => {
  if (!io) return;
  io.to(`event:${eventId}`).emit(eventType, data);
  // Also emit globally for dashboards
  io.emit(eventType, data);
};

export const broadcastStressTestMetric = (data) => {
  if (!io) return;
  io.emit('stress_test_update', data);
};
