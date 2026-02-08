const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: String,
  date: {
    type: Date,
    default: Date.now
  },
  billNo: {
    type: String,
    required: true
  },
  billItems: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: false
    },
    note: {
      type: String,
      required: false
    }
  }],
  paymentMethod: {
    type: String,
    default: "Cash"
  }
});

module.exports = mongoose.model("Expense", expenseSchema);