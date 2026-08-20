"use client";

import { useEffect, useState } from "react";
import { useOffLanguage } from "@/components/useOffLanguage";

const greetings = {
  es: ["Buenos días", "Buenas tardes", "Buenas noches"],
  en: ["Good morning", "Good afternoon", "Good evening"],
  it: ["Buongiorno", "Buon pomeriggio", "Buonasera"],
  pt: ["Bom dia", "Boa tarde", "Boa noite"],
} as const;

export function MemberGreeting({ name }: { name: string }) {
  const { language } = useOffLanguage();
  const [period, setPeriod] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      setPeriod(hour >= 5 && hour < 12 ? 0 : hour >= 12 && hour < 19 ? 1 : 2);
    };
    updateGreeting();
    const timer = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return <>{greetings[language][period]}, {name}.</>;
}
