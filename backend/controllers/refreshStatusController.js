const RefreshStatus = require("../models/refreshStatus");

exports.getRefreshStatus = async (req, res) => {
  try {
    const status = await RefreshStatus.findOne({});
    if (!status) {
      return res.json({ refreshed: false });
    }
    res.json(status);
  } catch (err) {
    console.error("Failed to load refresh status:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/auth/admin/refresh-status/reset → set to FALSE
exports.resetRefreshStatus = async (req, res) => {
  try {
    let status = await RefreshStatus.findOne({});
    if (!status) {
      status = new RefreshStatus({ refreshed: false });
    } else {
      status.refreshed = false;
    }
    await status.save();
    res.json(status);
  } catch (err) {
    console.error("Failed to reset refresh status:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/auth/admin/refresh-status/mark → set to TRUE
exports.markAsRefreshed = async (req, res) => {
  try {
    let status = await RefreshStatus.findOne({});
    if (!status) {
      status = new RefreshStatus({ refreshed: true });
    } else {
      status.refreshed = true;
    }
    await status.save();
    res.json(status);
  } catch (err) {
    console.error("Failed to mark as refreshed:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};