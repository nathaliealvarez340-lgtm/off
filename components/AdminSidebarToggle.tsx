"use client";

import { useEffect, useState } from "react";

export function AdminSidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("off-admin-sidebar-collapsed") === "true";
    setCollapsed(stored);
    document.querySelector(".admin-dashboard")?.classList.toggle("admin-sidebar-collapsed", stored);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem("off-admin-sidebar-collapsed", String(next));
    document.querySelector(".admin-dashboard")?.classList.toggle("admin-sidebar-collapsed", next);
  }

  return (
    <button className="sidebar-collapse-button" type="button" onClick={toggle} aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}>
      {collapsed ? "→" : "←"}
    </button>
  );
}
