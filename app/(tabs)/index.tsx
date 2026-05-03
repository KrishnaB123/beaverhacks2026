import { getMusicFromLocation } from '@/utils/nemotron';
import { getNearbyFeatures } from '@/utils/overpass';
import { addToQueue, searchSpotifyTrack } from '@/utils/spotify';
import * as AuthSession from 'expo-auth-session';
import * as Location from 'expo-location';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
  const [features, setFeatures] = useState<string[]>([]);
  const [currentTrack, setCurrentTrack] = useState<{ name: string; artist: string } | null>(null);
  const [queuedTracks, setQueuedTracks] = useState<{ name: string; artist: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const redirectUri = AuthSession.makeRedirectUri();
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    { clientId: CLIENT_ID, scopes: SCOPES, usePKCE: true, redirectUri },
    discovery
  );

  // Pulse animation for the location dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Fade in on load
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      exchangeCodeForToken(response.params.code);
    }
  }, [response]);

  const addSongToQueue = async (tok: string) => {
    setLoading(true);
    try {
      const currentLoc = await Location.getCurrentPositionAsync({});
      setLocation(currentLoc);
      const nearbyFeatures = await getNearbyFeatures(currentLoc.coords.latitude, currentLoc.coords.longitude);
      setFeatures(nearbyFeatures);
      const recommendation = await getMusicFromLocation(nearbyFeatures);
      const track = await searchSpotifyTrack(recommendation.song, recommendation.artist, tok);
      if (track) {
        await addToQueue(track.uri, tok);
        setCurrentTrack({ name: track.name, artist: track.artist });
        setQueuedTracks(prev => [{ name: track.name, artist: track.artist }, ...prev.slice(0, 4)]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }
      await addSongToQueue(token);
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 30000 },
        (newLoc) => setLocation(newLoc)
      );
      setInterval(() => addSongToQueue(token), 30000);
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
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>TRAILMIX</Text>
        <Text style={styles.appSubtitle}>music for the road</Text>
      </View>

      {!token ? (
        // Login Screen
        <View style={styles.loginContainer}>
          <Text style={styles.loginHero}>🗺️</Text>
          <Text style={styles.loginTitle}>Your journey,{'\n'}your soundtrack.</Text>
          <Text style={styles.loginDesc}>
            Connect Spotify and let your surroundings choose the music.
          </Text>
          <TouchableOpacity
            style={[styles.spotifyButton, !request && styles.buttonDisabled]}
            onPress={() => promptAsync()}
            disabled={!request}
          >
            <Text style={styles.spotifyButtonText}>● Connect Spotify</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Main Screen
        <ScrollView contentContainerStyle={styles.mainContainer} showsVerticalScrollIndicator={false}>

          {/* Location Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Animated.View style={[styles.locationDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.cardLabel}>CURRENT LOCATION</Text>
            </View>
            {locationError ? (
              <Text style={styles.errorText}>{locationError}</Text>
            ) : location ? (
              <Text style={styles.coordText}>
                {location.coords.latitude.toFixed(4)}°N, {location.coords.longitude.toFixed(4)}°W
              </Text>
            ) : (
              <Text style={styles.mutedText}>Acquiring GPS...</Text>
            )}
          </View>

          {/* Nearby Features */}
          {features.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>NEARBY LANDSCAPE</Text>
              <View style={styles.featurePills}>
                {features.map((f, i) => (
                  <View key={i} style={styles.pill}>
                    <Text style={styles.pillText}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Now Queued */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>JUST ADDED</Text>
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#a855f7" size="small" />
                <Text style={styles.mutedText}>  Finding a song...</Text>
              </View>
            ) : currentTrack ? (
              <View>
                <Text style={styles.trackName}>{currentTrack.name}</Text>
                <Text style={styles.trackArtist}>{currentTrack.artist}</Text>
              </View>
            ) : (
              <Text style={styles.mutedText}>Waiting for first song...</Text>
            )}
          </View>

          {/* Queue History */}
          {queuedTracks.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>QUEUE HISTORY</Text>
              {queuedTracks.slice(1).map((t, i) => (
                <View key={i} style={styles.historyRow}>
                  <Text style={styles.historyTrack}>{t.name}</Text>
                  <Text style={styles.historyArtist}>{t.artist}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.footer}>Updates every 30 seconds</Text>
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 6,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#a855f7',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  loginHero: {
    fontSize: 64,
    marginBottom: 8,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 40,
  },
  loginDesc: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  spotifyButton: {
    backgroundColor: '#a855f7',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  spotifyButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 1,
  },
  mainContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 2,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a855f7',
  },
  coordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  mutedText: {
    fontSize: 14,
    color: '#555',
  },
  errorText: {
    fontSize: 14,
    color: '#ff4444',
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  pillText: {
    fontSize: 12,
    color: '#aaa',
    textTransform: 'capitalize',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  trackArtist: {
    fontSize: 14,
    color: '#a855f7',
    marginTop: 2,
  },
  historyRow: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  historyTrack: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '600',
  },
  historyArtist: {
    fontSize: 12,
    color: '#555',
    marginTop: 1,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#333',
    letterSpacing: 1,
    marginTop: 8,
  },
});