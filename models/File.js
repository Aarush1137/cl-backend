// backend/models/File.js

const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number,
  firebaseUrl: String,
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  uploadedBy: String, // Store user ID
});

module.exports = mongoose.model('File', FileSchema);
