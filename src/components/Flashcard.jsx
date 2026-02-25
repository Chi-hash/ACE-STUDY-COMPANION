import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import "../styles/flashcard.css";
import { flashcardAPI, userAPI, analyticsAPI } from "../services/apiClient.js";
import { auth } from "../assets/js/firebase.js";
import {
  FaPlus,
  FaEdit,
  FaTrashAlt,
  FaChevronLeft,
  FaChevronRight,
  FaBookOpen,
  FaEye,
  FaFolder,
  FaFolderOpen,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBrain,
  FaFileUpload,
  FaMagic,
  FaUpload,
  FaFileAlt,
  FaSync,
  FaSpinner,
  FaTimes,
  FaFilePdf,
  FaFileWord,
  FaFilePowerpoint,
  FaFileExcel,
  FaFileImage,
  FaFile,
  FaFire,
  FaTrophy,
  FaHashtag,
  FaClock,
  FaCalendarAlt,
  FaStar,
  FaStarHalfAlt,
  FaRedo,
  FaEyeSlash,
} from "react-icons/fa";

// ==================== COMPLETE STREAK MANAGER ====================
class StreakManager {
  constructor() {
    this.STREAK_KEY = "aceit_streak_data_";
    this.MIN_STUDY_DURATION = 0.25; // 15 minutes
    this.STUDY_GOAL = 0.5; // 30 minutes daily goal
  }

  getStorageKey(uid) {
    return `${this.STREAK_KEY}${uid || "guest"}`;
  }

  toLocalDateString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  getStreakData(uid) {
    try {
      const stored = localStorage.getItem(this.getStorageKey(uid));
      const defaultData = {
        currentStreak: 0,
        longestStreak: 0,
        lastStudyDate: null,
        totalStudyDays: 0,
        totalStudyHours: 0,
        dailyStudyLog: {},
        achievements: [],
      };
      return stored ? JSON.parse(stored) : defaultData;
    } catch (error) {
      console.error("Error reading streak data:", error);
      return this.getDefaultStreakData();
    }
  }

  getDefaultStreakData() {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      totalStudyDays: 0,
      totalStudyHours: 0,
      dailyStudyLog: {},
      achievements: [],
    };
  }

  saveStreakData(uid, data) {
    try {
      localStorage.setItem(this.getStorageKey(uid), JSON.stringify(data));
    } catch (error) {
      console.error("Error saving streak data:", error);
    }
  }

  isConsecutiveDay(lastDateStr) {
    if (!lastDateStr) return false;

    try {
      const todayStr = this.toLocalDateString(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = this.toLocalDateString(yesterday);
      return lastDateStr === todayStr || lastDateStr === yesterdayStr;
    } catch (error) {
      console.error("Error checking consecutive days:", error);
      return false;
    }
  }

  updateStreak(uid, durationHours, activityType) {
    try {
      const streakData = this.getStreakData(uid);
      const today = this.toLocalDateString(new Date());

      if (!streakData.dailyStudyLog[today]) {
        streakData.dailyStudyLog[today] = {
          totalHours: 0,
          activities: [],
          cardsStudied: 0,
          completed: false,
        };
      }

      const todayLog = streakData.dailyStudyLog[today];
      todayLog.totalHours += durationHours;
      todayLog.activities.push(activityType);

      const goalMet = todayLog.totalHours >= this.STUDY_GOAL;

      if (goalMet && !todayLog.completed) {
        todayLog.completed = true;

        const lastDate = streakData.lastStudyDate;
        const isConsecutive = lastDate
          ? this.isConsecutiveDay(lastDate)
          : false;

        if (isConsecutive || streakData.currentStreak === 0) {
          streakData.currentStreak += 1;
        } else if (lastDate && !this.isConsecutiveDay(lastDate)) {
          streakData.currentStreak = 1;
        }

        streakData.lastStudyDate = today;
        streakData.totalStudyDays += 1;

        if (streakData.currentStreak > streakData.longestStreak) {
          streakData.longestStreak = streakData.currentStreak;
        }

        this.checkAchievements(streakData);
      }

      streakData.totalStudyHours += durationHours;
      this.saveStreakData(uid, streakData);

      return streakData;
    } catch (error) {
      console.error("Error updating streak:", error);
      return this.getDefaultStreakData();
    }
  }

  checkAchievements(streakData) {
    const achievements = [];

    if (
      streakData.currentStreak >= 7 &&
      !streakData.achievements.includes("7_day_streak")
    ) {
      achievements.push("7_day_streak");
    }

    if (
      streakData.currentStreak >= 30 &&
      !streakData.achievements.includes("30_day_streak")
    ) {
      achievements.push("30_day_streak");
    }

    if (
      streakData.totalStudyHours >= 100 &&
      !streakData.achievements.includes("100_hours")
    ) {
      achievements.push("100_hours");
    }

    if (achievements.length > 0) {
      streakData.achievements = [...streakData.achievements, ...achievements];
      return achievements;
    }

    return [];
  }

  getTodaysProgress(uid) {
    const streakData = this.getStreakData(uid);
    const today = this.toLocalDateString(new Date());
    const todayLog = streakData.dailyStudyLog[today];

    return {
      hoursStudied: todayLog ? todayLog.totalHours : 0,
      goal: this.STUDY_GOAL,
      completed: todayLog ? todayLog.completed : false,
      progressPercent: todayLog
        ? Math.min(100, (todayLog.totalHours / this.STUDY_GOAL) * 100)
        : 0,
    };
  }
}

const streakManager = new StreakManager();
// ==================== SPACED REPETITION ====================
const SpacedRepetitionScheduler = {
  initializeCard: (id) => ({
    id,
    repetitions: 0,
    easeFactor: 2.5,
    interval: 1,
    nextReviewDate: new Date(),
    lastReviewed: new Date(),
  }),

  scheduleNextReview: (reviewData, quality) => {
    const newData = { ...reviewData };

    if (quality < 3) {
      newData.interval = 1;
      newData.repetitions = 0;
    } else {
      newData.repetitions++;

      if (newData.repetitions === 1) {
        newData.interval = 1;
      } else if (newData.repetitions === 2) {
        newData.interval = 6;
      } else {
        newData.interval = Math.round(newData.interval * newData.easeFactor);
      }
    }

    newData.easeFactor = Math.max(
      1.3,
      newData.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + newData.interval);
    newData.nextReviewDate = nextDate;
    newData.lastReviewed = new Date();

    return newData;
  },

  getDueCards: (reviewCards) => {
    const today = new Date();
    return reviewCards.filter((card) => {
      try {
        return new Date(card.nextReviewDate) <= today;
      } catch (error) {
        return true;
      }
    });
  },

  getStudyOrder: (dueCards) => {
    return [...dueCards].sort((a, b) => {
      if (a.repetitions !== b.repetitions) return a.repetitions - b.repetitions;
      try {
        return new Date(a.nextReviewDate) - new Date(b.nextReviewDate);
      } catch (error) {
        return 0;
      }
    });
  },

  getPerformanceAnalytics: (reviewCards) => {
    const today = new Date();
    const dueToday = reviewCards.filter((card) => {
      const reviewDate = new Date(card.nextReviewDate);
      return reviewDate.toDateString() === today.toDateString();
    }).length;

    const overdueCards = reviewCards.filter(
      (card) => new Date(card.nextReviewDate) < today
    ).length;
    const masteredCards = reviewCards.filter(
      (card) => card.repetitions >= 5
    ).length;
    const averageEaseFactor =
      reviewCards.length > 0
        ? reviewCards.reduce((sum, card) => sum + card.easeFactor, 0) /
          reviewCards.length
        : 0;

    return {
      dueToday,
      overdueCards,
      masteredCards,
      averageEaseFactor: parseFloat(averageEaseFactor.toFixed(1)),
    };
  },
};

