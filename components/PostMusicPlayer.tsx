"use client";

import { Music2, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SpotifyIFramePlayer } from "@/components/SpotifyIFramePlayer";

export function PostMusicPlayer({
  musicSource,
  audioUrl,
  audioTitle,
  audioArtist,
  spotifyTrackId,
  playLabel = "Reproducir música",
  pauseLabel = "Pausar música",
}: {
  musicSource: "UPLOAD" | "SPOTIFY" | null;
  audioUrl: string | null;
  audioTitle: string | null;
  audioArtist: string | null;
  spotifyTrackId: string | null;
  playLabel?: string;
  pauseLabel?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const source =
    musicSource ?? (audioUrl ? "UPLOAD" : spotifyTrackId ? "SPOTIFY" : null);

  useEffect(() => {
    const audio = audioRef.current;
    if (source === "UPLOAD" && audioUrl && audio) {
      audio.currentTime = 0;
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
    return () => {
      audio?.pause();
      if (audio) audio.currentTime = 0;
      setPlaying(false);
    };
  }, [audioUrl, source]);

  if (source === "SPOTIFY" && spotifyTrackId) {
    return (
      <SpotifyIFramePlayer
        trackId={spotifyTrackId}
        title={audioTitle || "Spotify"}
        artist={audioArtist}
        playLabel={playLabel}
        pauseLabel={pauseLabel}
      />
    );
  }
  if (source !== "UPLOAD" || !audioUrl) return null;

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused)
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    else {
      audio.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="off-gallery-audio">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="none"
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggleAudio}
        aria-label={playing ? pauseLabel : playLabel}
      >
        {playing ? <Pause /> : <Play />}
      </button>
      <Music2 aria-hidden="true" />
      <span>
        <strong>{audioTitle || "Audio OFF"}</strong>
        {audioArtist ? <em>{audioArtist}</em> : null}
      </span>
    </div>
  );
}
