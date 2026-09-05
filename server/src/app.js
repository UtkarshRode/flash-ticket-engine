import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'FlashTicket High-Concurrency Engine API',
    status: 'ONLINE',
    version: '1.0.0',
    documentation: 'https://github.com/UtkarshRode/flash-ticket-engine',
    endpoints: {
      health: '/api/health',
      events: '/api/events',
      stressTest: '/api/stress-test',
    },
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {

  res.json({
    status: 'UP',
    service: 'flash-ticket-engine',
    timestamp: new Date().toISOString(),
  });
});

// Mount main API routes
app.use('/api', apiRoutes);

// Global centralized error handler
app.use(errorHandler);

export default app;
