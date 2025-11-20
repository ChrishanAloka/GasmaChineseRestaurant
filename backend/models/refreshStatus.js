const mongoose = require('mongoose');

const refreshStatusSchema = new mongoose.Schema({
  refreshed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('RefreshStatus', refreshStatusSchema);