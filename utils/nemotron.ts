import axios from 'axios';

const NVIDIA_API_KEY = process.env.EXPO_PUBLIC_NVIDIA_API_KEY ?? '';

export interface SongRecommendation {
  song: string;
  artist: string;
}

// Tracks all previously suggested songs globally
const suggestedSongs: SongRecommendation[] = [];

export const getMusicFromLocation = async (
  features: string[],
): Promise<SongRecommendation> => {
  const featureList = features.join(', ');
  const avoidList = suggestedSongs.map(s => `"${s.song}" by ${s.artist}`).join(', ');

  const response = await axios.post(
    'https://integrate.api.nvidia.com/v1/chat/completions',
    {
model: 'nvidia/nemotron-nano-8b-instruct'      ,
messages: [
        {
          role: 'system',
          content: `You are a music recommendation assistant. Given nearby geographic features and landmarks, recommend a real specific song that fits the vibe of that landscape. 
          Respond with ONLY a JSON object in this exact format, nothing else:
          {"song": "Song Name", "artist": "Artist Name"}
          Do not include any explanation, just the JSON.`
        },
        {
          role: 'user',
          content: `I am near these geographic features and landmarks: ${featureList}. Recommend a real specific song on Spotify that fits this landscape. ${avoidList ? `Do NOT suggest any of these previously suggested songs: ${avoidList}.` : ''} Pick something different and unexpected each time.`
        }
      ],
      max_tokens: 100,
      temperature: 0.9,
    },
    {
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  const raw = response.data.choices[0].message.content.trim();

  try {
    const songMatch = raw.match(/"song":\s*"([^"]+)"/);
    const artistMatch = raw.match(/"artist":\s*"([^"]+)"/);

    const song = songMatch?.[1] ?? '';
    const artist = artistMatch?.[1] ?? '';

    console.log('Parsed song:', song, 'artist:', artist);

    if (song && artist) {
      suggestedSongs.push({ song, artist });
      return { song, artist };
    }
    return { song: raw, artist: '' };
  } catch {
    console.log('Failed to parse:', raw);
    return { song: raw, artist: '' };
  }
};