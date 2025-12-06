// backend/controllers/dbStatsController.js
const mongoose = require('mongoose');

exports.getDbStats = async (req, res) => {
  try {
    // Get top-level DB stats
    const dbStats = await mongoose.connection.db.stats();

    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionStats = [];

    // Fetch stats for each collection
    for (const col of collections) {
      const stats = await mongoose.connection.db.collection(col.name).stats();
      collectionStats.push({
        name: col.name,
        count: stats.count || 0,
        sizeBytes: stats.size || 0,
        storageSizeBytes: stats.storageSize || 0,
        sizeMB: ((stats.size || 0) / (1024 * 1024)).toFixed(2),
        storageSizeMB: ((stats.storageSize || 0) / (1024 * 1024)).toFixed(2)
      });
    }

    // Calculate totals
    const totalSizeMB = ((dbStats.dataSize || 0) / (1024 * 1024)).toFixed(2);
    const totalStorageMB = ((dbStats.storageSize || 0) / (1024 * 1024)).toFixed(2);
    
    // fsUsedSize only exists on WiredTiger (MongoDB 3.2+); used in Atlas
    const fileSizeMB = dbStats.fsUsedSize 
      ? (dbStats.fsUsedSize / (1024 * 1024)).toFixed(2)
      : null;

    res.json({
      database: {
        name: dbStats.db,
        totalSizeMB,
        totalStorageMB,
        fileSizeMB,
        collections: collectionStats.length
      },
      collections: collectionStats
    });
  } catch (err) {
    console.error('Failed to fetch DB stats:', err);
    res.status(500).json({ error: 'Failed to retrieve database usage stats' });
  }
};