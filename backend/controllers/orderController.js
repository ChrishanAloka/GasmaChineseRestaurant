// backend/controllers/orderController.js

const mongoose = require("mongoose");
const Order = require("../models/Order");
const Driver = require("../models/Driver");

const Menu = require("../models/Menu");
const DeliveryCharge = require("../models/DeliveryCharge");
const ServiceCharge = require("../models/ServiceCharge");


// POST /api/auth/order
exports.createOrder = async (req, res) => {
  const {
    customerPhone,
    customerName,
    tableNo,
    items,
    deliveryType,
    deliveryCharge,
    deliveryNote,
    payment // { cash, card, bankTransfer, notes }
  } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items provided" });
  }

  try {
    // Auto-fill customer name from last order
    let finalCustomerName = customerName;
    if (!finalCustomerName && customerPhone) {
      const lastOrder = await Order.findOne({ customerPhone }).sort({ createdAt: -1 });
      finalCustomerName = lastOrder?.customerName || customerName;
    }

    // Validate and enrich items
    let validItems = [];
    let subtotal = 0;

    for (let item of items) {
      const menuItem = await Menu.findById(item.menuId);
      if (!menuItem) {
        return res.status(400).json({ error: "Invalid menu item" });
      }

      if (item.quantity > menuItem.currentQty) {
        return res.status(400).json({
          error: `Only ${menuItem.currentQty} left in stock for ${menuItem.name}`
        });
      }

      const netProfitPerUnit = menuItem.price - (menuItem.cost || 0);

      subtotal += menuItem.price * item.quantity;

      validItems.push({
        menuId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        netProfit: netProfitPerUnit,
        imageUrl: menuItem.imageUrl,
        quantity: item.quantity
      });
    }

    // Apply service charge only for Dine-In
    let serviceCharge = 0;
    let finalTotalPrice = subtotal;

    if (tableNo && tableNo !== "Takeaway") {
      const chargeSettings = await ServiceCharge.findOne({});
      if (chargeSettings?.dineInCharge > 0 && chargeSettings.isActive) {
        serviceCharge = subtotal * (chargeSettings.dineInCharge / 100);
        finalTotalPrice = subtotal + serviceCharge;
      }
    }

    // Apply delivery charge
    let deliveryCharge = 0;
    if (tableNo === "Takeaway" && deliveryType === "Delivery Service") {
      const deliverySettings = await DeliveryCharge.findOne({});
      if (deliverySettings?.isActive) {
        deliveryCharge = deliverySettings.amount;
        finalTotalPrice = subtotal + deliveryCharge;
      }
    }

    const invoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newOrder = new Order({
      invoiceNo,
      customerName: finalCustomerName,
      customerPhone,
      tableNo,
      items: validItems,
      subtotal,
      serviceCharge,
      deliveryType,
      deliveryCharge,
      deliveryNote: deliveryNote || "",
       deliveryStatus: deliveryType === "Customer Pickup"
        ? "Customer Pending"
        : "Driver Pending",
      totalPrice: finalTotalPrice,
      payment: {
        cash: payment?.cash || 0,
        card: payment?.card || 0,
        bankTransfer: payment?.bankTransfer || 0,
        totalPaid: (payment?.cash || 0) + (payment?.card || 0) + (payment?.bankTransfer || 0),
        changeDue:
          (payment?.totalPaid || 0) - finalTotalPrice,
        notes: payment?.notes || ""
      },
      cashierId: req.user.id,
      status: "Pending"
    });

    await newOrder.save();

    // Update menu stock
    for (let item of validItems) {
      await Menu.findByIdAndUpdate(item.menuId, {
        $inc: { currentQty: -item.quantity }
      });
    }

    res.json(newOrder);
  } catch (err) {
    console.error("Order creation failed:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/auth/orders/history
exports.getOrderHistory = async (req, res) => {
  const { startDate, endDate, status } = req.query;
  const query = {};

  // ✅ Handle date range properly
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // ✅ If only one date is provided (e.g., daily report), use full day range
  if (startDate && !endDate) {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999); // ✅ End of the day

    query.createdAt = {
      $gte: start,
      $lte: end
    };
  }

  // ✅ Handle status filter
  if (status) {
    query.status = status;
  }

  try {
    const orders = await Order.find(query).populate("cashierId", "name role").sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Failed to load order history:", err.message);
    res.status(500).json({ error: "Failed to load orders" });
  }
};

// Update order status (used by both admin & kitchen)
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Failed to update status" });
  }
};

exports.exportOrdersToExcel = async (req, res) => {
  const orders = await Order.find({});
  const XLSX = require("xlsx");

  const flatOrders = orders.flatMap(order =>
    order.items.map(i => ({
      OrderID: order._id,
      Date: new Date(order.date).toLocaleString(),
      Customer: order.customerName,
      Table: order.tableNo,
      Item: i.name,
      Quantity: i.quantity,
      Price: i.price,
      TotalPrice: i.price * i.quantity,
      Status: order.status
    }))
  );

  const ws = XLSX.utils.json_to_sheet(flatOrders);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");
  XLSX.writeFile(wb, "cashier_orders.xlsx");
  res.json({ message: "Exported" });
};

// backend/controllers/orderController.js

exports.getCustomerByPhone = async (req, res) => {
  const { phone } = req.query;

  if (!phone) return res.json(null);

  try {
    const lastOrder = await Order.findOne({ customerPhone: phone }).sort({ date: -1 });

    if (lastOrder) {
      return res.json({
        name: lastOrder.customerName,
        phone: lastOrder.customerPhone
      });
    }

    res.json(null);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

// backend/controllers/orderController.js

exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Failed to update status" });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Failed to load order" });
  }
};

// GET /api/auth/cashier/takeaway-orders?status=Pending
// GET /api/auth/cashier/takeaway-orders
exports.getCashierTakeawayOrders = async (req, res) => {
  const { status } = req.query;
  const userId = req.user.id;

  try {
    let query = {
      tableNo: "Takeaway"
    };

    if (status && ["Pending", "Processing", "Ready", "Completed"].includes(status)) {
      query.status = status;
    }

    // ✅ Add .populate("driverId")
    const orders = await Order.find(query)
      .populate("driverId", "name vehicle numberPlate")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    console.error("Failed to load takeaway orders:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/auth/drivers
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({}).select("name vehicle numberPlate");
    res.json(drivers);
  } catch (err) {
    console.error("Failed to load drivers:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/auth/order/:id/delivery-status
exports.updateDeliveryStatus = async (req, res) => {
  const { id } = req.params;
  const { deliveryStatus, driverId } = req.body;

  try {
    const updates = { deliveryStatus };
    if (deliveryStatus === "Driver Pending" && driverId) {
      updates.driverId = driverId;
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updates, { new: true })
      .populate("driverId", "name vehicle numberPlate");

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error("Failed to update delivery status:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};