import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SCHEDULED_TOASTS_KEY } from "../utils/toastBus.js";
import "../styles/global-toast.css";

function defaultDurationMs(type, hasActions) {
  if (hasActions) return null;
  if (type === "error") return 5200;
  if (type === "info") return 4200;
  return 3600;
}

function normalizeToastDetail(d) {
  if (!d?.message) return null;
  const type =
    d.type === "error" ? "error" : d.type === "info" ? "info" : "success";
  const actions = Array.isArray(d.actions)
    ? d.actions.filter((a) => a && String(a.label || "").trim())
    : [];
  const hasActions = actions.length > 0;
  let durationMs = d.durationMs;
  if (durationMs === undefined) {
    durationMs = defaultDurationMs(type, hasActions);
  }
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    message: String(d.message),
    title: d.title ? String(d.title) : "",
    actions,
    durationMs,
  };
}

export function GlobalToastHost() {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const queueRef = useRef([]);

  const dismissAndShowNext = useCallback(() => {
    const next = queueRef.current.shift();
    setToast(next ?? null);
  }, []);

  const enqueue = useCallback((detail) => {
    const item = normalizeToastDetail(detail);
    if (!item) return;
    setToast((prev) => {
      if (!prev) return item;
      queueRef.current.push(item);
      return prev;
    });
  }, []);

  useEffect(() => {
    const onAppToast = (e) => enqueue(e.detail);
    window.addEventListener("aceit-toast", onAppToast);
    return () => window.removeEventListener("aceit-toast", onAppToast);
  }, [enqueue]);

  useEffect(() => {
    const drainScheduled = () => {
      let list = [];
      try {
        list = JSON.parse(localStorage.getItem(SCHEDULED_TOASTS_KEY) || "[]");
      } catch {
        return;
      }
      if (!Array.isArray(list) || !list.length) return;
      const now = Date.now();
      const due = list.filter((x) => Number(x.fireAt) <= now);
      const rest = list.filter((x) => Number(x.fireAt) > now);
      try {
        localStorage.setItem(SCHEDULED_TOASTS_KEY, JSON.stringify(rest));
      } catch {
        /* ignore */
      }
      due.forEach((row) => {
        const { scheduleId: _sid, fireAt: _fa, ...rest } = row;
        enqueue(rest);
      });
    };
    drainScheduled();
    const id = setInterval(drainScheduled, 15000);
    return () => clearInterval(id);
  }, [enqueue]);

  useEffect(() => {
    if (!toast) return;
    if (toast.durationMs == null || toast.durationMs <= 0) return;
    const t = setTimeout(() => dismissAndShowNext(), toast.durationMs);
    return () => clearTimeout(t);
  }, [toast, dismissAndShowNext]);

  const runAction = useCallback(
    (action) => {
      if (action.navigateTo) {
        navigate(action.navigateTo);
      } else if (action.openUrl) {
        try {
          const u = new URL(action.openUrl, window.location.origin);
          if (u.protocol === "http:" || u.protocol === "https:") {
            window.open(u.href, "_blank", "noopener,noreferrer");
          }
        } catch {
          /* ignore */
        }
      }
      dismissAndShowNext();
    },
    [navigate, dismissAndShowNext],
  );

  if (!toast) return null;

  const role = toast.type === "error" ? "alert" : "status";

  return (
    <div className="global-toast-host" aria-live={toast.type === "error" ? "assertive" : "polite"}>
      <div
        className={`global-toast global-toast-${toast.type}`}
        role={role}
      >
        <div className="global-toast-body">
          {toast.title ? (
            <div className="global-toast-title">{toast.title}</div>
          ) : null}
          <div className="global-toast-message">{toast.message}</div>
          {toast.actions.length > 0 ? (
            <div className="global-toast-actions">
              {toast.actions.map((action, i) => (
                <button
                  key={`${toast.id}-a-${i}`}
                  type="button"
                  className="global-toast-btn"
                  onClick={() => runAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="global-toast-close"
          aria-label="Dismiss notification"
          onClick={dismissAndShowNext}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default GlobalToastHost;
