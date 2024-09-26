// backend/routes/files.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const File = require('../models/File');
const { bucket } = require('../firebaseAdmin');
const checkAuth = require('../middleware/auth');

// Configure multer storage (in-memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload a file (protected route)
router.post('/upload', checkAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }
    // Use the user's UID and original file name to create a unique file path
    const fileName = `${req.user.uid}/${req.file.originalname}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on('error', (err) => {
      console.error('Blob stream error:', err);
      res.status(500).send({ error: 'Blob stream error', details: err.message });
    });

    blobStream.on('finish', async () => {
      // Construct the public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

      // Save file metadata to MongoDB
      const file = new File({
        filename: blob.name,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        firebaseUrl: publicUrl,
        uploadedBy: req.user.uid, // Save user ID who uploaded the file
      });

      await file.save();

      res.status(200).json({ message: 'File uploaded successfully', file });
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).send({ error: 'Internal Server Error', details: error.message });
  }
});

// Get all files uploaded by the current user
router.get('/', checkAuth, async (req, res) => {
  try {
    const files = await File.find({ uploadedBy: req.user.uid }).sort({ uploadDate: -1 });
    res.status(200).json(files);
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).send(error);
  }
});
// Search files uploaded by the current user
router.get('/search', checkAuth, async (req, res) => {
  try {
    const { query } = req.query;
    const files = await File.find({
      uploadedBy: req.user.uid,
      originalname: { $regex: query, $options: 'i' },
    });
    res.status(200).json(files);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).send(error);
  }
});
// Delete a file (protected route)
router.delete('/:id', checkAuth, async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.uid;

    // Find the file in the database
    const file = await File.findOne({ _id: fileId, uploadedBy: userId });

    if (!file) {
      return res.status(404).send('File not found or access denied.');
    }

    // Delete the file from Firebase Storage
    const filePath = file.filename; // This should be the full path in storage
    const fileRef = bucket.file(filePath);

    await fileRef.delete();

    // Remove the file metadata from MongoDB
    await File.deleteOne({ _id: fileId });

    res.status(200).send({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send({ error: 'Internal Server Error', details: error.message });
  }
});

module.exports = router;
