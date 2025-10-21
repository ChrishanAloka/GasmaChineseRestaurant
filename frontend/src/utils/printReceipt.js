// src/utils/printReceipt.js
export const printReceiptToBoth = async (receiptHTML) => {
  // Wait for QZ to connect
  await qz.websocket.connect().catch((e) => console.error("QZ connect error", e));

  // Convert your HTML into printable text (or ESC/POS)
  const printData = [{ type: "html", format: "plain", data: receiptHTML }];

  // Printer names (must match your Windows printer names)
  const printers = ["Cashier Printer", "Kitchen Printer"];

  // Loop through both printers
  for (const printerName of printers) {
    try {
      await qz.print({ printer: printerName }, printData);
      console.log(`✅ Printed to ${printerName}`);
    } catch (err) {
      console.error(`❌ Failed to print on ${printerName}`, err);
    }
  }

  // Disconnect after printing
  qz.websocket.disconnect();
};
