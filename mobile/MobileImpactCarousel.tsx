"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { MobileCountUp } from "@/mobile/MobileCountUp";

type ImpactMetric = {
  value: number;
  decimals?: number;
  suffix: string;
  label: string;
};

export function ImpactMetricCard({ active, metric }: { active: boolean; metric: ImpactMetric }) {
  return (
    <article className="mobile-impact-card" aria-hidden={!active}>
      <strong>
        <MobileCountUp active={active} value={metric.value} decimals={metric.decimals} suffix={metric.suffix} />
      </strong>
      <span>{metric.label}</span>
    </article>
  );
}

export function MobileImpactCarousel({ metrics }: { metrics: ImpactMetric[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const reduceMotion = useReducedMotion();

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const viewport = viewportRef.current;
    const card = viewport?.querySelector<HTMLElement>(`[data-impact-index="${index}"]`);
    if (!viewport || !card) return;

    viewport.scrollTo({ left: card.offsetLeft, behavior: reduceMotion ? "auto" : behavior });
  }, [reduceMotion]);

  const pauseForInteraction = useCallback(() => {
    setPaused(true);
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
  }, []);

  const resumeAfterInteraction = useCallback(() => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setPaused(false), 5000);
  }, []);

  const syncActiveIndex = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    const cards = Array.from(viewport.querySelectorAll<HTMLElement>("[data-impact-index]"));
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(cardCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex((current) => current === closestIndex ? current : closestIndex);
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(syncActiveIndex);
  }, [syncActiveIndex]);

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    pauseForInteraction();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: viewport.scrollLeft,
    };
    viewport.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    const drag = dragRef.current;
    if (!viewport || !drag || drag.pointerId !== event.pointerId) return;
    viewport.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startX);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    if (viewport?.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    resumeAfterInteraction();
  }

  useEffect(() => {
    if (paused || reduceMotion || metrics.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % metrics.length;
        scrollToIndex(next);
        return next;
      });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [metrics.length, paused, reduceMotion, scrollToIndex]);

  useEffect(() => () => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current);
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  function selectIndex(index: number) {
    pauseForInteraction();
    setActiveIndex(index);
    scrollToIndex(index);
    resumeAfterInteraction();
  }

  return (
    <div
      className="mobile-impact-carousel"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Impacto de OFF"
    >
      <div
        className="mobile-impact-viewport"
        ref={viewportRef}
        onScroll={handleScroll}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="mobile-impact-track">
          {metrics.map((metric, index) => (
            <div data-impact-index={index} key={`${metric.value}-${metric.label}`}>
              <ImpactMetricCard active={index === activeIndex} metric={metric} />
            </div>
          ))}
        </div>
      </div>
      <div className="mobile-impact-dots" aria-label="Seleccionar métrica">
        {metrics.map((metric, index) => (
          <button
            type="button"
            className={index === activeIndex ? "is-active" : ""}
            onClick={() => selectIndex(index)}
            aria-label={`Ver ${metric.label}`}
            aria-current={index === activeIndex ? "true" : undefined}
            key={`${metric.label}-dot`}
          />
        ))}
      </div>
    </div>
  );
}
