/**
 * Database connection test script
 * This script tests the MongoDB connection
 * Run with: node scripts/test-db-connection.js
 */

// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log(`Connection string: ${maskConnectionString(process.env.MONGODB_URI)}`);
  
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log(`✅ Successfully connected to MongoDB at ${conn.connection.host}`);
    console.log(`Database name: ${conn.connection.name}`);
    
    // Check if we can perform basic operations
    const collections = await mongoose.connection.db.collections();
    console.log(`Available collections: ${collections.map(c => c.collectionName).join(', ') || 'none'}`);
    
    await mongoose.connection.close();
    console.log('Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    process.exit(1);
  }
}

// Utility to mask connection string for safe display
function maskConnectionString(uri) {
  if (!uri) return 'Not provided';
  try {
    // Mask username and password in connection string
    return uri.replace(/(mongodb(\+srv)?:\/\/)[^:]+:[^@]+@/, '$1*****:*****@');
  } catch (e) {
    return 'Invalid connection string format';
  }
}

// Run the test
testConnection();
