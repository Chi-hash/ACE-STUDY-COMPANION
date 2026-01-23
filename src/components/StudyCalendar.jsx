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

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      
      // 1. Load Local Custom Events
      if (user) {
        const storedEvents = localStorage.getItem(`aceit_calendar_events_${user.uid}`);
        if (storedEvents) {
          // Parse dates back to Date objects
          const parsed = JSON.parse(storedEvents).map(ev => ({
            ...ev,
            date: new Date(ev.date)
          }));
          setLocalEvents(parsed);
        }
      }

      // 2. Fetch API Reminders
      const response = await remindersAPI.getReminders();
      if (response.ok && response.reminders) {
        const formattedReminders = response.reminders.map(r => ({
          id: `api-${r.id}`,
          originalId: r.id,
          title: r.title || "Study Task",
          description: r.description || "",
          date: new Date(r.due_date || new Date()), // Fallback to today if missing
          time: new Date(r.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) || "09:00",
          type: r.type || "assignment",
          priority: r.priority || "medium",
          completed: r.completed || false,
          isApi: true
        }));
        setApiEvents(formattedReminders);
        setError(null);
      } else {
         // Backend offline
         // Keep existing local events but mark as offline
         setError("Offline Mode: Using local events only");
      } 
    } finally {
      setLoading(false);
    }
  };

  const saveLocalEvents = (eventsToSave) => {
    const user = auth.currentUser;
    if (user) {
      localStorage.setItem(
        `aceit_calendar_events_${user.uid}`, 
        JSON.stringify(eventsToSave)
      );
    }
    setLocalEvents(eventsToSave);
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
    return allEvents.filter(
      (event) => event.date.toDateString() === date.toDateString()
    );
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

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  
  // Revised Upcoming Events: Next 5 events from NOW, sorted by date
  const upcomingEvents = allEvents
    .filter((event) => event.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

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
      const isToday = new Date().toDateString() === date.toDateString();
      const isSelected = selectedDate.toDateString() === date.toDateString();
      
      const dayEvents = allEvents.filter(
        (event) => event.date.toDateString() === date.toDateString()
      );
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
            <FaSync className={`calendar-btn-icon ${loading ? 'animate-spin' : ''}`} />
            Sync
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
                        date: new Date(e.target.value),
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
