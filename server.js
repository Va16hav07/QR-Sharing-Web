// Load environment variables
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const shortid = require('shortid');
const cors = require('cors');
const connectDB = require('./config/db');
const File = require('./models/File');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const FILE_EXPIRY_DAYS = parseInt(process.env.FILE_EXPIRY_DAYS) || 7; // Files will expire after 7 days
const QUICK_DELETE_MINUTES = 2; // Files can be deleted after 2 minutes
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 200 * 1024 * 1024; // 200MB file size limit
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // Run cleanup once per day
const QUICK_CLEANUP_INTERVAL_MS = 60 * 1000; // Check for flagged files every minute

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Trust proxy for secure cookies in production (for Render.com and similar platforms)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Add request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Validate file types
const fileFilter = (req, file, cb) => {
  // Blacklist of potentially dangerous file extensions
  const blacklist = [
    'exe', 'dll', 'bat', 'cmd', 'sh',
    'vbs', 'js', 'ws', 'cpl', 'scr', 'hta',
    'msi', 'php', 'pl', 'py', 'rb'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (blacklist.includes(ext)) {
    return cb(new Error('File type not allowed for security reasons'), false);
  }
  
  cb(null, true);
};

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    // Create a unique filename with original extension
    const uniqueId = shortid.generate();
    cb(null, uniqueId + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Routes
app.get('/', async (req, res) => {
  try {
    // Get 10 most recent files from the database
    const recentFiles = await File.find()
      .sort({ uploadDate: -1 })
      .limit(10)
      .lean();
    
    const now = new Date();
    
    // Transform the MongoDB documents to match the expected format in the template
    const formattedFiles = recentFiles.map(file => {
      const deletionTime = file.flaggedForDeletion && file.deletionDate ? 
        Math.max(0, Math.floor((new Date(file.deletionDate) - now) / 1000)) : null;
      
      return {
        id: file.fileId,
        originalName: file.originalName,
        size: file.size,
        qrCodeUrl: file.qrCodeUrl,
        downloadUrl: file.downloadUrl,
        uploadDate: file.uploadDate,
        expiryDate: file.expiryDate,
        downloadCount: file.downloadCount,
        flaggedForDeletion: file.flaggedForDeletion,
        deletionDate: file.deletionDate,
        timeRemaining: deletionTime // seconds remaining before deletion
      };
    });
    
    res.render('index', { recentFiles: formattedFiles });
  } catch (error) {
    console.error('Error fetching recent files:', error);
    res.render('index', { recentFiles: [] });
  }
});

// Upload file and generate QR code
app.post('/upload', (req, res) => {
  // Handle file upload with error handling
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds the limit (200MB)' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

    const fileId = path.parse(req.file.filename).name;
    const fileExt = path.extname(req.file.originalname);
    const originalName = req.file.originalname;
    const fileSize = req.file.size;
    
    // Generate QR code for download link
    const fileUrl = `${req.protocol}://${req.get('host')}/download/${fileId}`;
    const qrImagePath = `public/uploads/${fileId}_qr.png`;
    
    await QRCode.toFile(qrImagePath, fileUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });
    
    // Calculate expiration date
    const uploadDate = new Date();
    const expiryDate = new Date(uploadDate);
    expiryDate.setDate(expiryDate.getDate() + FILE_EXPIRY_DAYS);
    
    // Prepare file info
    const fileInfo = {
      id: fileId,
      originalName,
      size: fileSize,
      qrCodeUrl: `/uploads/${fileId}_qr.png`,
      downloadUrl: fileUrl,
      uploadDate: uploadDate,
      expiryDate: expiryDate
    };
    
    // Save to MongoDB
    try {
      const newFile = new File({
        fileId: fileId,
        originalName: originalName,
        filename: req.file.filename,
        size: fileSize,
        qrCodeUrl: `/uploads/${fileId}_qr.png`,
        downloadUrl: fileUrl,
        uploadDate: uploadDate,
        expiryDate: expiryDate
      });
      
      await newFile.save();
      console.log(`File saved to database: ${fileId}`);
      
      res.json(fileInfo);
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ error: 'Error saving file information' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'An error occurred during upload' });
  }
  });
});

