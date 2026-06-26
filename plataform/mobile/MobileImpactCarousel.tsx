"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MobileCountUp } from "@/mobile/MobileCountUp";
import { mobileEase } from "@/mobile/mobileCopy";

type ImpactMetric = {
  value: number;
  decimals?: number;
  suffix: string;
  label: string;
};

export function ImpactMetricCard({ metric }: { metric: ImpactMetric }) {
  return (
    <article className="mobile-impact-card">
      <strong>
        <MobileCountUp value={metric.value} decimals={metric.decimals} suffix={metric.suffix} />
      </strong>
      <span>{metric.label}</span>
    </article>
  );
}

export function MobileImpactCarousel({ metrics }: { metrics: ImpactMetric[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || metrics.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % metrics.length);
    }, 2600);
    return () => window.clearInterval(timer);
  }, [metrics.length, paused]);

  return (
    <div
      className="mobile-impact-carousel"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        className="mobile-impact-track"
        animate={{ x: `-${activeIndex * 86}vw` }}
        transition={{ duration: 0.72, ease: mobileEase }}
      >
        {metrics.map((metric) => (
          <ImpactMetricCard metric={metric} key={`${metric.value}-${metric.label}`} />
        ))}
      </motion.div>
      <div className="mobile-impact-dots" aria-hidden="true">
        {metrics.map((metric, index) => (
          <button
            type="button"
            className={index === activeIndex ? "is-active" : ""}
            onClick={() => setActiveIndex(index)}
            key={`${metric.label}-dot`}
            tabIndex={-1}
          />
        ))}
      </div>
    </div>
  );
}
