const Expense = require("../models/Expense");
const Menu = require("../models/Menu"); // Import Menu model

exports.addExpense = async (req, res) => {
  const { supplier, amount, description, date, billNo, paymentMethod, billItems } = req.body;

  if (!supplier || !amount || !billNo) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const newExpense = new Expense({
      supplier,
      amount,
      description,
      date: date || Date.now(),
      billNo,
      paymentMethod: paymentMethod || "Cash",
      billItems: billItems || []
    });

    await newExpense.save();

    // Loop through billItems to update menu stock if linked
    if (billItems && billItems.length > 0) {
      for (const item of billItems) {
        if (item.menuId && item.quantity > 0) {
          const qtyToAdd = parseFloat(item.quantity) || 0;
          if (qtyToAdd > 0) {
            await Menu.findByIdAndUpdate(item.menuId, {
              $inc: { currentQty: qtyToAdd }
            });
          }
        }
      }
    }

    const populated = await newExpense.populate("supplier", "name contact");
    res.json(populated);
  } catch (err) {
    console.error("Failed to add expense:", err.message);
    res.status(500).json({ error: "Failed to add expense" });
  }
};

exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({}).populate("supplier").sort({ date: -1 });;
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Failed to load expenses" });
  }
};

// PUT /api/auth/expense/:id
// PUT /api/auth/expense/:id
exports.updateExpense = async (req, res) => {
  const { id } = req.params;
  const { amount, description, date, billNo, paymentMethod, billItems } = req.body;

  if (!amount || !billNo) {
    return res.status(400).json({ error: "Amount and Bill No are required" });
  }

  try {
    // 1. Fetch original expense to calculate stock differences
    const oldExpense = await Expense.findById(id);
    if (!oldExpense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // 2. Calculate stock adjustments
    // Map: menuId -> netChange
    const stockChanges = {};

    // Helper to get string ID
    const getMenuId = (id) => (id && id._id ? id._id.toString() : (id ? id.toString() : null));

    // Revert old quantities: Subtract old qty from menu stock
    if (oldExpense.billItems) {
      for (const item of oldExpense.billItems) {
        const mId = getMenuId(item.menuId);
        if (mId) {
          stockChanges[mId] = (stockChanges[mId] || 0) - (item.quantity || 0);
        }
      }
    }

    // Add new quantities: Add new qty to menu stock
    if (billItems && Array.isArray(billItems)) {
      for (const item of billItems) {
        const mId = getMenuId(item.menuId);
        if (mId) {
          const qty = parseFloat(item.quantity) || 0;
          stockChanges[mId] = (stockChanges[mId] || 0) + qty;
        }
      }
    }

    // Apply net stock updates to Menu
    for (const [menuId, change] of Object.entries(stockChanges)) {
      if (change !== 0) {
        await Menu.findByIdAndUpdate(menuId, { $inc: { currentQty: change } });
      }
    }

    // 3. Update the expense record
    const updated = await Expense.findByIdAndUpdate(
      id,
      { amount, description, date, billNo, paymentMethod, billItems: billItems || [] },
      { new: true }
    ).populate("supplier", "name contact");

    res.json(updated);
  } catch (err) {
    console.error("Update failed:", err.message);
    res.status(500).json({ error: "Failed to update expense" });
  }
};

// DELETE /api/auth/expense/:id
exports.deleteExpense = async (req, res) => {
  const { id } = req.params;

  try {
    // Check if expense exists first
    const expense = await Expense.findById(id);

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    // Revert stock changes for linked bill items
    if (expense.billItems && expense.billItems.length > 0) {
      for (const item of expense.billItems) {
        if (item.menuId) {
          const qtyToRevert = parseFloat(item.quantity) || 0;
          if (qtyToRevert > 0) {
            // Decrease stock from Menu as we are deleting the restock record
            await Menu.findByIdAndUpdate(item.menuId, {
              $inc: { currentQty: -qtyToRevert }
            });
          }
        }
      }
    }

    // Now delete the expense
    await Expense.findByIdAndDelete(id);

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Delete failed:", err.message);
    res.status(500).json({ error: "Failed to delete expense" });
  }
};