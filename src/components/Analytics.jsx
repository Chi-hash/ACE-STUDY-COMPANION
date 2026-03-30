import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar,
  Clock,
  Target,
  BookOpen,
  Brain,
  Trophy,
  Activity,
  Zap,
  TrendingUp,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from "recharts";
import "../styles/analytics.css";
import { analyticsAPI, flashcardAPI, userAPI } from "../services/apiClient.js";
import { auth } from "../assets/js/firebase.js";

/** When gamification total hours aren’t available, estimate minutes from cards reviewed. */
const MINUTES_PER_CARD_ESTIMATE = 2.5;

function formatSubjectStudyMinutes(totalMinutes) {
  const m = Math.round(Number(totalMinutes) || 0);
  if (m <= 0) return "0 min studied";
  if (m < 60) return `${m} min studied`;
  const h = m / 60;
  return `${h >= 10 ? Math.round(h) : h.toFixed(1)}h studied`;
}

const LOCAL_FLASHCARDS_KEY = "ace-it-flashcards";
const LOCAL_REVIEW_DATA_KEY = "ace-it-review-data";

/**
 * GET /get_flashcards returns decks: [{ id, flashcards: [...] }, ...].
 * Analytics must flatten to individual cards (same as Flashcard.jsx).
 */
function flattenFlashcardsApiPayload(apiValue) {
  const raw = apiValue?.flashcards;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (first && Array.isArray(first.flashcards)) {
    return raw.flatMap((set) => {
      const inner = set?.flashcards || [];
      const setMeta = set && typeof set === "object" ? set : {};
      return inner.map((card, index) => ({
        ...card,
        id: String(card?.id ?? `${setMeta.id ?? "set"}-${index}`),
        subject: card?.subject || setMeta.subject || "General",
        topic: card?.topic || setMeta.title || "General",
        flashcardSetId: setMeta.id,
      }));
    });
  }
  return raw.map((card, i) => ({
    ...card,
    id: String(card?.id ?? `card-${i}`),
  }));
}

/** Local study timestamps live in ace-it-review-data, not always on card objects. */
function loadLocalFlashcardsMergedWithReviews() {
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_FLASHCARDS_KEY) || "[]");
    const reviewData = JSON.parse(
      localStorage.getItem(LOCAL_REVIEW_DATA_KEY) || "{}",
    );
    if (!Array.isArray(local)) return [];
    return local
      .filter((card) => card && card.id != null)
      .map((card) => {
        const rev = reviewData[card.id];
        const lr =
          card.lastReviewed || card.lastStudied || rev?.lastReviewed;
        return {
          ...card,
          lastReviewed: lr,
          lastStudied: card.lastStudied || lr,
          srsRepetitions:
            typeof rev?.repetitions === "number" ? rev.repetitions : 0,
        };
      });
  } catch {
    return [];
  }
}

function mergeFlashcardSources(apiCards, localCards) {
  const byId = new Map();
  apiCards.forEach((c) => {
    if (!c || c.id == null) return;
    byId.set(String(c.id), { ...c });
  });
  localCards.forEach((c) => {
    if (!c || c.id == null) return;
    const id = String(c.id);
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, { ...c });
      return;
    }
    byId.set(id, {
      ...existing,
      ...c,
      totalAttempts: Math.max(
        Number(existing.totalAttempts) || 0,
        Number(c.totalAttempts) || 0,
      ),
      correctCount: Math.max(
        Number(existing.correctCount) || 0,
        Number(c.correctCount) || 0,
      ),
      lastReviewed:
        c.lastReviewed ||
        existing.lastReviewed ||
        c.lastStudied ||
        existing.lastStudied,
      lastStudied: c.lastStudied || existing.lastStudied,
      subject: c.subject || existing.subject,
      topic: c.topic || existing.topic,
      srsRepetitions: Math.max(
        Number(existing.srsRepetitions) || 0,
        Number(c.srsRepetitions) || 0,
      ),
    });
  });
  return Array.from(byId.values());
}

