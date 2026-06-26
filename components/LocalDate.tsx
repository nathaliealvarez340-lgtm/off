"use client";

import { useEffect, useState } from "react";

export function LocalDate({ value }: { value: string }) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    setFormatted(new Intl.DateTimeFormat(navigator.language, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value)));
  }, [value]);

  return <>{formatted || "—"}</>;
}
