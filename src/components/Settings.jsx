import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { FaCamera, FaCloud, FaDownload, FaUpload } from "react-icons/fa";
import { auth } from "../assets/js/firebase.js";
import { userAPI } from "../services/apiClient.js";
import { requestReminderNotificationPermission } from "../services/reminderEmailService.js";
import { showAppToast } from "../utils/toastBus.js";
import { ACEIT_SETTINGS_KEY } from "../utils/studySettings.js";
import "../styles/settings.css";

const PROFILE_PIC_KEY = "aceit_profile_picture";
const FLASHCARDS_STORAGE_KEY = "ace-it-flashcards";
const REVIEW_DATA_STORAGE_KEY = "ace-it-review-data";
const STUDY_BACKUP_VERSION = 1;

/** Resize & compress an image File to a 200×200 JPEG data-URL. */
const compressImage = (file) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const SIZE = 200;
      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      // Cover-fit: centre-crop to square
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = url;
  });

const defaultSettings = (currentUser) => ({
  // Profile
  profileName:
    currentUser?.name ||
    currentUser?.displayName ||
    currentUser?.email?.split("@")[0] ||
    "Student",
  profileEmail: currentUser?.email || "",
  profilePhone: "",
  profileCourse: "",
  profileSchool: "",
  profileDegree: "",
  subjects: [],
  // Study Preferences
  defaultSubject: "",
  weeklyGoalHours: 6,
  dailyStudyGoalMinutes: 30,
  reminderTime: "08:00",
  studyMode: "balanced",
  participationLevel: "",
  absences: "",
  tutoring: false,
  // Notifications
  notificationsEmail: true,
  notificationsPush: true,
  notificationsSms: false,
  // Privacy
  showProfile: true,
  allowAnalytics: true,
});

const loadSettings = (currentUser) => {
  try {
    const stored = JSON.parse(localStorage.getItem(ACEIT_SETTINGS_KEY) || "{}");
    const merged = { ...defaultSettings(currentUser), ...stored };
    // Migrate old single defaultSubject → subjects array
    if (merged.defaultSubject && (!merged.subjects || !merged.subjects.length)) {
      merged.subjects = [merged.defaultSubject];
    }
    delete merged.sleepHoursPerDay;
    delete merged.attendancePercentage;
    delete merged.assignmentsCompleted;
    return merged;
  } catch {
    return defaultSettings(currentUser);
  }
};

