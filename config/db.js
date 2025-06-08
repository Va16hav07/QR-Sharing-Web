/**
 * Database connection module
 * This module handles the MongoDB connection using Mongoose
 */

const mongoose = require('mongoose');

// Connection options
const options = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Track connection status
let isConnected = false;
const MAX_RETRIES = 3;

/**
 * Connect to MongoDB
 * @returns {Promise} MongoDB connection
 */
async function connectDB(retries = MAX_RETRIES) {
  if (isConnected) return;
  
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    isConnected = true;
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection errors after initial connection
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
      
      // Try to reconnect
      setTimeout(() => {
        if (!isConnected) connectDB();
      }, 5000);
    });
    
    // Handle disconnection
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
      isConnected = false;
      
      // Try to reconnect
      setTimeout(() => {
        if (!isConnected) connectDB();
      }, 5000);
    });
    
    return conn;
  } catch (error) {
    isConnected = false;
    console.error(`MongoDB connection error: ${error.message}`);
    
    if (retries > 0) {
      console.log(`Retrying connection... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return connectDB(retries - 1);
    } else {
      if (process.env.NODE_ENV === 'production') {
        console.error('Failed to connect to MongoDB after multiple attempts');
      } else {
        process.exit(1);
      }
    }
  }
}

module.exports = connectDB;
