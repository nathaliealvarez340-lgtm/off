export type SpotifyTrack = {
  trackId: string;
  url: string;
  embedUrl: string;
};

const SPOTIFY_TRACK_ID = /^[A-Za-z0-9]{10,64}$/;

export function isSpotifyTrackId(value: string) {
  return SPOTIFY_TRACK_ID.test(value);
}

export function parseSpotifyTrackUrl(value: string): SpotifyTrack | null {
  const input = value.trim();
  if (!input || input.length > 2048) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.host !== "open.spotify.com" || url.username || url.password) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "track" || !isSpotifyTrackId(parts[1])) return null;
    const trackId = parts[1];
    return {
      trackId,
      url: `https://open.spotify.com/track/${trackId}`,
      embedUrl: `https://open.spotify.com/embed/track/${trackId}`,
    };
  } catch {
    return null;
  }
}

export function spotifyEmbedUrl(trackId: string) {
  return isSpotifyTrackId(trackId) ? `https://open.spotify.com/embed/track/${trackId}` : null;
}
