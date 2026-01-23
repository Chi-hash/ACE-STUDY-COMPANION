// src/components/ui/progress.jsx
import React from "react";

export function Progress({ className = "", value = 0, ...props }) {
  return (
    <div className={`progress ${className}`} {...props}>
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  );
}
