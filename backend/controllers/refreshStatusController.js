const RefreshStatus = require("../models/refreshStatus");

// GET /api/auth/admin/refresh-status
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

// PUT /api/auth/admin/refresh-status
exports.updateRefreshStatus = async (req, res) => {
  const { refreshed } = req.body;

  if (typeof refreshed !== "boolean") {
    return res.status(400).json({ error: "Invalid 'refreshed' value. Must be true or false." });
  }

  try {
    let status = await RefreshStatus.findOne({});

    if (!status) {
      status = new RefreshStatus({ refreshed });
    } else {
      status.refreshed = refreshed;
    }

    await status.save();
    res.json(status);
  } catch (err) {
    console.error("Failed to update refresh status:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};