// File download route
app.get('/download/:fileId', async (req, res) => {
  const fileId = req.params.fileId;
  
  try {
    // Find file in database
    const fileRecord = await File.findOne({ fileId: fileId });
    
    if (!fileRecord) {
      // If not in database, try to find it in the filesystem as a fallback
      const uploadsDir = path.join(__dirname, 'public/uploads');
      const files = fs.readdirSync(uploadsDir);
      
      const file = files.find(file => {
        return path.parse(file).name === fileId && !file.endsWith('_qr.png');
      });
      
      if (!file) {
        return res.status(404).render('error', { message: 'File not found' });
      }
      
      const filePath = path.join(uploadsDir, file);
      return res.download(filePath, 'download' + path.extname(file));
    }
    
    // Increment download count
    fileRecord.downloadCount += 1;
    await fileRecord.save();
    
    // Construct file path
    const filePath = path.join(__dirname, 'public/uploads', fileRecord.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).render('error', { message: 'File not found on server' });
    }
    
    res.download(filePath, fileRecord.originalName);
  } catch (error) {
    console.error('Error processing download:', error);
    res.status(500).render('error', { message: 'Error processing download' });
  }
});

// API to get recent files
app.get('/api/recent-files', async (req, res) => {
  try {
    const recentFiles = await File.find()
      .sort({ uploadDate: -1 })
      .limit(10)
      .lean();
    
    const now = new Date();
    
    // Transform the MongoDB documents to match the expected format
    const formattedFiles = recentFiles.map(file => {
      const deletionTime = file.flaggedForDeletion && file.deletionDate ? 
        Math.max(0, Math.floor((new Date(file.deletionDate) - now) / 1000)) : null;
      
      return {
        id: file.fileId,
        originalName: file.originalName,
        size: file.size,
        qrCodeUrl: file.qrCodeUrl,
        downloadUrl: file.downloadUrl,
        uploadDate: file.uploadDate,
        expiryDate: file.expiryDate,
        downloadCount: file.downloadCount,
        flaggedForDeletion: file.flaggedForDeletion,
        deletionDate: file.deletionDate,
        timeRemaining: deletionTime, // seconds remaining before deletion
        isExpired: file.expiryDate && new Date(file.expiryDate) < now
      };
    });
    
    res.json(formattedFiles);
  } catch (error) {
    console.error('Error fetching recent files for API:', error);
    res.status(500).json({ error: 'Failed to fetch recent files' });
  }
});

// API to delete a file immediately
app.post('/api/delete-file/:fileId', async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    // Find the file
    const file = await File.findOne({ fileId: fileId });
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Delete the file immediately
    const success = await deleteFileResources(file);
    
    if (success) {
      res.json({ 
        message: 'File deleted successfully'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete file' });
    }
  } catch (error) {
    console.error('Error flagging file for deletion:', error);
    res.status(500).json({ error: 'Failed to flag file for deletion' });
  }
});

// Serve QR code page for a file
app.get('/share/:fileId', async (req, res) => {
  const fileId = req.params.fileId;
  const qrImageUrl = `/uploads/${fileId}_qr.png`;
  const downloadUrl = `/download/${fileId}`;
  
  try {
    // Find file in database
    const fileRecord = await File.findOne({ fileId: fileId }).lean();
    
    // Format file record to match the expected format in the template
    const formattedFileRecord = fileRecord ? {
      id: fileRecord.fileId,
      originalName: fileRecord.originalName,
      size: fileRecord.size,
      downloadUrl: fileRecord.downloadUrl,
      uploadDate: fileRecord.uploadDate,
      expiryDate: fileRecord.expiryDate,
      downloadCount: fileRecord.downloadCount
    } : null;
    
    res.render('share', {
      qrCodeUrl: qrImageUrl,
      downloadUrl: downloadUrl,
      fileId: fileId,
      fileRecord: formattedFileRecord,
      expiryDays: FILE_EXPIRY_DAYS
    });
  } catch (error) {
    console.error('Error fetching file data for share page:', error);
    res.render('share', {
      qrCodeUrl: qrImageUrl,
      downloadUrl: downloadUrl,
      fileId: fileId,
      fileRecord: null,
      expiryDays: FILE_EXPIRY_DAYS
    });
  }
});

