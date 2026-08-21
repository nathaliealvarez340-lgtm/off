import { spotifyEmbedUrl } from "@/lib/spotify";

export function SpotifyTrackEmbed({ trackId, title = "Spotify" }: { trackId: string; title?: string }) {
  const src = spotifyEmbedUrl(trackId);
  if (!src) return null;
  return (
    <iframe
      className="spotify-track-embed"
      src={src}
      title={title}
      width="100%"
      height="152"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
