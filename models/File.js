/**
 * File Model
 * This schema represents the file records in MongoDB
 */

const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  qrCodeUrl: {
    type: String,
    required: true
  },
  downloadUrl: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  flaggedForDeletion: {
    type: Boolean,
    default: false
  },
  deletionDate: {
    type: Date,
    default: null
  }
});

// Add index for expiry date to optimize cleanup queries
fileSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('File', fileSchema);