// Delete file and associated resources
async function deleteFileResources(record) {
  const uploadsDir = path.join(__dirname, 'public/uploads');
  try {
    // Delete the file
    const filePath = path.join(uploadsDir, record.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    }
    
    // Delete the QR code
    const qrPath = path.join(uploadsDir, `${record.fileId}_qr.png`);
    if (fs.existsSync(qrPath)) {
      fs.unlinkSync(qrPath);
      console.log(`Deleted QR code: ${qrPath}`);
    }
    
    // Delete the record from the database
    await File.deleteOne({ _id: record._id });
    console.log(`Deleted record for: ${record.originalName}`);
    
    return true;
  } catch (err) {
    console.error(`Error deleting file resources for ${record.fileId}:`, err);
    return false;
  }
}

// File cleanup function - removes expired files
async function cleanupExpiredFiles() {
  console.log('Running file cleanup...');
  const now = new Date();
  
  try {
    // Find expired records in database
    const expiredRecords = await File.find({
      expiryDate: { $lt: now }
    }).lean();
    
    console.log(`Found ${expiredRecords.length} expired files to remove`);
    
    // Process each expired file
    let deletedCount = 0;
    for (const record of expiredRecords) {
      const success = await deleteFileResources(record);
      if (success) deletedCount++;
    }
    
    console.log(`Cleanup complete. Removed ${deletedCount} expired files.`);
  } catch (err) {
    console.error('Error during cleanup process:', err);
  }
}

// Quick deletion cleanup function - removes files flagged for deletion
async function cleanupFlaggedFiles() {
  const now = new Date();
  
  try {
    // Find records flagged for deletion that have passed their deletion date
    const flaggedRecords = await File.find({
      flaggedForDeletion: true,
      deletionDate: { $lt: now }
    }).lean();
    
    if (flaggedRecords.length > 0) {
      console.log(`Found ${flaggedRecords.length} flagged files to remove`);
      
      // Process each flagged file
      let deletedCount = 0;
      for (const record of flaggedRecords) {
        const success = await deleteFileResources(record);
        if (success) deletedCount++;
      }
      
      console.log(`Quick cleanup complete. Removed ${deletedCount} flagged files.`);
    }
  } catch (err) {
    console.error('Error during quick cleanup process:', err);
  }
}

// 404 Handler - Must be placed after all other routes
app.use((req, res, next) => {
  res.status(404).render('error', { message: 'Page not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  const statusCode = err.statusCode || 500;
  const errorMessage = process.env.NODE_ENV === 'production' ? 
    'Something went wrong on the server' : 
    err.message || 'Internal Server Error';
  
  if (req.xhr || req.path.startsWith('/api')) {
    return res.status(statusCode).json({ error: errorMessage });
  }
  
  res.status(statusCode).render('error', { message: errorMessage });
});

// Connect to database and start server
(async function startServer() {
  try {
    // First connect to MongoDB
    await connectDB();
    
    // Create HTTP server with Express
    const http = require('http');
    const server = http.createServer(app);
    
    // Configure keep-alive timeout and headers timeout to avoid 502 errors on Render
    server.keepAliveTimeout = 120000; // 120 seconds
    server.headersTimeout = 120000; // 120 seconds
    
    // Then start the Express server with explicit host binding to 0.0.0.0
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`Server bound to 0.0.0.0 (all network interfaces)`);
      
      // Schedule regular cleanup
      setInterval(cleanupExpiredFiles, CLEANUP_INTERVAL_MS);
      
      // Schedule quick cleanup for flagged files
      setInterval(cleanupFlaggedFiles, QUICK_CLEANUP_INTERVAL_MS);
      
      // Also run cleanup on server start
      cleanupExpiredFiles();
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
})();
