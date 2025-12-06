// backend/controllers/dbStatsController.js
const mongoose = require('mongoose');

// Helper: Estimate average doc size (roughly)
const estimateAvgDocSize = (modelName) => {
  // You can customize per model if you want more accuracy
  switch (modelName) {
    case 'Order': return 1024;        // ~1KB
    case 'Menu': return 512;          // ~0.5KB
    case 'Employee': return 300;
    case 'OtherIncome': return 200;
    case 'Expense': return 200;
    case 'Customer': return 300;
    default: return 500; // fallback
  }
};

exports.getDbStats = async (req, res) => {
  try {
    const collections = [];
    let totalEstimatedSize = 0;

    // Get all Mongoose models
    const models = mongoose.models;

    for (const modelName in models) {
      const model = models[modelName];
      const count = await model.estimatedDocumentCount();
      const avgSize = estimateAvgDocSize(modelName);
      const estimatedSizeBytes = count * avgSize;
      const estimatedSizeMB = (estimatedSizeBytes / (1024 * 1024)).toFixed(2);

      totalEstimatedSize += estimatedSizeBytes;

      collections.push({
        name: modelName,
        count,
        estimatedSizeMB
      });
    }

    const totalSizeMB = (totalEstimatedSize / (1024 * 1024)).toFixed(2);

    res.json({
      database: {
        name: mongoose.connection.name || 'restaurant_rms',
        totalEstimatedSizeMB: totalSizeMB,
        collections: collections.length
      },
      collections: collections.sort((a, b) => parseFloat(b.estimatedSizeMB) - parseFloat(a.estimatedSizeMB))
    });
  } catch (err) {
    console.error('DB Stats Error:', err.message);
    res.status(500).json({ error: 'Unable to retrieve database stats', details: err.message });
  }
};