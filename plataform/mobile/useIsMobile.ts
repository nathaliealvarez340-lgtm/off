"use client";

import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 768px)";

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(query.matches);

    sync();
    query.addEventListener("change", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      query.removeEventListener("change", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return isMobile;
}