export function Analytics() {
  const [studySessions, setStudySessions] = useState([]);
  const [subjectProgress, setSubjectProgress] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState("week");
  const [prediction, setPrediction] = useState(null);
  const [predictionError, setPredictionError] = useState("");
  const [predictionLoading, setPredictionLoading] = useState(false);
  const isMountedRef = useRef(true);

  // Chart colors
  const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];

  /** Subject label for hours logged via dashboard / quiz (no per-day subject in API). */
  const primaryProfileSubject = (profile) => {
    const s = profile?.subject;
    if (Array.isArray(s) && s.length) return String(s[0]);
    if (typeof s === "string" && s.trim()) return s.trim();
    return "Logged study";
  };

  const loadAnalytics = useCallback(async () => {
    const toLocalDateString = (date = new Date()) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    try {
      const [flashcardResponse, gamificationResponse, profileResponse] =
        await Promise.allSettled([
          flashcardAPI.getFlashcards(),
          auth.currentUser?.uid
            ? analyticsAPI.getGamification(auth.currentUser.uid)
            : Promise.resolve(null),
          auth.currentUser?.uid
            ? userAPI.getProfile()
            : Promise.resolve(null),
        ]);

      const apiPayload =
        flashcardResponse.status === "fulfilled"
          ? flashcardResponse.value
          : {};
      const fromApi = flattenFlashcardsApiPayload(apiPayload);
      const fromLocal = loadLocalFlashcardsMergedWithReviews();
      const flashcards = mergeFlashcardSources(fromApi, fromLocal);

      const gamification =
        gamificationResponse.status === "fulfilled"
          ? gamificationResponse.value?.gamification || null
          : null;

      const progressMap = new Map();
      const sessionsMap = new Map();

      flashcards.forEach((card) => {
        if (!card) return;
        const subjectName = card.subject || "General";
        const entry = progressMap.get(subjectName) || {
          subject: subjectName,
          totalCards: 0,
          masteredCards: 0,
          totalAttempts: 0,
          totalCorrect: 0,
          timeSpent: 0,
          lastStudied: null,
        };

        entry.totalCards += 1;
        entry.totalAttempts += card.totalAttempts || 0;
        entry.totalCorrect += card.correctCount || 0;
        const rep = Number(card.srsRepetitions);
        const srsMastered = Number.isFinite(rep) && rep >= 5;
        const legacyMastered =
          !Number.isFinite(rep) || rep === 0
            ? (card.correctCount || 0) >= 3
            : false;
        if (srsMastered || legacyMastered) {
          entry.masteredCards += 1;
        }
        if (card.lastReviewed || card.lastStudied) {
          entry.lastStudied = card.lastReviewed || card.lastStudied;
        }

        progressMap.set(subjectName, entry);

        const lastReviewed = card.lastReviewed || card.lastStudied;
        if (!lastReviewed) return;
        const dateKey = toLocalDateString(new Date(lastReviewed));
        const sessionKey = `${dateKey}__${subjectName}`;
        const session = sessionsMap.get(sessionKey) || {
          date: dateKey,
          subject: subjectName,
          duration: 0,
          cardsStudied: 0,
          correctAnswers: 0,
          totalAttempts: 0,
          accuracy: 0,
        };

        session.cardsStudied += 1;
        session.correctAnswers += card.correctCount || 0;
        session.totalAttempts += card.totalAttempts || 0;
        session.accuracy =
          session.totalAttempts > 0
            ? Math.round((session.correctAnswers / session.totalAttempts) * 100)
            : 0;

        sessionsMap.set(sessionKey, session);
      });

      const totalStudyHours = gamification?.total_study_hours || 0;
      const totalStudyMinutes = Math.max(0, totalStudyHours * 60);

      // Apportion backend "total study hours" only across flashcard rows (cardsStudied > 0).
      // Rows added later from AttendanceDays keep explicit minute durations.
      if (sessionsMap.size > 0) {
        const sessionsByDate = {};
        sessionsMap.forEach((session) => {
          if (session.cardsStudied <= 0) return;
          sessionsByDate[session.date] =
            (sessionsByDate[session.date] || 0) + session.cardsStudied;
        });

        const totalCards = Object.values(sessionsByDate).reduce(
          (sum, count) => sum + count,
          0,
        );

        sessionsMap.forEach((session) => {
          if (session.cardsStudied <= 0) return;
          if (totalStudyMinutes > 0 && totalCards > 0) {
            const dateTotalCards = sessionsByDate[session.date] || 1;
            const dateMinutes = (dateTotalCards / totalCards) * totalStudyMinutes;
            session.duration =
              (session.cardsStudied / dateTotalCards) * dateMinutes;
          } else {
            session.duration = Math.round(
              session.cardsStudied * MINUTES_PER_CARD_ESTIMATE,
            );
          }
        });
      }

      // Daily hours from /log_activity (Firestore AttendanceDays) — fills charts when
      // flashcards have no review dates yet.
      const profilePayload =
        profileResponse?.status === "fulfilled" ? profileResponse.value : null;
      const profileDoc =
        profilePayload?.ok && profilePayload.profile ? profilePayload.profile : null;
      const attendanceDays = Array.isArray(profileDoc?.AttendanceDays)
        ? profileDoc.AttendanceDays
        : Array.isArray(profileDoc?.attendance_days)
          ? profileDoc.attendance_days
          : [];

      const logSubject = primaryProfileSubject(profileDoc);
      attendanceDays.forEach((row) => {
        const h = Number(row?.hours_used);
        if (!Number.isFinite(h) || h <= 0) return;
        const dateStr =
          typeof row?.date === "string" ? row.date.trim() : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
        const key = `${dateStr}__${logSubject}`;
        const addMin = Math.round(h * 60);
        const existing = sessionsMap.get(key);
        if (existing) {
          existing.duration = (existing.duration || 0) + addMin;
          sessionsMap.set(key, existing);
        } else {
          sessionsMap.set(key, {
            date: dateStr,
            subject: logSubject,
            duration: addMin,
            cardsStudied: 0,
            correctAnswers: 0,
            totalAttempts: 0,
            accuracy: 0,
          });
        }
      });

      // Sum session durations (minutes) per subject — entry.timeSpent was never filled before.
      const minutesBySubject = new Map();
      sessionsMap.forEach((session) => {
        const sub = session.subject || "General";
        const add = Number(session.duration) || 0;
        minutesBySubject.set(sub, (minutesBySubject.get(sub) || 0) + add);
      });

      const progress = Array.from(progressMap.values()).map((entry) => ({
        subject: entry.subject,
        totalCards: entry.totalCards,
        masteredCards: entry.masteredCards,
        averageAccuracy:
          entry.totalAttempts > 0
            ? Math.round((entry.totalCorrect / entry.totalAttempts) * 100)
            : 0,
        timeSpent: minutesBySubject.get(entry.subject) || 0,
        lastStudied: entry.lastStudied || "N/A",
      }));

      if (isMountedRef.current) {
        setStudySessions(Array.from(sessionsMap.values()));
        setSubjectProgress(progress);
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
      if (isMountedRef.current) {
        setStudySessions([]);
        setSubjectProgress([]);
      }
    }
  }, []);

  // Load analytics data from backend
  useEffect(() => {
    isMountedRef.current = true;
    loadAnalytics();

    const handleStudyActivity = () => {
      setTimeout(() => loadAnalytics(), 400);
    };

    const refreshInterval = setInterval(() => {
      loadAnalytics();
    }, 60000);

    window.addEventListener("studyActivity", handleStudyActivity);
    window.addEventListener("aceit_activity_logged", handleStudyActivity);
    return () => {
      isMountedRef.current = false;
      clearInterval(refreshInterval);
      window.removeEventListener("studyActivity", handleStudyActivity);
      window.removeEventListener("aceit_activity_logged", handleStudyActivity);
    };
  }, [loadAnalytics]);

  useEffect(() => {
    const loadPrediction = async () => {
      setPredictionLoading(true);
      setPredictionError("");
      try {
        const response = await analyticsAPI.getPerformancePrediction();
        setPrediction(response);
      } catch (error) {
        console.error("Error fetching prediction:", error);
        setPredictionError("Prediction unavailable");
      } finally {
        setPredictionLoading(false);
      }
    };

    loadPrediction();
  }, []);

  const getFilteredSessions = () => {
    const now = new Date();
    let cutoffDate = new Date();

    switch (selectedTimeRange) {
      case "week":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return studySessions.filter(
      (session) => new Date(session.date) >= cutoffDate,
    );
  };

  const getStudyStats = () => {
    const filteredSessions = getFilteredSessions();

    const totalSessions = filteredSessions.length;
    const totalTime = filteredSessions.reduce(
      (acc, session) => acc + session.duration,
      0,
    );
    const totalCards = filteredSessions.reduce(
      (acc, session) => acc + session.cardsStudied,
      0,
    );
    const totalCorrect = filteredSessions.reduce(
      (acc, session) => acc + session.correctAnswers,
      0,
    );
    const averageAccuracy =
      totalCards > 0 ? Math.round((totalCorrect / totalCards) * 100) : 0;

    // Logged study is stored as one row per day · subject = whole day’s hours — not one “session”.
    // Average only flashcard-backed rows (day · subject buckets that include card reviews).
    const flashBlocks = filteredSessions.filter((s) => s.cardsStudied > 0);
    const averageSessionTime =
      flashBlocks.length > 0
        ? Math.round(
            flashBlocks.reduce((a, s) => a + s.duration, 0) / flashBlocks.length,
          )
        : null;

    return {
      totalSessions,
      totalTime,
      totalCards,
      averageAccuracy,
      averageSessionTime,
    };
  };

  const getDailyStudyData = () => {
    const filteredSessions = getFilteredSessions();
    const dailyData = {};

    filteredSessions.forEach((session) => {
      if (!dailyData[session.date]) {
        dailyData[session.date] = { time: 0, cards: 0, accuracy: 0 };
      }
      dailyData[session.date].time += session.duration;
      dailyData[session.date].cards += session.cardsStudied;
      dailyData[session.date].accuracy = session.accuracy;
    });

    const barLimit =
      selectedTimeRange === "year" ? 14 : selectedTimeRange === "month" ? 31 : 7;

    return Object.entries(dailyData)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .slice(-barLimit)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        time: Math.round(data.time),
        cards: data.cards,
        accuracy: data.accuracy,
      }));
  };

  const getSubjectDistribution = () => {
    const filteredSessions = getFilteredSessions();
    const subjectTime = {};

    filteredSessions.forEach((session) => {
      subjectTime[session.subject] =
        (subjectTime[session.subject] || 0) + session.duration;
    });

    return Object.entries(subjectTime).map(([subject, time]) => ({
      subject,
      time,
      percentage: Math.round(
        (time / Object.values(subjectTime).reduce((a, b) => a + b, 0)) * 100,
      ),
    }));
  };

  const stats = getStudyStats();
  const dailyData = getDailyStudyData();
  const subjectDistribution = getSubjectDistribution();

  // API `confidence` is P(pass) × 100, not "certainty" in the Pass/Fail label (see predict_performance).
  const examPassChancePct =
    prediction?.ok !== false &&
    prediction?.confidence != null &&
    Number.isFinite(Number(prediction.confidence))
      ? Math.round(
          Math.min(100, Math.max(0, Number(prediction.confidence))),
        )
      : null;

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="analytics-header-text">
          <h2>Study Analytics</h2>
          <p>Track your progress and optimize your learning habits.</p>
        </div>
        <div className="analytics-range">
          {["week", "month", "year"].map((range) => (
            <button
              key={range}
              className={`analytics-range-btn ${
                selectedTimeRange === range ? "active" : ""
              }`}
              onClick={() => setSelectedTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-stats-grid">
        <div className="analytics-stat-card">
          <div className="analytics-stat-header">
            <div>
              <p>Study Sessions</p>
              <h3>{stats.totalSessions}</h3>
            </div>
            <Calendar className="analytics-stat-icon" />
          </div>
          <span>in {selectedTimeRange}</span>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-header">
            <div>
              <p>Time Studied</p>
              <h3>{Math.round(stats.totalTime / 60)}h</h3>
            </div>
            <Clock className="analytics-stat-icon" />
          </div>
          <span>{stats.totalTime} minutes</span>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-header">
            <div>
              <p>Cards Studied</p>
              <h3>{stats.totalCards}</h3>
            </div>
            <BookOpen className="analytics-stat-icon" />
          </div>
          <span>flashcards reviewed</span>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-header">
            <div>
              <p>Accuracy</p>
              <h3>{stats.averageAccuracy}%</h3>
            </div>
            <Target className="analytics-stat-icon" />
          </div>
          <span>average score</span>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-header">
            <div>
              <p>Session Avg</p>
              <h3>
                {stats.averageSessionTime != null
                  ? `${stats.averageSessionTime}m`
                  : "—"}
              </h3>
            </div>
            <Activity className="analytics-stat-icon" />
          </div>
          <span>
            {stats.averageSessionTime != null
              ? "avg min per flashcard block (day · subject)"
              : "Review flashcards to see this; logged hours are daily totals"}
          </span>
        </div>

        <div className="analytics-stat-card">
          <div className="analytics-stat-header">
            <div>
              <p>Exam Prediction</p>
              <h3>
                {predictionLoading
                  ? "Loading..."
                  : prediction?.prediction === 1
                    ? "Pass"
                    : prediction?.prediction === 0
                      ? "Fail"
                      : "N/A"}
              </h3>
            </div>
            <TrendingUp className="analytics-stat-icon" />
          </div>
          <span>
            {predictionLoading
              ? "Calculating"
              : predictionError
                ? predictionError
                : examPassChancePct != null
                  ? `Est. ${examPassChancePct}% chance of passing`
                  : "No data"}
          </span>
        </div>
      </div>

      <div className="analytics-grid-two">
        <div className="analytics-panel">
          <div className="analytics-panel-header">
            <LineChart className="analytics-panel-icon" />
            <div>
              <h4>Daily Study Time</h4>
              <p>Minutes per day (flashcards + logged sessions)</p>
            </div>
          </div>
          <div className="analytics-panel-body">
            {dailyData.length === 0 ? (
              <div className="analytics-empty">
                No study sessions recorded yet. Log hours on the Dashboard, complete a
                quiz, or review flashcards (with sync) to build this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`${value} min`, "Study time"]}
                  />
                  <Bar dataKey="time" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="analytics-panel">
          <div className="analytics-panel-header">
            <PieChart className="analytics-panel-icon" />
            <div>
              <h4>Study Distribution</h4>
              <p>Minutes by subject (same sources)</p>
            </div>
          </div>
          <div className="analytics-panel-body">
            {subjectDistribution.length === 0 ? (
              <div className="analytics-empty">
                No subject data yet. The pie uses flashcard subjects and your profile
                subject for logged study time.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RechartsPieChart>
                  <Pie
                    data={subjectDistribution}
                    dataKey="time"
                    nameKey="subject"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    fill="#8884d8"
                    labelLine={false}
                  >
                    {subjectDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${Math.round(Number(value))} min`}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="analytics-panel">
        <div className="analytics-panel-header">
          <Trophy className="analytics-panel-icon" />
          <div>
            <h4>Subject Progress</h4>
            <p>Time from logged + flashcard activity; mastered = 5 SRS wins (same as Flashcards)</p>
          </div>
        </div>
        <div className="analytics-panel-body analytics-subject-list">
          {subjectProgress.length === 0 ? (
            <div className="analytics-empty">
              No subject progress yet. Study a few flashcards to see insights.
            </div>
          ) : (
            subjectProgress.map((subject, index) => {
              const percent = Math.round(
                (subject.masteredCards / subject.totalCards) * 100
              );
              return (
                <div key={subject.subject} className="analytics-subject-item">
                  <div className="analytics-subject-header">
                    <div className="analytics-subject-title">
                      <span
                        className="analytics-subject-dot"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      ></span>
                      <div>
                        <h5>{subject.subject}</h5>
                        <p>
                          {subject.masteredCards}/{subject.totalCards} cards
                          mastered
                        </p>
                      </div>
                    </div>
                    <div className="analytics-subject-meta">
                      <span>{subject.averageAccuracy}% avg</span>
                      <span>{formatSubjectStudyMinutes(subject.timeSpent)}</span>
                    </div>
                  </div>
                  <div className="analytics-progress">
                    <div
                      className="analytics-progress-fill"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="analytics-panel">
        <div className="analytics-panel-header">
          <Brain className="analytics-panel-icon" />
          <div>
            <h4>Learning Insights</h4>
            <p>Signals to guide your next session</p>
          </div>
        </div>
        <div className="analytics-insights-grid">
          <div className="analytics-insight-card">
            <div className="analytics-insight-title">
              <Zap className="analytics-insight-icon" />
              Optimal Study Time
            </div>
            <p>Your best performance is between 2-4 PM with 85% accuracy.</p>
          </div>
          <div className="analytics-insight-card">
            <div className="analytics-insight-title">
              <TrendingUp className="analytics-insight-icon" />
              Improving Subject
            </div>
            <p>Mathematics accuracy improved by 12% this week.</p>
          </div>
          <div className="analytics-insight-card">
            <div className="analytics-insight-title">
              <Target className="analytics-insight-icon" />
              Focus Area
            </div>
            <p>Physics needs attention - 31% of cards need review.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
