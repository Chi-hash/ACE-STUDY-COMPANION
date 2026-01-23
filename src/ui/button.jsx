// src/components/ui/button.jsx
import React from "react";

export function Button({
  className = "",
  variant = "default",
  size = "md",
  children,
  ...props
}) {
  const variantClass = variant === "default" ? "btn-default" : "btn-outline";
  const sizeClass = size === "sm" ? "btn-sm" : "";

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
