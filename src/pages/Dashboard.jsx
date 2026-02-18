// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import StudyLayout from "../components/StudyLayout";
import Flashcards from "../components/Flashcard";
import StudyCalendar from "../components/StudyCalendar";
import { Analytics } from "../components/Analytics";
import { Quiz } from "../components/Quiz";
import { Resources } from "../components/Resources";
import { Chatbot } from "../components/Chatbot";
import {
  userAPI,
  analyticsAPI,
  remindersAPI,
  recommendationsAPI,
  activityAPI,
  flashcardAPI,
  dashboardAPI,
} from "../services/apiClient.js";
import "../styles/dashboard.css";
import {
  FaBookOpen,
  FaCalendarAlt,
  FaBullseye,
  FaChartLine,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaYoutube,
  FaTrophy,
  FaExclamationTriangle,
  FaSync,
} from "react-icons/fa";

function Dashboard({ currentUser, initialSection = "dashboard" }) {
  const [currentSection, setCurrentSection] = useState(initialSection);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Real data states
  const [userProfile, setUserProfile] = useState(null);
  const [gamificationData, setGamificationData] = useState(null);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [flashcardStats, setFlashcardStats] = useState({
    totalCards: 0,
    studiedToday: 0,
    dueToday: 0,
  });
  const [studyStats, setStudyStats] = useState({
    weeklyGoal: 100,
    weeklyProgress: 0,
    studyStreak: 0,
    totalStudyHours: 0,
  });

  // Fallback recommendations when API fails
  const getFallbackRecommendations = () => [
    {
      id: 1,
      title: "React Tutorial for Beginners",
      url: "https://www.youtube.com/watch?v=Ke90Tje7VS0",
      reason: "Based on your web development interest",
    },
    {
      id: 2,
      title: "Python Full Course for Beginners",
      url: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
      reason: "Programming language fundamentals",
    },
    {
      id: 3,
      title: "Machine Learning Course for Beginners",
      url: "https://www.youtube.com/watch?v=NWONeJKn6kc",
      reason: "Advanced computer science topic",
    },
  ];

  // Check if backend is available
  const checkBackendAvailability = async () => {
    try {
      await userAPI.getProfile();
      return true;
    } catch (error) {
      console.log("Backend check failed:", error.message);
      return false;
    }
  };

  // Ensure user has subjects in profile
  const ensureUserHasSubjects = async () => {
    try {
      const profileResponse = await userAPI.getProfile();

      if (profileResponse.ok && profileResponse.profile) {
        const profile = profileResponse.profile;

        // Check if user has subjects
        const hasSubjects =
          profile.subject &&
          (Array.isArray(profile.subject)
            ? profile.subject.length > 0
            : String(profile.subject).trim().length > 0);

        if (!hasSubjects) {
          console.log("Adding default subjects to user profile...");

          // Update profile with default subjects
          const updateData = {
            subject: ["Computer Science", "Mathematics"],
          };

          // Add required fields if missing (use defaults)
          if (!profile.date_of_birth) updateData.date_of_birth = "2000-01-01";
          if (!profile.gender) updateData.gender = "other";
          if (!profile.phone_number) updateData.phone_number = "+1234567890";
          if (!profile.name)
            updateData.name = currentUser?.displayName || "Student";

          await userAPI.updateProfile(updateData);
          console.log("✅ User profile updated with subjects");
          return true;
        }

        console.log("✅ User has subjects:", profile.subject);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error ensuring user has subjects:", error);
      return false;
    }
  };

  const calculateStudiedToday = (cards) => {
    if (!cards || !Array.isArray(cards)) return 0;
    const today = new Date().toDateString();
    return cards.filter((card) => {
      if (!card.lastStudied) return false;
      return new Date(card.lastStudied).toDateString() === today;
    }).length;
  };

  // Calculate streak from local storage (same as StudyLayout)
  const calculateLocalStreak = useCallback(() => {
    if (!currentUser?.uid) return 0;

    try {
      const toLocalDateString = (date = new Date()) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };

      const studyDatesKey = `aceit_study_dates_${currentUser.uid}`;
      const studyDates =
        JSON.parse(localStorage.getItem(studyDatesKey)) || [];
      if (studyDates.length === 0) return 0;

      // Sort dates newest to oldest
      studyDates.sort((a, b) => new Date(b) - new Date(a));

      const today = toLocalDateString();
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
      console.error("Error calculating local streak:", error);
      return 0;
    }
  }, [currentUser]);

  // Sync streak from local storage and backend
  const syncStreak = useCallback(() => {
    if (!currentUser?.uid) return;

    const localStreak = calculateLocalStreak();
    const backendStreak = gamificationData?.streak || 0;
    const finalStreak = Math.max(localStreak, backendStreak);

    setStudyStats((prev) => ({
      ...prev,
      studyStreak: finalStreak,
    }));
  }, [currentUser, gamificationData, calculateLocalStreak]);

  const formatReminderDate = (dateString) => {
    if (!dateString) return "No due date";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Tomorrow";
      if (diffDays < 7) return `${diffDays} days`;

      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  const fetchDashboardData = async (silent = false) => {
    if (!currentUser?.uid) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      // Check backend availability
      const isBackendUp = await checkBackendAvailability();
      setBackendAvailable(isBackendUp);

      if (!isBackendUp && !silent) {
        console.log("Backend unavailable, using local data");
        // Use local data from localStorage
        const localFlashcards = localStorage.getItem("ace-it-flashcards");
        if (localFlashcards) {
          const cards = JSON.parse(localFlashcards);
          setFlashcardStats({
            totalCards: cards.length,
            studiedToday: calculateStudiedToday(cards),
            dueToday: 0,
          });
        }
        setLoading(false);
        return;
      }

      // Use dashboardAPI to get all data at once
      const dashboardData = await dashboardAPI.getDashboardData();

      // Handle profile
      if (dashboardData.profile?.ok) {
        setUserProfile(dashboardData.profile.profile);

        // Debug: Check user subjects
        console.log("User subjects:", dashboardData.profile.profile.subject);
      }

      // Handle gamification data
      if (dashboardData.gamification?.ok) {
        const gamification = dashboardData.gamification.gamification;
        setGamificationData(gamification);
        
        // Sync streak from both local storage and backend
        const localStreak = calculateLocalStreak();
        const backendStreak = gamification.streak || 0;
        const finalStreak = Math.max(localStreak, backendStreak);
        
        setStudyStats((prev) => ({
          ...prev,
          studyStreak: finalStreak,
          totalStudyHours:
            gamification.total_study_hours || prev.totalStudyHours,
        }));
      } else {
        // If backend unavailable, use local streak
        const localStreak = calculateLocalStreak();
        setStudyStats((prev) => ({
          ...prev,
          studyStreak: localStreak,
        }));
      }

      // Handle reminders/tasks
      if (dashboardData.reminders?.ok) {
        const reminders = dashboardData.reminders.reminders || [];
        const tasks = reminders.map((reminder) => ({
          id: reminder.id || `reminder-${Date.now()}`,
          title: reminder.title || "Study Task",
          type: reminder.type || "study",
          dueDate: formatReminderDate(reminder.due_date),
          priority: reminder.priority || "medium",
          rawReminder: reminder,
        }));
        setUpcomingTasks(tasks);

        // Convert to notifications
        const newNotifications = reminders
          .filter((r) => !r.completed)
          .slice(0, 3)
          .map((r) => ({
            id: `reminder-${r.id}`,
            title: "Study Reminder",
            message: r.title || "Complete your study task",
            time: "Today",
            type: "reminder",
            read: false,
          }));

        if (!silent) {
          setNotifications((prev) => [
            ...newNotifications,
            ...prev.slice(0, 5),
          ]);
        }
      }

      // Fetch recommendations - WITH PROPER ERROR HANDLING
      try {
        // Ensure user has subjects before fetching recommendations
        await ensureUserHasSubjects();

        const recommendationsResponse =
          await recommendationsAPI.getRecommendations();

        if (
          recommendationsResponse.ok &&
          recommendationsResponse.recommendations
        ) {
          setRecommendations(recommendationsResponse.recommendations);
        } else {
          console.warn(
            "Recommendations API returned unexpected format, using fallback"
          );
          setRecommendations(getFallbackRecommendations());
        }
      } catch (recError) {
        console.log("Recommendations endpoint failed, using fallback data");
        setRecommendations(getFallbackRecommendations());
      }

      // Fetch flashcard stats
      try {
        const flashcardAnalytics = await flashcardAPI.getFlashcardAnalytics();
        setFlashcardStats({
          totalCards: flashcardAnalytics.total_cards || 0,
          studiedToday: 0,
          dueToday: flashcardAnalytics.due_today || 0,
        });

        if (flashcardAnalytics.total_cards > 0) {
          const weeklyProgress = Math.min(
            ((flashcardAnalytics.mastered_cards || 0) /
              flashcardAnalytics.total_cards) *
              100,
            100
          );
          setStudyStats((prev) => ({
            ...prev,
            weeklyProgress: Math.round(weeklyProgress),
          }));
        }
      } catch (flashcardError) {
        console.log("Flashcard analytics not available");
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      if (!silent) {
        setError(
          "Failed to load dashboard data. Backend might be unavailable."
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Poll for updates every 2 minutes
    const updateInterval = setInterval(() => {
      fetchDashboardData(true);
    }, 120000);

    return () => {
      clearInterval(updateInterval);
    };
  }, [currentUser]);

  useEffect(() => {
    setCurrentSection(initialSection);
  }, [initialSection]);

  // Sync streak with local storage and listen for updates
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Sync streak on mount
    syncStreak();

    // Listen for study activity events (from flashcards, etc.)
    const handleStudyActivity = (event) => {
      if (event.detail && event.detail.type === "study") {
        // Sync streak when study activity occurs
        setTimeout(() => syncStreak(), 500);
      }
    };

    // Listen for storage changes (when flashcard updates streak)
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith("aceit_study_dates_")) {
        syncStreak();
      }
    };

    // Periodic sync every 30 seconds
    const syncInterval = setInterval(() => {
      syncStreak();
    }, 30000);

    window.addEventListener("studyActivity", handleStudyActivity);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("studyActivity", handleStudyActivity);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [currentUser, syncStreak]);

  const handleLogActivity = async (hours) => {
    try {
      const response = await activityAPI.logActivity(hours);

      if (response.ok && response.updated_metrics) {
        const metrics = response.updated_metrics;
        setStudyStats((prev) => ({
          ...prev,
          weeklyProgress: metrics.weekly_goal_progress || prev.weeklyProgress,
          totalStudyHours: prev.totalStudyHours + hours,
        }));
      }

      // Refresh gamification data
      const gamificationResponse = await analyticsAPI.getGamification(
        currentUser.uid
      );
      if (gamificationResponse.ok) {
        setGamificationData(gamificationResponse.gamification);
        setStudyStats((prev) => ({
          ...prev,
          studyStreak:
            gamificationResponse.gamification.streak || prev.studyStreak,
        }));
      }
    } catch (error) {
      console.error("Error logging activity:", error);
      // Update locally for better UX
      setStudyStats((prev) => ({
        ...prev,
        totalStudyHours: prev.totalStudyHours + hours,
        weeklyProgress: Math.min(prev.weeklyProgress + 10, 100),
      }));
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "badge-high";
      case "medium":
        return "badge-medium";
      case "low":
        return "badge-low";
      default:
        return "badge-low";
    }
  };

  const handleLogout = () => {
    console.log("Logout requested");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getFirstName = () => {
    const name =
      userProfile?.name ||
      currentUser?.displayName ||
      (currentUser?.email ? currentUser.email.split("@")[0] : "Student");
    const first = String(name).trim().split(" ")[0];
    return first || "Student";
  };

  // Render different content based on the current section
  const renderContent = () => {
    if (currentSection === "flashcards") {
      return <Flashcards />;
    }

    if (currentSection === "calendar") {
      return <StudyCalendar />;
    }

    if (currentSection === "analytics") {
      return <Analytics />;
    }

    if (currentSection === "quiz") {
      return <Quiz />;
    }

    if (currentSection === "resources") {
      return <Resources />;
    }

    if (currentSection === "chatbot") {
      return <Chatbot />;
    }

    // Default dashboard content
    return (
      <div className="dashboard-container space-y-6">
        {/* Hero */}
        <div className="dashboard-hero">
          <div className="dashboard-hero-left">
            <p className="dashboard-hero-kicker">
              {getGreeting()}, {getFirstName()}
            </p>
            <h1 className="dashboard-hero-title">Your learning dashboard</h1>
            <p className="dashboard-hero-subtitle">
              Track your progress, plan tasks, and pick your next session.
            </p>
          </div>

          <div className="dashboard-hero-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => fetchDashboardData()}
              disabled={loading}
              title="Refresh dashboard"
            >
              <FaSync className={`icon-sm mr-1 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCurrentSection("calendar")}
              title="Open calendar"
            >
              <FaCalendarAlt className="icon-sm mr-1" />
              Calendar
            </button>
          </div>
        </div>

        {/* Backend Status Warning */}
        {!backendAvailable && (
          <div className="warning-banner">
            <FaExclamationTriangle className="icon mr-2" />
            <span>Backend temporarily unavailable. Using local data.</span>
            <button
              onClick={() => fetchDashboardData()}
              className="btn btn-outline btn-sm"
            >
              <FaSync className="icon-sm mr-1" />
              Retry Connection
            </button>
          </div>
        )}

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading dashboard...</p>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button
              onClick={() => fetchDashboardData()}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="stats-grid gap-4">
          <div className="card card-blue">
            <div className="card-header">
              <div className="card-title">Flashcards</div>
              <FaBookOpen className="icon icon-blue" />
            </div>
            <div className="card-content-sm">
              <div className="stat-number stat-blue">
                {flashcardStats.totalCards}
              </div>
              <p className="text-xs text-muted">
                {flashcardStats.dueToday} due today
              </p>
            </div>
          </div>

          <div className="card card-green">
            <div className="card-header">
              <div className="card-title">Weekly Goal</div>
              <FaBullseye className="icon icon-green" />
            </div>
            <div className="card-content-sm">
              <div className="stat-number stat-green">
                {studyStats.weeklyProgress}%
              </div>
              <div className="progress-container mt-2">
                <div
                  className="progress-bar"
                  style={{ width: `${studyStats.weeklyProgress}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="card card-orange">
            <div className="card-header">
              <div className="card-title">Study Streak</div>
              <FaChartLine className="icon icon-orange" />
            </div>
            <div className="card-content-sm">
              <div className="stat-number stat-orange">
                {studyStats.studyStreak}
              </div>
              <p className="text-xs text-muted">days in a row</p>
            </div>
          </div>

          <div className="card card-purple">
            <div className="card-header">
              <div className="card-title">Upcoming Tasks</div>
              <FaClock className="icon icon-purple" />
            </div>
            <div className="card-content-sm">
              <div className="stat-number stat-purple">
                {upcomingTasks.length}
              </div>
              <p className="text-xs text-muted">due soon</p>
            </div>
          </div>
        </div>

        <div className="main-grid gap-6">
          {/* Upcoming Tasks */}
          <div className="card">
            <div className="card-header">
              <div className="card-title flex items-center">
                <FaExclamationCircle className="icon mr-2" />
                Upcoming Tasks
              </div>
            </div>
            <div className="card-content space-y-4">
              {upcomingTasks.length === 0 ? (
                <p className="text-muted text-center py-4">No upcoming tasks</p>
              ) : (
                upcomingTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="task-item">
                    <div className="task-content">
                      <h4 className="task-title">{task.title}</h4>
                      <p className="task-date text-muted">{task.dueDate}</p>
                    </div>
                    <span className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
              <button
                className="btn btn-outline btn-full"
                onClick={() => setCurrentSection("calendar")}
              >
                <FaCalendarAlt className="icon mr-2" />
                View All Tasks
              </button>
            </div>
          </div>

          {/* Recommendations - FIXED */}
          <div className="card">
            <div className="card-header">
              <div className="card-title flex items-center">
                <FaYoutube className="icon mr-2" />
                Recommended Videos
              </div>
            </div>
            <div className="card-content space-y-4">
              {recommendations.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-2">
                    {backendAvailable
                      ? "No recommendations available"
                      : "Backend unavailable"}
                  </p>
                  <button
                    onClick={() => fetchDashboardData()}
                    className="btn btn-outline btn-sm"
                  >
                    <FaSync className="icon-sm mr-1" />
                    Refresh
                  </button>
                </div>
              ) : (
                <>
                  {recommendations.slice(0, 3).map((video, index) => (
                    <div key={video.id || index} className="activity-item">
                      <div className="activity-content">
                        <p className="activity-title">{video.title}</p>
                        <p className="activity-time text-muted">
                          {video.reason}
                        </p>
                      </div>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                      >
                        Watch
                      </a>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Gamification Badges */}
        {gamificationData?.badges && gamificationData.badges.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title flex items-center">
                <FaTrophy className="icon mr-2" />
                Your Badges
              </div>
            </div>
            <div className="card-content">
              <div className="flex flex-wrap gap-2">
                {gamificationData.badges.map((badge, index) => (
                  <div key={index} className="badge badge-secondary">
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Study Stats */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Study Statistics</div>
          </div>
          <div className="card-content">
            <div className="dashboard-metrics">
              <div className="dashboard-metric">
                <div className="dashboard-metric-value">
                  {Number(studyStats.totalStudyHours || 0).toFixed(1)}
                </div>
                <p className="dashboard-metric-label text-muted">
                  Total study hours
                </p>
              </div>
              <div className="dashboard-metric">
                <div className="dashboard-metric-value">
                  {studyStats.weeklyGoal}
                </div>
                <p className="dashboard-metric-label text-muted">
                  Weekly goal (hours)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Quick Actions</div>
          </div>
          <div className="card-content">
            <div className="quick-actions-grid gap-4">
              <button
                className="btn btn-blue btn-icon"
                onClick={() => setCurrentSection("flashcards")}
              >
                <FaBookOpen className="icon-lg mb-2" />
                Create Flashcards
              </button>
              <button
                className="btn btn-outline btn-outline-green btn-icon"
                onClick={() => setCurrentSection("calendar")}
              >
                <FaCalendarAlt className="icon-lg mb-2" />
                Schedule Study
              </button>
              <button
                className="btn btn-outline btn-outline-purple btn-icon"
                onClick={() => handleLogActivity(1.5)}
              >
                <FaBullseye className="icon-lg mb-2" />
                Log 1.5h Study
              </button>
              <button
                className="btn btn-outline btn-outline-orange btn-icon"
                onClick={() => fetchDashboardData()}
                disabled={loading}
              >
                <FaSync
                  className={`icon-lg mb-2 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <StudyLayout
      currentSection={currentSection}
      onSectionChange={(s) => setCurrentSection(s)}
      notifications={notifications}
      setNotifications={setNotifications}
      showNotifications={showNotifications}
      setShowNotifications={setShowNotifications}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {renderContent()}
    </StudyLayout>
  );
}

export default Dashboard;
