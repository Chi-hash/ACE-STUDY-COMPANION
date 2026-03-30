/**
 * Client-side study reminder delivery (no backend changes).
 *
 * 1) Optional real email via EmailJS — set in .env:
 *    VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY
 *    Template should include params: {{to_email}}, {{subject}}, {{message}}
 *    (configure the template in EmailJS to send to {{to_email}}).
 *
 * 2) Browser notifications when permission is granted (always tries this if enabled in Settings).
 */

const SENT_KEY = "aceit_reminder_email_sent_v1";

function loadSentMap() {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSentMap(map) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const pruned = Object.fromEntries(
    Object.entries(map).filter(([, t]) => typeof t === "number" && t > cutoff)
  );
  localStorage.setItem(SENT_KEY, JSON.stringify(pruned));
}

function reminderDedupeKey(userId, reminderId, dueMs) {
  return `${userId}::${reminderId ?? "x"}::${dueMs}`;
}

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem("aceit_settings") || "{}");
  } catch {
    return {};
  }
}

export function isEmailJsConfigured() {
  return Boolean(
    import.meta.env.VITE_EMAILJS_SERVICE_ID &&
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID &&
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  );
}

export async function requestReminderNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

async function sendEmailJsReminder({ toEmail, title, dueDateIso }) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
  const dueStr = dueDateIso
    ? new Date(dueDateIso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Soon";

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: toEmail,
        subject: `AceIt study reminder: ${title}`,
        message: `You have a study task coming up.\n\nTask: ${title}\nDue: ${dueStr}\n\nOpen AceIt to view your calendar and tasks.`,
        reply_to: toEmail,
      },
    }),
  });

  return res.ok;
}

/**
 * Call after fetching reminders (e.g. from get_reminders). Idempotent per user/reminder/due instant.
 */
export async function processReminderEmails(reminders, { userEmail, userId }) {
  if (!userId) return;

  const settings = readSettings();
  if (!settings.notificationsEmail && !settings.notificationsPush) return;

  const list = (reminders || []).filter((r) => r && !r.completed);
  const now = Date.now();

  for (const r of list) {
    if (!r.due_date) continue;
    const due = new Date(r.due_date).getTime();
    if (Number.isNaN(due)) continue;

    const msUntilDue = due - now;
    const soon = msUntilDue > 0 && msUntilDue <= 45 * 60 * 1000;
    const overdueSoon = msUntilDue < 0 && msUntilDue >= -3 * 60 * 60 * 1000;
    if (!soon && !overdueSoon) continue;

    const key = reminderDedupeKey(userId, r.id, due);
    const sent = loadSentMap();
    if (sent[key]) continue;

    const title = r.title || "Study reminder";
    const body =
      msUntilDue < 0
        ? `Overdue — was due ${new Date(r.due_date).toLocaleString()}`
        : `Due ${new Date(r.due_date).toLocaleString()}`;

    let delivered = false;

    if (
      settings.notificationsEmail &&
      userEmail &&
      String(userEmail).includes("@") &&
      isEmailJsConfigured()
    ) {
      try {
        delivered = await sendEmailJsReminder({
          toEmail: userEmail,
          title,
          dueDateIso: r.due_date,
        });
      } catch (e) {
        console.warn("Reminder email (EmailJS) failed:", e);
      }
    }

    if (
      (settings.notificationsEmail || settings.notificationsPush) &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(`AceIt — ${title}`, { body, tag: key, silent: false });
        delivered = true;
      } catch (e) {
        console.warn("Reminder notification failed:", e);
      }
    }

    if (delivered) {
      sent[key] = Date.now();
      saveSentMap(sent);
    }
  }
}

/**
 * Once per local day, at the user's "Daily reminder time" from Settings,
 * sends a digest of tasks due that day (EmailJS + browser notification).
 */
export async function maybeSendDailyStudyDigest(reminders, { userEmail, userId }) {
  if (!userId) return;

  const settings = readSettings();
  if (!settings.notificationsEmail && !settings.notificationsPush) return;

  const rt = settings.reminderTime || "08:00";
  const parts = String(rt).split(":");
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;

  const now = new Date();
  if (now.getHours() !== hh || now.getMinutes() !== mm) return;

  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const digestKey = `digest_${userId}_${y}-${mo}-${d}`;
  const sent = loadSentMap();
  if (sent[digestKey]) return;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const todayTasks = (reminders || []).filter((r) => {
    if (!r || r.completed || !r.due_date) return false;
    const t = new Date(r.due_date).getTime();
    return !Number.isNaN(t) && t >= start.getTime() && t <= end.getTime();
  });

  const lines = todayTasks.map((r) => {
    const t = new Date(r.due_date).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `• ${r.title || "Study task"} — ${t}`;
  });
  const message =
    todayTasks.length > 0
      ? `Today's study tasks:\n${lines.join("\n")}`
      : "No tasks due today — a good day to review or plan ahead.";

  let delivered = false;

  if (
    settings.notificationsEmail &&
    userEmail &&
    String(userEmail).includes("@") &&
    isEmailJsConfigured()
  ) {
    try {
      const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
          template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: userEmail,
            subject: "AceIt — your study plan for today",
            message,
            reply_to: userEmail,
          },
        }),
      });
      delivered = res.ok;
    } catch (e) {
      console.warn("Daily digest email failed:", e);
    }
  }

  if (
    (settings.notificationsEmail || settings.notificationsPush) &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification("AceIt — today's study tasks", {
        body: todayTasks.length
          ? `${todayTasks.length} task(s) due today. Open AceIt for details.`
          : message,
        tag: digestKey,
      });
      delivered = true;
    } catch (e) {
      console.warn("Daily digest notification failed:", e);
    }
  }

  if (delivered) {
    sent[digestKey] = Date.now();
    saveSentMap(sent);
  }
}
