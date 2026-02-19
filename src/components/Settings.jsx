import React, { useMemo, useState } from "react";
import "../styles/settings.css";

const SETTINGS_KEY = "aceit_settings";

const defaultSettings = (currentUser) => ({
  profileName:
    currentUser?.name ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Student",
  profileEmail: currentUser?.email || "",
  profilePhone: currentUser?.phoneNumber || "",
  defaultSubject: "",
  weeklyGoalHours: 6,
  reminderTime: "18:00",
  notificationsEmail: true,
  notificationsPush: true,
  notificationsSms: false,
  showProfile: true,
  allowAnalytics: true,
  studyMode: "balanced",
});

const loadSettings = (currentUser) => {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...defaultSettings(currentUser), ...stored };
  } catch {
    return defaultSettings(currentUser);
  }
};

export function Settings({ currentUser }) {
  const initial = useMemo(() => loadSettings(currentUser), [currentUser]);
  const [formState, setFormState] = useState(initial);
  const [status, setStatus] = useState("idle");

  const handleChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    setStatus("saving");
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(formState));
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  };

  const handleReset = () => {
    const reset = defaultSettings(currentUser);
    setFormState(reset);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(reset));
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your profile, preferences, and notifications.</p>
        </div>
        <div className="settings-actions">
          <button className="btn btn-outline" type="button" onClick={handleReset}>
            Reset
          </button>
          <button className="btn btn-primary" type="submit" form="settings-form">
            Save changes
          </button>
        </div>
      </header>

      <form id="settings-form" className="settings-grid" onSubmit={handleSave}>
        <section className="settings-card">
          <header className="settings-card-header">
            <h2>Profile</h2>
            <p>Update your personal information.</p>
          </header>
          <div className="settings-fields">
            <label className="settings-field">
              <span>Full name</span>
              <input
                type="text"
                value={formState.profileName}
                onChange={handleChange("profileName")}
              />
            </label>
            <label className="settings-field">
              <span>Email address</span>
              <input type="email" value={formState.profileEmail} readOnly />
            </label>
            <label className="settings-field">
              <span>Phone number</span>
              <input
                type="tel"
                value={formState.profilePhone}
                onChange={handleChange("profilePhone")}
                placeholder="Add a phone number"
              />
            </label>
          </div>
        </section>

        <section className="settings-card">
          <header className="settings-card-header">
            <h2>Study Preferences</h2>
            <p>Personalize your learning flow.</p>
          </header>
          <div className="settings-fields">
            <label className="settings-field">
              <span>Default subject focus</span>
              <input
                type="text"
                value={formState.defaultSubject}
                onChange={handleChange("defaultSubject")}
                placeholder="e.g. Biology"
              />
            </label>
            <label className="settings-field">
              <span>Weekly goal (hours)</span>
              <input
                type="number"
                min="1"
                max="40"
                value={formState.weeklyGoalHours}
                onChange={handleChange("weeklyGoalHours")}
              />
            </label>
            <label className="settings-field">
              <span>Daily reminder time</span>
              <input
                type="time"
                value={formState.reminderTime}
                onChange={handleChange("reminderTime")}
              />
            </label>
            <label className="settings-field">
              <span>Study mode</span>
              <select value={formState.studyMode} onChange={handleChange("studyMode")}>
                <option value="focused">Focused</option>
                <option value="balanced">Balanced</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </label>
          </div>
        </section>

        <section className="settings-card">
          <header className="settings-card-header">
            <h2>Notifications</h2>
            <p>Control how you receive updates.</p>
          </header>
          <div className="settings-toggles">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={formState.notificationsEmail}
                onChange={handleChange("notificationsEmail")}
              />
              <div>
                <span>Email alerts</span>
                <small>Weekly summaries and study reminders.</small>
              </div>
            </label>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={formState.notificationsPush}
                onChange={handleChange("notificationsPush")}
              />
              <div>
                <span>Push notifications</span>
                <small>Real-time activity updates.</small>
              </div>
            </label>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={formState.notificationsSms}
                onChange={handleChange("notificationsSms")}
              />
              <div>
                <span>SMS reminders</span>
                <small>Send urgent reminders to your phone.</small>
              </div>
            </label>
          </div>
        </section>

        <section className="settings-card">
          <header className="settings-card-header">
            <h2>Privacy</h2>
            <p>Manage visibility and data usage.</p>
          </header>
          <div className="settings-toggles">
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={formState.showProfile}
                onChange={handleChange("showProfile")}
              />
              <div>
                <span>Show profile to mentors</span>
                <small>Allows mentors to view your study activity.</small>
              </div>
            </label>
            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={formState.allowAnalytics}
                onChange={handleChange("allowAnalytics")}
              />
              <div>
                <span>Allow analytics</span>
                <small>Improve recommendations using activity insights.</small>
              </div>
            </label>
          </div>
        </section>

        <section className="settings-card settings-status-card">
          <header className="settings-card-header">
            <h2>Account status</h2>
            <p>Sync status and preference storage.</p>
          </header>
          <div className="settings-status">
            <div>
              <span>Status</span>
              <strong>{status === "saved" ? "Saved" : "Up to date"}</strong>
            </div>
            <div>
              <span>Storage</span>
              <strong>Local device</strong>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

export default Settings;
