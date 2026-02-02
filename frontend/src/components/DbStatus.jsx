import React, { useEffect, useState } from "react";
import axios from "axios";

const MAX_STORAGE_MB = 512; // Atlas free-tiers

const DatabaseUsage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDbStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          "https://gasmachineserestaurantapp.onrender.com/api/auth/admin/db-stats",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load DB stats:", err);
        alert("Failed to load database usage");
      } finally {
        setLoading(false);
      }
    };

    fetchDbStats();
  }, []);

  if (loading) return (
    <div className="text-center my-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p className="mt-2">Loading DB usage...</p>
    </div>
  );

  if (!stats) return <div><p className="text-muted">No stats available.</p></div>;

  const usedMB = Number(stats.database.totalStorageMB);
  const freeMB = (MAX_STORAGE_MB - usedMB).toFixed(2);
  const percentageUsed = ((usedMB / MAX_STORAGE_MB) * 100).toFixed(1);

  return (
    <div className="container py-4">

      {/* HEADER */}
      <div className="mb-4 text-center">
        <h2 className="fw-bold" style={{ letterSpacing: ".5px" }}>
          MongoDB Atlas Storage Dashboard
        </h2>
        <p className="text-muted">Premium Admin View</p>
      </div>

      {/* TOP CARDS */}
      <div className="row g-4">

        {/* Card 1 */}
        <div className="col-md-6">
          <div
            className="premium-card p-4 shadow-lg rounded-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(80,80,255,.2), rgba(140,50,255,.2))",
              backdropFilter: "blur(10px)",
            }}
          >
            <h5 className="fw-bold">
              📊 Database Overview
            </h5>
            <p className="text-muted mb-3">Real-time storage insights</p>

            <ul className="list-unstyled">
              <li className="mb-2">
                <strong>Database:</strong> {stats.database.name}
              </li>
              <li className="mb-2">
                <strong>Collections:</strong> {stats.database.collections}
              </li>
              <li className="mb-2">
                <strong>Data Size:</strong>{" "}
                <span className="badge bg-primary">
                  {stats.database.totalEstimatedSizeMB} MB
                </span>
              </li>
              <li className="mb-2">
                <strong>Storage Used:</strong>{" "}
                <span className="badge bg-danger">{usedMB} MB</span>
              </li>
              <li className="mb-2">
                <strong>Balance:</strong>{" "}
                <span className="badge bg-success">{freeMB} MB</span>
              </li>
            </ul>

            {/* Progress Bar */}
            <div className="mt-4">
              <label className="fw-semibold text-muted">Storage Usage</label>
              <div className="progress premium-progress">
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{
                    width: `${percentageUsed}%`,
                  }}
                >
                  {percentageUsed}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="col-md-6">
          <div
            className="premium-card p-4 shadow-lg rounded-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,170,60,.2), rgba(255,80,80,.2))",
              backdropFilter: "blur(10px)",
            }}
          >
            <h5 className="fw-bold">💾 Cluster Capacity</h5>
            <p className="text-muted mb-3">512MB Free-Tier Limit</p>

            <ul className="list-unstyled">
              <li className="mb-2">
                <strong>Total Capacity:</strong> 512 MB
              </li>
              <li className="mb-2">
                <strong>Used:</strong>{" "}
                <span className="badge bg-warning text-dark">{usedMB} MB</span>
              </li>
              <li className="mb-2">
                <strong>Free:</strong>{" "}
                <span className="badge bg-success">{freeMB} MB</span>
              </li>
            </ul>

            <div className="mt-3">
              <div className="d-flex justify-content-between">
                <small>0MB</small>
                <small>512MB</small>
              </div>
              <div className="progress premium-progress">
                <div
                  className="progress-bar bg-dark"
                  style={{ width: `${percentageUsed}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* COLLECTION TABLE */}
      <div className="card shadow-lg mt-5 border-0 rounded-4">
        <div className="card-body p-4">
          <h4 className="fw-bold mb-3">📁 Collection Breakdown</h4>
          <p className="text-muted">Sorted by storage size</p>

          <table className="table table-hover table-striped align-middle">
            <thead className="table-dark">
              <tr>
                <th>Collection</th>
                <th>Documents</th>
                <th>Data (MB)</th>
                <th>Storage (MB)</th>
              </tr>
            </thead>
            <tbody>
              {stats.collections
                .sort((a, b) => b.storageSizeMB - a.storageSizeMB)
                .map((col, i) => (
                  <tr key={i}>
                    <td className="fw-semibold">{col.name}</td>
                    <td>{col.count}</td>
                    <td>
                      <span className="badge bg-primary">{col.sizeMB}</span>
                    </td>
                    <td>
                      <span className="badge bg-info text-dark">
                        {col.storageSizeMB}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOM CSS */}
      <style>{`
        .premium-card:hover {
          transform: translateY(-5px);
          transition: 0.3s ease-in-out;
          box-shadow: 0 15px 35px rgba(0,0,0,.2);
        }

        .premium-progress {
          height: 14px;
          border-radius: 10px;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default DatabaseUsage;
