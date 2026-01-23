import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
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

export function Analytics() {
  const [studySessions, setStudySessions] = useState([]);
  const [subjectProgress, setSubjectProgress] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState("week");

  // Chart colors
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  // Load analytics data from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem("ace-it-study-sessions");
    const savedProgress = localStorage.getItem("ace-it-subject-progress");

    if (savedSessions) {
      setStudySessions(JSON.parse(savedSessions));
    } else {
      const mockSessions = generateMockStudySessions();
      setStudySessions(mockSessions);
      localStorage.setItem(
        "ace-it-study-sessions",
        JSON.stringify(mockSessions),
      );
    }

    if (savedProgress) {
      setSubjectProgress(JSON.parse(savedProgress));
    } else {
      const mockProgress = generateMockSubjectProgress();
      setSubjectProgress(mockProgress);
      localStorage.setItem(
        "ace-it-subject-progress",
        JSON.stringify(mockProgress),
      );
    }
  }, []);

  const generateMockStudySessions = () => {
    const sessions = [];
    const subjects = [
      "Mathematics",
      "Chemistry",
      "Literature",
      "Physics",
      "History",
    ];
    const topics = {
      Mathematics: ["Calculus", "Algebra", "Geometry"],
      Chemistry: ["Basic Compounds", "Periodic Table", "Organic Chemistry"],
      Literature: ["Shakespeare", "Poetry", "Modern Literature"],
      Physics: ["Mechanics", "Thermodynamics", "Electromagnetism"],
      History: ["World War II", "Ancient Rome", "Renaissance"],
    };

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const subject = subjects[Math.floor(Math.random() * subjects.length)];
      const subjectTopics = topics[subject] || [];
      const topic =
        subjectTopics[Math.floor(Math.random() * subjectTopics.length)];
      const cardsStudied = Math.floor(Math.random() * 20) + 5;
      const correctAnswers = Math.floor(
        cardsStudied * (0.6 + Math.random() * 0.4),
      );

      sessions.push({
        id: `session-${i}`,
        date: date.toISOString().split("T")[0],
        subject,
        topic,
        duration: Math.floor(Math.random() * 60) + 15,
        cardsStudied,
        correctAnswers,
        totalAnswers: cardsStudied,
        accuracy: Math.round((correctAnswers / cardsStudied) * 100),
      });
    }

    return sessions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  const generateMockSubjectProgress = () => {
    return [
      {
        subject: "Mathematics",
        totalCards: 45,
        masteredCards: 32,
        averageAccuracy: 87,
        timeSpent: 420,
        lastStudied: "2024-01-15",
      },
      {
        subject: "Chemistry",
        totalCards: 38,
        masteredCards: 25,
        averageAccuracy: 78,
        timeSpent: 315,
        lastStudied: "2024-01-14",
      },
      {
        subject: "Literature",
        totalCards: 29,
        masteredCards: 24,
        averageAccuracy: 91,
        timeSpent: 240,
        lastStudied: "2024-01-13",
      },
      {
        subject: "Physics",
        totalCards: 52,
        masteredCards: 18,
        averageAccuracy: 69,
        timeSpent: 385,
        lastStudied: "2024-01-12",
      },
    ];
  };

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
    <div className="analytics-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium">Study Analytics</h2>
          <p className="text-muted-foreground">
            Track your progress and optimize your learning
          </p>
        </div>
        <div className="button-group">
          {["week", "month", "year"].map((range) => (
            <Button
              key={range}
              variant={selectedTimeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br bg-blue-50 dark:bg-blue-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Study Sessions
            </CardTitle>
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {stats.totalSessions}
            </div>
            <p className="text-xs text-blue-600/70">in {selectedTimeRange}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br bg-green-50 dark:bg-green-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Time Studied</CardTitle>
            <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {Math.round(stats.totalTime / 60)}h
            </div>
            <p className="text-xs text-green-600/70">
              {stats.totalTime} minutes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br bg-orange-50 dark:bg-orange-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cards Studied</CardTitle>
            <BookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {stats.totalCards}
            </div>
            <p className="text-xs text-orange-600/70">flashcards reviewed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br bg-purple-50 dark:bg-purple-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
            <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {stats.averageAccuracy}%
            </div>
            <p className="text-xs text-purple-600/70">average score</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br bg-pink-50 dark:bg-pink-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Session Avg</CardTitle>
            <Activity className="w-4 h-4 text-pink-600 dark:text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">
              {stats.averageSessionTime}m
            </div>
            <p className="text-xs text-pink-600/70">per session</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Study Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="w-5 h-5 mr-2" />
              Daily Study Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="time" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subject Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Study Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ subject, percentage }) =>
                      `${subject} ${percentage}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="time"
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Subject Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {subjectProgress.map((subject, index) => (
              <div key={subject.subject} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="font-medium">{subject.subject}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {subject.masteredCards}/{subject.totalCards} cards
                      mastered
                    </span>
                    <Badge variant="outline">
                      {subject.averageAccuracy}% avg
                    </Badge>
                    <span>{Math.round(subject.timeSpent / 60)}h studied</span>
                  </div>
                </div>
                <Progress
                  value={(subject.masteredCards / subject.totalCards) * 100}
                  className="h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Spaced Repetition Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  Optimal Study Time
                </span>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                Your best performance is between 2-4 PM with 85% average
                accuracy
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  Improving Subject
                </span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Mathematics accuracy improved by 12% this week
              </p>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-orange-600" />
                <span className="font-medium text-orange-700 dark:text-orange-300">
                  Focus Area
                </span>
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Physics needs attention - 31% of cards need review
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
