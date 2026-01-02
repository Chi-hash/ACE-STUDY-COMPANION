// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import StudyLayout from "../components/StudyLayout";

import "../styles/dashboard.css";
import {
  FaBookOpen,
  FaCalendarAlt,
  FaBullseye,
  FaChartLine,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
} from "react-icons/fa";

function Dashboard({ currentUser }) {
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Welcome to AceIt!",
      message: "Start your learning journey today.",
      time: "Just now",
      type: "welcome",
    },
  ]);

  // Mock data
  const studyStats = {
    flashcardsStudied: 45,
    totalFlashcards: 120,
    weeklyGoal: 100,
    weeklyProgress: 67,
    studyStreak: currentUser?.streak || 7,
  };

  const upcomingTasks = [
    {
      id: 1,
      title: "Math Quiz - Calculus",
      type: "exam",
      dueDate: "Tomorrow, 2 PM",
      priority: "high",
    },
    {
      id: 2,
      title: "History Essay Draft",
      type: "assignment",
      dueDate: "Friday, 11:59 PM",
      priority: "medium",
    },
    {
      id: 3,
      title: "Physics Flashcards Review",
      type: "study",
      dueDate: "Today, 6 PM",
      priority: "low",
    },
  ];

  const recentActivity = [
    {
      action: "Completed",
      subject: "Biology Flashcards",
      time: "2 hours ago",
      score: 85,
    },
    {
      action: "Created",
      subject: "Chemistry Notes",
      time: "4 hours ago",
      score: null,
    },
    {
      action: "Studied",
      subject: "Spanish Vocabulary",
      time: "1 day ago",
      score: 92,
    },
  ];

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

  // Simulate new notifications
  useEffect(() => {
    const interval = setInterval(() => {
      const randomNotifications = [
        {
          title: "Study Break Reminder",
          message:
            "Felix suggests taking a 15-minute break after 45 minutes of studying!",
          type: "reminder",
        },
        {
          title: "Flashcard Review",
          message: "Felix recommends reviewing your Biology flashcards",
          type: "reminder",
        },
        {
          title: "Achievement Unlocked!",
          message: "Congratulations! 7-day study streak achieved on AceIt!",
          type: "achievement",
        },
      ];

      if (Math.random() < 0.3) {
        // 30% chance every 30 seconds
        const randomNotification =
          randomNotifications[
            Math.floor(Math.random() * randomNotifications.length)
          ];
        const newNotification = {
          id: Date.now(),
          title: randomNotification.title,
          message: randomNotification.message,
          time: "Just now",
          type: randomNotification.type,
        };

        setNotifications((prev) => [newNotification, ...prev.slice(0, 4)]); // Keep only 5 notifications
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    // This will be handled by StudyLayout through the parent
    console.log("Logout requested");
  };

  return (
    <StudyLayout
      currentSection={currentSection}
      onSectionChange={(s) => setCurrentSection(s)}
      notifications={notifications}
      showNotifications={showNotifications}
      setShowNotifications={setShowNotifications}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      <div className="dashboard-container space-y-6">
        {/* Quick Stats */}
        <div className="stats-grid gap-4">
          <div className="card card-blue">
            <div className="card-header">
              <div className="card-title">Cards Studied Today</div>
              <FaBookOpen className="icon icon-blue" />
            </div>
            <div className="card-content-sm">
              <div className="stat-number stat-blue">
                {studyStats.flashcardsStudied}
              </div>
              <p className="text-xs text-muted">
                {studyStats.totalFlashcards - studyStats.flashcardsStudied}{" "}
                remaining
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
              <p className="text-xs text-muted">due this week</p>
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
              {upcomingTasks.map((task) => (
                <div key={task.id} className="task-item">
                  <div className="task-content">
                    <h4 className="task-title">{task.title}</h4>
                    <p className="task-date text-muted">{task.dueDate}</p>
                  </div>
                  <span className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </span>
                </div>
              ))}
              <button className="btn btn-outline btn-full">
                <FaCalendarAlt className="icon mr-2" />
                View All Tasks
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="card-header">
              <div className="card-title flex items-center">
                <FaCheckCircle className="icon mr-2" />
                Recent Activity
              </div>
            </div>
            <div className="card-content space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-content">
                    <p className="activity-title">
                      {activity.action} {activity.subject}
                    </p>
                    <p className="activity-time text-muted">{activity.time}</p>
                  </div>
                  {activity.score && (
                    <span className="badge badge-secondary">
                      {activity.score}%
                    </span>
                  )}
                </div>
              ))}
              <button className="btn btn-outline btn-full">
                View All Activity
              </button>
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
              <button className="btn btn-blue btn-icon">
                <FaBookOpen className="icon-lg mb-2" />
                Create Flashcards
              </button>
              <button className="btn btn-outline btn-outline-green btn-icon">
                <FaCalendarAlt className="icon-lg mb-2" />
                Schedule Study
              </button>
              <button className="btn btn-outline btn-outline-purple btn-icon">
                <FaBullseye className="icon-lg mb-2" />
                Ask Felix
              </button>
              <button className="btn btn-outline btn-outline-orange btn-icon">
                <FaChartLine className="icon-lg mb-2" />
                Add Resources
              </button>
            </div>
          </div>
        </div>
      </div>
    </StudyLayout>
  );
}

export default Dashboard;