// ==================== FLASHCARD COMPONENT ====================
export function Flashcards() {
  // Main states
  const [flashcards, setFlashcards] = useState([]);
  const [flashcardSets, setFlashcardSets] = useState([]);
  const [reviewData, setReviewData] = useState({});
  const [userSubjects, setUserSubjects] = useState([]);

  // UI states
  const [mode, setMode] = useState("subjects");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyProgress, setStudyProgress] = useState(0);
  const [newCard, setNewCard] = useState({
    front: "",
    back: "",
    subject: "",
    topic: "",
    difficulty: "medium",
  });

  // Study states
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedSubjectForTopics, setSelectedSubjectForTopics] = useState("");
  const [studyCards, setStudyCards] = useState([]);
  const [showQualityButtons, setShowQualityButtons] = useState(false);
  const [lastStudySubject, setLastStudySubject] = useState(null);
  const [lastStudyTopic, setLastStudyTopic] = useState(null);

  // AI Generation states
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [cardCount, setCardCount] = useState(15); // Default to 15 cards
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingCard, setEditingCard] = useState(null);
  const [deletingCard, setDeletingCard] = useState(null);

  // Streak state
  const [streakData, setStreakData] = useState(() =>
    streakManager.getStreakData()
  );

  // Refs
  const fileInputRef = useRef(null);
  const studySessionStartTime = useRef(null);
  const isMounted = useRef(true);

  // ==================== HELPER FUNCTIONS ====================
  const calculateStudyDuration = useCallback(
    (cardsStudied, timePerCard = 0.25) => {
      return Math.max(
        streakManager.MIN_STUDY_DURATION,
        cardsStudied * timePerCard
      );
    },
    []
  );

  // Helper function to get current user ID
  const getCurrentUserId = useCallback(() => {
    try {
      const storedUser = localStorage.getItem("aceit_current_user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        return userData.uid || null;
      }
      return auth.currentUser?.uid || null;
    } catch {
      return auth.currentUser?.uid || null;
    }
  }, []);

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) return;
    setStreakData(streakManager.getStreakData(uid));
  }, [getCurrentUserId]);

  // Helper function to sync with main streak system (StudyLayout)
  const syncWithMainStreakSystem = useCallback(
    async (duration) => {
      const uid = getCurrentUserId();
      if (!uid) return;

      try {
        // Record study date in StudyLayout's format (YYYY-MM-DD)
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        const todayStr = `${y}-${m}-${d}`;

        const studyDatesKey = `aceit_study_dates_${uid}`;
        const studyDates =
          JSON.parse(localStorage.getItem(studyDatesKey)) || [];

        if (!studyDates.includes(todayStr)) {
          studyDates.push(todayStr);
          localStorage.setItem(studyDatesKey, JSON.stringify(studyDates));
        }

        // Calculate streak using StudyLayout's method
        const sortedDates = [...studyDates].sort(
          (a, b) => new Date(b) - new Date(a)
        );
        let currentStreak = 0;
        let expectedDate = todayStr;

        for (let i = 0; i < sortedDates.length; i++) {
          const studyDate = sortedDates[i];
          if (studyDate === expectedDate) {
            currentStreak++;
            const [yy, mm, dd] = expectedDate.split("-").map((v) => Number(v));
            const prev = new Date(yy, (mm || 1) - 1, (dd || 1) - 1);
            const prevY = prev.getFullYear();
            const prevM = String(prev.getMonth() + 1).padStart(2, "0");
            const prevD = String(prev.getDate()).padStart(2, "0");
            expectedDate = `${prevY}-${prevM}-${prevD}`;
          } else if (studyDate < expectedDate) {
            break;
          }
        }

        // Sync with backend if available
        try {
          const gamificationResponse = await analyticsAPI.getGamification(uid);
          if (gamificationResponse.ok) {
            const currentLevel = gamificationResponse.gamification?.level || 1;
            const currentBadges =
              gamificationResponse.gamification?.badges || [];
            const longestStreak = Math.max(
              gamificationResponse.gamification?.longest_streak || 0,
              currentStreak
            );

            await analyticsAPI.updateGamification(uid, {
              level: currentLevel,
              badges: currentBadges,
              streak: currentStreak,
              longest_streak: longestStreak,
            });
          }
        } catch (backendError) {
          console.log("Backend streak sync failed (non-critical):", backendError);
        }

        // Update local flashcard streak data to match main system
        const flashcardStreakData = streakManager.getStreakData(uid);
        flashcardStreakData.currentStreak = currentStreak;
        flashcardStreakData.longestStreak = Math.max(
          flashcardStreakData.longestStreak,
          currentStreak
        );
        streakManager.saveStreakData(uid, flashcardStreakData);
        setStreakData(flashcardStreakData);
      } catch (error) {
        console.error("Error syncing streak:", error);
      }
    },
    [getCurrentUserId]
  );

  const triggerStreakUpdate = useCallback(
    async (activityType, cardsStudied = 1, durationOverrideHours = null) => {
      const duration =
        typeof durationOverrideHours === "number"
          ? durationOverrideHours
          : calculateStudyDuration(cardsStudied);
      const uid = getCurrentUserId();
      const updatedStreak = streakManager.updateStreak(uid, duration, activityType);
      setStreakData(updatedStreak);

      // Sync with main streak system
      await syncWithMainStreakSystem(duration);

      const studyEvent = new CustomEvent("studyActivity", {
        detail: {
          type: "study",
          duration: duration,
          activity: activityType,
          cardsStudied: cardsStudied,
          streakData: updatedStreak,
        },
      });
      window.dispatchEvent(studyEvent);

      return updatedStreak;
    },
    [calculateStudyDuration, syncWithMainStreakSystem]
  );

  const getFileIcon = (fileType) => {
    if (!fileType) return <FaFile className="w-6 h-6" />;

    if (fileType.includes("pdf")) return <FaFilePdf className="w-6 h-6" />;
    if (fileType.includes("word") || fileType.includes("doc"))
      return <FaFileWord className="w-6 h-6" />;
    if (fileType.includes("powerpoint") || fileType.includes("ppt"))
      return <FaFilePowerpoint className="w-6 h-6" />;
    if (fileType.includes("excel") || fileType.includes("sheet"))
      return <FaFileExcel className="w-6 h-6" />;
    if (fileType.includes("image")) return <FaFileImage className="w-6 h-6" />;
    if (fileType.includes("text")) return <FaFileAlt className="w-6 h-6" />;

    return <FaFile className="w-6 h-6" />;
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    isMounted.current = true;

    const checkBackend = async () => {
      try {
        // Use userAPI instead of raw fetch to ensure token is attached correctly
        // and we wait for Firebase auth to initialize
        try {
          await userAPI.getProfile();
          setBackendStatus("available");
        } catch (error) {
          console.log("Backend check failed (likely auth or network):", error);
          // If 401, it means backend is reachable but auth failed
          // If network error, backend is unavailable
          setBackendStatus("unavailable"); 
        }
      } catch (error) {
        console.log("Backend check failed (unexpected):", error);
        setBackendStatus("unavailable");
      }
    };

    checkBackend();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Sync flashcard streak with main streak system when StudyLayout updates it
  useEffect(() => {
    const syncStreakFromMainSystem = async () => {
      const uid = getCurrentUserId();
      if (!uid) return;

      try {
        const studyDatesKey = `aceit_study_dates_${uid}`;
        const studyDates =
          JSON.parse(localStorage.getItem(studyDatesKey)) || [];

        // Calculate streak using StudyLayout's method
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, "0");
        const d = String(today.getDate()).padStart(2, "0");
        const todayStr = `${y}-${m}-${d}`;

        const sortedDates = [...studyDates].sort(
          (a, b) => new Date(b) - new Date(a)
        );
        let currentStreak = 0;
        let expectedDate = todayStr;

        for (let i = 0; i < sortedDates.length; i++) {
          const studyDate = sortedDates[i];
          if (studyDate === expectedDate) {
            currentStreak++;
            const [yy, mm, dd] = expectedDate.split("-").map((v) => Number(v));
            const prev = new Date(yy, (mm || 1) - 1, (dd || 1) - 1);
            const prevY = prev.getFullYear();
            const prevM = String(prev.getMonth() + 1).padStart(2, "0");
            const prevD = String(prev.getDate()).padStart(2, "0");
            expectedDate = `${prevY}-${prevM}-${prevD}`;
          } else if (studyDate < expectedDate) {
            break;
          }
        }

        let backendStreak = 0;
        try {
          const gamificationResponse = await analyticsAPI.getGamification(uid);
          if (gamificationResponse?.ok) {
            backendStreak = gamificationResponse.gamification?.streak || 0;
          }
        } catch (backendError) {
          console.log("Backend streak fetch failed (non-critical):", backendError);
        }

        const finalStreak = Math.max(currentStreak, backendStreak);

        // Update flashcard streak data to match main system
        const flashcardStreakData = streakManager.getStreakData(uid);
        if (flashcardStreakData.currentStreak !== finalStreak) {
          flashcardStreakData.currentStreak = finalStreak;
        }
          flashcardStreakData.longestStreak = Math.max(
            flashcardStreakData.longestStreak,
          finalStreak
          );
        streakManager.saveStreakData(uid, flashcardStreakData);
          setStreakData(flashcardStreakData);
      } catch (error) {
        console.error("Error syncing streak from main system:", error);
      }
    };

    // Sync on mount and periodically
    syncStreakFromMainSystem();
    const syncInterval = setInterval(() => {
      syncStreakFromMainSystem();
    }, 30000); // Every 30 seconds

    // Also listen for storage changes (when StudyLayout updates streak)
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith("aceit_study_dates_")) {
        syncStreakFromMainSystem();
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [getCurrentUserId]);

  useEffect(() => {
    const fetchFlashcardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load from localStorage first (for offline support)
        const savedFlashcards = localStorage.getItem("ace-it-flashcards");
        const savedReviewData = localStorage.getItem("ace-it-review-data");

        if (savedFlashcards) {
          try {
            const parsedCards = JSON.parse(savedFlashcards);
            if (Array.isArray(parsedCards)) {
              setFlashcards(parsedCards);
            }
          } catch (parseError) {
            console.error("Error parsing saved flashcards:", parseError);
          }
        }

        if (savedReviewData) {
          try {
            const parsedReviewData = JSON.parse(savedReviewData);
            if (parsedReviewData && typeof parsedReviewData === "object") {
              setReviewData(parsedReviewData);
            }
          } catch (parseError) {
            console.error("Error parsing saved review data:", parseError);
          }
        }

        // Only try backend if status is available
        if (backendStatus === "available") {
          try {
            // Try to get user subjects first
            const firebaseToken = localStorage.getItem("firebase_token");
            if (firebaseToken) {
              try {
                const profileResponse = await userAPI.getProfile();
                if (profileResponse.ok && profileResponse.profile) {
                  const subjects = profileResponse.profile.subject;
                  if (subjects) {
                    setUserSubjects(
                      Array.isArray(subjects) ? subjects : [subjects]
                    );
                  }
                }
              } catch (profileError) {
                console.log("Could not fetch user profile:", profileError);
              }
            }

            // Try to fetch flashcards from backend
            try {
              const flashcardResponse = await flashcardAPI.getFlashcards();
              if (flashcardResponse.flashcards) {
                setFlashcardSets(flashcardResponse.flashcards);

                const backendCards = flashcardResponse.flashcards.flatMap(
                  (set) =>
                    set.flashcards.map((card, index) => ({
                      id: `${set.id}-${index}`,
                      front: card.question || card.front || "",
                      back: card.answer || card.back || "",
                      subject: set.subject || "General",
                      topic: set.title || "Untitled",
                      difficulty: "medium",
                      correctCount: card.correctCount || 0,
                      totalAttempts: card.totalAttempts || 0,
                      flashcardSetId: set.id,
                    }))
                );

                setFlashcards((prev) => {
                  const existingIds = new Set(prev.map((card) => card.id));
                  const newCards = backendCards.filter(
                    (card) => !existingIds.has(card.id)
                  );
                  return [...prev, ...newCards];
                });
              }
            } catch (flashcardError) {
              console.log(
                "Could not fetch backend flashcards:",
                flashcardError
              );
            }
          } catch (apiError) {
            console.error("API error:", apiError);
          }
        }
      } catch (error) {
        console.error("Error loading flashcard data:", error);
        if (isMounted.current) {
          setError("Failed to load flashcard data. Using local storage only.");
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchFlashcardData();
  }, [backendStatus]);

  useEffect(() => {
    const fetchUserSubjects = async () => {
      try {
        if (backendStatus === "available") {
          const response = await userAPI.getProfile();
          if (response.ok && response.profile) {
            const subjects = response.profile.subject;
            if (subjects) {
              setUserSubjects(Array.isArray(subjects) ? subjects : [subjects]);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user subjects:", error);
      }
    };

    fetchUserSubjects();
  }, [backendStatus]);

  useEffect(() => {
    if (flashcards.length > 0) {
      localStorage.setItem("ace-it-flashcards", JSON.stringify(flashcards));
    }
  }, [flashcards]);

  useEffect(() => {
    if (Object.keys(reviewData).length > 0) {
      localStorage.setItem("ace-it-review-data", JSON.stringify(reviewData));
    }
  }, [reviewData]);

  useEffect(() => {
    const newReviewData = { ...reviewData };
    let hasChanges = false;

    flashcards.forEach((card) => {
      if (!newReviewData[card.id]) {
        newReviewData[card.id] = SpacedRepetitionScheduler.initializeCard(
          card.id
        );
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setReviewData(newReviewData);
    }
  }, [flashcards]);

  // ==================== MEMOIZED VALUES ====================
  const subjects = useMemo(() => {
    // Get subjects from active flashcards
    const activeSubjects = [...new Set(flashcards.map((card) => card.subject))].filter(s => s);
    
    // Merge with userSubjects (to show empty subjects)
    const allSubjectNames = [...new Set([...activeSubjects, ...userSubjects])];
    
    // Filter by search term
    const filteredNames = allSubjectNames.filter(name => 
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filteredNames.map((subjectName) => ({
        name: subjectName,
        topics: [
          ...new Set(
            flashcards
              .filter((card) => card.subject === subjectName)
              .map((card) => card.topic)
              .filter((topic) => topic)
          ),
        ],
      }));
  }, [flashcards, userSubjects, searchTerm]);

  const spacedRepetitionAnalytics = useMemo(() => {
    const baseAnalytics = SpacedRepetitionScheduler.getPerformanceAnalytics(
      Object.values(reviewData)
    );
    
    // Calculate additional metrics
    const reviewCards = Object.values(reviewData);
    const learningCards = reviewCards.filter(
      (card) => card.repetitions > 0 && card.repetitions < 5
    ).length;
    const newCards = reviewCards.filter(
      (card) => card.repetitions === 0
    ).length;
    
    // Calculate success rate from flashcards
    const reviewedFlashcards = flashcards.filter(
      (card) => reviewData[card.id] && (card.totalAttempts || 0) > 0
    );
    const totalAttempts = reviewedFlashcards.reduce(
      (sum, card) => sum + (card.totalAttempts || 0),
      0
    );
    const totalCorrect = reviewedFlashcards.reduce(
      (sum, card) => sum + (card.correctCount || 0),
      0
    );
    const successRate = totalAttempts > 0
      ? Math.round((totalCorrect / totalAttempts) * 100)
      : 0;
    
    // Calculate cards reviewed this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cardsReviewedThisWeek = reviewCards.filter((card) => {
      if (!card.lastReviewed) return false;
      try {
        return new Date(card.lastReviewed) >= weekAgo;
      } catch {
        return false;
      }
    }).length;
    
    // Calculate average interval
    const intervals = reviewCards
      .map((card) => card.interval || 0)
      .filter((interval) => interval > 0);
    const averageInterval = intervals.length > 0
      ? Math.round(intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length)
      : 0;
    
    return {
      ...baseAnalytics,
      learningCards,
      newCards,
      totalCards: flashcards.length,
      successRate,
      cardsReviewedThisWeek,
      averageInterval,
    };
  }, [reviewData, flashcards]);

  const todaysProgress = useMemo(() => {
    return streakManager.getTodaysProgress(getCurrentUserId());
  }, [streakData, getCurrentUserId]);
  const isStreakComplete = todaysProgress.progressPercent >= 100;

  const handleStudySessionComplete = useCallback(() => {
    const cardsStudied = currentCardIndex + 1;
    let durationHours = null;
    if (studySessionStartTime.current instanceof Date) {
      const elapsedMs = Date.now() - studySessionStartTime.current.getTime();
      durationHours = Math.max(elapsedMs / (1000 * 60 * 60), 0);
    }
    triggerStreakUpdate("flashcards_completed", cardsStudied, durationHours);

    setCurrentCardIndex(0);
    setShowAnswer(false);
    setShowQualityButtons(false);
    setStudyProgress(100);
    setStudyCards([]);
    if (lastStudySubject) {
      setSelectedSubjectForTopics(lastStudySubject);
      setSelectedSubject(lastStudySubject);
      if (lastStudyTopic) {
        setSelectedTopic(lastStudyTopic);
      }
      setMode("browse");
    } else {
      setMode("subjects");
    }
  }, [
    currentCardIndex,
    triggerStreakUpdate,
    lastStudySubject,
    lastStudyTopic,
    setSelectedSubjectForTopics,
    setSelectedSubject,
    setSelectedTopic,
  ]);

  // ==================== CARD NAVIGATION ====================
  const handleNextCard = useCallback(() => {
    if (studyCards.length === 0) {
      setMode("subjects");
      return;
    }

    const isLastCard = currentCardIndex >= studyCards.length - 1;
    if (isLastCard) {
      if (!showAnswer) {
        setShowAnswer(true);
        return;
      }
      handleStudySessionComplete();
      return;
    }

    setCurrentCardIndex((prev) => prev + 1);
    setShowAnswer(false);
    setShowQualityButtons(false);

    const newProgress = ((currentCardIndex + 2) / studyCards.length) * 100;
    setStudyProgress(Math.min(newProgress, 100));
  }, [
    currentCardIndex,
    handleStudySessionComplete,
    showAnswer,
    studyCards.length,
  ]);

  const handlePrevCard = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((prev) => prev - 1);
      setShowAnswer(false);
      setShowQualityButtons(false);

      const newProgress = (currentCardIndex / studyCards.length) * 100;
      setStudyProgress(Math.max(newProgress, 0));
    }
  }, [currentCardIndex, studyCards.length]);

  // ==================== FLASHCARD OPERATIONS ====================
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setError(null);

    // Enforce 10MB limit (increased from 5MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large. Please upload a file smaller than 10MB.");
      e.target.value = ""; // Clear the input
      setUploadedFile(null);
      return;
    }

    // Read and preview text files
    if (file.type.includes("text/") || file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (isMounted.current) {
          setUploadedFile((prev) => ({ ...prev, preview: e.target.result }));
        }
      };
      reader.onerror = () => {
        if (isMounted.current) {
          setError("Failed to read file");
          setUploadedFile(null);
        }
      };
      reader.readAsText(file);
    }

    setMode("uploadPreview");
  };

  const processFileUpload = async () => {
    if (!uploadedFile) return;

    setIsGenerating(true);
    setError(null);

    try {
      let response;

      if (backendStatus === "available") {
        try {
          console.log("Attempting to generate flashcards via backend...");
          response = await flashcardAPI.generateFlashcardsFromFile(uploadedFile, cardCount);
        } catch (apiError) {
          console.error("Backend API failed, using local fallback:", apiError);
          response = await generateFlashcardsLocally(uploadedFile);
        }
      } else {
        console.log("Backend unavailable, using local fallback.");
        response = await generateFlashcardsLocally(uploadedFile);
      }

      if (response.flashcards) {
        const generated = response.flashcards.map((card, index) => ({
          id: `generated-${Date.now()}-${index}`,
          front: card.question || card.front || "",
          back: card.answer || card.back || "",
          subject: "AI Generated",
          topic: `From ${uploadedFile.name}`,
          difficulty: "medium",
          correctCount: 0,
          totalAttempts: 0,
          isGenerated: true,
          isMock: response.isMock || false,
        }));

        if (isMounted.current) {
          setGeneratedCards(generated);
          
          // Auto-set the topic name from the filename (remove extension)
          if (uploadedFile && uploadedFile.name) {
             const cleanName = uploadedFile.name.replace(/\.[^/.]+$/, "");
             setNewCard(prev => ({ ...prev, topic: cleanName }));
          }
          
          setMode("previewGenerated");
        }

        if (response.isMock) {
          setError(
            "Backend unavailable. Using sample flashcards. You can edit these before saving."
          );
        }
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
      if (isMounted.current) {
        setError(error.message || "Failed to generate flashcards");
      }
    } finally {
      if (isMounted.current) {
        setIsGenerating(false);
      }
    }
  };

  const generateFlashcardsLocally = async (file) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          flashcards: [
            {
              question: "Sample question from uploaded file?",
              answer: "This is a sample answer generated locally.",
            },
            {
              question: "What type of file did you upload?",
              answer: `You uploaded a ${file.type} file named ${file.name}`,
            },
            {
              question: "What is flashcard-based learning?",
              answer:
                "A learning technique using cards with questions and answers.",
            },
          ],
          isMock: true,
          message: "Generated locally (backend unavailable)",
        });
      }, 1500);
    });
  };

  const saveGeneratedCards = async (subject, topic) => {
    try {
      const cardsToSave = generatedCards.map((card) => ({
        ...card,
        subject: subject || "AI Generated",
        topic: topic || `From ${uploadedFile?.name || "text"}`,
        isGenerated: false,
      }));

      setFlashcards((prev) => [...prev, ...cardsToSave]);
      setGeneratedCards([]);
      setUploadedFile(null);
      setMode("subjects");

      alert(`${cardsToSave.length} flashcards saved successfully!`);
    } catch (error) {
      console.error("Error saving generated cards:", error);
      setError("Failed to save generated cards");
    }
  };

  const generateFromText = async (textInput) => {
    const text = textInput || prompt("Enter study material text:");
    if (!text || text.trim().length < 10) {
      alert("Please enter at least 10 characters of text");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let response;
      if (backendStatus === "available") {
        response = await flashcardAPI.generateFlashcardsFromText(text);
      } else {
        response = {
          flashcards: [
            {
              question: "What is the main topic of this text?",
              answer: text.substring(0, 100) + "...",
            },
            {
              question: "Key concept from the text?",
              answer: "This would be generated by AI in production.",
            },
          ],
          isMock: true,
        };
      }

      if (response.flashcards) {
        const generated = response.flashcards.map((card, index) => ({
          id: `generated-${Date.now()}-${index}`,
          front: card.question || card.front || "",
          back: card.answer || card.back || "",
          subject: "AI Generated",
          topic: "From Text",
          difficulty: "medium",
          correctCount: 0,
          totalAttempts: 0,
          isGenerated: true,
          sourceText: text.substring(0, 100) + "...",
        }));

        setGeneratedCards(generated);
        setMode("previewGenerated");
      }
    } catch (error) {
      console.error("Error generating flashcards from text:", error);
      setError("Failed to generate flashcards from text");
    } finally {
      setIsGenerating(false);
    }
  };

  const getCardsForTopic = (subject, topic) => {
    return flashcards.filter(
      (card) => card.subject === subject && card.topic === topic
    );
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;

    if (userSubjects.includes(newSubjectName.trim())) {
      alert("Subject already exists!");
      return;
    }

    const updatedSubjects = [...userSubjects, newSubjectName.trim()];
    setUserSubjects(updatedSubjects);

    // Backend profile uses `subject` (singular) which can be an array,
    // so we send it in the same shape to avoid 400 errors.
    if (backendStatus === "available") {
      try {
        await userAPI.updateProfile({ subject: updatedSubjects });
      } catch (error) {
        console.error("Failed to update subjects on backend:", error);
      }
    }
    
    setNewSubjectName("");
    setIsAddingSubject(false);
  };

  const handleCreateCard = async () => {
    if (newCard.front && newCard.back && newCard.subject && newCard.topic) {
      const card = {
        id: Date.now().toString(),
        front: newCard.front,
        back: newCard.back,
        subject: newCard.subject,
        topic: newCard.topic,
        difficulty: newCard.difficulty,
        correctCount: 0,
        totalAttempts: 0,
      };
      setFlashcards((prev) => [...prev, card]);
      setNewCard((prev) => ({
        ...prev,
        front: "",
        back: "",
      }));
    }
  };

  const performDeleteCard = async (id) => {
    const cardToDelete = flashcards.find((card) => card.id === id);
    if (!cardToDelete) return;

    if (backendStatus === "available" && cardToDelete?.flashcardSetId) {
      try {
        await flashcardAPI.deleteFlashcards(cardToDelete.flashcardSetId);
      } catch (error) {
        console.error("Error deleting from backend:", error);
      }
    }

    setFlashcards((prev) => prev.filter((card) => card.id !== id));
  };

  const handleDeleteCard = (id) => {
    const cardToDelete = flashcards.find((card) => card.id === id);
    if (!cardToDelete) return;
    setDeletingCard(cardToDelete);
  };

  const handleEditCard = (id) => {
    const cardToEdit = flashcards.find((card) => card.id === id);
    if (!cardToEdit) return;

    setEditingCard({
      id: cardToEdit.id,
      front: cardToEdit.front,
      back: cardToEdit.back,
    });
  };

  // Helper function to format review date and get status
  const getReviewDateInfo = (cardId) => {
    const review = reviewData[cardId];
    if (!review || !review.nextReviewDate) {
      return { status: 'new', text: 'New Card', color: 'badge-outline' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reviewDate = new Date(review.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);
    const diffTime = reviewDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'overdue',
        text: `Overdue ${Math.abs(diffDays)}d`,
        color: 'badge-error',
        date: reviewDate,
      };
    } else if (diffDays === 0) {
      return {
        status: 'due',
        text: 'Due Today',
        color: 'badge-warning',
        date: reviewDate,
      };
    } else if (diffDays <= 3) {
      return {
        status: 'soon',
        text: `Due in ${diffDays}d`,
        color: 'badge-info',
        date: reviewDate,
      };
    } else {
      return {
        status: 'upcoming',
        text: reviewDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        color: 'badge-outline',
        date: reviewDate,
      };
    }
  };

  const handleAnswer = async (correct) => {
    if (!studyCards[currentCardIndex]) return;

    if (correct) {
      setShowQualityButtons(true);
      return;
    }

    await handleSpacedRepetitionAnswer(1);
  };

  const handleSpacedRepetitionAnswer = async (quality) => {
    const studyCard = studyCards[currentCardIndex];
    if (!studyCard) return;

    const currentReviewData = reviewData[studyCard.id];

    if (currentReviewData) {
      const updatedReviewData = SpacedRepetitionScheduler.scheduleNextReview(
        currentReviewData,
        quality
      );
      setReviewData((prev) => ({
        ...prev,
        [studyCard.id]: updatedReviewData,
      }));

      try {
        if (backendStatus === "available" && studyCard.flashcardSetId) {
          await flashcardAPI.saveFlashcardProgress(
            studyCard.flashcardSetId,
            studyCard.id,
            quality >= 3,
            quality
          );
        }
      } catch (error) {
        console.error("Error saving progress to backend:", error);
      }
    }

    setFlashcards((prev) =>
      prev.map((card) => {
        if (card.id === studyCard.id) {
          return {
            ...card,
            totalAttempts: (card.totalAttempts || 0) + 1,
            correctCount:
              quality >= 3
                ? (card.correctCount || 0) + 1
                : card.correctCount || 0,
          };
        }
        return card;
      })
    );

    setShowQualityButtons(false);

    const newProgress = ((currentCardIndex + 1) / studyCards.length) * 100;
    setStudyProgress(Math.min(newProgress, 100));

    if (quality >= 3) {
      triggerStreakUpdate("flashcard_correct", 1, 0);
    }

    setTimeout(() => {
      if (currentCardIndex < studyCards.length - 1) {
        handleNextCard();
      } else {
        handleStudySessionComplete();
      }
    }, 1500);
  };

  const startStudySession = (subject, topic) => {
    const cards = getCardsForTopic(subject, topic);
    if (cards.length === 0) {
      alert(`No flashcards found for ${subject} > ${topic}`);
      return;
    }

    studySessionStartTime.current = new Date();
    setLastStudySubject(subject);
    setLastStudyTopic(topic);
    setStudyCards(cards);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setShowQualityButtons(false);
    setStudyProgress(0);
    setMode("study");

    const studyEvent = new CustomEvent("studyActivity", {
      detail: {
        type: "study_start",
        duration: 0,
        activity: "flashcards",
        subject: subject,
        topic: topic,
      },
    });
    window.dispatchEvent(studyEvent);
  };

  const startSpacedRepetitionSession = () => {
    const reviewCards = Object.values(reviewData);
    const dueCards = SpacedRepetitionScheduler.getDueCards(reviewCards);
    const sortedCards = SpacedRepetitionScheduler.getStudyOrder(dueCards);

    const cards = sortedCards
      .map((reviewCard) => flashcards.find((card) => card.id === reviewCard.id))
      .filter((card) => card !== undefined);

    if (cards.length === 0) {
      alert("No cards due for review right now!");
      return;
    }

    studySessionStartTime.current = new Date();
    setLastStudySubject(null);
    setLastStudyTopic(null);
    setStudyCards(cards);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setShowQualityButtons(false);
    setStudyProgress(0);
    setMode("study");

    const studyEvent = new CustomEvent("studyActivity", {
      detail: {
        type: "study_start",
        duration: 0,
        activity: "spaced_repetition",
      },
    });
    window.dispatchEvent(studyEvent);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "easy":
        return "badge-easy";
      case "medium":
        return "badge-medium";
      case "hard":
        return "badge-hard";
      default:
        return "badge-outline";
    }
  };

  const getSubjectColor = (index) => {
    const colors = [
      "subject-dot-blue",
      "subject-dot-green",
      "subject-dot-purple",
      "subject-dot-orange",
      "subject-dot-pink",
    ];
    return colors[index % colors.length];
  };

  const renderDeleteModal = () =>
    deletingCard && (
      <div className="flashcards-modal-overlay">
        <div className="flashcards-modal">
          <h4 className="font-medium mb-2">Delete Flashcard</h4>
          <p className="text-sm text-muted">
            Are you sure you want to delete this flashcard? This action cannot
            be undone.
          </p>
          <div className="mt-4 p-3 rounded-md bg-muted">
            <p className="text-xs text-muted mb-1 uppercase tracking-wide">
              Preview
            </p>
            <p className="text-sm font-medium mb-1">
              {deletingCard.front || "Untitled question"}
            </p>
            {deletingCard.back && (
              <p className="text-xs text-muted line-clamp-2">
                {deletingCard.back}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="btn btn-outline"
              onClick={() => setDeletingCard(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await performDeleteCard(deletingCard.id);
                setDeletingCard(null);
              }}
            >
              Delete Card
            </button>
          </div>
        </div>
      </div>
    );

  const renderEditModal = () =>
    editingCard && (
      <div className="flashcards-modal-overlay">
        <div className="flashcards-modal">
          <h4 className="font-medium mb-2">Edit Flashcard</h4>
          <p className="text-sm text-muted">
            Update the question and answer for this card.
          </p>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Front (Question)</label>
              <textarea
                className="textarea"
                rows={3}
                value={editingCard.front}
                onChange={(e) =>
                  setEditingCard((prev) => ({
                    ...prev,
                    front: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Back (Answer)</label>
              <textarea
                className="textarea"
                rows={3}
                value={editingCard.back}
                onChange={(e) =>
                  setEditingCard((prev) => ({
                    ...prev,
                    back: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="btn btn-outline"
              onClick={() => setEditingCard(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setFlashcards((prev) =>
                  prev.map((card) =>
                    card.id === editingCard.id
                      ? {
                          ...card,
                          front: editingCard.front,
                          back: editingCard.back,
                        }
                      : card
                  )
                );
                setEditingCard(null);
              }}
              disabled={!editingCard.front.trim() || !editingCard.back.trim()}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );

  // ==================== RENDER MODES ====================
  if (mode === "uploadPreview" && uploadedFile) {
    return (
      <div className="flashcards-container space-y-6">
        {/* Show backend status for debugging */}
        {process.env.NODE_ENV === "development" && (
          <div
            className={`backend-status ${
              backendStatus === "available"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            } p-2 rounded text-sm`}
          >
            Backend: {backendStatus}
          </div>
        )}
        {/* Error message for unauthorized access */}
        {backendStatus === "unavailable" && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <FaExclamationTriangle className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <h4 className="font-medium text-blue-800">
                  Working in Offline Mode
                </h4>
                <p className="text-blue-600 text-sm">
                  {error ||
                    "You can still create and study flashcards locally. All data will be saved to your browser."}
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Upload Preview</h2>
            <p className="text-muted">
              Review your file before generating flashcards
            </p>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              setUploadedFile(null);
              setMode("subjects");
            }}
          >
            Cancel
          </button>
        </div>
        <div className="file-preview">
          <div className="file-preview-header">
            <div className="file-preview-icon">
              {getFileIcon(uploadedFile.type)}
            </div>
            <div className="file-preview-info">
              <div className="file-preview-name">{uploadedFile.name}</div>
              <div className="file-preview-meta">
                {(uploadedFile.size / 1024).toFixed(2)} KB • {uploadedFile.type}{" "}
                • Last modified:{" "}
                {new Date(uploadedFile.lastModified).toLocaleDateString()}
              </div>
            </div>
          </div>

          {uploadedFile.preview && (
            <div className="file-preview-content">
              <h4 className="font-medium mb-2">Content Preview:</h4>
              <pre>{uploadedFile.preview.substring(0, 500)}...</pre>
            </div>
          )}

          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium">
              Number of Flashcards to Generate: {cardCount}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={cardCount}
                onChange={(e) => setCardCount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="font-bold w-8 text-center">{cardCount}</span>
            </div>
            <p className="text-xs text-muted">
              Note: The AI might generate slightly fewer cards depending on content length.
            </p>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={processFileUpload}
              className="btn btn-primary flex-1"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FaMagic className="w-4 h-4" />
                  Generate Flashcards
                </>
              )}
            </button>
            <button
              onClick={() => {
                setUploadedFile(null);
                setMode("subjects");
              }}
              className="btn btn-outline"
            >
              Choose Different File
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "previewGenerated") {
    return (
      <div className="flashcards-container space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Preview Generated Flashcards</h3>
            <p className="text-muted">
              {generatedCards.length} cards generated
            </p>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => {
              setGeneratedCards([]);
              setUploadedFile(null);
              setMode("subjects");
            }}
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="error-banner">
            <p>{error}</p>
          </div>
        )}

        <div className="cards-grid">
          {generatedCards.map((card, index) => (
            <div key={card.id} className="card-item">
              <div className="card-header">
                <span className="badge badge-secondary">Generated</span>
                <span className="text-xs text-muted">Card {index + 1}</span>
              </div>
              <div className="card-body">
                <p className="card-question">{card.front}</p>
                <p className="card-answer">{card.back}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card-item p-6">
          <h4 className="font-medium mb-4">Save to Collection</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <select
                  className="select"
                  value={newCard.subject}
                  onChange={(e) =>
                    setNewCard({ ...newCard, subject: e.target.value })
                  }
                >
                  <option value="">Select Subject</option>
                  {userSubjects.map((subject, index) => (
                    <option key={index} value={subject}>
                      {subject}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <input
                  className="input"
                  type="text"
                  value={newCard.topic}
                  onChange={(e) =>
                    setNewCard({ ...newCard, topic: e.target.value })
                  }
                  placeholder="Enter topic name"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() =>
                  saveGeneratedCards(newCard.subject, newCard.topic)
                }
                disabled={!newCard.subject || !newCard.topic}
                className="btn btn-primary flex-1"
              >
                Save {generatedCards.length} Cards
              </button>
              <button
                onClick={() => {
                  setGeneratedCards([]);
                  setUploadedFile(null);
                  setMode("subjects");
                }}
                className="btn btn-outline"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "study" && studyCards.length > 0) {
    const currentCard = studyCards[currentCardIndex];

    const handleCardTap = () => {
      // Tap to flip between question and answer
      setShowAnswer((prev) => !prev);
      // Hide quality buttons when manually flipping
      if (showQualityButtons) {
        setShowQualityButtons(false);
      }
    };

    return (
      <div className="study-container space-y-6">
        {/* Study Progress */}
        <div className="study-progress">
          <div className="progress-header">
            <h3 className="font-medium">Study Session Progress</h3>
            <span className="text-sm text-muted">
              {currentCardIndex + 1} of {studyCards.length}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${studyProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Flashcard */}
        <div className={`flashcard ${showAnswer ? "flipped" : ""}`}>
          <div className="flashcard-header">
            <span className={getDifficultyColor(currentCard.difficulty)}>
              {currentCard.difficulty}
            </span>
            <span className="badge badge-outline">
              {currentCard.subject} → {currentCard.topic}
            </span>
          </div>
          <div
            className="flashcard-content"
            onClick={handleCardTap}
          >
            <div className="flashcard-inner">
              <div className="flashcard-face card-front">
                <h3>{currentCard.front}</h3>
              </div>
              <div className="flashcard-face card-back">
                <p>{currentCard.back}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
              {!showAnswer ? (
                <button
                  onClick={() => setShowAnswer(true)}
                  className="btn btn-outline"
                >
                  <FaEye className="w-4 h-4 mr-2" />
                  Show Answer
                </button>
              ) : (
                <div className="space-y-4">
                  {!showQualityButtons ? (
                    <div className="flex gap-2">
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleAnswer(false)}
                      >
                        Incorrect
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAnswer(true)}
                      >
                        Correct
                      </button>
                    </div>
                  ) : (
                    <div className="quality-buttons">
                      <p className="quality-label">
                        How well did you know this?
                      </p>
                      <div className="quality-grid">
                        <button
                          className="btn btn-outline quality-btn"
                          onClick={() => handleSpacedRepetitionAnswer(5)}
                        >
                          <FaCheckCircle className="w-4 h-4 mr-2 icon-green" />
                          Perfect - Easy recall
                        </button>
                        <button
                          className="btn btn-outline quality-btn"
                          onClick={() => handleSpacedRepetitionAnswer(4)}
                        >
                          <FaCheckCircle className="w-4 h-4 mr-2 icon-blue" />
                          Correct - With hesitation
                        </button>
                        <button
                          className="btn btn-outline quality-btn"
                          onClick={() => handleSpacedRepetitionAnswer(3)}
                        >
                          <FaExclamationTriangle className="w-4 h-4 mr-2 icon-yellow" />
                          Correct - With difficulty
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* Navigation */}
        <div className="navigation-buttons">
          <button
            className="btn btn-outline"
            onClick={handlePrevCard}
            disabled={currentCardIndex === 0}
          >
            <FaChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <button
            className="btn btn-outline"
            onClick={() => {
              if (
                window.confirm(
                  "Exit study session? Your progress will be saved."
                )
              ) {
                handleStudySessionComplete();
              }
            }}
          >
            Save & Exit
          </button>

          <button
            className="btn btn-primary"
            onClick={handleNextCard}
            disabled={studyCards.length === 0}
          >
            {currentCardIndex >= studyCards.length - 1 ? (
              showAnswer ? (
              <>
                <FaCheckCircle className="w-4 h-4 mr-2" />
                Complete Session
              </>
              ) : (
                <>
                  <FaEye className="w-4 h-4 mr-2" />
                  Reveal Answer
                </>
              )
            ) : (
              <>
                <FaChevronRight className="w-4 h-4 mr-2" />
                Next Card
              </>
            )}
          </button>
        </div>

        {/* Progress Stats */}
        <div className="progress-stats">
          <div className="flex justify-between text-sm text-muted">
            <span>
              Card {currentCardIndex + 1} of {studyCards.length}
            </span>
            <span>{Math.round(studyProgress)}% complete</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="flex items-center">
              <FaFire className="w-3 h-3 mr-1 text-orange-500" />
              Streak: {streakData.currentStreak} days
            </span>
            <span className="flex items-center">
              <FaTrophy className="w-3 h-3 mr-1 text-yellow-500" />
              Today: {Math.round(todaysProgress.hoursStudied * 60)}/
              {Math.round(todaysProgress.goal * 60)} min
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="flashcards-container space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create New Flashcard</h3>
          <button
            className="btn btn-outline"
            onClick={() => setMode("subjects")}
          >
            Cancel
          </button>
        </div>

        <div className="card-item p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Front (Question)</label>
              <textarea
                className="textarea"
                value={newCard.front}
                onChange={(e) =>
                  setNewCard({ ...newCard, front: e.target.value })
                }
                placeholder="Enter the question or prompt..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Back (Answer)</label>
              <textarea
                className="textarea"
                value={newCard.back}
                onChange={(e) =>
                  setNewCard({ ...newCard, back: e.target.value })
                }
                placeholder="Enter the answer..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <select
                  className="select"
                  value={newCard.subject}
                  onChange={(e) =>
                    setNewCard({ ...newCard, subject: e.target.value })
                  }
                >
                  <option value="">Select Subject</option>
                  {userSubjects.map((subject, index) => (
                    <option key={index} value={subject}>
                      {subject}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Topic</label>
                <input
                  className="input"
                  type="text"
                  value={newCard.topic}
                  onChange={(e) =>
                    setNewCard({ ...newCard, topic: e.target.value })
                  }
                  placeholder="e.g., Calculus, Chemistry, World War II"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Difficulty</label>
              <select
                className="select"
                value={newCard.difficulty}
                onChange={(e) =>
                  setNewCard({ ...newCard, difficulty: e.target.value })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <button
              onClick={handleCreateCard}
              className="btn btn-primary w-full"
            >
              Create Flashcard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "browse" && selectedSubjectForTopics) {
    const subjectCards = flashcards.filter(
      (card) => card.subject === selectedSubjectForTopics
    );
    const topics = [...new Set(subjectCards.map((card) => card.topic))];

    const subjectIndex = subjects.findIndex(
      (s) => s.name === selectedSubjectForTopics
    );
    const accentPalettes = [
      ["#3b82f6", "#1d4ed8"], // blue
      ["#22c55e", "#16a34a"], // green
      ["#8b5cf6", "#6d28d9"], // purple
      ["#f97316", "#ea580c"], // orange
      ["#ec4899", "#db2777"], // pink
    ];
    const [accent1, accent2] =
      accentPalettes[
        subjectIndex >= 0 ? subjectIndex % accentPalettes.length : 0
      ];

    return (
      <div
        className="flashcards-container space-y-6"
        style={{
          "--subject-accent-1": accent1,
          "--subject-accent-2": accent2,
        }}
      >
        <div className="flex items-center gap-4 mb-6">
          <button
            className="btn btn-outline"
            onClick={() => setMode("subjects")}
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Subjects
          </button>
        </div>

        <div>
          <h2 className="text-xl font-bold">{selectedSubjectForTopics}</h2>
          <p className="text-muted">
            {subjectCards.length} cards in {topics.length} topics
          </p>
        </div>

        <div className="topics-grid">
          {topics.map((topic) => {
            const topicCards = subjectCards.filter(
              (card) => card.topic === topic
            );
            const dueCards = topicCards.filter((card) => {
              const review = reviewData[card.id];
              return review && new Date(review.nextReviewDate) <= new Date();
            }).length;

            return (
              <div
                key={topic}
                className="topic-card"
                onClick={() => {
                  setSelectedSubject(selectedSubjectForTopics);
                  setSelectedTopic(topic);
                  startStudySession(selectedSubjectForTopics, topic);
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-medium line-clamp-1">{topic}</h3>
                  <span className="badge badge-outline text-xs">
                    {topicCards.length} cards
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Due now:</span>
                    <span
                      className={
                        dueCards > 0
                          ? "text-warning font-medium"
                          : "text-success"
                      }
                    >
                      {dueCards}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Mastered:</span>
                    <span>
                      {
                        topicCards.filter((card) => {
                          const review = reviewData[card.id];
                          return review && review.repetitions >= 5;
                        }).length
                      }
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-outline w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSubject(selectedSubjectForTopics);
                    setSelectedTopic(topic);
                    startStudySession(selectedSubjectForTopics, topic);
                  }}
                >
                  <FaBookOpen className="w-4 h-4 mr-2" />
                  Start Studying
                </button>

                <div className="flex gap-2 mt-3">
                  <button
                    className="btn btn-secondary btn-sm btn-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewCard((prev) => ({
                        ...prev,
                        subject: selectedSubjectForTopics,
                        topic: topic || "",
                      }));
                      setMode("create");
                    }}
                  >
                    <FaPlus className="w-4 h-4" />
                    Add Card
                  </button>
                  <button
                    className="btn btn-outline btn-sm btn-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSubject(selectedSubjectForTopics);
                      setSelectedTopic(topic);
                      setMode("manageTopic");
                    }}
                  >
                    <FaEdit className="w-4 h-4" />
                    Manage Cards
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {topics.length === 0 && (
          <div className="empty-state">
            <FaFolder className="empty-icon" />
            <h3 className="empty-title">No topics yet</h3>
            <p className="empty-description">
              Create flashcards for <strong>{selectedSubjectForTopics}</strong>{" "}
              to see topics appear here. Each topic is a collection of related
              cards for faster, focused study.
            </p>
            <div className="empty-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setNewCard((prev) => ({
                    ...prev,
                    subject: selectedSubjectForTopics,
                    topic: "",
                  }));
                  setMode("create");
                }}
              >
                <FaPlus className="w-4 h-4 mr-2" />
                Create Flashcard
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setNewCard((prev) => ({
                    ...prev,
                    subject: selectedSubjectForTopics,
                    topic: "",
                  }));
                  fileInputRef.current?.click();
                }}
              >
                <FaUpload className="w-4 h-4 mr-2" />
                Upload & Generate
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === "manageTopic" && selectedSubject && selectedTopic) {
    let topicCards = getCardsForTopic(selectedSubject, selectedTopic);

    return (
      <div className="flashcards-container space-y-6">
        <div className="flashcards-toolbar">
          <button
            className="btn btn-outline"
            onClick={() => {
              setMode("browse");
              setSelectedSubjectForTopics(selectedSubject);
            }}
          >
            <FaArrowLeft className="w-4 h-4 mr-2" />
            Back to Topics
          </button>
        </div>

        {topicCards.length === 0 ? (
          <div className="empty-state">
            <FaFolderOpen className="empty-icon" />
            <h3 className="empty-title">No cards in this topic yet</h3>
            <p className="empty-description">
              Add new flashcards manually or generate them from your study
              material.
            </p>
            <div className="empty-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setNewCard((prev) => ({
                    ...prev,
                    subject: selectedSubject,
                    topic: selectedTopic,
                  }));
                  setMode("create");
                }}
              >
                <FaPlus className="w-4 h-4 mr-2" />
                Add Card
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flashcards-section-header">
              <div className="flashcards-section-title">
                <h2>
                    {selectedSubject} – {selectedTopic}
                  </h2>
                <p>
                  {topicCards.length} card{topicCards.length !== 1 ? 's' : ''} in this topic
                  </p>
                </div>
                </div>
            <div className="cards-grid">
            {topicCards.map((card) => {
              const reviewInfo = getReviewDateInfo(card.id);
              return (
                <div key={card.id} className="card-item">
                  <div className="card-body">
                    <div className="flex items-start justify-between mb-2">
                      <p className="card-question">{card.front}</p>
                      <span className={`badge ${reviewInfo.color} text-xs ml-2 flex items-center gap-1`}>
                        <FaClock className="w-3 h-3" />
                        {reviewInfo.text}
                      </span>
                    </div>
                    <p className="card-answer mt-2">{card.back}</p>
                    {reviewData[card.id] && reviewData[card.id].repetitions > 0 && (
                      <div className="mt-2 text-xs text-muted flex items-center gap-2">
                        <span>Reviewed {reviewData[card.id].repetitions} time{reviewData[card.id].repetitions !== 1 ? 's' : ''}</span>
                        {reviewData[card.id].lastReviewed && (
                          <span className="flex items-center gap-1">
                            <FaCalendarAlt className="w-3 h-3" />
                            Last: {new Date(reviewData[card.id].lastReviewed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="card-actions card-actions-bottom">
                      <button
                        className="action-btn"
                        title="Edit card"
                        onClick={() => handleEditCard(card.id)}
                      >
                        <FaEdit className="w-4 h-4" />
                      </button>
                      <button
                        className="action-btn"
                        title="Delete card"
                        onClick={() => handleDeleteCard(card.id)}
                      >
                        <FaTrashAlt className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}

        {renderEditModal()}
        {renderDeleteModal()}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flashcards-container">
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading your flashcards...</p>
        </div>
      </div>
    );
  }

  // Default: Subjects View
  return (
    <div className="flashcards-container space-y-6">
      {/* Header */}
      <div className="flashcards-header">
        <div>
          <h2 className="flashcards-title">Flashcards</h2>
          <p className="flashcards-subtitle">
            {flashcards.length} cards organized in {subjects.length} subjects
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-smart-review"
            onClick={startSpacedRepetitionSession}
            disabled={
              spacedRepetitionAnalytics.dueToday === 0 &&
              spacedRepetitionAnalytics.overdueCards === 0
            }
          >
            <FaBrain className="w-4 h-4" />
            Smart Review (
            {spacedRepetitionAnalytics.dueToday +
              spacedRepetitionAnalytics.overdueCards}
            )
          </button>
          <button onClick={() => setMode("create")} className="btn btn-primary">
            <FaPlus className="w-4 h-4" />
            Create Card
          </button>
        </div>
      </div>

      {/* Summary + AI layout */}
      <div className="flashcards-main-grid">
        {/* Left: streak */}
        <div className="space-y-4">
          {/* Streak Display */}
          <div className="streak-display">
            <div className="streak-info">
              <div className="flex items-center gap-4">
                <div
                  className={`streak-icon ${
                    isStreakComplete ? "streak-complete" : ""
                  }`}
                >
                  <FaFire className="w-6 h-6 text-orange-500" />
                  {isStreakComplete && (
                    <>
                      <span className="streak-flame" aria-hidden="true"></span>
                      <span className="streak-embers" aria-hidden="true"></span>
                    </>
                  )}
                </div>
                <div>
                  <h3 className="font-medium">Current Streak</h3>
                  <p className="text-2xl font-bold">
                    {streakData.currentStreak} days
                  </p>
                </div>
              </div>
              <div className="progress-bar mt-2">
                <div
                  className="progress-fill bg-orange-500"
                  style={{ width: `${todaysProgress.progressPercent}%` }}
                ></div>
              </div>
              <p className="text-sm text-muted mt-1">
                {Math.round(todaysProgress.hoursStudied * 60)}/
                {Math.round(todaysProgress.goal * 60)} minutes today
              </p>
            </div>
            <div className="streak-stats">
              <div className="stat-item">
                <span className="stat-label">Longest Streak</span>
                <span className="stat-value">{streakData.longestStreak}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Days</span>
                <span className="stat-value">{streakData.totalStudyDays}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Total Hours</span>
                <span className="stat-value">
                  {Math.round(streakData.totalStudyHours)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right: AI Generation Options + Learning Progress */}
        <div className="space-y-4">
          <div className="card-item p-6">
            <h3 className="font-medium mb-4">AI-Powered Flashcard Generation</h3>

          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  Upload Study Material
                </label>
                <div className="flex gap-2">
                  <input
                    id="fileInput"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isGenerating}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-outline flex items-center gap-2"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaUpload className="w-4 h-4" /> Choose File
                      </>
                    )}
                  </button>
                  {uploadedFile && (
                    <div className="flex items-center gap-2 text-sm bg-muted px-3 py-2 rounded-lg flex-1">
                      <FaFileAlt className="w-4 h-4 text-muted" />
                      <span className="truncate">{uploadedFile.name}</span>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="text-destructive hover:text-destructive/80 ml-auto"
                        disabled={isGenerating}
                      >
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted mt-2">
                  Supports PDF, DOCX, PPTX, Excel, Text, and Images
                </p>
              </div>
            </div>

            {uploadedFile && !isGenerating && (
              <button
                onClick={() => setMode("uploadPreview")}
                className="btn btn-secondary w-full"
              >
                <FaEye className="w-4 h-4 mr-2" />
                Preview & Generate Flashcards
              </button>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Or generate from text:</h4>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Paste your study notes here and press Enter..."
                className="input"
                style={{ flex: "100%" }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && e.target.value.trim().length > 10) {
                    generateFromText(e.target.value);
                  }
                }}
              />
              <button
                onClick={() => {
                  const text = prompt("Enter study material text:");
                  if (text && text.trim().length > 10) generateFromText(text);
                }}
                className="btn btn-primary"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Learning Progress - full width */}
      <div className="insights-card">
        <div className="insights-header">
          <FaBrain className="insights-icon" />
          <h3 className="font-medium">Learning Progress</h3>
        </div>
        <div className="insights-grid insights-grid-6">
          <div className="text-center">
            <div className="stat-value stat-mastered">
              {spacedRepetitionAnalytics.masteredCards}
            </div>
            <p className="stat-label">Mastered</p>
          </div>
          <div className="text-center">
            <div className="stat-value stat-due">
              {spacedRepetitionAnalytics.learningCards}
            </div>
            <p className="stat-label">Learning</p>
          </div>
          <div className="text-center">
            <div className="stat-value stat-mastered">
              {spacedRepetitionAnalytics.totalCards}
            </div>
            <p className="stat-label">Total Cards</p>
          </div>
          <div className="text-center">
            <div className="stat-value stat-due">
              {spacedRepetitionAnalytics.dueToday}
            </div>
            <p className="stat-label">Due Today</p>
          </div>
          <div className="text-center">
            <div className="stat-value stat-overdue">
              {spacedRepetitionAnalytics.overdueCards}
            </div>
            <p className="stat-label">Overdue</p>
          </div>
          <div className="text-center">
            <div className="stat-value stat-ease">
              {spacedRepetitionAnalytics.cardsReviewedThisWeek}
            </div>
            <p className="stat-label">This Week</p>
          </div>
        </div>
      </div>

      {/* Subjects Header & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <h3 className="font-bold text-xl">My Subjects</h3>
        
        <div className="flashcards-subjects-actions flex gap-2 w-full md:w-auto">
          <div className="flashcards-subjects-search relative flex-1 md:w-64">
            <input
              type="text"
              placeholder="Search subjects..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FaFolderOpen className="absolute left-3 top-3 text-muted-foreground w-4 h-4" />
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={() => setIsAddingSubject(true)}
          >
            <FaPlus className="w-4 h-4 mr-2" />
            Add Subject
          </button>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="subjects-grid">
        {subjects.map((subject, index) => {
          const subjectStats = flashcards.filter(
            (card) => card.subject === subject.name
          );
          
          // Calculate average success rate
          const reviewedCards = subjectStats.filter(card => reviewData[card.id]);
          const successRate = reviewedCards.length > 0 
            ? Math.round(
                (reviewedCards.reduce((sum, card) => sum + (card.correctCount || 0), 0) / 
                 reviewedCards.reduce((sum, card) => sum + (card.totalAttempts || 0), 0)) * 100
              ) || 0
            : 0;

          return (
            <div
              key={subject.name}
              className="subject-card"
              onClick={() => {
                setSelectedSubjectForTopics(subject.name);
                setMode("browse");
              }}
            >
              <div className="card-header">
                <div className="subject-title">
                  <span className={`subject-dot ${getSubjectColor(index)}`}></span>
                  <h3>{subject.name}</h3>
                </div>
                <FaFolder className="text-muted-foreground w-5 h-5" />
              </div>
              
              <div className="subject-content">
                <div className="subject-row">
                  <span className="row-label">Topics:</span>
                  <span className="badge badge-secondary">{subject.topics.length}</span>
                </div>
                <div className="subject-row">
                  <span className="row-label">Cards:</span>
                  <span className="badge badge-outline">{subjectStats.length}</span>
                </div>
                <div className="subject-row">
                  <span className="row-label">Avg. Success:</span>
                  <span className="badge badge-outline">{successRate}%</span>
                </div>
              </div>

              <div className="card-footer">
                <button className="subject-button">
                  Explore Topics
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {subjects.length === 0 && (
        <div className="empty-state">
          <FaFolder className="empty-icon" />
          <h3 className="empty-title">No flashcards yet</h3>
          <p className="empty-description">
            Create your first flashcard or use AI to generate flashcards from
            your study materials.
          </p>
          <div className="empty-actions">
            <button
              onClick={() => setMode("create")}
              className="btn btn-primary"
            >
              <FaPlus className="w-4 h-4 mr-2" />
              Create Manually
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-outline"
            >
              <FaUpload className="w-4 h-4 mr-2" />
              Upload & Generate
            </button>
          </div>
        </div>
      )}

      {/* Add Subject Popup Modal */}
      {isAddingSubject && (
        <div className="flashcards-modal-overlay">
          <div className="flashcards-modal">
            <h4 className="font-medium mb-2">Add New Subject</h4>
            <p className="text-sm text-muted">
              Give your new subject a clear, memorable name.
            </p>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Enter subject name..."
                className="input w-full"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddSubject()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="btn btn-outline"
                onClick={() => setIsAddingSubject(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddSubject}
                disabled={!newSubjectName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {renderEditModal()}
      {renderDeleteModal()}
    </div>
  );
}

export default Flashcards;
