"use client";

import { Music2, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SpotifyController = {
  play: () => void;
  pause: () => void;
  destroy?: () => void;
  addListener: (event: string, callback: (event: { data?: { isPaused?: boolean } }) => void) => void;
};

type SpotifyApi = {
  createController: (element: HTMLElement, options: { uri: string; width: string; height: number }, callback: (controller: SpotifyController) => void) => void;
};

declare global {
  interface Window {
    SpotifyIframeApi?: SpotifyApi;
    onSpotifyIframeApiReady?: (api: SpotifyApi) => void;
  }
}

let apiPromise: Promise<SpotifyApi> | null = null;

function loadSpotifyApi() {
  if (typeof window === "undefined") return Promise.reject(new Error("Spotify solo está disponible en el navegador."));
  if (window.SpotifyIframeApi) return Promise.resolve(window.SpotifyIframeApi);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<SpotifyApi>((resolve, reject) => {
    const previous = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      window.SpotifyIframeApi = api;
      previous?.(api);
      resolve(api);
    };
    if (!document.querySelector('script[src="https://open.spotify.com/embed/iframe-api/v1"]')) {
      const script = document.createElement("script");
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      script.onerror = () => reject(new Error("No se pudo cargar Spotify."));
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

export function SpotifyIFramePlayer({ trackId, title, artist, playLabel, pauseLabel }: { trackId: string; title: string; artist?: string | null; playLabel: string; pauseLabel: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SpotifyController | null>(null);
  const [playing, setPlaying] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let active = true;
    let playbackStarted = false;
    let timer = 0;
    const host = hostRef.current;
    if (!host) return;
    host.replaceChildren();
    loadSpotifyApi().then((api) => {
      if (!active) return;
      api.createController(host, { uri: `spotify:track:${trackId}`, width: "100%", height: 80 }, (controller) => {
        if (!active) { controller.destroy?.(); return; }
        controllerRef.current = controller;
        controller.addListener("playback_update", (event) => {
          const isPaused = event.data?.isPaused;
          if (typeof isPaused === "boolean") {
            if (!isPaused) playbackStarted = true;
            setPlaying(!isPaused);
            if (!isPaused) setFallback(false);
          }
        });
        controller.play();
        timer = window.setTimeout(() => { if (!playbackStarted) setFallback(true); }, 1400);
      });
    }).catch(() => setFallback(true));
    return () => {
      active = false;
      window.clearTimeout(timer);
      controllerRef.current?.pause();
      controllerRef.current?.destroy?.();
      controllerRef.current = null;
      host.replaceChildren();
    };
  }, [trackId]);

  function toggle() {
    const controller = controllerRef.current;
    if (!controller) { setFallback(true); return; }
    if (playing) controller.pause();
    else controller.play();
  }

  return (
    <div className={`off-spotify-controller ${fallback ? "needs-fallback" : ""}`}>
      <button type="button" onClick={toggle} aria-label={playing ? pauseLabel : playLabel}>
        {playing ? <Pause /> : <Play />}
        <Music2 aria-hidden="true" />
        <span>{title}{artist ? <em> · {artist}</em> : null}</span>
      </button>
      <div className="off-spotify-official" ref={hostRef} aria-hidden={!fallback} />
    </div>
  );
}
