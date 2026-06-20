require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize models to compile their schemas in mongoose
require('./models/User');
require('./models/StartupOrg');
require('./models/Task');
require('./models/Gamification');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const gamificationRouter = require('./routes/gamification');

app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/gamification', gamificationRouter);

// Basic Route for testing
app.get('/', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'online',
    message: 'Tick-It Database Server Active',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    models: mongoose.modelNames()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Tick-It Server listening on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/`);
  console.log(`⚙️ Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});
