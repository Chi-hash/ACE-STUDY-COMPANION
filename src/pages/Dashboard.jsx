// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import StudyLayout from "../components/StudyLayout";
import GlobalToastHost from "../components/GlobalToastHost";
import Flashcards from "../components/Flashcard";
import StudyCalendar from "../components/StudyCalendar";
import { Analytics } from "../components/Analytics";
import { Quiz } from "../components/Quiz";
import { Resources } from "../components/Resources";
import { Chatbot } from "../components/Chatbot";
import { Settings } from "../components/Settings";
import {
  analyticsAPI,
  remindersAPI,
  recommendationsAPI,
  activityAPI,
  flashcardAPI,
  dashboardAPI,
} from "../services/apiClient.js";
import "../styles/dashboard.css";
import { showAppToast } from "../utils/toastBus.js";
import {
  readWeeklyGoalHoursFromStorage,
  computeWeeklyProgressPercent,
  ACEIT_SETTINGS_KEY,
} from "../utils/studySettings.js";
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
  FaRobot,
  FaPaperPlane,
  FaBolt,
  FaMedal,
  FaChartBar,
} from "react-icons/fa";

const DAILY_TIPS = [
  "Spaced repetition is the most effective long-term memorization technique.",
  "Take a 5-minute break every 25 minutes to stay sharp — try the Pomodoro method.",
  "Teaching a concept to someone else is the fastest way to master it.",
  "Sleeping after studying helps consolidate memories significantly.",
  "Active recall beats re-reading every time — use your flashcards!",
  "Start with the hardest topic when your focus is at its peak.",
  "Consistent short sessions beat infrequent long ones for retention.",
];

