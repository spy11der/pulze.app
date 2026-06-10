import React, { useCallback, useMemo } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MapPin, Navigation } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/providers/ThemeProvider';
import { useMapLocation } from '@/hooks/useMapLocation';
import { getNearbyVenues, type NearbyVenue } from '@/hooks/useNearbyVenues';
import { pulzeVenues } from '@/mocks/venues';
import { getBusynessColor, getBusynessLabel } from '@/types/venue';

const DENVER_COORDS = { lat: 39.756, lng: -104.99 };

function metersToWalkMinutes(meters: number): string {
  const mins = Math.ceil(meters / 84); // ~5 km/h walking pace
  if (mins < 1) return '1 min';
  return `${mins} min`;
}

function NearbyCard({
  venue,
  onPress,
}: {
  venue: NearbyVenue;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const pulzeVenue = useMemo(
    () => pulzeVenues.find((v) => v.id === venue.id),
    [venue.id],
  );

  const busynessColor = pulzeVenue ? getBusynessColor(pulzeVenue.busyness) : '#6B8E7B';
  const busynessLabel = pulzeVenue ? getBusynessLabel(pulzeVenue.busyness) : 'Quiet';
  const busynessPercent = pulzeVenue?.busynessPercent ?? 0;
  const photoUri = pulzeVenue?.photo;
  const displayTags = (pulzeVenue?.tags ?? []).slice(0, 2);
  const walkMins = metersToWalkMinutes(venue.distanceMeters);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Mini photo banner */}
      <View style={styles.cardPhotoWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.cardPhoto} />
        ) : (
          <View style={[styles.cardPhotoPlaceholder, { backgroundColor: isDark ? '#0A1F28' : '#DCE9EF' }]}>
            <MapPin color={colors.aqua} size={14} />
          </View>
        )}
        {/* Walk time badge */}
        <View style={[styles.walkBadge, { backgroundColor: colors.aqua + '20' }]}>
          <Navigation color={colors.aqua} size={10} />
          <Text style={[styles.walkBadgeText, { color: colors.aqua }]}>{walkMins}</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        {/* Name + type */}
        <View style={styles.cardRow1}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {venue.name}
          </Text>
          <View style={[styles.typeChip, { backgroundColor: colors.aqua + '14' }]}>
            <Text style={[styles.typeChipText, { color: colors.aqua }]}>
              {venue.categoryLabel}
            </Text>
          </View>
        </View>

        {/* Neighborhood + distance */}
        <View style={styles.cardRow2}>
          <View style={styles.metaItem}>
            <MapPin color={colors.textSoft} size={11} />
            <Text style={[styles.metaText, { color: colors.textSoft }]}>{venue.neighborhood}</Text>
          </View>
          <Text style={[styles.metaText, { color: colors.textSoft }]}>
            {venue.distanceLabel}
          </Text>
        </View>

        {/* Busyness bar */}
        <View style={styles.barRow}>
          <View
            style={[
              styles.barTrack,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
            ]}
          >
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: busynessColor,
                  width: `${busynessPercent}%` as unknown as undefined,
                },
              ]}
            />
          </View>
          <View style={[styles.busynessLabel, { backgroundColor: busynessColor + '22' }]}>
            <Text style={[styles.busynessLabelText, { color: busynessColor }]}>
              {busynessLabel}
            </Text>
          </View>
        </View>

        {/* Vibe tags */}
        {displayTags.length > 0 && (
          <View style={styles.tagsRow}>
            {displayTags.map((tag) => (
              <View
                key={tag}
                style={[
                  styles.tagChip,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.textMuted }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function NearbyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { userLocation } = useMapLocation();

  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

  const lat = userLocation?.latitude ?? DENVER_COORDS.lat;
  const lng = userLocation?.longitude ?? DENVER_COORDS.lng;

  const nearbyVenues = useMemo(() => getNearbyVenues(lat, lng, 12), [lat, lng]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    const t = setTimeout(() => setIsRefreshing(false), 800);
    return () => clearTimeout(t);
  }, []);

  const handleVenuePress = useCallback(
    (venueId: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/venue-detail', params: { venueId } });
    },
    [router],
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.brand, { color: colors.aqua }]}>PULZE</Text>
            <View style={styles.timeRow}>
              <View style={[styles.liveDot, { backgroundColor: colors.aquaBright }]} />
              <Text style={[styles.timeLabel, { color: colors.textMuted }]}>Near you, right now</Text>
            </View>
          </View>
          <Text style={[styles.radiusBadge, { color: colors.textMuted, borderColor: colors.border }]}>
            {nearbyVenues.length} spots
          </Text>
        </View>
      </View>

      {/* Venue list */}
      <ScrollView
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.aqua}
            colors={[colors.aqua]}
          />
        }
      >
        {nearbyVenues.length === 0 ? (
          <View style={styles.emptyState}>
            <MapPin color={colors.textSoft} size={32} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No venues nearby
            </Text>
          </View>
        ) : (
          nearbyVenues.map((venue) => (
            <NearbyCard
              key={venue.id}
              venue={venue}
              onPress={() => handleVenuePress(venue.id)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const PHOTO_HEIGHT = 64;

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  radiusBadge: {
    fontSize: 12,
    fontWeight: '600' as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Cards
  cardList: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden' as const,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.988 }],
  },

  // Photo
  cardPhotoWrap: {
    position: 'relative' as const,
    height: PHOTO_HEIGHT,
  },
  cardPhoto: {
    width: '100%',
    height: PHOTO_HEIGHT,
    resizeMode: 'cover' as const,
  },
  cardPhotoPlaceholder: {
    width: '100%',
    height: PHOTO_HEIGHT,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  walkBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  walkBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },

  // Info
  cardInfo: {
    padding: 10,
    gap: 5,
  },
  cardRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700' as const,
    flex: 1,
  },
  typeChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  cardRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500' as const,
  },

  // Busyness bar
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden' as const,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  busynessLabel: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  busynessLabelText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  tagChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },

  // Empty state
  emptyState: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500' as const,
  },
});
