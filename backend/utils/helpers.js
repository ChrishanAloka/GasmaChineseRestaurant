const Employee = require("../models/Employee");

async function generateEmployeeId() {
  const count = await Employee.countDocuments({});
  return `EMP-${String(count + 1).padStart(3, "0")}`;
}

module.exports = { generateEmployeeId };