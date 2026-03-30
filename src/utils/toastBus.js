/**
 * App-wide toasts (fixed layer, all sections). Dispatch `aceit-toast` on window.
 *
 * @typedef {Object} ToastAction
 * @property {string} label - Button text
 * @property {string} [navigateTo] - React Router path (e.g. `/calendar`)
 * @property {string} [openUrl] - Open in new tab (https:…)
 */

const EVENT = "aceit-toast";
export const SCHEDULED_TOASTS_KEY = "aceit_scheduled_toasts";

/**
 * @param {"success" | "error" | "info"} type
 * @param {string} message
 * @param {{
 *   title?: string,
 *   durationMs?: number | null,
 *   actions?: ToastAction[],
 * }=} options
 *   durationMs: `null` or omitted with actions = stay until dismissed; number = auto-hide ms.
 */
export function showAppToast(type, message, options = {}) {
  if (typeof window === "undefined" || !message) return;
  const t =
    type === "error" ? "error" : type === "info" ? "info" : "success";
  window.dispatchEvent(
    new CustomEvent(EVENT, {
      detail: {
        type: t,
        message: String(message),
        title: options.title ? String(options.title) : undefined,
        durationMs: options.durationMs,
        actions: Array.isArray(options.actions) ? options.actions : [],
      },
    }),
  );
}

/**
 * Schedule a toast for a future time (persists across reloads while logged in).
 * @param {{
 *   fireAt: number,
 *   type?: "success" | "error" | "info",
 *   message: string,
 *   title?: string,
 *   durationMs?: number | null,
 *   actions?: ToastAction[],
 * }} payload - fireAt = Date.now() ms
 * @returns {string} scheduleId
 */
export function scheduleAppToast(payload) {
  if (typeof window === "undefined" || !payload?.message || !payload?.fireAt) {
    return "";
  }
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  try {
    const list = JSON.parse(
      localStorage.getItem(SCHEDULED_TOASTS_KEY) || "[]",
    );
    list.push({
      scheduleId: id,
      fireAt: Number(payload.fireAt),
      type: payload.type === "error" || payload.type === "info" ? payload.type : "info",
      message: String(payload.message),
      title: payload.title ? String(payload.title) : undefined,
      durationMs: payload.durationMs,
      actions: Array.isArray(payload.actions) ? payload.actions : [],
    });
    list.sort((a, b) => a.fireAt - b.fireAt);
    localStorage.setItem(SCHEDULED_TOASTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return id;
}

export function cancelScheduledToast(scheduleId) {
  if (typeof window === "undefined" || !scheduleId) return;
  try {
    const list = JSON.parse(
      localStorage.getItem(SCHEDULED_TOASTS_KEY) || "[]",
    ).filter((x) => x.scheduleId !== scheduleId);
    localStorage.setItem(SCHEDULED_TOASTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
