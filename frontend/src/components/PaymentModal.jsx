import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PaymentModal = ({ totalAmount, onConfirm, onClose }) => {
  const [cash, setCash] = useState(0);
  const [card, setCard] = useState(0);
  const [bankTransfer, setBankTransfer] = useState(0);
  const [notes, setNotes] = useState("");

  const totalPaid = parseFloat(cash || 0) + parseFloat(card || 0) + parseFloat(bankTransfer || 0);
  const changeDue = (totalPaid - totalAmount).toFixed(2);

  const handleSubmit = () => {
    if (totalPaid < totalAmount) {
      toast.warn("Total paid must be equal or greater than order total");
      return;
    }

    onConfirm({
      cash,
      card,
      bankTransfer,
      totalPaid,
      changeDue,
      notes
    });
  };

  const symbol = localStorage.getItem("currencySymbol") || "$";

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Record Payment</h5>
            <button className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6">
                <h4>Order Total: <strong>{symbol}{totalAmount.toFixed(2)}</strong></h4>
              </div>
              <div className="col-md-6 text-end">
                <h4>
                  Total Paid: <strong>{symbol}{totalPaid.toFixed(2)}</strong>
                </h4>
              </div>
            </div>

            <hr />

            <div className="row">
              <div className="col-md-4">
                <label className="form-label">Cash ({symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cash}
                  onChange={(e) => setCash(parseFloat(e.target.value))}
                  className="form-control"
                  placeholder="0.00"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Card ({symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={card}
                  onChange={(e) => setCard(parseFloat(e.target.value))}
                  className="form-control"
                  placeholder="0.00"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Bank Transfer ({symbol})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.00"
                  value={bankTransfer}
                  onChange={(e) => setBankTransfer(parseFloat(e.target.value) || 0.00)}
                  className="form-control"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="form-label">Notes (Optional)</label>
              <textarea
                rows="2"
                className="form-control"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
            </div>

            <div className="mt-3">
              <h5>
                Change Due:{" "}
                <span className="text-success">{symbol}{changeDue}</span>
              </h5>
            </div>

            <div className="mt-4 d-flex justify-content-between">
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleSubmit}>
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default PaymentModal;