import React, { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "../assets/js/firebase.js";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  dashboardAPI,
  analyticsAPI,
  remindersAPI,
} from "../services/apiClient.js";
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
  FaCheckCircle,
  FaExclamationTriangle,
  FaUserGraduate,
  FaClock,
  FaClipboardCheck,
} from "react-icons/fa";

export function StudyLayout({
  children,
  currentSection,
  onSectionChange,
  notifications,
  setNotifications,
  currentUser,
  onLogout,
}) {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutProgress, setLogoutProgress] = useState(0);
  const [streakAnimating, setStreakAnimating] = useState(false);
  const streakTimerRef = useRef(null);
  const [streakPopupVisible, setStreakPopupVisible] = useState(false);
  const [streakPopupMessage, setStreakPopupMessage] = useState("");
  const streakPopupTimerRef = useRef(null);

  // ── Inactivity auto-logout ────────────────────────────────────────────────
  const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
  const WARNING_BEFORE   =  2 * 60 * 1000; // warn 2 minutes before
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [inactivityCountdown, setInactivityCountdown] = useState(120);
  const inactivityTimerRef   = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Profile picture — stored in localStorage by Settings page
  const [profilePicture, setProfilePicture] = useState(
    () => localStorage.getItem("aceit_profile_picture") || null
  );

  useEffect(() => {
    const handler = () =>
      setProfilePicture(localStorage.getItem("aceit_profile_picture") || null);
    window.addEventListener("profilePictureUpdated", handler);
    return () => window.removeEventListener("profilePictureUpdated", handler);
  }, []);

  // Real-time data states
  const [userProfile, setUserProfile] = useState(null);
  const [gamificationData, setGamificationData] = useState(null);
  const [userStreak, setUserStreak] = useState(0);
  const [studyMetrics, setStudyMetrics] = useState({
    totalStudyHours: 0,
    weeklyGoal: 100,
    weeklyProgress: 0,
    attendancePercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // ==================== STREAK LOGIC FUNCTIONS ====================

  // Local YYYY-MM-DD (avoids UTC toISOString() timezone streak bugs)
  const toLocalDateString = useCallback((date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // Get today's date in YYYY-MM-DD format (LOCAL)
  const getTodayDateString = useCallback(() => {
    return toLocalDateString(new Date());
  }, [toLocalDateString]);

  // Get yesterday's date (LOCAL)
  const getYesterdayDateString = useCallback(() => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return toLocalDateString(yesterday);
  }, [toLocalDateString]);

  // Check if user studied on a specific date
  const didStudyOnDate = useCallback(
    (dateString) => {
      if (!currentUser?.uid) return false;

      const studyDates =
        JSON.parse(
          localStorage.getItem(`aceit_study_dates_${currentUser.uid}`)
        ) || [];
      return studyDates.includes(dateString);
    },
    [currentUser]
  );

  // Record that user studied today
  const recordStudyToday = useCallback(() => {
    if (!currentUser?.uid) return false;

    try {
      const today = getTodayDateString();
      const studyDates =
        JSON.parse(
          localStorage.getItem(`aceit_study_dates_${currentUser.uid}`)
        ) || [];

      if (!studyDates.includes(today)) {
        studyDates.push(today);
        localStorage.setItem(
          `aceit_study_dates_${currentUser.uid}`,
          JSON.stringify(studyDates)
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error recording study:", error);
      return false;
    }
  }, [currentUser, getTodayDateString]);

  // Calculate current streak based on study dates
  const calculateCurrentStreak = useCallback(() => {
    if (!currentUser?.uid) return 0;

    try {
      const studyDates =
        JSON.parse(
          localStorage.getItem(`aceit_study_dates_${currentUser.uid}`)
        ) || [];
      if (studyDates.length === 0) return 0;

      // Sort dates newest to oldest
      studyDates.sort((a, b) => new Date(b) - new Date(a));

      const today = getTodayDateString();
      let currentStreak = 0;
      let expectedDate = today;

      for (let i = 0; i < studyDates.length; i++) {
        const studyDate = studyDates[i];

        if (studyDate === expectedDate) {
          currentStreak++;
          const [yy, mm, dd] = expectedDate.split("-").map((v) => Number(v));
          const prev = new Date(yy, (mm || 1) - 1, (dd || 1) - 1);
          expectedDate = toLocalDateString(prev);
        } else if (studyDate < expectedDate) {
          break;
        }
      }

      return currentStreak;
    } catch (error) {
      console.error("Error calculating streak:", error);
      return 0;
    }
  }, [currentUser, getTodayDateString]);

  // Update streak when user completes a study activity
  const updateStreakForStudyActivity = useCallback(
    async (duration = 0) => {
      if (!currentUser?.uid) return false;

      try {
        const recorded = recordStudyToday();
        const newStreak = calculateCurrentStreak();
        if (newStreak !== userStreak) {
          setUserStreak(newStreak);
        }

        if (streakTimerRef.current) {
          clearTimeout(streakTimerRef.current);
        }
        setStreakAnimating(true);
        streakTimerRef.current = setTimeout(() => {
          setStreakAnimating(false);
        }, 1200);

        if (recorded) {
          if (streakPopupTimerRef.current) {
            clearTimeout(streakPopupTimerRef.current);
          }
          const popupMessage =
            newStreak === 1
              ? "Streak started! Keep it going tomorrow."
              : `Streak locked in! ${newStreak} days strong.`;
          setStreakPopupMessage(popupMessage);
          setStreakPopupVisible(true);
          streakPopupTimerRef.current = setTimeout(() => {
            setStreakPopupVisible(false);
          }, 2200);
        }

        try {
          // Prepare complete gamification data to prevent backend 500 errors
          // The backend likely expects the full object, not just partial updates
          const currentLevel = gamificationData?.level || 1;
          const currentBadges = gamificationData?.badges || [];
          if (recorded) {
            await analyticsAPI.updateGamification(currentUser.uid, {
              level: currentLevel,
              badges: currentBadges,
              streak: newStreak,
              longest_streak: Math.max(
                gamificationData?.longest_streak || 0,
                newStreak
              ),
            });
          }
        } catch (backendError) {
          console.log("Backend streak update failed", backendError);
        }

        if (duration > 0) {
          setStudyMetrics((prev) => ({
            ...prev,
            totalStudyHours: prev.totalStudyHours + duration,
          }));
        }

        if (setNotifications && newStreak > 0 && recorded) {
          let streakMessage = "";

          if (newStreak === 1) {
            streakMessage =
              "🎉 You started a study streak! Come back tomorrow to continue it!";
          } else if (newStreak % 5 === 0) {
            streakMessage = `🔥 Amazing! You're on a ${newStreak}-day streak!`;
          } else if (newStreak > 1) {
            streakMessage = `Great job! ${newStreak} day streak and counting!`;
          }

          if (streakMessage) {
            const streakNotification = {
              id: `streak-${Date.now()}`,
              title: "Streak Updated!",
              message: streakMessage,
              time: "Just now",
              type: "achievement",
              read: false,
            };

            setNotifications((prev) => [
              streakNotification,
              ...prev.slice(0, 9),
            ]);
          }
        }

        return true;
      } catch (error) {
        console.error("Error updating streak:", error);
        return false;
      }
    },
    [
      currentUser,
      gamificationData,
      setNotifications,
      recordStudyToday,
      calculateCurrentStreak,
      userStreak,
    ]
  );

  useEffect(() => {
    return () => {
      if (streakTimerRef.current) {
        clearTimeout(streakTimerRef.current);
      }
      if (streakPopupTimerRef.current) {
        clearTimeout(streakPopupTimerRef.current);
      }
    };
  }, []);

  // Sync streak when study dates change in other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (!currentUser?.uid) return;
      const key = event.key || "";
      if (key.startsWith(`aceit_study_dates_${currentUser.uid}`)) {
        const newStreak = calculateCurrentStreak();
        if (newStreak !== userStreak) {
          setUserStreak(newStreak);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [currentUser, calculateCurrentStreak, userStreak]);

  // Check and maintain streak
  const checkAndMaintainStreak = useCallback(() => {
    if (!currentUser?.uid) return;

    const currentStreak = calculateCurrentStreak();
    if (currentStreak !== userStreak) {
      setUserStreak(currentStreak);
    }
  }, [currentUser, userStreak, calculateCurrentStreak]);

  // ==================== END STREAK LOGIC ====================

  // Listen for study activity from child components
  useEffect(() => {
    const handleStudyActivity = (event) => {
      if (event.detail && event.detail.type === "study") {
        updateStreakForStudyActivity(event.detail.duration || 0.5);
      }
    };

    window.addEventListener("studyActivity", handleStudyActivity);
    return () =>
      window.removeEventListener("studyActivity", handleStudyActivity);
  }, [updateStreakForStudyActivity]);

  // Fetch initial data
  useEffect(() => {
    if (currentUser?.uid) {
      fetchSidebarData();

      // Check streak every 5 minutes
      const streakInterval = setInterval(() => {
        checkAndMaintainStreak();
      }, 300000);

      // Set up other data updates
      const interval = setInterval(() => {
        fetchGamificationData();
        fetchReminders();
      }, 30000);

      return () => {
        clearInterval(streakInterval);
        clearInterval(interval);
      };
    }
  }, [currentUser, checkAndMaintainStreak]);

  // Update unread notifications count
  useEffect(() => {
    const unreadCount = notifications.filter((n) => !n.read).length;
    setUnreadNotifications(unreadCount);
  }, [notifications]);

  const fetchSidebarData = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);

      const profileResponse = await dashboardAPI.getDashboardData();
      if (profileResponse.profile?.ok) {
        setUserProfile(profileResponse.profile.profile);
      }

      await fetchGamificationData();

      await fetchReminders(true); // first load — show Welcome notification once

      try {
        // getUserMetrics endpoint does not exist — skipping this call.
        // Study metrics are sourced from /profile and /log_activity responses.
        if (false) {
          setStudyMetrics({
            totalStudyHours: 0,
            weeklyGoal: 100,
            weeklyProgress: 0,
            attendancePercentage: 0,
          });
        }
      } catch (error) {
        console.log("Metrics endpoint not available, using default values");
      }

      // Calculate and sync local streak after loading data
      const localStreak = calculateCurrentStreak();
      const finalStreak = Math.max(localStreak, userStreak);
      if (finalStreak > userStreak) {
        setUserStreak(finalStreak);
      }
    } catch (error) {
      console.error("Error fetching sidebar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGamificationData = async () => {
    try {
      const response = await analyticsAPI.getGamification(currentUser.uid);
      if (response.ok) {
        setGamificationData(response.gamification);
        const backendStreak = response.gamification.streak || 0;

        // Use the higher of backend or local streak
        const localStreak = calculateCurrentStreak();
        const finalStreak = Math.max(backendStreak, localStreak);
        setUserStreak(finalStreak);
      }
    } catch (error) {
      console.error("Error fetching gamification data:", error);
    }
  };

  const fetchReminders = async (isFirstLoad = false) => {
    try {
      const response = await remindersAPI.getReminders();
      if (response.ok) {
        // Build fresh reminder notifications from the backend response.
        const incomingReminders = response.reminders
          .filter((r) => !r.completed)
          .map((r) => ({
            id: `reminder-${r.id}`,
            title: "Study Reminder",
            message: r.title || "Complete your study task",
            time: formatReminderTime(r.due_date),
            type: "reminder",
            read: false,
            data: r,
          }));

        if (setNotifications) {
          setNotifications((prev) => {
            // Keep all non-reminder notifications (streaks, achievements, welcome)
            // exactly as they are — including their read state.
            const nonReminders = prev.filter(
              (n) => !n.id.startsWith("reminder-")
            );

            // For reminder notifications, preserve the read state the user already
            // set so that re-polling doesn't flip them back to unread.
            const prevReminderReadState = new Map(
              prev
                .filter((n) => n.id.startsWith("reminder-"))
                .map((n) => [n.id, n.read])
            );
            const mergedReminders = incomingReminders.map((n) => ({
              ...n,
              read: prevReminderReadState.get(n.id) ?? false,
            }));

            // Welcome notification — add only once on first load.
            const alreadyHasWelcome = prev.some((n) =>
              n.id.startsWith("system-welcome")
            );
            const welcomeNotif =
              isFirstLoad && !alreadyHasWelcome
                ? [
                    {
                      id: "system-welcome",
                      title: "Welcome to AceIt! 👋",
                      message: "Your smart learning journey starts now.",
                      time: "Just now",
                      type: "welcome",
                      read: false,
                    },
                  ]
                : [];

            return [...welcomeNotif, ...mergedReminders, ...nonReminders];
          });
        }
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  };

  const formatReminderTime = (dueDate) => {
    if (!dueDate) return "Soon";

    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = Math.floor((due - now) / (1000 * 60 * 60));

    if (diffHours <= 0) return "Overdue";
    if (diffHours < 24) return `In ${diffHours} hours`;
    if (diffHours < 48) return "Tomorrow";

    const diffDays = Math.floor(diffHours / 24);
    return `In ${diffDays} days`;
  };

  const handleMarkAsRead = (notificationId) => {
    // Only dismiss the notification visually — do NOT complete the underlying
    // reminder on the backend. Completing a reminder is a separate, explicit
    // action the user must take (e.g. from the Calendar / task list).
    if (setNotifications) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    }
  };

  const handleClearNotifications = async () => {
    try {
      if (setNotifications) {
        setNotifications([]);
      }

      await dashboardAPI.clearNotifications();

      setShowNotifications(false);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(false);
    setLogoutProgress(0);
  };

  // ── Inactivity timer helpers ──────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    setInactivityCountdown(120);
    setShowInactivityWarning(true);
    clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      setInactivityCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimerRef.current);
    clearInterval(countdownIntervalRef.current);
    setShowInactivityWarning(false);
    setInactivityCountdown(120);

    inactivityTimerRef.current = setTimeout(() => {
      startCountdown();
    }, INACTIVITY_LIMIT - WARNING_BEFORE);
  }, [startCountdown, INACTIVITY_LIMIT, WARNING_BEFORE]);

  // Auto-logout when countdown hits 0
  useEffect(() => {
    if (inactivityCountdown === 0 && showInactivityWarning) {
      setShowInactivityWarning(false);
      handleLogout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inactivityCountdown, showInactivityWarning]);

  // Set up activity listeners + visibility handling
  useEffect(() => {
    const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

    const onActivity = () => {
      if (!showInactivityWarning) resetInactivityTimer();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetInactivityTimer();
      } else {
        // Pause the warning/timer when tab is hidden
        clearTimeout(inactivityTimerRef.current);
        clearInterval(countdownIntervalRef.current);
      }
    };

    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisibilityChange);
    resetInactivityTimer();

    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(inactivityTimerRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactivityWarning]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutProgress(0);

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
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await signOut(auth);

      [
        "aceit_current_user",
        "aceit_auth_token",
        "firebase_token",
        "userData",
        "ace-it-flashcards",
        "ace-it-review-data",
        "ace-it-resources",
        "ace-it-resource-subjects",
        "ace-it-library-subject-map",
        "ace-summary-titles",
        "quiz_history",
        "aceit_settings",
        "aceit_profile_picture",
        "ace-it-voice-enabled",
        "ace-it-chat-sessions",
      ].forEach((key) => localStorage.removeItem(key));

      setUserProfile(null);
      setGamificationData(null);
      setUserStreak(0);
      setStudyMetrics({
        totalStudyHours: 0,
        weeklyGoal: 100,
        weeklyProgress: 0,
        attendancePercentage: 0,
      });

      if (onLogout) {
        onLogout();
      }

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
      id: "quiz",
      label: "Quiz",
      icon: FaClipboardCheck,
      path: "/quiz",
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

  const getUserDisplayName = () => {
    if (userProfile?.name) return userProfile.name;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split("@")[0];
    return "Student";
  };

  const getUserInitial = () => {
    const name = getUserDisplayName();
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="study-layout">
      {/* Inactivity Warning Modal */}
      {showInactivityWarning && (
        <div className="inactivity-overlay">
          <div className="inactivity-modal">
            <div className="inactivity-icon">
              <FaClock />
            </div>
            <h3 className="inactivity-title">Still there?</h3>
            <p className="inactivity-body">
              You've been inactive for a while. You'll be logged out in
            </p>
            <div className="inactivity-countdown">
              {Math.floor(inactivityCountdown / 60)}:
              {String(inactivityCountdown % 60).padStart(2, "0")}
            </div>
            <div className="inactivity-actions">
              <button
                className="inactivity-btn-stay"
                onClick={resetInactivityTimer}
              >
                Stay logged in
              </button>
              <button
                className="inactivity-btn-logout"
                onClick={() => { setShowInactivityWarning(false); confirmLogout(); }}
              >
                Log out now
              </button>
            </div>
          </div>
        </div>
      )}

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
          className="mobile-overlay"
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
              {/* Prefer locally-uploaded picture → Firebase photoURL → initials */}
              {(profilePicture || currentUser?.photoURL) ? (
                <img
                  className="avatar-image"
                  src={profilePicture || currentUser.photoURL}
                  alt="Profile"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextElementSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="avatar-fallback"
                style={{
                  display: (profilePicture || currentUser?.photoURL) ? "none" : "flex",
                }}
              >
                {getUserInitial()}
              </div>
            </div>
            {!sidebarCollapsed && (
              <div className="profile-info">
                <p className="profile-name">{getUserDisplayName()}</p>
                <div className="streak-container">
                  <FaFire
                    className={`sidebar-streak-icon ${
                      streakAnimating ? "streak-flame" : ""
                    }`}
                  />
                  <span className="streak-text">
                    {userStreak || 0} day streak
                  </span>
                </div>
                
                {studyMetrics.totalStudyHours > 0 && (
                  <div className="streak-container mt-1">
                    <FaClock className="sidebar-streak-icon" />
                    <span className="streak-text">
                      {studyMetrics.totalStudyHours.toFixed(1)} study hours
                    </span>
                  </div>
                )}
              </div>
            )}
            {sidebarCollapsed && (
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-1">
                  <FaFire
                    className={`sidebar-streak-icon ${
                      streakAnimating ? "streak-flame" : ""
                    }`}
                  />
                  <span className="streak-number">{userStreak || 0}</span>
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
                onClick={() => {
                  onSectionChange(item.id);
                  setSidebarCollapsed(true);
                }}
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

        {/* Badges Section (Visible when sidebar is expanded) */}
        {!sidebarCollapsed &&
          gamificationData?.badges &&
          gamificationData.badges.length > 0 && (
            <div className="sidebar-badges p-4 border-t border-sidebar-border">
              <h4 className="text-xs font-medium text-text-secondary mb-2">
                Your Badges
              </h4>
              <div className="flex flex-wrap gap-1">
                {gamificationData.badges.slice(0, 3).map((badge, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary"
                    title={badge}
                  >
                    {badge}
                  </span>
                ))}
                {gamificationData.badges.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                    +{gamificationData.badges.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

        {/* Logout Button in Sidebar */}
        {!sidebarCollapsed && (
          <div className="sidebar-footer mt-auto p-4">
            <button
              className="btn btn-outline btn-red btn-full flex items-center justify-center"
              onClick={confirmLogout}
              disabled={isLoggingOut || loading}
            >
              <FaSignOutAlt className="mr-2" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {streakPopupVisible && (
          <div className="streak-popup">
            <div className="streak-popup-content">
              <FaFire className="streak-popup-icon" />
              <div className="streak-popup-text">
                <div className="streak-popup-title">Streak Complete!</div>
                <div className="streak-popup-message">
                  {streakPopupMessage}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <header className="main-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn mobile-only"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <FaBars className="mobile-menu-icon" />
            </button>
            <h2 className="section-title capitalize">{currentSection}</h2>
          </div>

          <div className="header-right">
            {/* Study Stats (Visible on desktop) */}
            {!sidebarCollapsed && (
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm">
                  <FaClock className="w-3 h-3 text-text-tertiary" />
                  <span className="text-text-secondary">
                    {studyMetrics.weeklyProgress}% weekly goal
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <FaUserGraduate className="w-3 h-3 text-text-tertiary" />
                  <span className="text-text-secondary">
                    {studyMetrics.attendancePercentage}% attendance
                  </span>
                </div>
              </div>
            )}

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
                {unreadNotifications > 0 && (
                  <span className="notifications-badge">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {/* Notifications Panel */}
              {showNotifications && (
                <div className="notifications-panel">
                  <div className="notifications-header">
                    <h3 className="notifications-header-title">
                      Notifications ({unreadNotifications} unread)
                    </h3>
                    <div className="flex space-x-2">
                      {unreadNotifications > 0 && (
                        <button
                          className="notifications-clear text-xs px-3 py-1 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          onClick={handleClearNotifications}
                          title="Clear all"
                        >
                          Clear All
                        </button>
                      )}
                      <button
                        className="notifications-close flex items-center justify-center w-8 h-8"
                        onClick={() => setShowNotifications(false)}
                        aria-label="Close notifications"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="notifications-list">
                    {notifications.length === 0 ? (
                      <p className="notification-empty">No new notifications</p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`notification-item ${
                            notification.read ? "read" : ""
                          }`}
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-2">
                            <div className="mt-1">
                              {notification.type === "reminder" ? (
                                <FaExclamationTriangle className="w-3 h-3 text-orange-500" />
                              ) : notification.type === "achievement" ? (
                                <FaCheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <FaBell className="w-3 h-3 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="notification-title">
                                {notification.title}
                                {!notification.read && (
                                  <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                                )}
                              </p>
                              <p className="notification-message">
                                {notification.message}
                              </p>
                              <p className="notification-time">
                                {notification.time}
                              </p>
                            </div>
                          </div>
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
        <main className={`content-area ${currentSection === "chatbot" ? "chatbot-mode" : ""}`}>
          {loading && currentSection === "dashboard" ? (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>Loading your data...</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

export default StudyLayout;
