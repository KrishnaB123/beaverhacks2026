import { addToQueue, searchSpotifyTrack } from '@/utils/spotify';

import { getMusicFromLocation } from '@/utils/nemotron';
import { getNearbyFeatures } from '@/utils/overpass';

import * as AuthSession from 'expo-auth-session';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';


WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID ?? '';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
];

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: SCOPES,
      usePKCE: true,
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code);
    }
  }, [response]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      const features = await getNearbyFeatures(loc.coords.latitude, loc.coords.longitude);
console.log('Nearby features:', features);

const recommendation = await getMusicFromLocation(features);
console.log('Nemotron suggests:', recommendation.song, '-', recommendation.artist);

if (token) {
  const track = await searchSpotifyTrack(recommendation.song, recommendation.artist, token);
  if (track) {
    console.log('Found on Spotify:', track.name, '-', track.artist);
    const success = await addToQueue(track.uri, token);
    if (success) {
      console.log('✅ Added to queue!');
    } else {
      console.log('❌ Failed to add to queue - is Spotify open and playing?');
    }
  } else {
    console.log('❌ Nothing found on Spotify');
  }
}
      // Watch location as user moves
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 100 },
        (newLoc) => setLocation(newLoc)
      );
    })();
  }, [token]);

  const exchangeCodeForToken = async (code: string) => {
    const result = await AuthSession.exchangeCodeAsync(
      {
        clientId: CLIENT_ID,
        code,
        redirectUri,
        extraParams: request?.codeVerifier ? { code_verifier: request.codeVerifier } : {},
      },
      discovery
    );
    setToken(result.accessToken);
  };

  return (
    <View style={styles.container}>
      {token ? (
        <Text>✅ Logged into Spotify!</Text>
      ) : (
        <Button
          title="Login with Spotify"
          onPress={() => promptAsync()}
          disabled={!request}
        />
      )}

      {locationError ? (
        <Text style={styles.error}>{locationError}</Text>
      ) : location ? (
        <Text style={styles.location}>
          📍 {location.coords.latitude.toFixed(4)}, {location.coords.longitude.toFixed(4)}
        </Text>
      ) : (
        <Text>Fetching location...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  location: {
    fontSize: 16,
    color: 'green',
  },
  error: {
    fontSize: 16,
    color: 'red',
  },
});