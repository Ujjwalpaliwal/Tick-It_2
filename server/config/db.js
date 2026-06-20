const mongoose = require('mongoose');
const seedDB = require('./seed');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGO_UR;
    if (uri) {
      console.log(`Attempting connection to remote MongoDB Atlas...`);
      // Add a connection timeout so it doesn't hang indefinitely (e.g. 4 seconds)
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log(`MongoDB Connected (Atlas): ${conn.connection.host}`);
      await seedDB();
      return;
    }
  } catch (error) {
    console.log(`⚠️ Atlas connection failed/refused: ${error.message}`);
  }

  // Fallback to In-Memory MongoDB Server
  try {
    console.log(`🚀 Starting in-memory local MongoDB Server fallback...`);
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log(`In-Memory MongoDB Server running at: ${uri}`);
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected (In-Memory): ${conn.connection.host}`);
    
    // Store mongod instance on global or mongoose to shut it down gracefully on exit
    mongoose.mongod = mongod;
    
    await seedDB();
  } catch (error) {
    console.error(`Fatal Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
