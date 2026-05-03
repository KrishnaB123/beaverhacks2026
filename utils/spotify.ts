export const searchSpotifyTrack = async (
  song: string,
  artist: string,
  token: string
): Promise<{ uri: string; name: string; artist: string } | null> => {
  const query = encodeURIComponent(`track:${song} artist:${artist}`);
  
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=track&limit=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await response.json();
  const track = data.tracks?.items?.[0];

  if (!track) return null;

  return {
    uri: track.uri,
    name: track.name,
    artist: track.artists[0].name,
  };
};

export const addToQueue = async (uri: string, token: string): Promise<boolean> => {
  const response = await fetch(
    `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  return response.status === 204;
};