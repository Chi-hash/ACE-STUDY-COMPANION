import React, { useState, useEffect } from "react";
import "../styles/calendar.css";
import {
  FaPlus,
  FaClock,
  FaBookOpen,
  FaFileAlt,
  FaExclamationTriangle,
  FaEdit,
  FaTrash,
  FaCalendarAlt,
  FaCheckCircle,
  FaRegCircle,
  FaSync,
} from "react-icons/fa";
import { remindersAPI } from "../services/apiClient";
import { auth } from "../assets/js/firebase";

const StudyCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [localEvents, setLocalEvents] = useState([]);
  const [localPlans, setLocalPlans] = useState([]);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [apiEvents, setApiEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    date: new Date(),
    time: "12:00",
    type: "study",
    priority: "medium",
  });
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [planError, setPlanError] = useState("");
  const [planFiles, setPlanFiles] = useState([]);
  const [planData, setPlanData] = useState({
    title: "",
    start_date: "",
    due_date: "",
    description: "",
  });

  // Load data on mount and when auth state becomes available
  useEffect(() => {
    fetchData();
    const unsubscribe = auth.onAuthStateChanged(() => {
      fetchData();
    });
    return () => unsubscribe();
  }, []);

  const parseLocalDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const raw = String(value);
    if (/^day\s*\d+$/i.test(raw.trim())) {
      return null;
    }
    const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, y, m, d] = dateOnlyMatch;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date(raw);
  };

  const toLocalDateString = (value) => {
    const date = value instanceof Date ? value : parseLocalDate(value);
    if (!date || Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem("aceit_current_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const getPlanStorageKey = (user) =>
    user ? `aceit_study_plans_${user.uid}` : "aceit_study_plans_guest";

  const resolveDayOffsetFromId = (id) => {
    const match = String(id || "").match(/day\s*(\d+)/i);
    if (!match) return null;
    const dayNum = parseInt(match[1], 10);
    if (Number.isNaN(dayNum) || dayNum <= 0) return null;
    return dayNum - 1;
  };

  const resolvePlanDateFromMetadata = (event, plans) => {
    const planMatch =
      plans.find((plan) => plan.id === event.planId) ||
      plans.find((plan) => plan.title === event.planTitle) ||
      null;
    if (!planMatch) return null;
    const startDate = parseLocalDate(planMatch.start_date);
    if (!startDate || Number.isNaN(startDate.getTime())) return null;
    const offset = resolveDayOffsetFromId(event.id);
    if (offset === null) return null;
    const resolved = new Date(startDate);
    resolved.setDate(startDate.getDate() + offset);
    return resolved;
  };

  const extractDayIndexFromTitle = (title) => {
    const match = String(title || "").match(/\(Day\s*(\d+)\)/i);
    if (!match) return null;
    const dayNum = parseInt(match[1], 10);
    if (Number.isNaN(dayNum) || dayNum <= 0) return null;
    return dayNum - 1;
  };

  const resolvePlanBaseDate = (plan) => {
    const start = parseLocalDate(plan?.start_date);
    if (start && !Number.isNaN(start.getTime())) return start;
    return null;
  };

  const repairPlanEventDates = (events, plans) => {
    let didRepair = false;
    const today = new Date();
    const planById = new Map(plans.map((plan) => [plan.id, plan]));
    const planByTitle = new Map(plans.map((plan) => [plan.title, plan]));

    const repaired = events.map((event) => {
      if (!event?.date || Number.isNaN(event.date.getTime())) return event;
      if (event.date.getFullYear() !== 2001) return event;

      const plan =
        planById.get(event.planId) || planByTitle.get(event.planTitle);
      const baseDate = resolvePlanBaseDate(plan) || today;
      const dayOffset =
        event.planDayIndex ??
        extractDayIndexFromTitle(event.title) ??
        resolveDayOffsetFromId(event.id) ??
        0;

      const correctedDate = new Date(baseDate);
      correctedDate.setDate(baseDate.getDate() + dayOffset);
      didRepair = true;
      return { ...event, date: correctedDate };
    });

    return { repaired, didRepair };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser || getStoredUser();

      const planKey = getPlanStorageKey(user);
      const storedPlans = localStorage.getItem(planKey);
      if (storedPlans) {
        setLocalPlans(JSON.parse(storedPlans));
      }

      // 1. Load Local Custom Events
      if (user) {
        const storedEvents = localStorage.getItem(
          `aceit_calendar_events_${user.uid}`
        );
        if (storedEvents) {
          const plans = storedPlans ? JSON.parse(storedPlans) : [];
          // Parse dates back to Date objects and repair plan dates if needed
          const parsed = JSON.parse(storedEvents).map((ev) => {
            const parsedDate = parseLocalDate(ev.date);
            const repairedDate =
              parsedDate &&
              parsedDate.getFullYear() === 2001 &&
              (ev.planId || ev.planTitle)
                ? resolvePlanDateFromMetadata(ev, plans)
                : null;
            return {
              ...ev,
              date: repairedDate || parsedDate,
            };
          });
          const { repaired, didRepair } = repairPlanEventDates(parsed, plans);
          setLocalEvents(repaired);
          if (didRepair) {
            localStorage.setItem(
              `aceit_calendar_events_${user.uid}`,
              JSON.stringify(repaired)
            );
            if (selectedDate?.getFullYear?.() === 2001) {
              setSelectedDate(new Date());
            }
          }
        }
      }

      // 2. Fetch API Reminders
      const response = await remindersAPI.getReminders();
      if (response.ok && response.reminders) {
        const formattedReminders = response.reminders.map((r) => {
          const rawDate = parseLocalDate(r.due_date);
          const safeDate =
            rawDate && !Number.isNaN(rawDate.getTime()) ? rawDate : new Date();
          const safeTime =
            rawDate && !Number.isNaN(rawDate.getTime())
              ? safeDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
              : "09:00";

          return {
            id: `api-${r.id}`,
            originalId: r.id,
            title: r.title || "Study Task",
            description: r.description || "",
            date: safeDate,
            time: safeTime,
            type: r.type || "assignment",
            priority: r.priority || "medium",
            completed: r.completed || false,
            isApi: true,
          };
        });
        setApiEvents(formattedReminders);
        setError(null);
      } else {
        // Backend offline
        // Keep existing local events but mark as offline
        setError("Offline Mode: Using local events only");
      }
    } catch (error) {
      console.error("Calendar fetch failed:", error);
      setError("Unable to load reminders. Using local events only.");
    } finally {
      setLoading(false);
    }
  };

  const notifyCalendarUpdate = () => {
    window.dispatchEvent(
      new CustomEvent("calendarEventsUpdated", {
        detail: { source: "calendar" },
      })
    );
  };

  const saveLocalEvents = (eventsToSave) => {
    const user = auth.currentUser || getStoredUser();
    if (user) {
      localStorage.setItem(
        `aceit_calendar_events_${user.uid}`, 
        JSON.stringify(eventsToSave)
      );
    }
    setLocalEvents(eventsToSave);
    notifyCalendarUpdate();
  };

  const saveLocalPlans = (plansToSave) => {
    const user = auth.currentUser || getStoredUser();
    const planKey = getPlanStorageKey(user);
    localStorage.setItem(planKey, JSON.stringify(plansToSave));
    setLocalPlans(plansToSave);
  };

  const handleDeletePlan = (planId, planTitle) => {
    const shouldDelete = window.confirm(
      `Delete the plan "${planTitle}" and all its events?`
    );
    if (!shouldDelete) return;

    const updatedPlans = localPlans.filter((plan) => plan.id !== planId);
    saveLocalPlans(updatedPlans);

    const updatedEvents = localEvents.filter(
      (event) => event.planId !== planId
    );
    saveLocalEvents(updatedEvents);
  };

  const resolvePlanDayDate = (dayValue, index, startDate) => {
    const parsed = parseLocalDate(dayValue);
    if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
    if (startDate && !Number.isNaN(startDate.getTime())) {
      const raw = String(dayValue ?? "");
      const match = raw.match(/(\d+)/);
      const dayOffset = match ? Math.max(parseInt(match[1], 10) - 1, 0) : index;
      const resolved = new Date(startDate);
      resolved.setDate(startDate.getDate() + dayOffset);
      return resolved;
    }
    return null;
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowDetailsDialog(true);
  };

  const handleCreateEvent = () => {
    if (newEvent.title) {
      // Combine date and time properly
      const eventDate = new Date(newEvent.date);
      const [hours, minutes] = newEvent.time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));

      const event = {
        id: `local-${Date.now()}`,
        ...newEvent,
        date: eventDate,
        completed: false,
        isApi: false
      };
      
      const updatedEvents = [...localEvents, event];
      saveLocalEvents(updatedEvents);
      
      // Reset form
      setNewEvent({
        title: "",
        description: "",
        date: new Date(),
        time: "12:00",
        type: "study",
        priority: "medium",
      });
      setShowCreateDialog(false);
    }
  };

  const handleDeleteEvent = async (id, isApi) => {
    if (isApi) {
      // For API events, we might want to call the API delete endpoint
      // Assuming ID format "api-123" -> extract 123
      const apiId = id.replace('api-', '');
      try {
        await remindersAPI.deleteReminder(apiId);
        setApiEvents(apiEvents.filter(e => e.id !== id));
        notifyCalendarUpdate();
      } catch (err) {
        console.error("Failed to delete API reminder", err);
        alert("Could not delete this server event");
      }
    } else {
      const updated = localEvents.filter((event) => event.id !== id);
      saveLocalEvents(updated);
    }
  };

  const toggleEventComplete = async (id, isApi, currentStatus) => {
    if (isApi) {
      try {
        const apiId = id.replace('api-', '');
        // Optimistic update
        setApiEvents(apiEvents.map(e => e.id === id ? { ...e, completed: !e.completed } : e));
        
        if (!currentStatus) { // If marking as complete
          await remindersAPI.completeReminder(apiId);
        }
        // If uncompleting, no API endpoint in provided list, so we just stick with local optimistic update until refresh
        notifyCalendarUpdate();
      } catch (err) {
        console.error("Failed to update API reminder", err);
        // Revert
        setApiEvents(apiEvents.map(e => e.id === id ? { ...e, completed: currentStatus } : e));
      }
    } else {
      const updated = localEvents.map((event) =>
        event.id === id ? { ...event, completed: !event.completed } : event
      );
      saveLocalEvents(updated);
    }
  };

  // Merge and Filter Logic
  const allEvents = [...localEvents, ...apiEvents];

  const getEventsForDate = (date) => {
    const target = toLocalDateString(date);
    if (!target) return [];
    return allEvents.filter((event) => {
      const eventDate = toLocalDateString(event.date);
      return eventDate === target;
    });
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case "study": return FaBookOpen;
      case "assignment": return FaFileAlt;
      case "exam": return FaExclamationTriangle;
      case "reminder": return FaClock;
      default: return FaClock;
    }
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case "study": return "event-type-study";
      case "assignment": return "event-type-assignment";
      case "exam": return "event-type-exam";
      case "reminder": return "event-type-reminder";
      default: return "event-type-default";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      case "low": return "priority-low";
      default: return "priority-low";
    }
  };

  const getDatesWithEvents = () => {
    return allEvents.map((event) => event.date);
  };

  const formatPlanDate = (value) => {
    const date = parseLocalDate(value);
    if (!date || Number.isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const normalizePlanTopics = (topics) => {
    if (Array.isArray(topics)) {
      return topics.filter((topic) => typeof topic === "string" && topic.trim());
    }
    if (typeof topics === "string" && topics.trim()) {
      return [topics.trim()];
    }
    return [];
  };

  const handlePlanSubmit = async () => {
    if (!planData.title || !planData.start_date || !planData.due_date) {
      setPlanError("Please fill in title, start date, and due date.");
      return;
    }
    setPlanSubmitting(true);
    setPlanError("");
    try {
      const startDate = parseLocalDate(planData.start_date);
      const response = await remindersAPI.createStudyPlan({
        ...planData,
        files: planFiles,
      });

      if (!response.study_plan || !Array.isArray(response.study_plan)) {
        setPlanError("Plan generated, but no schedule was returned.");
      } else {
        const planId = `plan-${Date.now()}`;
        const generatedEvents = response.study_plan.flatMap((day, index) => {
          const dayValue = day?.day ?? day?.date ?? day?.day_date;
          const dayDate = resolvePlanDayDate(dayValue, index, startDate);
          const topics = Array.isArray(day?.topics)
            ? day.topics
            : day?.topics
            ? [day.topics]
            : [];
          if (!dayDate) return [];

          if (topics.length === 0) {
            return [
              {
                id: `local-${Date.now()}-${day.day}`,
                title: `${planData.title} (Day ${index + 1})`,
                description: planData.description || "",
                date: dayDate,
                time: "09:00",
                type: "study",
                priority: "medium",
                completed: false,
                isApi: false,
                planId,
                planTitle: planData.title,
                planDayIndex: index,
              },
            ];
          }

          const topicsText = topics
            .filter((topic) => typeof topic === "string" && topic.trim())
            .map((topic) => `- ${topic.trim()}`)
            .join("\n");
          const combinedDescription = [
            planData.description || "",
            topicsText ? `Topics:\n${topicsText}` : "",
          ]
            .filter(Boolean)
            .join("\n\n");

          return [
            {
              id: `local-${Date.now()}-${day.day}`,
              title: `${planData.title} (Day ${index + 1})`,
              description: combinedDescription,
              date: dayDate,
              time: "09:00",
              type: "study",
              priority: "medium",
              completed: false,
              isApi: false,
              planId,
              planTitle: planData.title,
              planDayIndex: index,
            },
          ];
        });

        const updated = [...localEvents, ...generatedEvents];
        saveLocalEvents(updated);

        const updatedPlans = [
          ...localPlans,
          {
            id: planId,
            title: planData.title,
            start_date: planData.start_date,
            due_date: planData.due_date,
            description: planData.description || "",
            created_at: new Date().toISOString(),
            schedule: response.study_plan,
            sources: planFiles.map((file) => file.name),
          },
        ];
        saveLocalPlans(updatedPlans);

        if (generatedEvents.length === 0) {
          setPlanError("Plan generated, but no dated items were created.");
        }
      }

      setShowPlanDialog(false);
      setPlanFiles([]);
      setPlanData({
        title: "",
        start_date: "",
        due_date: "",
        description: "",
      });
    } catch (err) {
      console.error("Failed to create study plan:", err);
      setPlanError("Could not generate study plan.");
    } finally {
      setPlanSubmitting(false);
    }
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  
  // Revised Upcoming Events: Next 5 events from NOW, sorted by date
  const upcomingEvents = allEvents
    .filter((event) => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  const planSummaries = localPlans.map((plan) => {
    const planEvents = allEvents.filter((event) => event.planId === plan.id);
    const firstEventDate = planEvents
      .map((event) => event.date)
      .filter((date) => date instanceof Date && !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];
    return {
      ...plan,
      eventCount: planEvents.length,
      startLabel: formatPlanDate(plan.start_date),
      dueLabel: formatPlanDate(plan.due_date),
      firstEventDate: firstEventDate || null,
      schedule,
    };
  });

  // Calendar render logic
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday

    return { firstDay, lastDay, daysInMonth, startingDay };
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(selectedDate);
    // Fixed: monthNames was 1-indexed sort of? Standard array is fine.
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const days = [];

    // Empty cells for days before the first day of month
    for (let i = 0; i < startingDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const todayKey = toLocalDateString(new Date());
      const dateKey = toLocalDateString(date);
      const selectedKey = toLocalDateString(selectedDate);
      const isToday = todayKey && dateKey === todayKey;
      const isSelected = selectedKey && dateKey === selectedKey;

      const dayEvents = allEvents.filter((event) => {
        const eventDate = toLocalDateString(event.date);
        return eventDate && dateKey && eventDate === dateKey;
      });
      const hasEvent = dayEvents.length > 0;
      
      // Determine dot color priority: Exam > Assignment > Study > Reminder
      let dotClass = "";
      if (hasEvent) {
         if (dayEvents.some(e => e.type === 'exam')) dotClass = "event-dot-exam";
         else if (dayEvents.some(e => e.type === 'assignment')) dotClass = "event-dot-assignment";
         else if (dayEvents.some(e => e.type === 'study')) dotClass = "event-dot-study";
         else dotClass = "event-dot-reminder";
      }

      days.push(
        <button
          key={day}
          className={`calendar-day ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${hasEvent ? "has-event" : ""}`}
          onClick={() => setSelectedDate(date)}
        >
          <span className="calendar-day-number">{day}</span>
          {hasEvent && <div className={`calendar-day-event-dot ${dotClass}`}></div>}
        </button>
      );
    }

    return (
      <div className="calendar-container">
        <div className="calendar-header">
          <button
            className="calendar-nav-btn"
            onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
          >
            &larr;
          </button>
          <h3 className="calendar-month">
            {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
          </h3>
          <button
            className="calendar-nav-btn"
            onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
          >
            &rarr;
          </button>
        </div>
        <div className="calendar-grid">
          {dayNames.map((day) => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="study-calendar-container">
      {/* Header */}
      <div className="study-calendar-header">
        <div>
          <h2 className="study-calendar-title">Study Calendar</h2>
          <p className="study-calendar-subtitle">
            Manage your study schedule and deadlines
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            onClick={fetchData}
            title="Sync with Dashboard"
          >
            <FaSync className={`calendar-btn-icon ${loading ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            className="btn btn-outline"
            onClick={() => setShowPlanDialog(true)}
          >
            <FaCalendarAlt className="calendar-btn-icon" />
            Study Plan
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateDialog(true)}
          >
            <FaPlus className="calendar-btn-icon" />
            Add Event
          </button>
        </div>
      </div>

      {/* Create Event Dialog */}
      {showCreateDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-header">
              <h3 className="dialog-title">Create Study Event</h3>
              <button
                className="dialog-close"
                onClick={() => setShowCreateDialog(false)}
              >
                &times;
              </button>
            </div>
            <div className="dialog-content">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={newEvent.title}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, title: e.target.value })
                  }
                  placeholder="Enter event title..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={newEvent.description}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, description: e.target.value })
                  }
                  placeholder="Enter description..."
                  rows={3}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newEvent.date.toISOString().split("T")[0]}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        date: parseLocalDate(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newEvent.time}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, time: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={newEvent.type}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, type: e.target.value })
                    }
                  >
                    <option value="study">Study Session</option>
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={newEvent.priority}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={handleCreateEvent}
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Study Plan Dialog */}
      {showPlanDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-header">
              <h3 className="dialog-title">Generate Study Plan</h3>
              <button
                className="dialog-close"
                onClick={() => setShowPlanDialog(false)}
              >
                &times;
              </button>
            </div>
            <div className="dialog-content">
              {planError && <p className="calendar-error">{planError}</p>}
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={planData.title}
                  onChange={(e) =>
                    setPlanData({ ...planData, title: e.target.value })
                  }
                  placeholder="Enter plan title..."
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={planData.start_date}
                    onChange={(e) =>
                      setPlanData({ ...planData, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={planData.due_date}
                    onChange={(e) =>
                      setPlanData({ ...planData, due_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-textarea"
                  value={planData.description}
                  onChange={(e) =>
                    setPlanData({ ...planData, description: e.target.value })
                  }
                  placeholder="What should this plan cover?"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attach files (optional)</label>
                <input
                  type="file"
                  className="form-input"
                  multiple
                  onChange={(e) => setPlanFiles(Array.from(e.target.files || []))}
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={handlePlanSubmit}
                disabled={planSubmitting}
              >
                {planSubmitting ? "Generating..." : "Generate Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="study-calendar-grid">
        {/* Calendar */}
        <div className="calendar-section">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Calendar</h3>
            </div>
            <div className="card-content">{renderCalendar()}</div>
          </div>
        </div>

        {/* Sidebar - Selected Date Only */}
        <div className="calendar-sidebar">
          {/* Selected Date Events */}
          <div className="card h-full">
            <div className="card-header">
              <h3 className="card-title">
                {selectedDate
                  ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                  : "Select a date"}
              </h3>
            </div>
            <div className="card-content h-full-content">
              {selectedDateEvents.length > 0 ? (
                <div className="events-list">
                  {selectedDateEvents.map((event) => {
                    const EventIcon = getEventTypeIcon(event.type);
                    return (
                      <div
                        key={event.id}
                        className={`event-card ${
                          event.completed ? "completed" : ""
                        }`}
                        onClick={() => handleEventClick(event)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="event-header">
                          <div className="event-title-row">
                            <EventIcon className="event-icon" />
                            <span className="event-title">{event.title}</span>
                          </div>
                          <div className="event-actions">
                            <button
                              className="event-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEventComplete(event.id, event.isApi, event.completed);
                              }}
                              title={
                                event.completed
                                  ? "Mark as incomplete"
                                  : "Mark as complete"
                              }
                            >
                              {event.completed ? (
                                <FaCheckCircle className="text-green-500" />
                              ) : (
                                <FaRegCircle />
                              )}
                            </button>
                            {/* Allow delete for local events, maybe API too if owner */}
                            <button
                              className="event-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEvent(event.id, event.isApi);
                              }}
                              title="Delete event"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                        {event.description && <p className="event-description">{event.description}</p>}
                        <div className="event-footer">
                          <span className="event-time">{event.time}</span>
                          <div className="event-tags">
                            <span
                              className={`priority-badge ${getPriorityColor(
                                event.priority
                              )}`}
                            >
                              {event.priority}
                            </span>
                            <span
                              className={`event-type-badge ${getEventTypeColor(
                                event.type
                              )}`}
                            >
                              {event.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-state">No events for this date</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Upcoming Events */}
      <div className="mt-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Upcoming Events</h3>
          </div>
          <div className="card-content">
            <div className="upcoming-events-grid">
              {upcomingEvents.map((event) => {
                const EventIcon = getEventTypeIcon(event.type);
                // Fixed date calc
                const today = new Date();
                today.setHours(0,0,0,0);
                const eventDate = new Date(event.date);
                eventDate.setHours(0,0,0,0);
                
                const diffTime = eventDate - today;
                const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Don't show past events in "upcoming"
                if (daysUntil < 0) return null;

                return (
                  <div 
                    key={event.id} 
                    className="upcoming-event-card"
                    onClick={() => handleEventClick(event)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="upcoming-event-header">
                      <div className="flex items-center gap-2">
                          <EventIcon className="upcoming-event-icon" />
                          <span className="upcoming-event-title">
                          {event.title}
                          </span>
                      </div>
                    </div>
                    <div className="upcoming-event-footer">
                      <span className="upcoming-event-days">
                        {daysUntil === 0
                          ? "Today"
                          : daysUntil === 1
                          ? "Tomorrow"
                          : `${daysUntil} days`}
                      </span>
                      <span
                        className={`priority-badge ${getPriorityColor(
                          event.priority
                        )}`}
                      >
                        {event.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
              {upcomingEvents.length === 0 && (
                <p className="empty-state">No upcoming events found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Study Plans */}
      <div className="mt-8">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Study Plans</h3>
          </div>
          <div className="card-content">
            {planSummaries.length > 0 ? (
              <div className="study-plan-list">
                {planSummaries.map((plan) => (
                  <div key={plan.id} className="study-plan-item">
                    <div className="study-plan-header">
                      <span className="study-plan-title">{plan.title}</span>
                      <span className="study-plan-count">
                        {plan.eventCount} items
                      </span>
                    </div>
                    <div className="study-plan-meta">
                      {plan.startLabel} → {plan.dueLabel}
                    </div>
                    {plan.description && (
                      <div className="study-plan-description">
                        {plan.description}
                      </div>
                    )}
                    {plan.sources && plan.sources.length > 0 && (
                      <div className="study-plan-sources">
                        Sources: {plan.sources.join(", ")}
                      </div>
                    )}
                    <div className="study-plan-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => {
                          if (plan.firstEventDate) {
                            setSelectedDate(new Date(plan.firstEventDate));
                          }
                        }}
                        disabled={!plan.firstEventDate}
                      >
                        View plan events
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() =>
                          setExpandedPlanId(
                            expandedPlanId === plan.id ? null : plan.id
                          )
                        }
                      >
                        {expandedPlanId === plan.id ? "Hide plan" : "View plan"}
                      </button>
                      <button
                        className="btn btn-outline btn-sm study-plan-delete"
                        type="button"
                        onClick={() => handleDeletePlan(plan.id, plan.title)}
                      >
                        Delete plan
                      </button>
                    </div>
                    {expandedPlanId === plan.id && (
                      <div className="study-plan-schedule">
                        {plan.schedule.length > 0 ? (
                          <div className="study-plan-days">
                            {plan.schedule.map((day, index) => {
                              const topics = normalizePlanTopics(day?.topics);
                              const dayLabel =
                                day?.day ||
                                day?.date ||
                                day?.day_date ||
                                `Day ${index + 1}`;
                              return (
                                <div key={`${plan.id}-${index}`} className="study-plan-day">
                                  <div className="study-plan-day-title">
                                    {dayLabel}
                                  </div>
                                  {topics.length > 0 ? (
                                    <ul className="study-plan-topic-list">
                                      {topics.map((topic, topicIndex) => (
                                        <li key={`${plan.id}-${index}-${topicIndex}`}>
                                          {topic}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <div className="study-plan-empty-topics">
                                      No topics listed for this day.
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="study-plan-empty-topics">
                            No schedule returned for this plan.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">No study plans generated yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Event Details Dialog */}
      {showDetailsDialog && selectedEvent && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-header">
              <h3 className="dialog-title">Event Details</h3>
              <button
                className="dialog-close"
                onClick={() => setShowDetailsDialog(false)}
              >
                &times;
              </button>
            </div>
            <div className="dialog-content">
              <div className="mb-4">
                <span className={`priority-badge ${getPriorityColor(selectedEvent.priority)} mr-2`}>
                  {selectedEvent.priority}
                </span>
                <span className={`event-type-badge ${getEventTypeColor(selectedEvent.type)}`}>
                  {selectedEvent.type}
                </span>
              </div>
              
              <h4 className="text-xl font-bold mb-2">{selectedEvent.title}</h4>
              
              <div className="flex items-center gap-2 text-gray-500 mb-4">
                <FaCalendarAlt />
                <span>{selectedEvent.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {selectedEvent.time}</span>
              </div>

              {selectedEvent.description && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedEvent.description}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    toggleEventComplete(selectedEvent.id, selectedEvent.isApi, selectedEvent.completed);
                    setShowDetailsDialog(false);
                  }}
                >
                  {selectedEvent.completed ? "Mark Incomplete" : "Mark Complete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyCalendar;
