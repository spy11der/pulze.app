import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Search,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import {
  getNearbyVenuesLive,
  searchVenuesLive,
  type NearbyVenue,
  type SelectedLocation,
} from '@/hooks/useNearbyVenues';
import { analytics } from '@/services/analytics';

export default function LocationSelectorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { userLocation, isLocating, requestLocation } = useMapLocation();

  const [query, setQuery] = useState<string>('');
  const [nearbyVenues, setNearbyVenues] = useState<NearbyVenue[]>([]);
  const [searchResults, setSearchResults] = useState<NearbyVenue[]>([]);
  const inputRef = useRef<TextInput>(null);
  // Skip recording the same executed query twice in a row — pause,
  // resume-typing, and same-key-retap should collapse into one
  // event, not three.
  const lastRecordedQueryRef = useRef<string>('');

  useEffect(() => {
    if (!userLocation) return;
    getNearbyVenuesLive(userLocation.latitude, userLocation.longitude, 10).then(setNearbyVenues);
  }, [userLocation]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setSearchResults([]);
      lastRecordedQueryRef.current = '';
      return;
    }
    let cancelled = false;
    // 400ms debounce — long enough that a normal typist doesn't
    // burn one network + one analytics event per keystroke, short
    // enough to feel instant. The cleanup below clears the timer
    // when `query` changes again, so the effect only fires for the
    // last stable value the user paused on.
    const timer = setTimeout(() => {
      const run = async () => {
        const results = await searchVenuesLive(query);
        if (cancelled) return;
        let finalResults: NearbyVenue[];
        if (userLocation) {
          const nearbyResults = await getNearbyVenuesLive(userLocation.latitude, userLocation.longitude, 50);
          if (cancelled) return;
          const filtered = nearbyResults.filter(
            (v) =>
              v.name.toLowerCase().includes(query.toLowerCase()) ||
              v.neighborhood.toLowerCase().includes(query.toLowerCase())
          );
          const ids = new Set(filtered.map((v) => v.id));
          const extra = results.filter((v) => !ids.has(v.id));
          finalResults = [...filtered, ...extra].slice(0, 15);
        } else {
          finalResults = results.slice(0, 15);
        }
        setSearchResults(finalResults);
        // Record a MEANINGFUL debounced search under both purposes.
        // Dedup on the trimmed lowercased text so casing changes
        // during typing don't re-fire either row. Server drops the
        // personalization row when consent is off.
        const normalized = trimmed.toLowerCase();
        if (lastRecordedQueryRef.current !== normalized) {
          lastRecordedQueryRef.current = normalized;
          const payload = {
            eventType: 'search_query' as const,
            subjectType: 'search' as const,
            properties: {
              // Truncated to 200 chars. Never printed to console;
              // never sent outside Supabase.
              query: trimmed.slice(0, 200),
              query_length: trimmed.length,
              result_count: finalResults.length,
            },
          };
          analytics.operational(payload);
          analytics.personalization(payload);
        }
      };
      void run();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, userLocation]);

  const displayList = useMemo(() => {
    return query.trim().length > 0 ? searchResults : nearbyVenues;
  }, [query, searchResults, nearbyVenues]);

  const handleSelectVenue = useCallback(
    (venue: NearbyVenue) => {
      console.log('[LocationSelector] Selected venue:', venue.name);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const location: SelectedLocation = {
        type: 'venue',
        venueId: venue.id,
        name: venue.name,
        neighborhood: venue.neighborhood,
        latitude: venue.latitude,
        longitude: venue.longitude,
      };
      // Operational + personalization pair. Fires only when this
      // tap came from the search list (query non-empty); the same
      // handler is called for the nearby list too, and recording
      // nearby taps as search results would be misleading.
      const q = query.trim();
      if (q.length > 0) {
        const payload = {
          eventType: 'search_result_clicked' as const,
          subjectType: 'venue' as const,
          subjectId: venue.id,
          properties: {
            query: q.slice(0, 200),
            position: searchResults.findIndex((v) => v.id === venue.id),
          },
        };
        analytics.operational(payload);
        analytics.personalization(payload);
      }
      router.back();
      setTimeout(() => {
        router.setParams({ selectedLocation: JSON.stringify(location) });
      }, 50);
    },
    [router, query, searchResults]
  );

  const handleUseCurrentLocation = useCallback(() => {
    console.log('[LocationSelector] Using raw GPS location');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (userLocation) {
      const location: SelectedLocation = {
        type: 'custom',
        name: 'Current Location',
        neighborhood: 'GPS',
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      };
      router.back();
      setTimeout(() => {
        router.setParams({ selectedLocation: JSON.stringify(location) });
      }, 50);
    } else {
      void requestLocation();
    }
  }, [userLocation, router, requestLocation]);

  const clearQuery = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const renderVenueItem = useCallback(
    ({ item }: { item: NearbyVenue }) => {
      return (
        <VenueRow
          venue={item}
          colors={colors}
          isDark={isDark}
          showDistance={query.trim().length === 0 && item.distanceMeters > 0}
          onPress={() => handleSelectVenue(item)}
        />
      );
    },
    [colors, isDark, query, handleSelectVenue]
  );

  const keyExtractor = useCallback((item: NearbyVenue) => item.id, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="location-selector">
      <View style={[styles.headerArea, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.back();
            }}
            style={[styles.backBtn, { backgroundColor: colors.card }]}
            hitSlop={12}
          >
            <ArrowLeft color={colors.text} size={20} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Choose location</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search color={colors.textSoft} size={18} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search venues..."
            placeholderTextColor={colors.textSoft}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            testID="location-search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={clearQuery} hitSlop={8}>
              <X color={colors.textSoft} size={16} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={displayList}
        keyExtractor={keyExtractor}
        renderItem={renderVenueItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <Pressable
              onPress={handleUseCurrentLocation}
              style={[styles.gpsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              testID="use-current-location"
            >
              <View style={[styles.gpsIcon, { backgroundColor: `${colors.aqua}18` }]}>
                <Navigation color={colors.aqua} size={18} />
              </View>
              <View style={styles.gpsTextWrap}>
                <Text style={[styles.gpsTitle, { color: colors.aqua }]}>
                  {isLocating ? 'Getting location...' : 'Use current location'}
                </Text>
                <Text style={[styles.gpsSub, { color: colors.textSoft }]}>
                  Post using your GPS coordinates
                </Text>
              </View>
            </Pressable>

            <Text style={[styles.sectionLabel, { color: colors.textSoft }]}>
              {query.trim().length > 0
                ? searchResults.length > 0
                  ? `${searchResults.length} results`
                  : 'No venues found'
                : 'Nearby venues'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          query.trim().length > 0 ? (
            <View style={styles.emptyWrap}>
              <MapPin color={colors.textSoft} size={32} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No venues match "{query}"
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSoft }]}>
                Try a different name or use your current location
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function VenueRow({
  venue,
  colors,
  isDark,
  showDistance,
  onPress,
}: {
  venue: NearbyVenue;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
  showDistance: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.venueRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={[styles.venueIcon, { backgroundColor: `${colors.aqua}12` }]}>
          <MapPin color={colors.aqua} size={18} />
        </View>
        <View style={styles.venueInfo}>
          <Text style={[styles.venueName, { color: colors.text }]} numberOfLines={1}>
            {venue.name}
          </Text>
          <Text style={[styles.venueNeighborhood, { color: colors.textSoft }]} numberOfLines={1}>
            {venue.neighborhood}
            {venue.categoryLabel ? ` · ${venue.categoryLabel}` : ''}
          </Text>
        </View>
        {showDistance && (
          <View style={[styles.distBadge, { backgroundColor: isDark ? `${colors.aqua}14` : `${colors.aqua}10` }]}>
            <Text style={[styles.distText, { color: colors.aqua }]}>{venue.distanceLabel}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerArea: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 18,
    gap: 6,
  },
  gpsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 14,
    marginBottom: 6,
  },
  gpsIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  gpsTextWrap: {
    flex: 1,
    gap: 2,
  },
  gpsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  gpsSub: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
    marginLeft: 2,
  },
  venueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  venueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  venueInfo: {
    flex: 1,
    gap: 2,
  },
  venueName: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  venueNeighborhood: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  distBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  distText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  emptyWrap: {
    alignItems: 'center' as const,
    paddingTop: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  emptyHint: {
    fontSize: 13,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
});
