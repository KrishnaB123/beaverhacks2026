export const searchSpotifyTrack = async (
  song: string,
  artist: string,
  token: string
): Promise<{ uri: string; name: string; artist: string } | null> => {

  // Step 1: search song + artist together (best match)
  const fullQuery = encodeURIComponent(`${song} ${artist}`);
  const fullResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${fullQuery}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const fullData = await fullResponse.json();
  const fullTrack = fullData.tracks?.items?.[0];

  if (fullTrack) {
    console.log('✅ Found via song+artist:', fullTrack.name, '-', fullTrack.artists[0].name);
    return {
      uri: fullTrack.uri,
      name: fullTrack.name,
      artist: fullTrack.artists[0].name,
    };
  }

  // Step 2: search just song name
  const songQuery = encodeURIComponent(song);
  const songResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${songQuery}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const songData = await songResponse.json();
  const songTrack = songData.tracks?.items?.[0];

  if (songTrack) {
    console.log('✅ Found via song name:', songTrack.name, '-', songTrack.artists[0].name);
    return {
      uri: songTrack.uri,
      name: songTrack.name,
      artist: songTrack.artists[0].name,
    };
  }

  // Step 3: search just artist name
  const artistQuery = encodeURIComponent(artist);
  const artistResponse = await fetch(
    `https://api.spotify.com/v1/search?q=${artistQuery}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const artistData = await artistResponse.json();
  const artistTrack = artistData.tracks?.items?.[0];

  if (artistTrack) {
    console.log('✅ Found via artist:', artistTrack.name, '-', artistTrack.artists[0].name);
    return {
      uri: artistTrack.uri,
      name: artistTrack.name,
      artist: artistTrack.artists[0].name,
    };
  }

  return null;
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