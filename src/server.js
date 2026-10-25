require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const careerRoutes = require('./routes/careers');
const skillRoutes = require('./routes/skills');
const projectRoutes = require('./routes/projects');
const assessmentRoutes = require('./routes/assessments');
const studentRoutes = require('./routes/students');

// Connect to MongoDB
connectDB();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, '');

    // Allow any localhost port
    if (/^http:\/\/localhost(:\d+)?$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    // Automatically allow any Vercel domain (*.vercel.app)
    if (cleanOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow configured CLIENT_URL(s)
    if (allowedOrigins.length > 0 && allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // If wildcard is provided
    if (allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger (dev) ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// ─── Routes (supports both /api/* and /* routes) ─────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/careers', careerRoutes);
app.use('/careers', careerRoutes);

app.use('/api/skills', skillRoutes);
app.use('/skills', skillRoutes);

app.use('/api/projects', projectRoutes);
app.use('/projects', projectRoutes);

app.use('/api/assessments', assessmentRoutes);
app.use('/assessments', assessmentRoutes);

app.use('/api/students', studentRoutes);
app.use('/students', studentRoutes);

// ─── Health & Root Checks ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CareerPath AI Backend API is running 🚀',
    version: '1.0.0',
    health: '/api/health',
  });
});

const healthHandler = (req, res) => {
  res.json({
    success: true,
    message: 'CareerPath AI API is running ✅',
    timestamp: new Date().toISOString(),
  });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({ success: false, message: 'Duplicate field value entered.' });
  }
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API base: http://localhost:${PORT}/api`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health\n`);
});
