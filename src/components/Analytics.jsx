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
import { analyticsAPI, flashcardAPI } from "../services/apiClient.js";
import { auth } from "../assets/js/firebase.js";

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

  const loadAnalytics = useCallback(async () => {
    const toLocalDateString = (date = new Date()) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    try {
      const [flashcardResponse, gamificationResponse] = await Promise.allSettled(
        [
          flashcardAPI.getFlashcards(),
          auth.currentUser?.uid
            ? analyticsAPI.getGamification(auth.currentUser.uid)
            : Promise.resolve(null),
        ],
      );

      const flashcards =
        flashcardResponse.status === "fulfilled"
          ? flashcardResponse.value.flashcards || []
          : [];

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
        if ((card.correctCount || 0) >= 3) {
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

      if (sessionsMap.size > 0) {
        const sessionsByDate = {};
        sessionsMap.forEach((session) => {
          sessionsByDate[session.date] =
            (sessionsByDate[session.date] || 0) + session.cardsStudied;
        });

        const totalCards = Object.values(sessionsByDate).reduce(
          (sum, count) => sum + count,
          0,
        );

        sessionsMap.forEach((session) => {
          if (totalStudyMinutes > 0 && totalCards > 0) {
            const dateTotalCards = sessionsByDate[session.date] || 1;
            const dateMinutes = (dateTotalCards / totalCards) * totalStudyMinutes;
            session.duration =
              (session.cardsStudied / dateTotalCards) * dateMinutes;
          } else {
            session.duration = session.cardsStudied;
          }
        });
      }

      const progress = Array.from(progressMap.values()).map((entry) => ({
        subject: entry.subject,
        totalCards: entry.totalCards,
        masteredCards: entry.masteredCards,
        averageAccuracy:
          entry.totalAttempts > 0
            ? Math.round((entry.totalCorrect / entry.totalAttempts) * 100)
            : 0,
        timeSpent: entry.timeSpent,
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
    return () => {
      isMountedRef.current = false;
      clearInterval(refreshInterval);
      window.removeEventListener("studyActivity", handleStudyActivity);
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
    const averageSessionTime =
      totalSessions > 0 ? Math.round(totalTime / totalSessions) : 0;

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

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        time: data.time,
        cards: data.cards,
        accuracy: data.accuracy,
      }))
      .reverse()
      .slice(0, 7);
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
              <h3>{stats.averageSessionTime}m</h3>
            </div>
            <Activity className="analytics-stat-icon" />
          </div>
          <span>per session</span>
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
                : prediction?.confidence !== undefined
                  ? `${Math.round(prediction.confidence)}% confidence`
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
              <p>Recent sessions overview</p>
            </div>
          </div>
          <div className="analytics-panel-body">
            {dailyData.length === 0 ? (
              <div className="analytics-empty">
                No study sessions recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
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
              <p>Time spent per subject</p>
            </div>
          </div>
          <div className="analytics-panel-body">
            {subjectDistribution.length === 0 ? (
              <div className="analytics-empty">
                No subject data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <RechartsPieChart>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="time"
                    labelLine={false}
                  >
                    {subjectDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
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
            <p>Mastery progress by subject</p>
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
                      <span>{Math.round(subject.timeSpent / 60)}h studied</span>
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
