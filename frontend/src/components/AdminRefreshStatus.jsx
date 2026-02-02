// components/AdminRefreshStatus.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const AdminRefreshStatus = () => {
  const [refreshed, setRefreshed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  // Load current status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "https://gasmachineserestaurantapp.onrender.com/api/auth/refresh-status",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRefreshed(res.data.refreshed);
      } catch (err) {
        toast.error("Failed to load refresh status");
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  // Reset to "not refreshed" (always sets false)
  const handleReset = async () => {
    if (!window.confirm("Are you sure? This will show a refresh badge to all users until they reload.")) {
      return;
    }
    setResetting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://gasmachineserestaurantapp.onrender.com/api/auth/refresh-status/reset",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRefreshed(res.data.refreshed); // should be false
      toast.success("✅ System marked as NOT refreshed. All users will see the refresh indicator.");
    } catch (err) {
      toast.error("❌ Failed to reset refresh status");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="container my-4">
      <h2>System Refresh Indicator</h2>
      <p className="text-muted">
        Use this to notify all users that a refresh is required (e.g., after an update).
      </p>

      <div className="card bg-light border rounded shadow-sm p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h5 className="mb-1">Current Status</h5>
            <span
              className={`badge fs-6 px-3 py-2 ${
                refreshed
                  ? "bg-success text-white"
                  : "bg-warning text-dark"
              }`}
            >
              {refreshed ? "✅ Refreshed" : "⚠️ Not Refreshed"}
            </span>
          </div>

          <button
            className="btn btn-danger btn-lg"
            onClick={handleReset}
            disabled={resetting || !refreshed} // only allow reset if currently refreshed
          >
            {resetting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Resetting...
              </>
            ) : (
              "🔄 Mark System as NOT Refreshed"
            )}
          </button>
        </div>
      </div>

      <div className="alert alert-info">
        <strong>Note:</strong> When set to "Not Refreshed", a red <strong>"1"</strong> badge appears on the refresh icon in the header for all users.
        The badge disappears only after a user performs a hard refresh.
      </div>

      <ToastContainer />
    </div>
  );
};

export default AdminRefreshStatus;