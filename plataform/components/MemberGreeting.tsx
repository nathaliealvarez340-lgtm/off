"use client";

import { useEffect, useState } from "react";

export function MemberGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Bienvenido");

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      setGreeting(hour >= 5 && hour < 12 ? "Buenos días" : hour >= 12 && hour < 19 ? "Buenas tardes" : "Buenas noches");
    };
    updateGreeting();
    const timer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return <>{greeting}, {name}.</>;
}
