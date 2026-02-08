import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import CreatableSelect from 'react-select/creatable';
import makeAnimated from 'react-select/animated';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ExpensePage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [formData, setFormData] = useState({
    supplier: null,
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    billNo: "",
    paymentMethod: "Cash"
  });
  const [billItems, setBillItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [expandedExpenses, setExpandedExpenses] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showCreateMenuModal, setShowCreateMenuModal] = useState(false);
  const [newMenuData, setNewMenuData] = useState({ name: "", price: "", cost: "", category: "Main Course", minimumQty: 5 });
  const [pendingMenuIndex, setPendingMenuIndex] = useState(null); // Track which row triggered creation

  // Toggle bill items visibility
  const toggleBillItems = (expenseId) => {
    setExpandedExpenses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expenseId)) {
        newSet.delete(expenseId);
      } else {
        newSet.add(expenseId);
      }
      return newSet;
    });
  };

  // Add new bill item
  const addBillItem = () => {
    setBillItems([...billItems, { description: "", quantity: 1, unitPrice: 0, total: 0, menuId: null, isConfirmed: false, note: "" }]);
  };

  // Remove bill item
  const removeBillItem = (index) => {
    const updated = billItems.filter((_, i) => i !== index);
    setBillItems(updated);
    updateTotalAmount(updated);
  };

  // Update bill item field
  const updateBillItem = (index, field, value) => {
    const updated = [...billItems];
    updated[index][field] = value;

    // Handle menu selection specifically
    if (field === "menuId") {
      const selectedMenu = menus.find(m => m._id === value);
      updated[index].isConfirmed = false; // Reset confirmation when menu changes
      if (selectedMenu) {
        // If description is empty, auto-fill with menu name
        if (!updated[index].description) {
          updated[index].description = `${selectedMenu.name} (Restock)`;
        }
        // Store current available quantity in note field
        updated[index].note = `Avail Qty: ${selectedMenu.currentQty || 0}`;
      } else {
        updated[index].note = "";
      }
    }

    // Auto-calculate total for this item
    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(updated[index].quantity) || 0;
      const price = parseFloat(updated[index].unitPrice) || 0;
      updated[index].total = qty * price;
    }

    setBillItems(updated);
    updateTotalAmount(updated);
  };

  // Update total amount based on bill items
  const updateTotalAmount = (items) => {
    const total = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    setFormData(prev => ({ ...prev, amount: total.toFixed(2) }));
  };

  const [menus, setMenus] = useState([]);

  // Handle new menu creation
  const handleCreateMenuSubmit = async () => {
    if (!newMenuData.name || !newMenuData.price || !newMenuData.cost) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: newMenuData.name,
        price: newMenuData.price,
        cost: newMenuData.cost,
        category: newMenuData.category || "Main Course",
        minimumQty: newMenuData.minimumQty || 5,
        currentQty: 0
      };

      const res = await axios.post("https://gasmachineserestaurantapp.onrender.com/api/auth/menu", payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update menus list
      setMenus(prev => [...prev, res.data]);
      toast.success("New menu item created!");

      // If pending row exists, link the new menu
      if (pendingMenuIndex !== null) {
        // Need to wrap updateBillItem call carefully because menus state might not be updated within this closure immediately?
        // Actually setMenus updates state, wait, updateBillItem uses `menus` state.
        // `menus` is from outer scope.
        // State update `setMenus` is async. If I call `updateBillItem` right after...
        // `updateBillItem` logic: const selectedMenu = menus.find(...);
        // It uses stale `menus` closure?
        // Yes. `updateBillItem` uses `menus` from closure.
        // But `updateBillItem` logic finds `selectedMenu` to fill description/note.
        // If `menus` is stale, `selectedMenu` is undefined.
        // Then description/note won't be filled.
        // But `menuId` will be set.
        // That's acceptable. The user will see confirmation or refresh.
        // OR I can manually pass the new menu object to a modified `updateBillItem`?
        // Or just let it be. If description is empty, user can type it.
        // Note: I should manually fill description/note here if `updateBillItem` fails to find it.

        const index = pendingMenuIndex;
        const newMenu = res.data;

        setBillItems(prevItems => {
          const updated = [...prevItems];
          updated[index].menuId = newMenu._id;
          updated[index].isConfirmed = false;
          if (!updated[index].description) {
            updated[index].description = `${newMenu.name} (Restock)`;
          }
          updated[index].note = `Avail Qty: ${newMenu.currentQty || 0}`;
          return updated;
        });

        setPendingMenuIndex(null);
      }

      setShowCreateMenuModal(false);
      setNewMenuData({ name: "", price: "", cost: "", category: "Main Course", minimumQty: 5 });
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to create menu item");
    } finally {
      setLoading(false);
    }
  };

  // Load suppliers, expenses, and menus
  useEffect(() => {
    fetchSuppliers();
    fetchExpenses();
    fetchMenus();

    // Check for restock items from MenuManagement
    const storedItems = localStorage.getItem('restockBillItems');
    if (storedItems) {
      try {
        const items = JSON.parse(storedItems);
        if (Array.isArray(items) && items.length > 0) {
          setBillItems(items);
          // Calculate total amount for the loaded items
          const total = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
          setFormData(prev => ({ ...prev, amount: total.toFixed(2) }));

          toast.info("Loaded items for restocking from Menu Management");
          localStorage.removeItem('restockBillItems');
        }
      } catch (e) {
        console.error("Failed to parse restock items", e);
      }
    }
  }, []);

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://gasmachineserestaurantapp.onrender.com/api/auth/menus", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenus(res.data);
    } catch (err) {
      console.error("Failed to load menus");
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://gasmachineserestaurantapp.onrender.com/api/auth/suppliers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (err) {
      alert("Failed to load suppliers");
    }
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://gasmachineserestaurantapp.onrender.com/api/auth/expenses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Fetched expenses:", res.data);
      setExpenses(res.data);
    } catch (err) {
      alert("Failed to load expenses");
    }
  };

  const handleSupplierChange = (selectedOption) => {
    setFormData({ ...formData, supplier: selectedOption });
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier || !formData.amount || !formData.billNo) {
      alert("Please select supplier, enter amount, and provide bill number");
      return;
    }

    // Validate if any linked bill item is not confirmed
    const unconfirmedItems = billItems.filter(item => item.menuId && !item.isConfirmed);
    if (unconfirmedItems.length > 0) {
      toast.error("Please confirm all linked menu items before saving.");
      return;
    }

    const payload = {
      supplier: formData.supplier.value,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      billNo: formData.billNo,
      paymentMethod: formData.paymentMethod,
      // Remove frontend-only isConfirmed flag before sending
      billItems: billItems.map(({ isConfirmed, ...rest }) => rest)
    };

    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const url = editingId
        ? `https://gasmachineserestaurantapp.onrender.com/api/auth/expense/${editingId}`
        : "https://gasmachineserestaurantapp.onrender.com/api/auth/expense/add";

      const method = editingId ? "put" : "post";

      const res = await axios[method](url, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (editingId) {
        const updatedList = expenses.map((exp) =>
          exp._id === editingId ? res.data : exp
        );
        setExpenses(updatedList);
        setEditingId(null);
        toast.success("Expense updated successfully!");
      } else {
        const supplierData = suppliers.find((s) => s._id === payload.supplier);
        const newExpense = {
          _id: res.data._id,
          supplier: supplierData,
          amount: payload.amount,
          description: payload.description,
          date: payload.date,
          billNo: payload.billNo
        };
        setExpenses([newExpense, ...expenses]);
        toast.success("Expense added successfully!");
      }

      setFormData({
        supplier: null,
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        billNo: ""
      });
      setBillItems([]);
      fetchMenus();
      fetchExpenses();

    } catch (err) {
      console.error("Failed to submit expense:", err.response?.data || err.message);
      toast.error(editingId ? "Failed to update expense" : "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (exp) => {
    console.log("Editing expense:", exp);
    console.log("Bill items:", exp.billItems);

    setFormData({
      supplier: {
        value: exp.supplier._id,
        label: `${exp.supplier.name} (${exp.supplier.contact})`
      },
      amount: exp.amount,
      description: exp.description,
      date: new Date(exp.date).toISOString().split("T")[0],
      billNo: exp.billNo,
      paymentMethod: exp.paymentMethod || "Cash"
    });

    // Initialize bill items with isConfirmed true for existing items
    const existingItems = (exp.billItems || []).map(item => ({
      ...item,
      isConfirmed: true // Existing items are already confirmed
    }));

    setBillItems(existingItems);
    setEditingId(exp._id);

    // Scroll to top of page to show the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDelete = (id) => {
    setDeleteId(id);
    setShowConfirmModal(true);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://gasmachineserestaurantapp.onrender.com/api/auth/expense/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(expenses.filter((exp) => exp._id !== deleteId));
      toast.success("Expense deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete expense");
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
      setDeleteId(null);
      fetchExpenses();
      fetchMenus();
    }
  };

  const supplierOptions = suppliers.map((s) => ({
    value: s._id,
    label: `${s.name} (${s.contact})`
  }));

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="container py-4">
      <h2 className="mb-4 text-primary fw-bold border-bottom pb-2">Record Supplier Expense</h2>

      {/* Expense Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-white shadow-sm rounded border mb-5">
        <div className="row g-4">

          <div className="col-md-4">
            <label className="form-label fw-semibold">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="form-control shadow-sm"
            />
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold">Select Supplier *</label>
            <Select
              options={supplierOptions}
              value={formData.supplier}
              onChange={handleSupplierChange}
              placeholder="Search supplier..."
              isClearable
              isSearchable
              required
            />
          </div>

          <div className="col-md-4">
            <label className="form-label fw-semibold">Bill No *</label>
            <input
              type="text"
              name="billNo"
              value={formData.billNo}
              onChange={handleChange}
              placeholder="Enter Bill Number"
              className="form-control shadow-sm"
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Amount ({symbol}) *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="e.g., 100"
              className="form-control shadow-sm"
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label fw-semibold">Payment Method</label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="form-select shadow-sm"
            >
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Debit Card">Debit Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="col-md-12">
            <label className="form-label fw-semibold">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Raw materials"
              className="form-control shadow-sm"
            />
          </div>

          {/* Bill Items Section */}
          <div className="col-12">
            <hr className="my-3" />
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-secondary mb-0">📋 Bill Items</h5>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={addBillItem}
                disabled={loading}
              >
                + Add Item
              </button>
            </div>

            {billItems.length > 0 && (
              <div className="table-responsive mb-3">
                <table className="table table-bordered table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "25%" }}>Item Description</th>
                      <th style={{ width: "25%" }}>Link Menu (Restock)</th>
                      <th style={{ width: "10%" }}>Qty</th>
                      <th style={{ width: "15%" }}>Unit Price ({symbol})</th>
                      <th style={{ width: "20%" }}>Total ({symbol})</th>
                      <th style={{ width: "5%" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item, index) => {
                      const selectedMenu = menus.find(m => m._id === item.menuId);
                      const isLinked = !!item.menuId;
                      const showFields = !isLinked || item.isConfirmed;

                      return (
                        <tr key={index}>
                          <td>
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              placeholder="Item description"
                              value={item.description}
                              onChange={(e) => updateBillItem(index, "description", e.target.value)}
                            />
                          </td>
                          <td>
                            <div className="d-flex flex-column gap-2">
                              <CreatableSelect
                                classNamePrefix="react-select"
                                isClearable
                                isDisabled={item.isConfirmed || loading}
                                options={menus.map(m => ({ value: m._id, label: m.name }))}
                                value={item.menuId ? {
                                  value: item.menuId,
                                  label: menus.find(m => m._id === item.menuId)?.name || "Unknown"
                                } : null}
                                onChange={(option) => updateBillItem(index, "menuId", option ? option.value : "")}
                                onCreateOption={(inputValue) => {
                                  setNewMenuData({ name: inputValue, price: "0", cost: "0", category: "Main Course", minimumQty: 5 });
                                  setPendingMenuIndex(index);
                                  setShowCreateMenuModal(true);
                                }}
                                placeholder="Select or Create..."
                                menuPortalTarget={document.body}
                                styles={{
                                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                  control: (base) => ({
                                    ...base,
                                    minHeight: '30px',
                                    height: '30px',
                                    fontSize: '0.875rem'
                                  }),
                                  valueContainer: (base) => ({
                                    ...base,
                                    padding: '0 8px'
                                  }),
                                  input: (base) => ({
                                    ...base,
                                    margin: 0,
                                    padding: 0
                                  })
                                }}
                              />

                              {selectedMenu && (
                                <div className="d-flex align-items-center justify-content-between">
                                  <div style={{ fontSize: "0.75rem" }}>
                                    Stock: <strong>{selectedMenu.currentQty || 0}</strong>
                                    {selectedMenu.currentQty <= 5 && (
                                      <span className="text-danger ms-1">
                                        ({selectedMenu.currentQty === 0 ? "Out" : "Low"})
                                      </span>
                                    )}
                                  </div>
                                  {!item.isConfirmed ? (
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm py-0 px-2"
                                      style={{ fontSize: "0.7rem", height: "22px" }}
                                      onClick={() => updateBillItem(index, "isConfirmed", true)}
                                      disabled={loading}
                                    >
                                      Confirm
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary btn-sm py-0 px-2"
                                      style={{ fontSize: "0.7rem", height: "22px" }}
                                      onClick={() => updateBillItem(index, "isConfirmed", false)}
                                      disabled={loading}
                                    >
                                      Edit
                                    </button>
                                  )}
                                </div>
                              )}

                              {isLinked && (
                                <input
                                  type="text"
                                  className="form-control form-control-sm text-muted"
                                  style={{ fontSize: "0.75rem", backgroundColor: "#f8f9fa", fontStyle: "italic" }}
                                  value={item.note || ""}
                                  readOnly
                                  placeholder="Stock Note"
                                  title="Snapshot of available quantity when linked"
                                />
                              )}
                            </div>
                          </td>
                          <td>
                            {showFields && (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="Qty"
                                min="0"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => updateBillItem(index, "quantity", e.target.value)}
                              />
                            )}
                          </td>
                          <td>
                            {showFields && (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="Price"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateBillItem(index, "unitPrice", e.target.value)}
                              />
                            )}
                          </td>
                          <td>
                            {showFields && (
                              <input
                                type="number"
                                className="form-control form-control-sm bg-light"
                                value={item.total.toFixed(2)}
                                readOnly
                              />
                            )}
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => removeBillItem(index)}
                              title="Remove item"
                              disabled={loading}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="table-secondary fw-bold">
                      <td colSpan="3" className="text-end">Total Amount:</td>
                      <td>{symbol}{formData.amount || "0.00"}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {billItems.length === 0 && (
              <div className="alert alert-info text-center">
                <small>No items added yet. Click "+ Add Item" to add bill items.</small>
              </div>
            )}
          </div>

          <div className="col-12 mt-3">
            <button type="submit" className="btn btn-success w-100 py-2 fs-5" disabled={loading}>
              {loading ? "Processing..." : (editingId ? "✏️ Update Expense" : "+ Add New Expense")}
            </button>
          </div>
          {/* Edit Mode Indicator */}
          {editingId && (
            <div className="alert alert-warning d-flex justify-content-between align-items-center" role="alert">
              <span>
                <strong>✏️ Edit Mode:</strong> You are currently editing an expense. Make your changes and click "Update Expense".
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => {
                  setEditingId(null);
                  setBillItems([]);
                  setFormData({
                    supplier: null,
                    amount: "",
                    description: "",
                    date: new Date().toISOString().split("T")[0],
                    billNo: "",
                    paymentMethod: "Cash"
                  });
                }}
                disabled={loading}
              >
                Cancel Edit
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Expenses Table */}
      <h4 className="mb-3 text-secondary">📋 Recent Expenses</h4>
      <div className="table-responsive shadow-sm rounded border">
        <table className="table table-bordered table-striped align-middle mb-0">
          <thead className="table-dark">
            <tr>
              <th>Date</th>
              <th>Bill No</th>
              <th>Supplier</th>
              <th>Description</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Payment Method</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center text-muted py-4">
                  No expenses found
                </td>
              </tr>
            ) : (
              expenses.map((exp, idx) => (
                <React.Fragment key={idx}>
                  <tr>
                    <td>{new Date(exp.date).toLocaleDateString()}</td>
                    <td><strong>{exp.billNo}</strong></td>
                    <td>{exp.supplier?.name || "Unknown"} ({exp.supplier?.contact || "-"})</td>
                    <td>{exp.description || "-"}</td>
                    <td className="text-center">
                      {exp.billItems && exp.billItems.length > 0 ? (
                        <span
                          className="badge bg-primary"
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                          onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          onClick={() => toggleBillItems(exp._id)}
                          title={expandedExpenses.has(exp._id) ? "Click to hide items" : "Click to view items"}
                        >
                          {exp.billItems.length} {expandedExpenses.has(exp._id) ? '▼' : '▶'}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{symbol}{parseFloat(exp.amount).toFixed(2)}</td>
                    <td>{exp.paymentMethod || "Cash"}</td>
                    <td className="text-center">
                      <div className="d-flex gap-2 justify-content-center">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openEditModal(exp)}
                          title="Edit Expense"
                          disabled={loading}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => confirmDelete(exp._id)}
                          title="Delete Expense"
                          disabled={loading}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Bill Items Row - Only show when expanded */}
                  {exp.billItems && exp.billItems.length > 0 && expandedExpenses.has(exp._id) && (
                    <tr className="bg-light">
                      <td colSpan="8">
                        <div className="p-2">
                          <strong className="text-muted">📋 Bill Items:</strong>
                          <table className="table table-sm table-bordered mt-2 mb-0">
                            <thead className="table-secondary">
                              <tr>
                                <th style={{ width: "50%" }}>Description</th>
                                <th style={{ width: "15%" }}>Quantity</th>
                                <th style={{ width: "20%" }}>Unit Price</th>
                                <th style={{ width: "15%" }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {exp.billItems.map((item, itemIdx) => (
                                <tr key={itemIdx}>
                                  <td>{item.description}</td>
                                  <td>{item.quantity}</td>
                                  <td>{symbol}{parseFloat(item.unitPrice).toFixed(2)}</td>
                                  <td>{symbol}{parseFloat(item.total).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-sm">
            <div className="modal-content shadow-lg rounded">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this expense?</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                  {loading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Create Menu Modal */}
      {showCreateMenuModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Menu Item</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateMenuModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newMenuData.name}
                    onChange={e => setNewMenuData({ ...newMenuData, name: e.target.value })}
                    placeholder="Menu item name"
                  />
                </div>
                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newMenuData.price}
                      onChange={e => setNewMenuData({ ...newMenuData, price: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">Cost</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newMenuData.cost}
                      onChange={e => setNewMenuData({ ...newMenuData, cost: e.target.value })}
                      min="0"
                    />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">Category</label>
                    <CreatableSelect
                      isClearable
                      onChange={(option) => setNewMenuData({ ...newMenuData, category: option ? option.value : "" })}
                      onCreateOption={(inputValue) => {
                        setNewMenuData({ ...newMenuData, category: inputValue });
                      }}
                      options={[...new Set(menus.map(m => m.category).filter(Boolean))].map(c => ({ value: c, label: c }))}
                      value={newMenuData.category ? { value: newMenuData.category, label: newMenuData.category } : null}
                      placeholder="Select or Create..."
                      menuPortalTarget={document.body}
                      styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                      components={makeAnimated()}
                    />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">Minimum Qty</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newMenuData.minimumQty}
                      onChange={e => setNewMenuData({ ...newMenuData, minimumQty: e.target.value })}
                      min="0"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreateMenuModal(false)} disabled={loading}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreateMenuSubmit} disabled={loading}>
                  {loading ? "Creating..." : "Create Menu Item"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default ExpensePage;