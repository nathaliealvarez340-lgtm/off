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
    if (
      url.protocol !== "https:" ||
      url.hostname !== "open.spotify.com" ||
      url.port ||
      url.username ||
      url.password
    ) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    const trackIndex = segments.indexOf("track");
    const trackId = trackIndex >= 0 ? segments[trackIndex + 1] : undefined;
    if (!trackId || !isSpotifyTrackId(trackId)) return null;

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
