// backend/index.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const fileRoutes = require('./routes/files');

const app = express();

// Middleware
app.use(
  cors({
    origin: 'http://localhost:3000', // Replace with your frontend URL
    credentials: true,
  })
);
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('MongoDB connection error:', error));

// Routes
app.use('/api/files', fileRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).send('Internal Server Error');
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
