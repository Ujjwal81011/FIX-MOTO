
require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');
const registerSocketHandlers = require('./socket/socketHandler');

const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const mechanicRoutes = require('./routes/mechanicRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Frontend URL should be configured in Backend/.env
const clientUrl = process.env.CLIENT_URL;

const io = new Server(server, {
  cors: {
    origin: clientUrl || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

app.set('io', io);

// CORS configuration for frontend requests
app.use(
  cors({
    origin: clientUrl || '*',
  })
);

// Preserve existing request body limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FIX MOTO Backend Running!',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
  });
});

// Existing API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Keep the centralized error handler last
app.use(errorHandler);

// Socket.IO handlers
registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`FIX MOTO server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
}

startServer();