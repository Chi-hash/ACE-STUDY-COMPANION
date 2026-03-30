/** Key must match Settings.jsx */
export const ACEIT_SETTINGS_KEY = "aceit_settings";

/** Default matches Settings `defaultSettings.weeklyGoalHours` */
const DEFAULT_WEEKLY_GOAL_HOURS = 6;

export function readWeeklyGoalHoursFromStorage(
  defaultHours = DEFAULT_WEEKLY_GOAL_HOURS
) {
  try {
    const stored = JSON.parse(
      localStorage.getItem(ACEIT_SETTINGS_KEY) || "{}"
    );
    const n = Number(stored.weeklyGoalHours);
    if (Number.isFinite(n) && n > 0) return Math.min(168, n);
    return defaultHours;
  } catch {
    return defaultHours;
  }
}

export function computeWeeklyProgressPercent(studyHoursThisWeek, goalHours) {
  const hours = Number(studyHoursThisWeek);
  const goal = Number(goalHours) || 0;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  if (!goal) return 0;
  return Math.min(Math.round((hours / goal) * 100), 100);
}
