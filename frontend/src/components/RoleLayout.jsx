import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "./ProtectedRoute";
import useTokenCountdown from "../hooks/useTokenCountdown";
import {
  FaBars, FaSignOutAlt, FaTachometerAlt, FaUsers, FaKey, FaFileInvoice,
  FaChartBar, FaUserTie, FaCalendarCheck, FaTruck, FaMoneyBillWave,
  FaMoneyCheckAlt, FaUtensils, FaDollarSign, FaShoppingCart, FaHistory,
  FaBookOpen, FaClipboardList, FaUserCircle, FaPercentage, FaTruckLoading, 
  FaFirstOrder,FaMotorcycle,FaUserClock,FaCashRegister,FaBookReader,FaCoins,FaWallet
} from "react-icons/fa";
import "./Sidebar.css";
import NotificationCenter from "./NotificationCenter";

const RoleLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userDropdown, setUserDropdown] = useState(false);
  const { user, logout } = useAuth();
  const countdown = useTokenCountdown();
  const location = useLocation();
  const dropdownRef = useRef();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Auto detect mobile view
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const createMenuItem = (to, label, Icon) => {
    const isActive = location.pathname === to;
    return (
      <li title={!sidebarOpen ? label : ""} key={to}>
        <Link to={to} className={`menu-link ${isActive ? "active" : ""}`}>
          <Icon className="menu-icon" />
          {sidebarOpen && <span className="menu-label">{label}</span>}
        </Link>
      </li>
    );
  };

  const renderSidebarMenu = () => {
    switch (user?.role) {
      case "admin":
        return (
          <>
            {createMenuItem("/admin", "Dashboard", FaTachometerAlt)}
            {createMenuItem("/cashier/today", "View Today", FaBookOpen)}
            {createMenuItem("/cashier-summery", "Cashier Summery", FaBookReader)}
            {createMenuItem("/cashier", "Order Management", FaCashRegister)}
            
            {createMenuItem("/kitchen", "Live Orders", FaShoppingCart)}
            {createMenuItem("/cashier/orders", "Order History", FaHistory)}

            {createMenuItem("/kitchen/menu", "Manage Menu", FaClipboardList)}
                        
            {createMenuItem("/cashier/takeaway-orders", "Takeaway Orders", FaFirstOrder)}

            {createMenuItem("/admin/users", "User Management", FaUsers)}
            {createMenuItem("/admin/report", "Monthly Report", FaChartBar)}
            {createMenuItem("/admin/employees", "Employees", FaUserTie)}
            {createMenuItem("/kitchen/attendance/add", "Live Attendance", FaUserClock)}
            {createMenuItem("/admin/attendance", "Attendance History", FaCalendarCheck)}
            {createMenuItem("/cashier/driver-register", "Takeaway Driver Register", FaMotorcycle)}
            {createMenuItem("/admin/suppliers", "Suppliers Register", FaTruck)}
            {createMenuItem("/admin/expenses", "Supplier Expenses", FaMoneyBillWave)}
            {createMenuItem("/admin/bills", "Restaurant Bills", FaFileInvoice)}            
            {createMenuItem("/admin/salaries", "Salary Payments", FaMoneyCheckAlt)}
            {createMenuItem("/admin/service-charge", "Service Charge", FaPercentage)}
            {createMenuItem("/admin/delivery-charge", "Delivery Charge", FaTruckLoading)}
            {createMenuItem("/admin/signup-key", "Signup Key", FaKey)}
            {createMenuItem("/admin/currency", "Currency", FaDollarSign)}
          </>
        );
      case "cashier":
        return (
          <>
            {createMenuItem("/cashier", "Order Management", FaCashRegister)}
            {createMenuItem("/kitchen/menu", "Manage Menu", FaClipboardList)}
            {createMenuItem("/kitchen", "Live Orders", FaShoppingCart)}
            {createMenuItem("/cashier/orders", "Order History", FaHistory)}
            {createMenuItem("/cashier/takeaway-orders", "Takeaway Orders", FaFirstOrder)}

            {createMenuItem("/cashier/today", "View Today", FaBookOpen)}
            {createMenuItem("/cashier-summery", "Cashier Summery", FaBookReader)}

            {createMenuItem("/cashier/other-income", "Other Incomes", FaCoins)}
            {createMenuItem("/cashier/other-expences", "Other Expences", FaWallet)}
            
            {createMenuItem("/cashier/driver-register", "Driver Register", FaMotorcycle)}
            
            {createMenuItem("/kitchen/kitchen-requestsForm", "Admin Requests", FaUtensils)}
            {createMenuItem("/kitchen/attendance/add", "Live Attendance", FaUserClock)}
            
          </>
        );
      case "kitchen":
        return (
          <>
            {createMenuItem("/kitchen", "Live Orders", FaShoppingCart)}
            {createMenuItem("/kitchen/history", "Order History", FaHistory)}
            {createMenuItem("/kitchen/menu", "Manage Menu", FaClipboardList)}
            {createMenuItem("/kitchen/kitchen-requestsForm", "Admin Requests", FaUtensils)}
            {createMenuItem("/kitchen/attendance/add", "Attendance", FaUserClock)}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="layout d-flex">
      {!isMobile || sidebarOpen ? (
        <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
          <div className="sidebar-header d-flex align-items-center">
            {sidebarOpen && (
              <>
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="sidebar-logo rounded-circle me-2"
                  style={{
                    width: "40px",
                    height: "40px",
                    objectFit: "cover",
                    border: "2px solid #fff",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                />
                <h3 className="justify-content-left sidebar-title mb-0">Golden Plus Cafe RMS  </h3>
              </>
            )}
          </div>
          <ul className="sidebar-menu">{renderSidebarMenu()}</ul>
        </aside>
      ) : null}

      <div className="main-content flex-grow-1">
        <header className="top-navbar">
          <div className="navbar-left">
            <button className="btn-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <span className="session-timer">⏳ Session expires in: {countdown}</span>
            <div >
              <NotificationCenter />
            </div>
          </div>
          <div className="navbar-right" ref={dropdownRef}>
            <div className="user-dropdown">
              
              <div
                className="user-toggle"
                onClick={() => setUserDropdown(!userDropdown)}
                style={{ cursor: "pointer" }}
              >
                <FaUserCircle className="user-icon" />
                <span className="user-role">{user?.role}</span>
              </div>
              {userDropdown && (
                <div className="dropdown-menu show">
                  <button className="dropdown-item" onClick={logout}>
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RoleLayout;