const LOADING_QUOTES = [
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
  { quote: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { quote: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { quote: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { quote: "The beautiful thing about learning is nobody can take it away from you.", author: "B.B. King" },
  { quote: "Don't watch the clock; do what it does — keep going.", author: "Sam Levenson" },
  { quote: "Genius is 1% inspiration and 99% perspiration.", author: "Thomas Edison" },
  { quote: "It does not matter how slowly you go, as long as you do not stop.", author: "Confucius" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
];

const getTodaysTip = () => {
  const dayIndex = new Date().getDay();
  return DAILY_TIPS[dayIndex % DAILY_TIPS.length];
};

function Dashboard({ currentUser, initialSection = "dashboard" }) {
  const [quickAskQuery, setQuickAskQuery] = useState("");
  const [quickAskLoading, setQuickAskLoading] = useState(false);
  const [currentSection, setCurrentSection] = useState(initialSection);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [selectedResourceIds, setSelectedResourceIds] = useState([]);

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
  const [studyStats, setStudyStats] = useState(() => ({
    weeklyGoal: readWeeklyGoalHoursFromStorage(),
    weeklyProgress: 0,
    studyStreak: 0,
    totalStudyHours: 0,
  }));

  const [performancePrediction, setPerformancePrediction] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [logHours, setLogHours] = useState("");

  // Loading quote rotation
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * LOADING_QUOTES.length)
  );
  const [quoteFading, setQuoteFading] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("aceit_login_flash");
      if (!raw) return;
      sessionStorage.removeItem("aceit_login_flash");
      const data = JSON.parse(raw);
      if (data?.message) {
        showAppToast(
          data.type === "error" ? "error" : "success",
          data.message,
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  const upcomingTasksFiltered = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return upcomingTasks.filter((task) => {
      if (!task?.dueAt) return true;
      const dueTime = new Date(task.dueAt).getTime();
      if (Number.isNaN(dueTime)) return true;
      return dueTime >= startOfToday.getTime();
    });
  }, [upcomingTasks]);

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

  const ensureUserHasSubjects = (profile) => {
    if (!profile) return false;
    const subjects = profile.subject;
    return Array.isArray(subjects)
      ? subjects.length > 0
      : String(subjects || "").trim().length > 0;
  };

  const calculateStudiedToday = (cards) => {
    if (!cards || !Array.isArray(cards)) return 0;
    const today = new Date().toDateString();
    return cards.filter((card) => {
      if (!card.lastStudied) return false;
      return new Date(card.lastStudied).toDateString() === today;
    }).length;
  };

  const calculateWeeklyProgress = useCallback(
    (weeklyHours) =>
      computeWeeklyProgressPercent(weeklyHours, studyStats.weeklyGoal),
    [studyStats.weeklyGoal]
  );

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
      const rawStudyDates =
        JSON.parse(localStorage.getItem(studyDatesKey)) || [];
      const studyDates = Array.from(
        new Set(rawStudyDates.filter((d) => typeof d === "string"))
      );
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
      if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
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

  const loadLocalCalendarTasks = useCallback(() => {
    if (!currentUser?.uid) return [];
    try {
      const stored = localStorage.getItem(
        `aceit_calendar_events_${currentUser.uid}`
      );
      if (!stored) return [];
      const parsed = JSON.parse(stored).map((ev) => ({
        ...ev,
        date: ev?.date ? new Date(ev.date) : null,
      }));

      return parsed.map((event, index) => ({
        id:
          event.id ||
          `local-${event.title || "task"}-${event.date?.getTime() || index}`,
        title: event.title || "Study Task",
        type: event.type || "study",
        dueDate: formatReminderDate(event.date),
        dueAt: event.date ? new Date(event.date) : null,
        priority: event.priority || "medium",
        rawReminder: event,
        isLocal: true,
      }));
    } catch (error) {
      console.error("Error loading local calendar events:", error);
      return [];
    }
  }, [currentUser, formatReminderDate]);

  const dedupeTasks = (tasks) => {
    const seen = new Set();
    return tasks.filter((task) => {
      const key = [
        task.id,
        task.title,
        task.type,
        task.dueAt ? new Date(task.dueAt).getTime() : "none",
        task.isLocal ? "local" : "remote",
      ].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchDashboardData = async (silent = false) => {
    if (!currentUser?.uid) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      let dashboardData = null;
      try {
        // Use dashboardAPI to get all data at once
        dashboardData = await dashboardAPI.getDashboardData();
        setBackendAvailable(true);
      } catch (backendError) {
        console.log("Backend unavailable, using local data");
        setBackendAvailable(false);
        setStudyStats((prev) => ({
          ...prev,
          weeklyGoal: readWeeklyGoalHoursFromStorage(),
        }));
        if (!silent) {
          const localFlashcards = localStorage.getItem("ace-it-flashcards");
          if (localFlashcards) {
            const cards = JSON.parse(localFlashcards);
            setFlashcardStats({
              totalCards: cards.length,
              studiedToday: calculateStudiedToday(cards),
              dueToday: 0,
            });
          }
          const localTasks = loadLocalCalendarTasks();
          setUpcomingTasks(localTasks);
        }
        return;
      }

      // Handle profile
      if (dashboardData.profile?.ok) {
        const profile = dashboardData.profile.profile;
        setUserProfile(profile);

        // Debug: Check user subjects
        console.log("User subjects:", profile.subject);

        const weeklyGoalHours = readWeeklyGoalHoursFromStorage();
        setStudyStats((prev) => {
          const next = { ...prev, weeklyGoal: weeklyGoalHours };
          if (profile?.study_hours_per_week != null) {
            next.weeklyProgress = computeWeeklyProgressPercent(
              profile.study_hours_per_week,
              weeklyGoalHours
            );
          }
          return next;
        });
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

      // Fetch performance prediction (non-blocking, silently fails on 500)
      setPredictionLoading(true);
      try {
        const predictionRes = await analyticsAPI.getPerformancePrediction();
        if (predictionRes?.ok) {
          setPerformancePrediction(predictionRes);
        }
      } catch {
        // Backend returns 500 — silently ignore, card shows "unavailable"
      } finally {
        setPredictionLoading(false);
      }

      // Handle reminders/tasks
      const localTasks = loadLocalCalendarTasks();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      if (dashboardData.reminders?.ok) {
        const reminders = dashboardData.reminders.reminders || [];
        const tasks = reminders.map((reminder) => {
          const dueAt = reminder.due_date ? new Date(reminder.due_date) : null;
          return {
          id: reminder.id || `reminder-${Date.now()}`,
          title: reminder.title || "Study Task",
          type: reminder.type || "study",
          dueDate: formatReminderDate(reminder.due_date),
          dueAt,
          priority: reminder.priority || "medium",
          rawReminder: reminder,
        };
        });

        const merged = dedupeTasks([...localTasks, ...tasks])
          .filter((task) => !task.dueAt || task.dueAt >= startOfToday)
          .sort((a, b) => {
          const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return aTime - bTime;
        });
        setUpcomingTasks(merged);

        // Notifications are managed exclusively by StudyLayout's fetchReminders()
        // to avoid duplicates. Dashboard only updates the task list here.

      } else if (localTasks.length) {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const filteredLocal = dedupeTasks(localTasks).filter(
          (task) => !task.dueAt || task.dueAt >= startOfToday
        );
        setUpcomingTasks(filteredLocal);
      }

      // Fetch recommendations - WITH PROPER ERROR HANDLING
      try {
        const hasSubjects = ensureUserHasSubjects(
          dashboardData.profile?.profile
        );
        if (!hasSubjects) {
          setRecommendations(getFallbackRecommendations());
        } else {
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

  // Lock scroll + rotate quotes while loading
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = "hidden";

      const interval = setInterval(() => {
        setQuoteFading(true);
        setTimeout(() => {
          setQuoteIndex((i) => (i + 1) % LOADING_QUOTES.length);
          setQuoteFading(false);
        }, 400);
      }, 3500);

      return () => clearInterval(interval);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [loading]);

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

  // Weekly goal lives in Settings (localStorage); keep dashboard % in sync when it changes
  useEffect(() => {
    const syncGoalFromSettings = () => {
      const goal = readWeeklyGoalHoursFromStorage();
      setStudyStats((prev) => {
        const weekHrs = userProfile?.study_hours_per_week;
        const weeklyProgress =
          weekHrs != null
            ? computeWeeklyProgressPercent(weekHrs, goal)
            : prev.weeklyProgress;
        return { ...prev, weeklyGoal: goal, weeklyProgress };
      });
    };
    window.addEventListener("aceit_settings_updated", syncGoalFromSettings);
    const onStorage = (e) => {
      if (e.key === ACEIT_SETTINGS_KEY) syncGoalFromSettings();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("aceit_settings_updated", syncGoalFromSettings);
      window.removeEventListener("storage", onStorage);
    };
  }, [userProfile?.study_hours_per_week]);

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

    const handleCalendarUpdate = () => {
      fetchDashboardData(true);
    };

    // Periodic sync every 30 seconds
    const syncInterval = setInterval(() => {
      syncStreak();
    }, 30000);

    window.addEventListener("studyActivity", handleStudyActivity);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("calendarEventsUpdated", handleCalendarUpdate);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("studyActivity", handleStudyActivity);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("calendarEventsUpdated", handleCalendarUpdate);
    };
  }, [currentUser, syncStreak]);

  const handleLogActivity = async (hours) => {
    const hrs = Number(hours);
    if (!hrs || hrs <= 0) return;

    try {
      const response = await activityAPI.logActivity(hrs);

      if (response.ok && response.updated_metrics) {
        const metrics = response.updated_metrics;
        setStudyStats((prev) => ({
          ...prev,
          weeklyProgress:
            metrics.study_hours_per_week != null
              ? calculateWeeklyProgress(metrics.study_hours_per_week)
              : prev.weeklyProgress,
          totalStudyHours: prev.totalStudyHours + hrs,
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

      try {
        const pred = await analyticsAPI.getPerformancePrediction();
        if (pred?.ok) setPerformancePrediction(pred);
      } catch {
        // Prediction refresh is best-effort
      }

      showAppToast("success", `Logged ${hrs}h study session.`);
      window.dispatchEvent(new CustomEvent("aceit_activity_logged"));
      setLogHours("");
    } catch (error) {
      console.error("Error logging activity:", error);
      // Update locally for better UX
      setStudyStats((prev) => ({
        ...prev,
        totalStudyHours: prev.totalStudyHours + hrs,
      }));
      showAppToast("error", "Study time saved locally — couldn't sync with server.");
      setLogHours("");
    }
  };

  const handleLogSession = async (hours) => {
    const h = parseFloat(hours);
    if (!h || h <= 0 || h > 24) return;
    setLogLoading(true);
    try {
      await handleLogActivity(h);
      setLogHours("");
      setLogSuccess(true);
      setTimeout(() => setLogSuccess(false), 2500);
    } finally {
      setLogLoading(false);
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
      return (
        <Resources
          selectedResourceIds={selectedResourceIds}
          setSelectedResourceIds={setSelectedResourceIds}
        />
      );
    }

    if (currentSection === "chatbot") {
      return (
        <Chatbot
          selectedResourceIds={selectedResourceIds}
          setSelectedResourceIds={setSelectedResourceIds}
        />
      );
    }

    if (currentSection === "settings") {
      return <Settings currentUser={currentUser} />;
    }

    // Default dashboard content
    return (
      <div className="dashboard-container space-y-6">
        {/* Hero */}
        <div className="dashboard-hero">
          <div className="dashboard-hero-left">
            <div className="dashboard-hero-avatar">
              {getFirstName().charAt(0).toUpperCase()}
            </div>
            <div className="dashboard-hero-text">
              <p className="dashboard-hero-kicker">
                {getGreeting()}, {getFirstName()} 
              </p>
              <h1 className="dashboard-hero-title">Your learning dashboard</h1>
              <p className="dashboard-hero-subtitle">
                 {getTodaysTip()}
              </p>
            </div>
          </div>

          <div className="dashboard-hero-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => fetchDashboardData()}
              disabled={loading}
              title="Refresh dashboard"
            >
              <FaSync className={`icon-sm ${loading ? "animate-spin" : ""}`} />
              <span className="btn-label">{loading ? "Refreshing..." : "Refresh"}</span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCurrentSection("calendar")}
              title="Open calendar"
            >
              <FaCalendarAlt className="icon-sm" />
              <span className="btn-label">Calendar</span>
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
              <FaBookOpen className="icon-lg icon-blue" />
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
              <FaBullseye className="icon-lg icon-green" />
            </div>
            <div className="card-content-sm">
              <div className="stat-number stat-green">
                {studyStats.weeklyProgress}%
              </div>
              <div className="progress-container mt-2">
                <div
                  className="progress-bar"
                  style={{ width: `${studyStats.weeklyProgress}%` }}
                >
                </div>
              </div>
            </div>
          </div>

          <div className="card card-orange">
            <div className="card-header">
              <div className="card-title">Study Streak</div>
              <FaChartLine className="icon-lg icon-orange" />
            </div>
            <div className="card-content-sm">
              <div className="stat-number stat-orange">
                {studyStats.studyStreak} 🔥
              </div>
              <p className="text-xs text-muted">days in a row</p>
            </div>
          </div>

          <div className="card card-purple">
            <div className="card-header">
              <div className="card-title">Upcoming Tasks</div>
              <FaClock className="icon-lg icon-purple" />
            </div>
            <div className="card-content-sm">
              <div className="stat-number stat-purple">
                {upcomingTasksFiltered.length}
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
              {upcomingTasksFiltered.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">✅</div>
                  <p>No upcoming tasks — you're all caught up!</p>
                </div>
              ) : (
                upcomingTasksFiltered.slice(0, 3).map((task) => (
                  <div key={task.id} className={`task-item priority-${task.priority || "low"}`}>
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

          {/* Recommended Videos */}
          <div className="card">
            <div className="card-header">
              <div className="card-title flex items-center">
                <FaYoutube className="icon mr-2" />
                Recommended Videos
              </div>
            </div>
            <div className="card-content space-y-4">
              {recommendations.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎬</div>
                  <p>
                    {backendAvailable
                      ? "No recommendations available"
                      : "Backend unavailable"}
                  </p>
                  <button
                    onClick={() => fetchDashboardData()}
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: "0.5rem" }}
                  >
                    <FaSync className="icon-sm mr-1" />
                    Refresh
                  </button>
                </div>
              ) : (
                <>
                  {recommendations.slice(0, 3).map((video, index) => (
                    <div key={video.id || index} className="activity-item">
                      <FaYoutube className="icon-lg icon-red" style={{ flexShrink: 0 }} />
                      <div className="activity-content">
                        <p className="activity-title">{video.title}</p>
                        <p className="activity-reason">{video.reason}</p>
                      </div>
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline-red btn-sm"
                      >
                        Watch
                      </a>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Felix AI Quick Ask */}
          <div className="card quick-ask-card">
            <div className="card-header">
              <div className="card-title flex items-center">
                <FaRobot className="icon mr-2 icon-purple" />
                Ask Felix AI
              </div>
              <span className="quick-ask-badge">AI</span>
            </div>
            <div className="card-content quick-ask-content">
              <p className="quick-ask-desc">
                Ask anything about your studies. Felix will answer instantly.
              </p>

              {/* Suggested prompts */}
              <div className="quick-ask-prompts">
                {[
                  "Summarise my flashcards",
                  "What should I study today?",
                  "Quiz me on my subjects",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    className="quick-ask-prompt-btn"
                    onClick={() => setQuickAskQuery(prompt)}
                  >
                    <FaBolt className="icon-sm" />
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input */}
              <form
                className="quick-ask-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = quickAskQuery.trim();
                  if (!q) return;
                  setQuickAskLoading(true);
                  sessionStorage.setItem("felixPendingQuestion", q);
                  setQuickAskQuery("");
                  setTimeout(() => {
                    setQuickAskLoading(false);
                    setCurrentSection("chatbot");
                  }, 300);
                }}
              >
                <div className="quick-ask-input-wrap">
                  <input
                    type="text"
                    className="quick-ask-input"
                    placeholder="Type your question..."
                    value={quickAskQuery}
                    onChange={(e) => setQuickAskQuery(e.target.value)}
                    disabled={quickAskLoading}
                    maxLength={300}
                  />
                  <button
                    type="submit"
                    className="quick-ask-send"
                    disabled={!quickAskQuery.trim() || quickAskLoading}
                    title="Ask Felix"
                  >
                    {quickAskLoading
                      ? <FaSync className="animate-spin icon-sm" />
                      : <FaPaperPlane className="icon-sm" />}
                  </button>
                </div>
              </form>

              <button
                className="btn btn-outline btn-full"
                style={{ marginTop: "0.5rem" }}
                onClick={() => setCurrentSection("chatbot")}
              >
                <FaRobot className="icon mr-2" />
                Open Full Chat
              </button>
            </div>
          </div>
        </div>

        {/* Gamification Badges */}
        {gamificationData && (gamificationData.badges?.length > 0 || gamificationData.level > 1) && (
          <div className="card card-gold">
            <div className="card-header">
              <div className="card-title flex items-center">
                <FaTrophy className="icon-lg icon-gold mr-2" />
                Your Achievements
              </div>
              <span className="level-badge">Lv {gamificationData.level || 1}</span>
            </div>
            <div className="card-content">
              <div className="flex flex-wrap gap-2">
                {(gamificationData.badges || []).map((badge, index) => (
                  <div key={index} className="badge badge-secondary">
                    {["🥇", "🥈", "🥉", "⭐", "🏅"][index % 5]} {badge}
                  </div>
                ))}
                {(!gamificationData.badges || gamificationData.badges.length === 0) && (
                  <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                    No badges yet — keep studying to earn them!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Performance Prediction */}
        {(() => {
          // ── API `confidence` is always P(pass) = proba[1]*100 (see predict_performance).
          // Do NOT use 100 - rawConf when prediction is 0 — that is P(fail) mislabeled as pass chance.
          const rawConf = performancePrediction?.confidence || 0;
          const isPass  = performancePrediction?.prediction === 1;
          const passChance = Math.round(Math.min(100, Math.max(0, rawConf)));

          // Strip backend's embedded "(Confidence: X%)." — we show it ourselves
          const cleanMessage = (performancePrediction?.message || "")
            .replace(/\(Confidence:\s*[\d.]+%\)\.\s*/gi, "")
            .trim();

          // ── Factor breakdown from ml_input ─────────────────────────────────
          // Backend (student-success-chatbot) still returns XGBoost feature names;
          // telemetry is mapped server-side from /log_activity, streaks, and quizzes.
          // See: https://github.com/okefemi12/student-success-chatbot
          const ml = performancePrediction?.ml_input || {};
          const STATUS = { good: "good", warn: "warn", bad: "bad" };

          const pick = (obj, keys) => {
            for (const k of keys) {
              const v = obj[k];
              if (v != null && v !== "") return { key: k, value: v };
            }
            return null;
          };

          /** Model often sends fractions in 0–1; treat larger values as already %-like */
          const asPercentDisplay = (v) => {
            const n = Number(v);
            if (!Number.isFinite(n)) return null;
            if (n >= 0 && n <= 1) return n * 100;
            return n;
          };

          const rateWeeklyHours = (h) =>
            h >= 15 ? STATUS.good : h >= 8 ? STATUS.warn : STATUS.bad;
          const rateEngagementPct = (pct) =>
            pct >= 80 ? STATUS.good : pct >= 60 ? STATUS.warn : STATUS.bad;
          const rateQuizPct = (pct) =>
            pct >= 75 ? STATUS.good : pct >= 55 ? STATUS.warn : STATUS.bad;

          const factorRows = [];

          let weeklyH = null;
          if (ml.StudyTimeWeekly != null && ml.StudyTimeWeekly !== "") {
            weeklyH = Number(ml.StudyTimeWeekly);
          }
          if (!Number.isFinite(weeklyH) && ml.study_hours_per_week != null) {
            weeklyH = Number(ml.study_hours_per_week) * 40;
          }
          if (Number.isFinite(weeklyH)) {
            factorRows.push({
              key: "weekly_study_hours",
              label: "Weekly study hours",
              display: `${weeklyH.toFixed(1)}h`,
              raw: weeklyH,
              status: rateWeeklyHours(weeklyH),
              tip: "Log more focused study hours using the session tracker",
            });
          }

          const engPct = asPercentDisplay(ml.attendance_percentage);
          if (engPct != null) {
            factorRows.push({
              key: "attendance_percentage",
              label: "Study consistency",
              display: `${Math.round(engPct)}%`,
              raw: ml.attendance_percentage,
              status: rateEngagementPct(engPct),
              tip: "Maintain your daily login streak and study sessions",
            });
          }

          if (ml.assignments_completed != null && ml.assignments_completed !== "") {
            const quizPct = asPercentDisplay(ml.assignments_completed);
            if (quizPct != null) {
              factorRows.push({
                key: "assignments_completed",
                label: "Quiz performance",
                display: `${Math.round(quizPct)}%`,
                raw: ml.assignments_completed,
                status: rateQuizPct(quizPct),
                tip: "Take more AI quizzes to prove your knowledge retention",
              });
            }
          }

          // Optional extras if API adds them later (or alternate deploys)
          const streakPick = pick(ml, [
            "active_streak",
            "current_streak",
            "streak",
            "study_streak",
          ]);
          if (streakPick) {
            const n = Number(streakPick.value);
            const st =
              Number.isFinite(n) && n >= 7
                ? STATUS.good
                : Number.isFinite(n) && n >= 3
                  ? STATUS.warn
                  : STATUS.bad;
            factorRows.push({
              key: streakPick.key,
              label: "Active streak",
              display: `${streakPick.value} day${Number(streakPick.value) === 1 ? "" : "s"}`,
              raw: streakPick.value,
              status: st,
              tip: "Study most days to build your streak",
            });
          }

          const hoursPick = pick(ml, [
            "session_hours",
            "total_session_hours",
            "logged_session_hours",
            "study_session_hours",
          ]);
          if (hoursPick) {
            const h = Number(hoursPick.value);
            const st =
              Number.isFinite(h) && h >= 10
                ? STATUS.good
                : Number.isFinite(h) && h >= 3
                  ? STATUS.warn
                  : STATUS.bad;
            factorRows.push({
              key: hoursPick.key,
              label: "Logged session hours",
              display: `${Number.isFinite(h) ? h.toFixed(1) : hoursPick.value}h`,
              raw: hoursPick.value,
              status: st,
              tip: "Finish study sessions and timers to log time",
            });
          }

          const quizPick = pick(ml, [
            "quiz_score_avg",
            "average_quiz_score",
            "quiz_scores_average",
            "quiz_avg",
            "quiz_average",
          ]);
          if (quizPick) {
            const q = Number(quizPick.value);
            factorRows.push({
              key: quizPick.key,
              label: "Quiz average",
              display: Number.isFinite(q) ? `${Math.round(q)}%` : String(quizPick.value),
              raw: quizPick.value,
              status: rateQuizPct(Number.isFinite(q) ? q : 0),
              tip: "Take more AI quizzes to improve this signal",
            });
          }

          const allFactors = factorRows.sort((a, b) => {
            const order = { bad: 0, warn: 1, good: 2 };
            return order[a.status] - order[b.status];
          });

          const hasFactors = allFactors.length > 0;

          // Icons per status
          const statusIcon = { good: "✅", warn: "⚠️", bad: "❌" };

          return (
            <div className={`card prediction-card${isPass ? " prediction-pass" : performancePrediction?.prediction === 0 ? " prediction-fail" : ""}`}>
              <div className="card-header">
                <div className="card-title flex items-center">
                  <FaChartLine className="icon mr-2" />
                  Performance Prediction
                </div>
                <span className="quick-ask-badge">AI</span>
              </div>
              <div className="card-content prediction-content">
                {predictionLoading ? (
                  <div className="prediction-loading">
                    <div className="loading-spinner" style={{ width: 28, height: 28, marginBottom: 0 }} />
                    <span>Analysing your data…</span>
                  </div>
                ) : performancePrediction?.ok ? (
                  <div className="prediction-result">
                    {/* Verdict + pass-chance bar */}
                    <div className={`prediction-verdict${isPass ? " verdict-pass" : " verdict-fail"}`}>
                      {isPass ? "🎯 Likely to Pass" : "⚠️ At Risk"}
                    </div>
                    <div className="prediction-confidence">
                      <span className="confidence-label">Chance of passing</span>
                      <div className="confidence-bar-wrap">
                        <div className="confidence-bar-fill" style={{ width: `${passChance}%` }} />
                      </div>
                      <span className="confidence-pct">{passChance}%</span>
                    </div>

                    {/* ── Factor breakdown ── */}
                    {hasFactors && (
                      <div className="prediction-factors">
                        <p className="prediction-factors-title">
                          {isPass ? "What's working for you" : "What's holding you back"}
                        </p>
                        <div className="prediction-factors-list">
                          {allFactors.map((f) => (
                            <div key={f.key} className={`prediction-factor prediction-factor-${f.status}`}>
                              <span className="factor-icon">{statusIcon[f.status]}</span>
                              <div className="factor-body">
                                <span className="factor-label">{f.label}</span>
                                <span className="factor-value">{f.display}</span>
                              </div>
                              {f.status !== "good" && (
                                <span className="factor-tip">{f.tip}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Model feedback (may reference quizzes, timers, etc.) */}
                    {cleanMessage && (
                      <p className="prediction-message">{cleanMessage}</p>
                    )}
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: "1rem 0" }}>
                    <div className="empty-state-icon">📊</div>
                    <p>
                      Prediction unavailable — use flashcards, quizzes, and study timers,
                      then check back soon.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

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
                {/* Circular progress for weekly goal */}
                {(() => {
                  const r = 28;
                  const circ = 2 * Math.PI * r;
                  const offset = circ - (studyStats.weeklyProgress / 100) * circ;
                  return (
                    <div className="circular-progress-wrap">
                      <div className="circular-progress">
                        <svg width="72" height="72" viewBox="0 0 72 72">
                          <circle className="circular-progress-bg" cx="36" cy="36" r={r} />
                          <circle
                            className="circular-progress-fill"
                            cx="36" cy="36" r={r}
                            strokeDasharray={circ}
                            strokeDashoffset={offset}
                          />
                        </svg>
                        <div className="circular-progress-label">
                          {studyStats.weeklyProgress}%
                        </div>
                      </div>
                      <div className="circular-progress-info">
                        <div className="metric-value">{studyStats.weeklyGoal}h</div>
                        <div className="metric-label text-muted">Weekly goal</div>
                      </div>
                    </div>
                  );
                })()}
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
                className="btn-action-card action-blue"
                onClick={() => setCurrentSection("flashcards")}
              >
                <FaBookOpen className="action-icon" />
                Create Flashcards
              </button>
              <button
                className="btn-action-card action-green"
                onClick={() => setCurrentSection("calendar")}
              >
                <FaCalendarAlt className="action-icon" />
                Schedule Study
              </button>
              <div className={`btn-action-card action-purple log-session-card${logSuccess ? " log-success-active" : ""}`}>
                {logSuccess ? (
                  <>
                    <FaCheckCircle className="action-icon log-success-icon" />
                    <span className="log-success-label">Session logged! 🎉</span>
                  </>
                ) : (
                  <>
                    <FaClock className="action-icon" />
                    <span className="log-card-title">Log Study</span>
                    <div className="log-presets">
                      {["0.5", "1", "1.5", "2"].map((h) => (
                        <button
                          key={h}
                          className={`log-preset-chip${logHours === h ? " active" : ""}`}
                          onClick={(e) => { e.stopPropagation(); setLogHours(h); }}
                          disabled={logLoading}
                          type="button"
                        >
                          {h}h
                        </button>
                      ))}
                    </div>
                    <div className="log-input-row" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        className="log-hours-input"
                        placeholder="custom hrs"
                        value={logHours}
                        min="0.1"
                        max="24"
                        step="0.5"
                        onChange={(e) => setLogHours(e.target.value)}
                        disabled={logLoading}
                      />
                      <button
                        className="log-submit-btn"
                        onClick={(e) => { e.stopPropagation(); handleLogSession(logHours); }}
                        disabled={!logHours || logLoading}
                        type="button"
                      >
                        {logLoading ? <FaSync className="animate-spin" style={{ fontSize: "0.7rem" }} /> : "Log"}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <button
                className="btn-action-card action-orange"
                onClick={() => fetchDashboardData()}
                disabled={loading}
              >
                <FaSync
                  className={`action-icon ${loading ? "animate-spin" : ""}`}
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
    <>
      <GlobalToastHost />
      {loading && (
        <div className="dashboard-fullscreen-loader">
          <div className="loader-spinner-wrap">
            <div className="loading-spinner"></div>
          </div>
          <div className={`loader-quote${quoteFading ? " fading" : ""}`}>
            <p className="loader-quote-text">
              "{LOADING_QUOTES[quoteIndex].quote}"
            </p>
            <span className="loader-quote-author">
              — {LOADING_QUOTES[quoteIndex].author}
            </span>
          </div>
          <p className="loader-label">Loading your dashboard…</p>
        </div>
      )}
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
    </>
  );
}

export default Dashboard;
