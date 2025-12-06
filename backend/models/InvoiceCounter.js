// models/InvoiceCounter.js
const mongoose = require('mongoose');

const invoiceCounterSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true // ensures one per day
  },
  seq: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('InvoiceCounter', invoiceCounterSchema);