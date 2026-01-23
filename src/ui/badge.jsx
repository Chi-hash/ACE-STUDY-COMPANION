// src/components/ui/badge.jsx
import React from "react";

export function Badge({
  className = "",
  variant = "default",
  children,
  ...props
}) {
  const variantClass = variant === "outline" ? "badge-outline" : "";

  return (
    <div className={`badge ${variantClass} ${className}`} {...props}>
      {children}
    </div>
  );
}
