const mongoose = require("mongoose");

exports.getDbStats = async (req, res) => {
  try {
    const db = mongoose.connection.db;

    const stats = await db.command({ dbStats: 1 });

    const collections = await db.listCollections().toArray();
    const collectionStats = [];

    for (const col of collections) {
      const cs = await db.command({ collStats: col.name });

      collectionStats.push({
        name: col.name,
        count: cs.count,
        sizeMB: (cs.size / 1024 / 1024).toFixed(2),
        storageSizeMB: (cs.storageSize / 1024 / 1024).toFixed(2),
        estimatedSizeMB: (cs.size / 1024 / 1024).toFixed(2)
      });
    }

    res.json({
      database: {
        name: stats.db,
        collections: stats.collections,
        totalEstimatedSizeMB: (stats.dataSize / 1024 / 1024).toFixed(2),
        totalStorageMB: (stats.storageSize / 1024 / 1024).toFixed(2),
        fileSizeMB: stats.fileSize
          ? (stats.fileSize / 1024 / 1024).toFixed(2)
          : null
      },
      collections: collectionStats
    });

  } catch (err) {
    console.error("DB Stats error:", err);
    res.status(500).json({ error: "Failed to get DB stats" });
  }
};
