const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const workLogRoutes = require('./routes/workLogs');
const transporterLogRoutes = require('./routes/transporterLogs');
const partyRoutes = require('./routes/parties');
const jobTypeRoutes = require('./routes/jobTypes');
const salaryRoutes = require('./routes/salary');
const financeRoutes = require('./routes/finance');
const Product = require('./models/Product');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Allow common localhost dev ports by default; allow all origins in non-production
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

const allowedOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL)
  ? (process.env.FRONTEND_URLS || process.env.FRONTEND_URL).split(',').map(o => o.trim())
  : defaultOrigins;

const corsOrigin = (origin, callback) => {
  // Allow non-browser or same-origin requests
  if (!origin) return callback(null, true);

  // Allow all in non-production for easier local dev unless explicitly disabled
  if (process.env.NODE_ENV !== 'production' && process.env.CORS_STRICT !== 'true') {
    return callback(null, true);
  }

  if (allowedOrigins.includes(origin)) return callback(null, true);

  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return callback(null, true);
    }
  } catch (_) {}

  return callback(new Error('Not allowed by CORS'));
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('❌ MONGODB_URI is not set. Please define it in your .env file.');
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    // Ensure indexes are in sync
    Product.syncIndexes().then(() => console.log('🗂️ Product indexes synced')).catch((e) => console.warn('Index sync failed:', e?.message));
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/work-logs', workLogRoutes);
app.use('/api/transporter-logs', transporterLogRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/job-types', jobTypeRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/finance', financeRoutes);
const exportRoutes = require('./routes/export');
app.use('/api/export', exportRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoState = mongoose.connection.readyState; // 1 connected, 2 connecting
  res.json({ 
    status: 'OK', 
    message: 'Employee Management System API is running',
    db: mongoState === 1 ? 'connected' : (mongoState === 2 ? 'connecting' : 'disconnected'),
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API available at http://localhost:${PORT}`);
});