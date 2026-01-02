import React, { useState, useEffect } from "react";
import { auth } from "../assets/js/firebase.js";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "../styles/StudyLayout.css";
import {
  FaBell,
  FaBookOpen,
  FaCalendarAlt,
  FaComments,
  FaHome,
  FaCog,
  FaBars,
  FaTimes,
  FaFolderOpen,
  FaFire,
  FaSun,
  FaMoon,
  FaChartBar,
  FaSignOutAlt,
} from "react-icons/fa";

export function StudyLayout({
  children,
  currentSection,
  onSectionChange,
  notifications,
  showNotifications,
  setShowNotifications,
  currentUser,
  onLogout,
}) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [studyStreak, setStudyStreak] = useState(7);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);

  // Initialize dark mode
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  // Show logout confirmation dialog
  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  // Cancel logout
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(false);
    setLogoutProgress(0);
  };

  // Handle logout with animation
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutProgress(0);

    // Animate progress bar
    const interval = setInterval(() => {
      setLogoutProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    try {
      // Simulate a brief delay for animation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Sign out from Firebase
      await signOut(auth);

      // Clear localStorage
      localStorage.removeItem("aceit_current_user");
      localStorage.removeItem("aceit_auth_token");
      localStorage.removeItem("theme");

      // Call the parent logout handler if provided
      if (onLogout) {
        onLogout();
      }

      // Navigate to login page with success state
      setLogoutProgress(100);
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (error) {
      console.error("Logout error:", error);
      clearInterval(interval);
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      setLogoutProgress(0);

      // Show error message
      alert("Failed to logout. Please try again.");
    }
  };

  const sidebarItems = [
    { id: "dashboard", label: "Dashboard", icon: FaHome, path: "/dashboard" },
    {
      id: "flashcards",
      label: "Flashcards",
      icon: FaBookOpen,
      path: "/flashcards",
    },
    {
      id: "calendar",
      label: "Calendar",
      icon: FaCalendarAlt,
      path: "/calendar",
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: FaChartBar,
      path: "/analytics",
    },
    {
      id: "resources",
      label: "Resources",
      icon: FaFolderOpen,
      path: "/resources",
    },
    { id: "chatbot", label: "Felix AI", icon: FaComments, path: "/chatbot" },
    { id: "settings", label: "Settings", icon: FaCog, path: "/settings" },
  ];
  return (
    <div className="study-layout">
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <div className="logout-modal-header">
              <h3 className="logout-modal-title">Confirm Logout</h3>
              <button
                className="logout-modal-close"
                onClick={cancelLogout}
                disabled={isLoggingOut}
              >
                ×
              </button>
            </div>

            <div className="logout-modal-body">
              {isLoggingOut ? (
                <>
                  <div className="logout-animation">
                    <div className="spinner">
                      <div className="spinner-inner"></div>
                    </div>
                    <p className="logout-message">Logging you out...</p>

                    {/* Progress bar */}
                    <div className="logout-progress-container">
                      <div
                        className="logout-progress-bar"
                        style={{ width: `${logoutProgress}%` }}
                      ></div>
                    </div>
                    <p className="logout-progress-text">{logoutProgress}%</p>

                    <div className="logout-steps">
                      <div
                        className={`logout-step ${
                          logoutProgress > 0 ? "active" : ""
                        }`}
                      >
                        <div className="step-icon">1</div>
                        <span>Closing session</span>
                      </div>
                      <div
                        className={`logout-step ${
                          logoutProgress > 50 ? "active" : ""
                        }`}
                      >
                        <div className="step-icon">2</div>
                        <span>Clearing data</span>
                      </div>
                      <div
                        className={`logout-step ${
                          logoutProgress === 100 ? "active" : ""
                        }`}
                      >
                        <div className="step-icon">3</div>
                        <span>Redirecting</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="logout-warning-icon">⚠️</div>
                  <p className="logout-confirm-text">
                    Are you sure you want to logout?
                  </p>
                  <p className="logout-warning-text">
                    Your study streak and progress will be saved.
                  </p>

                  <div className="logout-modal-actions">
                    <button className="btn btn-outline" onClick={cancelLogout}>
                      Cancel
                    </button>
                    <button className="btn btn-red" onClick={handleLogout}>
                      <FaSignOutAlt className="mr-2" />
                      Yes, Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div
          className="mobile-overlay md-hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar ${
          sidebarCollapsed ? "sidebar-collapsed" : "sidebar-expanded"
        }`}
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-header-content">
            <div className={sidebarCollapsed ? "hidden" : "block"}>
              <h1 className="sidebar-title">AceIt</h1>
              <p className="sidebar-subtitle">Smart Learning Platform</p>
            </div>
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <FaBars className="w-4 h-4" />
              ) : (
                <FaTimes className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Profile Section */}
        <div
          className={`sidebar-profile ${
            sidebarCollapsed ? "profile-collapsed" : "profile-expanded"
          }`}
        >
          <div
            className={`profile-container ${
              sidebarCollapsed ? "flex-col" : ""
            }`}
          >
            <div className="avatar">
              {currentUser?.photoURL ? (
                <img
                  className="avatar-image"
                  src={currentUser.photoURL}
                  alt="Profile"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="avatar-fallback"
                style={{ display: currentUser?.photoURL ? "none" : "flex" }}
              >
                {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
            {!sidebarCollapsed && (
              <div className="profile-info">
                <p className="profile-name">{currentUser?.name || "Student"}</p>
                <div className="streak-container">
                  <FaFire className="streak-icon" />
                  <span className="streak-text">
                    {currentUser?.streak || studyStreak} day streak
                  </span>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-1">
                  <FaFire className="streak-icon" />
                  <span className="streak-number">{studyStreak}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-button ${
                  currentSection === item.id ? "nav-button-active" : ""
                } ${
                  sidebarCollapsed
                    ? "nav-button-collapsed"
                    : "nav-button-expanded"
                }`}
                onClick={() => onSectionChange(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="nav-icon" />
                {!sidebarCollapsed && (
                  <span className="nav-label">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button in Sidebar */}
        {!sidebarCollapsed && (
          <div className="sidebar-footer mt-auto p-4">
            <button
              className="btn btn-outline btn-red btn-full flex items-center justify-center"
              onClick={confirmLogout}
              disabled={isLoggingOut}
            >
              <FaSignOutAlt className="mr-2" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="main-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn md-hidden"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <FaBars className="mobile-menu-icon" />
            </button>
            <h2 className="section-title capitalize">{currentSection}</h2>
          </div>

          <div className="header-right">
            <button className="theme-toggle-btn" onClick={toggleDarkMode}>
              {isDarkMode ? (
                <FaSun className="theme-toggle-icon" />
              ) : (
                <FaMoon className="theme-toggle-icon" />
              )}
            </button>

            <div className="notifications-container">
              <button
                className="notifications-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <FaBell className="notifications-icon" />
                {notifications.length > 0 && (
                  <span className="notifications-badge">
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Notifications Panel */}
              {showNotifications && (
                <div className="notifications-panel">
                  <div className="notifications-header">
                    <h3 className="notifications-header-title">
                      Notifications
                    </h3>
                    <button
                      className="notifications-close"
                      onClick={() => setShowNotifications(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="notifications-list">
                    {notifications.length === 0 ? (
                      <p className="notification-empty">No new notifications</p>
                    ) : (
                      notifications.map((notification, index) => (
                        <div key={index} className="notification-item">
                          <p className="notification-title">
                            {notification.title}
                          </p>
                          <p className="notification-message">
                            {notification.message}
                          </p>
                          <p className="notification-time">
                            {notification.time}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout Button in Header */}
            <div className="header-logout">
              <button
                className="btn btn-outline btn-red btn-sm"
                onClick={confirmLogout}
                disabled={isLoggingOut}
                title="Logout"
              >
                {isLoggingOut ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FaSignOutAlt />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
}

export default StudyLayout;
