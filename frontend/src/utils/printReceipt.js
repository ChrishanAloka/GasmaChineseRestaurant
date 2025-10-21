// src/utils/printReceipt.js

import { toast } from "react-toastify";

export const printReceiptToBoth = async (receiptHTML) => {
  try {
    toast.info("Connecting to QZ Tray...");

    await qz.websocket.connect();

    // Format as printable HTML (ESC/POS printers can also use raw text)
    const printData = [{ type: "html", format: "plain", data: receiptHTML }];

    // Printer names (must match your system printer names)
    const printers = ["Cashier Printer", "Kitchen Printer"];
    const printed = [];

    // Print to both
    for (const printerName of printers) {
      try {
        await qz.print({ printer: printerName }, printData);
        printed.push(printerName);
        toast.success(`✅ Printed successfully on ${printerName}`);
      } catch (err) {
        toast.error(`⚠️ Failed to print on ${printerName}`);
        console.error(`❌ Failed to print on ${printerName}`, err);
      }
    }

    if (printed.length === 0) {
      toast.warn("No printers printed successfully!");
    } else if (printed.length < printers.length) {
      toast.warn("Some printers failed. Check connection or paper.");
    } else {
      toast.success("✅ Printed on both printers successfully!");
    }

    await qz.websocket.disconnect();
    toast.info("Disconnected from QZ Tray.");
  } catch (err) {
    toast.error("❌ Could not connect to QZ Tray. Please make sure it’s running.");
    console.error(err);
  }
};
