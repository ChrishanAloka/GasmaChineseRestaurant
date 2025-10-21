import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import PaymentModal from "./PaymentModal";
import ReceiptModal from "./ReceiptModal";

const CashierLanding = () => {
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    phone: "",
    name: "",
    orderType: "table",
    tableNo: ""
  });
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [serviceChargeSettings, setServiceChargeSettings] = useState({
    dineInCharge: 0,
    isActive: false
  });
  const [deliveryChargeSettings, setDeliveryChargeSettings] = useState({
    amount: 0,
    isActive: false
  });


  // Load menus and service charge
  useEffect(() => {
    fetchMenus();
    fetchServiceCharge();
    fetchDeliveryCharge();
  }, []);

  // Auto-fill customer name when phone changes
  useEffect(() => {
    if (!customer.phone) return;

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("https://goldenpluscaferms.onrender.com/api/auth/customer", {
          params: { phone: customer.phone },
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data?.name && !customer.name) {
          setCustomer((prev) => ({ ...prev, name: res.data.name }));
        }
      } catch (err) {
        console.error("Auto-fill failed:", err.message);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [customer.phone]);

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://goldenpluscaferms.onrender.com/api/auth/menus", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenus(res.data);
    } catch (err) {
      console.error("Failed to load menus:", err.message);
    }
  };

  const fetchServiceCharge = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      "https://goldenpluscaferms.onrender.com/api/auth/admin/service-charge",
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const { dineInCharge, isActive } = res.data;

    setServiceChargeSettings({
      dineInCharge,
      isActive: isActive === true || isActive === "true" // ✅ ensures boolean
    });
  } catch (err) {
    console.error("Failed to load service charge:", err.message);
    console.error("Failed to load service charge:", err.response?.data || err.message);

  }
  };

  const fetchDeliveryCharge = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://goldenpluscaferms.onrender.com/api/auth/admin/delivery-charge", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeliveryChargeSettings(res.data);
    } catch (err) {
      console.error("Failed to load delivery charge:", err.message);
    }
  };


  // Add item to cart
  const addToCart = (menu) => {
    const existing = cart.find((item) => item._id === menu._id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item._id === menu._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...menu, quantity: 1 }]);
    }
  };

  // Remove item from cart
  const removeFromCart = (menu) => {
    const existing = cart.find((item) => item._id === menu._id);

    if (existing && existing.quantity <= 1) {
      setCart(cart.filter((item) => item._id !== menu._id));
    } else {
      setCart(
        cart.map((item) =>
          item._id === menu._id
            ? { ...item, quantity: item.quantity - 1 }
            : item
        ).filter((item) => item.quantity > 0)
      );
    }
  };

  // Proceed to payment
  const goToPayment = () => {
    const { phone, name } = customer;

    if (!phone.trim() || !name.trim()) {
      toast.warn("Please enter customer phone and name");
      return;
    }

    if (customer.orderType === "table" && !customer.tableNo.trim()) {
      toast.warn("Table number is required for Dine-In orders");
      return;
    }

    if (customer.orderType === "takeaway" && !customer.deliveryType) {
      toast.warn("Delivery Type is required for Takeaway orders");
      return;
    }

    if (cart.length === 0) {
      toast.warn("Please add at least one item");
      return;
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    let serviceCharge = 0;
    let deliveryCharge = 0;
    let finalTotal = subtotal;

    // Apply service charge
    if (customer.orderType === "table" && serviceChargeSettings.isActive) {
      serviceCharge = subtotal * (serviceChargeSettings.dineInCharge / 100);
      finalTotal += serviceCharge;
    }

    // Apply delivery charge
    if (customer.orderType === "takeaway" && deliveryChargeSettings.isActive && customer.deliveryType === "Delivery Service") {
      deliveryCharge = deliveryChargeSettings.amount;
      finalTotal += deliveryCharge;
    }
    

    setOrderData({
      customerName: name,
      customerPhone: phone,
      tableNo: customer.orderType === "takeaway" ? "Takeaway" : customer.tableNo,
      items: cart.map((item) => ({
        menuId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      })),
      subtotal,
      serviceCharge,
      deliveryType: customer.orderType === "takeaway" ? customer.deliveryType : null,
      deliveryCharge,
      totalPrice: finalTotal
    });

    setShowPaymentModal(true);
  };

  // Confirm order and send to backend
  const submitConfirmedOrder = async (paymentData) => {
    try {
      const token = localStorage.getItem("token");
      const invoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const payload = {
        ...customer,
        ...orderData,
        payment: {
          cash: paymentData.cash,
          card: paymentData.card,
          bankTransfer: paymentData.bankTransfer,
          totalPaid: paymentData.totalPaid,
          changeDue: paymentData.changeDue,
          notes: paymentData.notes
        },
        invoiceNo,
      };

      const res = await axios.post(
        "https://goldenpluscaferms.onrender.com/api/auth/order",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setReceiptOrder(res.data);
      setCustomer({
        phone: "",
        name: "",
        orderType: "table",
        tableNo: "",
        deliveryType: "Customer Pickup"
      });
      setCart([]);
      fetchMenus();
      setShowPaymentModal(false);
      toast.success("Order placed successfully!");
    } catch (err) {
      console.error("Order failed:", err.response?.data || err.message);
      alert("Failed to place order");
    }
  };

  // Filter menus by search & category
  const filteredMenus = menus.filter((menu) => {
    const matchesSearch = menu.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      !selectedCategory || menu.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ✅ LIVE subtotal calculation
const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
const serviceCharge = customer.orderType === "table" && serviceChargeSettings.isActive
  ? subtotal * (serviceChargeSettings.dineInCharge / 100)
  : 0;
const deliveryCharge = customer.orderType === "takeaway" && deliveryChargeSettings.isActive && customer.deliveryType === "Delivery Service"
    ? deliveryChargeSettings.amount
    : 0;

const finalTotal = subtotal + serviceCharge + deliveryCharge;

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="container-fluid px-4">
      <h2 className="mb-4 text-primary border-bottom pb-2 fw-bold">Order Management</h2>

      {/* Customer Info */}
      <div className="mb-4 bg-white p-4 rounded shadow-sm">
        <h4>Customer Details</h4>
        <div className="row g-3">
          <div className="col-md-3">
            <label>Phone *</label>
            <input
              name="phone"
              value={customer.phone}
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  phone: e.target.value
                })
              }
              className="form-control"
              placeholder="e.g., 0771234567"
            />
          </div>

          <div className="col-md-3">
            <label>Name *</label>
            <input
              name="name"
              value={customer.name}
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  name: e.target.value
                })
              }
              className="form-control"
              placeholder="John Doe"
            />
          </div>

          <div className="col-md-3">
            <label>Order Type</label>
            <select
              name="orderType"
              value={customer.orderType}
              onChange={(e) =>
                setCustomer({
                  ...customer,
                  orderType: e.target.value
                })
              }
              className="form-select"
            >
              <option value="table">Dine In</option>
              <option value="takeaway">Takeaway</option>
            </select>
          </div>
          
          {customer.orderType === "table" && (
            <>
              <div className="col-md-3">
                <label>Table No</label>
                <input
                  name="tableNo"
                  value={customer.tableNo}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      tableNo: e.target.value
                    })
                  }
                  className="form-control"
                  placeholder="-"
                />
              </div>
            </>
          )}

          {/* Delivery Type (only for Takeaway) */}
        {customer.orderType === "takeaway" && (
          <div className="col-md-3">
            <label>Delivery Type</label>
            <select
              name="deliveryType"
              value={customer.deliveryType}
              onChange={(e) =>
                    setCustomer({
                      ...customer,
                      deliveryType: e.target.value
                    })
                  }
              className="form-select"
            >
              <option value="">Select an option</option>
              <option value="Customer Pickup">Customer Pickup</option>
              <option value="Delivery Service">Delivery Service</option>
            </select>
          </div>
        )}

        {/* Delivery Note (only for Delivery Service) */}
            {customer.deliveryType === "Delivery Service" && (
              <div className="mt-3">
                <label>Delivery Address or Note</label>
                <textarea
                  name="deliveryNote"
                  value={customer.deliveryNote || ""}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      deliveryNote: e.target.value
                    })
                  }
                  rows="2"
                  className="form-control"
                  placeholder="Enter delivery address or instructions"
                  required
                ></textarea>
              </div>
            )}

        </div>
      </div>

      {/* Cart Summary */}
      <div className="row g-4">
        <div className="col-md-8">
          {/* Search & Filter */}
          <div className="bg-white p-3 mb-3 rounded shadow-sm">
            <div className="row g-3">
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="col-md-4">
                <select
                  className="form-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Drinks">Drinks</option>
                  <option value="Dessert">Dessert</option>
                </select>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="row g-3">
            {filteredMenus.map((menu) => {
              
              const inStock = menu.currentQty > 0;
              const lowStock = menu.currentQty <= menu.minimumQty;

              return(
              <div key={menu._id} className="col-12 col-md-4 col-lg-4 col-xl-3">
                <div className="card shadow-sm h-100 border-0">
                  <img
                    src={
                    menu.imageUrl.startsWith("https")
                      ? menu.imageUrl
                      : `https://goldenpluscaferms.onrender.com${menu.imageUrl}`
                    }
                    alt={menu.name}
                    style={{ height: "150px", width:"100%" ,objectFit: "contain" }}
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                    }}
                    className="card-img-top"
                  />
                  <div className="card-body text-center">
                    <h6>{menu.name}</h6>
                    <p className="m-0">{symbol}{menu.price.toFixed(2)} </p>
                    <p className="m-0">
                      Stock:{" "}
                    <span className={`badge ${lowStock ? "bg-warning text-dark" : "bg-success"}`}>
                      {menu.currentQty}
                    </span>
                    </p>
                    {inStock ? (
                    <button
                      className="btn btn-success w-100 mt-2"
                      onClick={() => addToCart(menu)}
                    >
                      Add to Order
                    </button>
                    ) : (
                      <div className="text-danger mt-auto">❌ Out of Stock</div>
                    )}
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Right Side - Cart & Receipt */}
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">🛒 Current Order</h5>
            </div>
            <div className="card-body">
              <ul className="list-group mb-3">
                {cart.length === 0 ? (
                  <li className="list-group-item">No items added</li>
                ) : (
                  cart.map((item, idx) => (
                    <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                      <span>{item.name}</span>
                      <span>{symbol}{(item.price * item.quantity).toFixed(2)}</span>
                      <span className="badge bg-secondary">{item.quantity}</span>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => removeFromCart(item)}
                      >
                        -
                      </button>
                    </li>
                  ))
                )}
              </ul>

              <hr />

              {/* Order Summary */}
              <div className="d-flex justify-content-between mb-2">
                <strong>Subtotal</strong>
                <span>{symbol}{subtotal.toFixed(2)}</span> {/* ✅ UPDATED */}
              </div>

              {serviceCharge > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <strong>Service Charge ({serviceChargeSettings.dineInCharge}%)</strong>
                  <span>{symbol}{serviceCharge.toFixed(2)}</span> {/* ✅ UPDATED */}
                </div>
              )}

              {deliveryCharge > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <strong>Delivery Fee</strong>
                  <span>{symbol}{deliveryCharge.toFixed(2)}</span>
                </div>
              )}

              <div className="d-flex justify-content-between fw-bold fs-5">
                <strong>Total</strong>
                <span>{symbol}{finalTotal.toFixed(2)}</span> {/* ✅ UPDATED */}
              </div>

              <button
                className="btn btn-success w-100 py-2 mt-3"
                onClick={goToPayment}
                disabled={cart.length === 0}
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPaymentModal && (
        <PaymentModal
          totalAmount={orderData.totalPrice}
          subtotal={orderData.subtotal}
          serviceCharge={orderData.serviceCharge}
          deliveryCharge={orderData.deliveryCharge}
          onConfirm={submitConfirmedOrder}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          onClose={() => setReceiptOrder(null)}
        />
      )}
      <ToastContainer />
    </div>
  );
};

export default CashierLanding;