export function Settings({ currentUser }) {
  const navigate = useNavigate();
  const initial = useMemo(() => loadSettings(currentUser), [currentUser]);
  const [formState, setFormState] = useState(initial);
  const [status, setStatus] = useState("idle"); // idle | saving | saved
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");
  const [lastSynced, setLastSynced] = useState(null);
  const [profilePicture, setProfilePicture] = useState(
    () => localStorage.getItem(PROFILE_PIC_KEY) || null
  );
  const avatarInputRef = useRef(null);
  const studyBackupInputRef = useRef(null);

  const handleExportStudyBackup = useCallback(() => {
    try {
      let cards = [];
      let review = {};
      try {
        const rawC = localStorage.getItem(FLASHCARDS_STORAGE_KEY);
        if (rawC) cards = JSON.parse(rawC);
        if (!Array.isArray(cards)) cards = [];
      } catch {
        cards = [];
      }
      try {
        const rawR = localStorage.getItem(REVIEW_DATA_STORAGE_KEY);
        if (rawR) review = JSON.parse(rawR);
        if (!review || typeof review !== "object") review = {};
      } catch {
        review = {};
      }
      const payload = {
        version: STUDY_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        aceItFlashcards: cards,
        aceItReviewData: review,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aceit-study-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showAppToast("success", "Backup downloaded — use Import on your live site.");
    } catch {
      showAppToast("error", "Could not create backup.");
    }
  }, []);

  const handleImportStudyBackup = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let cards;
      let review = {};
      if (
        data &&
        typeof data === "object" &&
        data.version === STUDY_BACKUP_VERSION &&
        data.aceItFlashcards != null
      ) {
        cards = data.aceItFlashcards;
        review = data.aceItReviewData && typeof data.aceItReviewData === "object"
          ? data.aceItReviewData
          : {};
      } else if (Array.isArray(data)) {
        cards = data;
      } else {
        showAppToast("error", "Unrecognized backup file.");
        return;
      }
      if (!Array.isArray(cards)) {
        showAppToast("error", "Backup has no flashcard list.");
        return;
      }
      const ok = window.confirm(
        `Replace flashcards on this device with ${cards.length} cards from the file? This overwrites current flashcards and review progress here.`,
      );
      if (!ok) return;
      localStorage.setItem(FLASHCARDS_STORAGE_KEY, JSON.stringify(cards));
      localStorage.setItem(REVIEW_DATA_STORAGE_KEY, JSON.stringify(review));
      window.dispatchEvent(new CustomEvent("aceit-study-data-imported"));
      showAppToast("success", `Imported ${cards.length} flashcards.`);
    } catch {
      showAppToast("error", "Could not read that file.");
    }
  }, []);

  /** Compress, store, and broadcast the new profile picture. */
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      localStorage.setItem(PROFILE_PIC_KEY, dataUrl);
      setProfilePicture(dataUrl);
      // Tell StudyLayout (and any other listeners) to refresh the avatar
      window.dispatchEvent(new CustomEvent("profilePictureUpdated"));
    } catch {
      // Silently ignore compression errors
    }
  };

  // ── Load backend profile ──────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(false);
    try {
      const res = await userAPI.getProfile();
      if (res?.ok && res.profile) {
        const p = res.profile;
        setFormState((prev) => ({
          ...prev,
          profileName: p.name || prev.profileName,
          profilePhone: p.phone_number || prev.profilePhone,
          profileCourse: p.course_of_study || prev.profileCourse,
          profileSchool: p.school_name || prev.profileSchool,
          profileDegree: p.degree || prev.profileDegree,
          subjects: Array.isArray(p.subject)
            ? p.subject
            : p.subject
            ? [p.subject]
            : prev.subjects,
          participationLevel:
            p.participation_level != null
              ? String(p.participation_level)
              : prev.participationLevel,
          absences:
            p.Absences != null
              ? String(p.Absences)
              : p.absences != null
              ? String(p.absences)
              : prev.absences,
          // BUG FIX: backend value always wins; old `|| prev.tutoring` prevented clearing
          tutoring:
            p.Tutoring != null
              ? p.Tutoring === 1 || p.Tutoring === true
              : prev.tutoring,
        }));
      }
    } catch {
      setProfileError(true);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Generic change handler ────────────────────────────────────────────────
  const handleChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // ── Subject tag helpers ───────────────────────────────────────────────────
  const addSubject = (raw) => {
    const tag = raw.trim().replace(/,$/, "");
    if (!tag) return;
    setFormState((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(tag) ? prev.subjects : [...prev.subjects, tag],
    }));
    setSubjectInput("");
  };

  const removeSubject = (tag) => {
    setFormState((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s !== tag),
    }));
  };

  const handleSubjectKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSubject(subjectInput);
    } else if (e.key === "Backspace" && !subjectInput && formState.subjects.length) {
      removeSubject(formState.subjects[formState.subjects.length - 1]);
    }
  };

  const handleToggleEmailAlerts = (e) => {
    const checked = e.target.checked;
    setFormState((prev) => ({ ...prev, notificationsEmail: checked }));
    if (checked) void requestReminderNotificationPermission();
  };

  const handleTogglePushAlerts = (e) => {
    const checked = e.target.checked;
    setFormState((prev) => ({ ...prev, notificationsPush: checked }));
    if (checked) void requestReminderNotificationPermission();
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (event) => {
    event.preventDefault();
    setStatus("saving");
    localStorage.setItem(ACEIT_SETTINGS_KEY, JSON.stringify(formState));
    window.dispatchEvent(new CustomEvent("aceit_settings_updated"));
    try {
      const payload = {
        name: formState.profileName || undefined,
        phone_number: formState.profilePhone || undefined,
        course_of_study: formState.profileCourse || undefined,
        school_name: formState.profileSchool || undefined,
        degree: formState.profileDegree || undefined,
        subject: formState.subjects.length ? formState.subjects : undefined,
        participation_level:
          formState.participationLevel !== ""
            ? parseInt(formState.participationLevel, 10)
            : undefined,
        // Absences are computed server-side from study activity / streaks — do not send
        // Same for tutoring
        tutoring: formState.tutoring ? 1 : 0,
        Tutoring: formState.tutoring ? 1 : 0,
      };
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k]
      );
      await userAPI.updateProfile(payload);
      showAppToast("success", "Profile & settings synced to the cloud.");
    } catch {
      showAppToast("info", "Saved on this device — cloud sync failed. Try again later.");
    }
    setLastSynced(new Date());
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2500);
  };

  // ── Reset (preferences only — habits are cloud-synced) ───────────────────
  const handleReset = () => {
    setFormState((prev) => ({
      ...prev,
      weeklyGoalHours: 6,
      dailyStudyGoalMinutes: 30,
      reminderTime: "08:00",
      studyMode: "balanced",
    }));
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
    showAppToast("info", "Study preferences reset — tap Save to sync to the cloud.");
  };

  // ── Optional profile fields the user can set (not server-computed metrics) ──
  const habitCompleteness = [
    formState.participationLevel !== "",
    formState.tutoring === true,
  ];
  const filledCount = habitCompleteness.filter(Boolean).length;
  const completenessPercent = Math.round(
    (filledCount / habitCompleteness.length) * 100
  );

  // ── Sync status label ─────────────────────────────────────────────────────
  const formatLastSynced = () => {
    if (!lastSynced) return "Not yet synced this session";
    const diff = Math.floor((Date.now() - lastSynced.getTime()) / 1000);
    if (diff < 10) return "Last synced just now";
    if (diff < 60) return `Last synced ${diff}s ago`;
    return `Last synced ${Math.floor(diff / 60)}m ago`;
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "This will permanently delete your account and all associated data. This action cannot be undone."
    );
    if (!confirmed) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await userAPI.deleteAccount();
      await signOut(auth);
      localStorage.removeItem("aceit_current_user");
      localStorage.removeItem("aceit_auth_token");
      navigate("/");
    } catch {
      setDeleteError("Failed to delete account. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="settings-page">

      {/* ── Action bar (sits just above the cards, no h1 — main-header already shows "Settings") ── */}
      <div className="settings-action-bar">
        <p className="settings-subtitle">
          Manage your profile, preferences, and study habits.
        </p>
        <div className="settings-actions">
          <button
            className="btn btn-outline"
            type="button"
            onClick={handleReset}
            disabled={status === "saving"}
          >
            Reset
          </button>
          <button
            className={`btn ${status === "saved" ? "btn-success" : "btn-primary"}`}
            type="submit"
            form="settings-form"
            disabled={status === "saving"}
          >
            {status === "saving" && <span className="settings-btn-spinner" />}
            {status === "saving"
              ? "Saving…"
              : status === "saved"
              ? "✓ Save Changes"
              : "Save Changes"}
          </button>
        </div>
      </div>

      {status === "saved" && (
        <div className="settings-save-banner">
          ✓ Settings saved — your profile and study habits have been synced to the cloud.
        </div>
      )}

      <form id="settings-form" className="settings-grid" onSubmit={handleSave}>

        {/* ════════════════════════════════════════
            PROFILE
        ════════════════════════════════════════ */}
        <section className="settings-card">
          <h2 className="settings-section-title">Profile</h2>

          {/* ── Profile picture ── */}
          <div className="profile-avatar-wrap">
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={() => avatarInputRef.current?.click()}
              title="Change profile picture"
            >
              {profilePicture ? (
                <img
                  className="profile-avatar-img"
                  src={profilePicture}
                  alt="Profile"
                />
              ) : (
                <div className="profile-avatar-initials">
                  {(formState.profileName || "S").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="profile-avatar-overlay">
                <FaCamera className="avatar-cam-icon" />
                Change
              </span>
            </button>
            {/* Hidden file input */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </div>

          <div className="settings-fields settings-fields-2col">

            <label className="settings-field">
              <span>Full Name</span>
              <input
                type="text"
                value={formState.profileName}
                onChange={handleChange("profileName")}
                placeholder="Your name"
              />
            </label>

            <label className="settings-field">
              <span>Email Address</span>
              <input type="email" value={formState.profileEmail} readOnly />
            </label>

            <label className="settings-field">
              <span>Phone Number</span>
              <input
                type="tel"
                value={formState.profilePhone}
                onChange={handleChange("profilePhone")}
                placeholder="+1 (555) 123-4567"
              />
            </label>

            <label className="settings-field">
              <span>Course of Study</span>
              <input
                type="text"
                value={formState.profileCourse}
                onChange={handleChange("profileCourse")}
                placeholder="e.g. Computer Science"
              />
            </label>

            <label className="settings-field">
              <span>School / University</span>
              <input
                type="text"
                value={formState.profileSchool}
                onChange={handleChange("profileSchool")}
                placeholder="e.g. University of Lagos"
              />
            </label>

            <label className="settings-field">
              <span>Degree / Qualification</span>
              <input
                type="text"
                value={formState.profileDegree}
                onChange={handleChange("profileDegree")}
                placeholder="e.g. B.Sc."
              />
            </label>

            {/* Multi-subject tag input — always full-width */}
            <div className="settings-field settings-field-full">
              <span>Subjects</span>
              <div className="subject-tags-wrap">
                {formState.subjects.map((s) => (
                  <span key={s} className="subject-tag">
                    {s}
                    <button
                      type="button"
                      className="subject-tag-remove"
                      onClick={() => removeSubject(s)}
                      aria-label={`Remove ${s}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="subject-tags-input"
                  type="text"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={handleSubjectKeyDown}
                  onBlur={() => addSubject(subjectInput)}
                  placeholder={
                    formState.subjects.length
                      ? "Add another subject…"
                      : "Type a subject and press Enter"
                  }
                />
              </div>
              <small className="field-hint">
                Press Enter or comma to add · Backspace removes the last one
              </small>
            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════
            STUDY PREFERENCES
        ════════════════════════════════════════ */}
        <section className="settings-card">
          <h2 className="settings-section-title">Study Preferences</h2>
          <div className="settings-fields settings-fields-2col">

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
              <span>Daily study goal (minutes)</span>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={formState.dailyStudyGoalMinutes}
                onChange={handleChange("dailyStudyGoalMinutes")}
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
              <select
                value={formState.studyMode}
                onChange={handleChange("studyMode")}
              >
                <option value="focused">Focused</option>
                <option value="balanced">Balanced</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </label>

          </div>
        </section>

        {/* ════════════════════════════════════════
            STUDY CONTEXT (optional profile)
        ════════════════════════════════════════ */}
        <section className="settings-card settings-habits-card">
          <h2 className="settings-section-title" style={{ marginBottom: "0.3rem" }}>
            Study context
          </h2>
          <p className="habits-subtitle">
            Performance predictions use your app activity — streaks, quiz scores,
            and logged study time. These fields are optional extras for your profile.
          </p>

          {/* Completeness bar */}
          <div className="habits-completeness-block">
            <div className="habits-completeness-header">
              <span className="completeness-label-left">Completeness</span>
              <span className="completeness-label-right">
                {filledCount}/{habitCompleteness.length} fields filled
              </span>
            </div>
            <div className="habits-completeness-track">
              <div
                className="habits-completeness-fill"
                style={{ width: `${completenessPercent}%` }}
              />
            </div>
          </div>

          {/* Habit fields */}
          {profileLoading ? (
            <div className="habits-loading">
              <span className="habits-loading-spinner" />
              Loading your saved habits…
            </div>
          ) : profileError ? (
            <div className="habits-error">
              <span>⚠️ Could not load your saved habits from the server.</span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={loadProfile}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="habits-fields-stack">

              {/* Participation — full width */}
              <div className="habit-panel habit-panel-participation">
                <span className="habit-field-label">Class participation level</span>
                <div className="habit-stars-row">
                  <div className="habit-stars">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`habit-star${
                          parseInt(formState.participationLevel || 0) >= n ? " active" : ""
                        }`}
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            participationLevel: String(n),
                          }))
                        }
                        title={["Never", "Rarely", "Sometimes", "Often", "Always"][n - 1]}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <span className="habit-star-label">
                    {formState.participationLevel
                      ? `${formState.participationLevel}/5`
                      : "Not set"}
                  </span>
                </div>
                <p className="habit-panel-hint">
                  {[
                    "",
                    "Never participates",
                    "Rarely participates",
                    "Sometimes participates",
                    "Often participates",
                    "Always participates",
                  ][parseInt(formState.participationLevel || 0)] ||
                    "Optional — how often you take part in class discussions."}
                </p>
              </div>

              {/* Absences — read-only metric strip */}
              <div
                className="habit-metric-card"
                title="Value from the server based on study streaks and logged sessions"
              >
                <div className="habit-metric-inner">
                  <div className="habit-metric-copy">
                    <div className="habit-metric-heading">
                      <span className="habit-metric-title">Absences</span>
                      <span className="habit-metric-badge">From your activity</span>
                    </div>
                    <p className="habit-metric-desc">
                      Updates when you study in the app. Missed streak days increase this
                      count.
                    </p>
                  </div>
                  <div className="habit-metric-value" role="status">
                    {formState.absences !== "" && formState.absences != null
                      ? formState.absences
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Tutoring */}
              <div className="habit-panel habit-toggle-row">
                <div>
                  <span className="habit-field-label" style={{ fontSize: "0.9rem", color: "var(--foreground)" }}>
                    Tutoring Services
                  </span>
                  <small className="field-hint" style={{ marginTop: "0.2rem" }}>
                    Enable personalised tutoring recommendations based on your performance.
                  </small>
                </div>
                <label className="toggle-switch" aria-label="Tutoring">
                  <input
                    type="checkbox"
                    checked={formState.tutoring}
                    onChange={handleChange("tutoring")}
                  />
                  <span className="toggle-track">
                    <span className="toggle-thumb" />
                  </span>
                </label>
              </div>
            </div>
          )}
        </section>

        {/* ════════════════════════════════════════
            STUDY DATA (per browser / per site)
        ════════════════════════════════════════ */}
        <section className="settings-card">
          <h2 className="settings-section-title">Flashcards &amp; study data</h2>
          <p className="settings-study-data-note">
            Flashcards and spaced-repetition progress are stored in{" "}
            <strong>this browser</strong> for <strong>this website address</strong>.
            <br />
            <strong>localhost</strong> (when you develop) and <strong>your deployed URL</strong>{" "}
            (e.g. <code className="settings-code-inline">.vercel.app</code>) do{" "}
            <strong>not</strong> share storage — that is normal browser behavior, not a bug.
            Cards that only existed on your computer stay there until you move them.
          </p>
          <p className="settings-study-data-note settings-study-data-note-secondary">
            Download a backup while logged in on <strong>localhost</strong>, then open{" "}
            <strong>Settings</strong> on your live site and import the same file (same account).
          </p>
          <div className="settings-study-data-actions">
            <input
              ref={studyBackupInputRef}
              type="file"
              accept="application/json,.json"
              className="settings-hidden-file-input"
              aria-hidden
              tabIndex={-1}
              onChange={handleImportStudyBackup}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleExportStudyBackup}
            >
              <FaDownload className="settings-inline-icon" aria-hidden />
              Download backup
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => studyBackupInputRef.current?.click()}
            >
              <FaUpload className="settings-inline-icon" aria-hidden />
              Import backup…
            </button>
          </div>
        </section>

        {/* ════════════════════════════════════════
            NOTIFICATIONS
        ════════════════════════════════════════ */}
        <section className="settings-card">
          <h2 className="settings-section-title">Notifications</h2>
          <div className="settings-toggle-list">

            <div className="settings-toggle-row">
              <div>
                <span className="toggle-row-title">Email alerts</span>
                <small className="toggle-row-desc">
                  Study reminders near due time and a daily summary at your reminder time.
                  Uses browser notifications by default; add EmailJS keys in{" "}
                  <code className="settings-code-inline">.env</code> (see{" "}
                  <code className="settings-code-inline">reminderEmailService.js</code>
                  ) to send real email.
                </small>
              </div>
              <label className="toggle-switch" aria-label="Email alerts">
                <input
                  type="checkbox"
                  checked={formState.notificationsEmail}
                  onChange={handleToggleEmailAlerts}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>

            <div className="settings-toggle-row">
              <div>
                <span className="toggle-row-title">Push notifications</span>
                <small className="toggle-row-desc">
                  Get instant alerts for upcoming deadlines and study reminders.
                </small>
              </div>
              <label className="toggle-switch" aria-label="Push notifications">
                <input
                  type="checkbox"
                  checked={formState.notificationsPush}
                  onChange={handleTogglePushAlerts}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>

            <div className="settings-toggle-row">
              <div>
                <span className="toggle-row-title">SMS reminders</span>
                <small className="toggle-row-desc">
                  Receive text messages for critical alerts only.
                </small>
              </div>
              <label className="toggle-switch" aria-label="SMS reminders">
                <input
                  type="checkbox"
                  checked={formState.notificationsSms}
                  onChange={handleChange("notificationsSms")}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════
            PRIVACY
        ════════════════════════════════════════ */}
        <section className="settings-card">
          <h2 className="settings-section-title">Privacy</h2>
          <div className="settings-toggle-list">

            <div className="settings-toggle-row">
              <div>
                <span className="toggle-row-title">Show profile to mentors</span>
                <small className="toggle-row-desc">
                  Allow university-approved mentors to view your academic profile.
                </small>
              </div>
              <label className="toggle-switch" aria-label="Show profile to mentors">
                <input
                  type="checkbox"
                  checked={formState.showProfile}
                  onChange={handleChange("showProfile")}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>

            <div className="settings-toggle-row">
              <div>
                <span className="toggle-row-title">Allow analytics</span>
                <small className="toggle-row-desc">
                  Share anonymous usage data to help us improve the platform.
                </small>
              </div>
              <label className="toggle-switch" aria-label="Allow analytics">
                <input
                  type="checkbox"
                  checked={formState.allowAnalytics}
                  onChange={handleChange("allowAnalytics")}
                />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
              </label>
            </div>

          </div>
        </section>

        {/* ════════════════════════════════════════
            SYNC STATUS (subtle bar — no card border)
        ════════════════════════════════════════ */}
        <div className="settings-sync-card">
          <div className="sync-left">
            <FaCloud className="sync-cloud-icon" />
            <div>
              <strong>
                Sync Status: {status === "saved" ? "Saved" : "Up to date"}
              </strong>
              <small>{formatLastSynced()}</small>
            </div>
          </div>
          <span className="sync-storage">Storage: Cloud + Local</span>
        </div>

        {/* ════════════════════════════════════════
            DANGER ZONE (minimal, no card)
        ════════════════════════════════════════ */}
        <div className="settings-danger-zone">
          <p className="danger-zone-label">Danger Zone</p>
          <p className="danger-zone-desc">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          {deleteError && <p className="settings-error">{deleteError}</p>}
          <button
            className="btn btn-danger"
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete Account"}
          </button>
        </div>

      </form>
    </div>
  );
}

export default Settings;
