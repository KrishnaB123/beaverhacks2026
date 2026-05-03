import axios from 'axios';

const NVIDIA_API_KEY = process.env.EXPO_PUBLIC_NVIDIA_API_KEY ?? '';

export const getMusicFromLocation = async (features: string[]): Promise<string> => {
  const featureList = features.join(', ');
  
  const response = await axios.post(
    'https://integrate.api.nvidia.com/v1/chat/completions',
    {
      model: 'nvidia/nemotron-mini-4b-instruct',
      messages: [
        {
          role: 'system',
          content: 'You are a music recommendation assistant. Given geographic features near a user, suggest a Spotify search query for fitting background music. Respond with ONLY the search query, nothing else. Keep it short, 2-5 words.'
        },
        {
          role: 'user',
          content: `I am near these geographic features: ${featureList}. What Spotify search query fits this landscape?`
        }
      ],
      max_tokens: 50,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  );

  return response.data.choices[0].message.content.trim();
};