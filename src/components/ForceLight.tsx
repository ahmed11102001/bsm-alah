"use client";

// Wrapper that pins its subtree to the LIGHT theme, even when <html>
// carries .dark (dashboard choice). Uses display:contents so it stays
// layout-transparent — CSS variables still inherit through it.
export default function ForceLight({ children }: { children: React.ReactNode }) {
  return <div className="force-light contents">{children}</div>;
}
