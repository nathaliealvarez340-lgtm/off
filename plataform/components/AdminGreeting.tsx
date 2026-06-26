"use client";

import { useEffect, useState } from "react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Buenos días, Nathalie.";
  if (hour >= 12 && hour < 19) return "Buenas tardes, Nathalie.";
  return "Buenas noches, Nathalie.";
}

export function AdminGreeting() {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting());
    updateGreeting();
    const interval = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return <h1>{greeting || "OFF Admin"}</h1>;
}
