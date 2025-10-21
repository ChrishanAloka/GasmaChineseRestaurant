import React, { useEffect, useState } from "react";
import axios from "axios";

const KitchenLanding = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://goldenpluscaferms.onrender.com/api/auth/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data);
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const markAsReady = async (id) => {
    const token = localStorage.getItem("token");

    try {
      await axios.put(
        `https://goldenpluscaferms.onrender.com/api/auth/order/${id}/status`,
        { status: "Ready" },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      await axios.post(
        "https://goldenpluscaferms.onrender.com/api/auth/notifications/send",
        {
          userId: id, // In practice, use the correct cashier/admin ID
          message: `Order #${id} is ready for pickup.`,
          type: "update",
          role: "kitchen"
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setOrders(orders.filter((o) => o._id !== id));
    } catch (err) {
      alert("❌ Failed to update order status");
    }
  };

  const liveOrders = orders.filter(
    (order) => order.status === "Pending" || order.status === "Processing"
  );

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary border-bottom pb-2 fw-bold">Live Kitchen Orders</h2>

      {liveOrders.length === 0 ? (
        <p className="text-muted">No live orders at the moment.</p>
      ) : (
        <div className="row g-4">
          {liveOrders.map((order) => (
            <div key={order._id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-primary border-1">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">Order #{order._id.slice(-5)}</span>
                  <span className="badge bg-warning text-dark">{order.status}</span>
                </div>
                <div className="card-body">
                  <p className="mb-2">
                    <strong>Customer:</strong> {order.customerName || "Walk-in"}
                  </p>
                  <p className="mb-2">
                    <strong>Table / Type:</strong>{" "}
                    {order.tableNo > 0 ? (
                      <span className="badge bg-primary">Table {order.tableNo}</span>
                    ) : (
                      <span className="badge bg-info text-dark">Takeaway</span>
                    )}
                  </p>

                  <ul className="list-group mb-3">
                    {order.items.map((item, idx) => (
                      <li
                        key={idx}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        {item.name}
                        <span className="badge bg-secondary">{item.quantity}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className="btn btn-success w-100"
                    onClick={() => markAsReady(order._id)}
                  >
                    ✅ Mark as Ready
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KitchenLanding;
