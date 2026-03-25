import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  Heart,
  LocateFixed,
  Search,
  Zap,
  Moon,
  Sparkles,
  UtensilsCrossed,
  Wine,
  CalendarDays,
  Coffee,
  Navigation,
  Users,
  Clock,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { Image as RNImage } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { pulzeVenues } from '@/mocks/venues';
import type { PulzeVenue, MapCluster, MapFilterId } from '@/types/venue';
import { MAP_FILTERS } from '@/types/venue';
import { useMapLocation } from '@/hooks/useMapLocation';
import { useFavorites } from '@/providers/FavoritesProvider';
import { DirectionsSheet } from '@/components/DirectionsSheet';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';

const DENVER_REGION: Region = {
  latitude: 39.7475,
  longitude: -104.9903,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

// Paste your Google Map ID here (from Google Cloud Console > Map Management)
const GOOGLE_MAP_ID = '2783466a9a2d6e2483f0e07a';

function getVibeColor(score: number): string {
  if (score >= 80) return '#E85D50';
  if (score >= 60) return '#E8A040';
  if (score >= 40) return '#C8B850';
  if (score >= 20) return '#50B880';
  return '#5098C0';
}

function getStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case 'open': return { label: 'Open', color: '#4CAF78' };
    case 'closing_soon': return { label: 'Closing Soon', color: '#D4924A' };
    case 'closed': return { label: 'Closed', color: '#C05050' };
    default: return { label: 'Unknown', color: '#8899AA' };
  }
}

function getVibeLabel(score: number): string {
  if (score >= 80) return 'Packed';
  if (score >= 60) return 'Buzzing';
  if (score >= 40) return 'Lively';
  if (score >= 20) return 'Chill';
  return 'Quiet';
}

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

const MapHeatmap: React.ComponentType<{
  points: HeatmapPoint[];
  radius?: number;
  opacity?: number;
  gradient?: { colors: string[]; startPoints: number[]; colorMapSize: number };
}> | undefined = (() => {
  try {
    return (require('react-native-maps') as any).Heatmap;
  } catch {
    return undefined;
  }
})();

function buildHeatmapPoints(venues: PulzeVenue[]): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  const offsets = [
    [0.3, 0.5], [-0.4, 0.2], [0.1, -0.6], [-0.3, -0.4],
    [0.5, -0.1], [-0.2, 0.6], [0.4, 0.3], [-0.5, -0.2],
  ];
  for (const v of venues) {
    const w = v.vibe_score / 100;
    points.push({ latitude: v.latitude, longitude: v.longitude, weight: w });
    const spread = 0.003 * w;
    const count = Math.ceil(w * 5);
    for (let i = 0; i < count && i < offsets.length; i++) {
      points.push({
        latitude: v.latitude + offsets[i][0] * spread,
        longitude: v.longitude + offsets[i][1] * spread,
        weight: w * (0.4 + (i % 3) * 0.15),
      });
    }
  }
  return points;
}

function filterVenues(venues: PulzeVenue[], filters: MapFilterId[]): PulzeVenue[] {
  if (filters.length === 0 || filters.includes('all')) return venues;
  return venues.filter((v) => {
    for (const f of filters) {
      if (f === 'pulze' && v.vibe_score >= 70) return true;
      if (f === 'quiet' && v.vibe_score < 35) return true;
      if (f === 'food' && v.category === 'food') return true;
      if (f === 'bars' && (v.category === 'bar' || v.category === 'nightclub')) return true;
      if (f === 'events' && (v.category === 'event' || v.category === 'music')) return true;
      if (f === 'coffee' && v.category === 'coffee') return true;
    }
    return false;
  });
}

function clusterVenues(
  venues: PulzeVenue[],
  region: Region
): { clusters: MapCluster[]; singles: PulzeVenue[] } {
  const zoomLevel = region.latitudeDelta;
  if (zoomLevel < 0.02) return { clusters: [], singles: venues };

  const cellSize = zoomLevel / 6;
  const grid: Record<string, PulzeVenue[]> = {};

  for (const venue of venues) {
    const cellX = Math.floor(venue.longitude / cellSize);
    const cellY = Math.floor(venue.latitude / cellSize);
    const key = `${cellX}_${cellY}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(venue);
  }

  const clusters: MapCluster[] = [];
  const singles: PulzeVenue[] = [];

  for (const [key, cellVenues] of Object.entries(grid)) {
    if (cellVenues.length >= 3) {
      const avgLat = cellVenues.reduce((s, v) => s + v.latitude, 0) / cellVenues.length;
      const avgLng = cellVenues.reduce((s, v) => s + v.longitude, 0) / cellVenues.length;
      const avgScore = Math.round(cellVenues.reduce((s, v) => s + v.vibe_score, 0) / cellVenues.length);
      clusters.push({
        id: `cluster_${key}`,
        latitude: avgLat,
        longitude: avgLng,
        count: cellVenues.length,
        venues: cellVenues,
        avgVibeScore: avgScore,
      });
    } else {
      singles.push(...cellVenues);
    }
  }

  return { clusters, singles };
}

const ICON_MAP: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  Sparkles, Zap, Moon, UtensilsCrossed, Wine, CalendarDays, Coffee,
};

const DOT_SIZE = 32;
const DOT_INNER = 24;
const DOT_AVATAR = 20;

const RefinedMarker = React.memo(function RefinedMarker({
  venue,
  onPress,
  isDark,
}: {
  venue: PulzeVenue;
  onPress: () => void;
  isDark: boolean;
}) {
  const color = getVibeColor(venue.vibe_score);
  const isHot = venue.vibe_score >= 60;

  return (
    <Marker
      coordinate={{ latitude: venue.latitude, longitude: venue.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      flat
      stopPropagation
      testID={`venue-marker-${venue.id}`}
    >
      <View style={mStyles.root}>
        {isHot ? (
          <View style={[mStyles.pulse, { backgroundColor: color, opacity: 0.15 }]} />
        ) : null}
        <View style={[
          mStyles.dot,
          {
            backgroundColor: isDark ? '#1e2438' : '#ffffff',
            borderColor: color,
            borderWidth: isHot ? 2.5 : 2,
            shadowColor: color,
            shadowOpacity: isHot ? 0.3 : 0.15,
            shadowRadius: isHot ? 8 : 4,
            shadowOffset: { width: 0, height: 2 },
          },
        ]}>
          <RNImage
            source={{ uri: venue.avatar }}
            style={mStyles.avatar}
          />
        </View>
        {isHot ? (
          <View style={[mStyles.scoreBadge, { backgroundColor: color }]}>
            <Text style={mStyles.scoreText}>{venue.vibe_score}</Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}, () => true);

const ClusterDot = React.memo(function ClusterDot({
  cluster,
  onPress,
  isDark,
}: {
  cluster: MapCluster;
  onPress: () => void;
  isDark: boolean;
}) {
  const color = getVibeColor(cluster.avgVibeScore);
  const size = Math.min(44, 28 + cluster.count * 2.5);

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      testID={`cluster-${cluster.id}`}
    >
      <View style={[mStyles.clusterRoot, { width: size + 8, height: size + 8 }]}>
        <View style={[mStyles.clusterOuter, {
          width: size + 8, height: size + 8, borderRadius: (size + 8) / 2,
          backgroundColor: color, opacity: 0.12,
        }]} />
        <View style={[mStyles.clusterInner, {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: isDark ? color + 'CC' : color + 'E0',
        }]}>
          <Text style={mStyles.clusterCount}>{cluster.count}</Text>
        </View>
      </View>
    </Marker>
  );
});

const FilterPill = React.memo(function FilterPill({
  filterId,
  label,
  iconName,
  isActive,
  onPress,
  isDark,
  colors,
}: {
  filterId: MapFilterId;
  label: string;
  iconName: string;
  isActive: boolean;
  onPress: () => void;
  isDark: boolean;
  colors: { aqua: string; coral: string; quiet: string; textMuted: string; text: string };
}) {
  const IconComp = ICON_MAP[iconName];

  const accentColor = filterId === 'pulze' ? colors.coral
    : filterId === 'quiet' ? colors.quiet
    : colors.aqua;

  const pillBg = isActive
    ? isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
    : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)';

  const tColor = isActive ? accentColor : isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterPill,
        {
          backgroundColor: pillBg,
          borderColor: isActive ? accentColor + '40' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        },
        pressed && styles.pressed,
      ]}
      testID={`map-filter-${filterId}`}
    >
      {IconComp ? <IconComp color={tColor} size={12} /> : null}
      <Text style={[styles.filterPillText, { color: tColor }]}>{label}</Text>
    </Pressable>
  );
});

function VenueCard({
  venue,
  onClose,
  onDirections,
  onDetails,
  onHeart,
  isHearted,
  bottomInset,
  isDark,
  colors,
}: {
  venue: PulzeVenue;
  onClose: () => void;
  onDirections: () => void;
  onDetails: () => void;
  onHeart: () => void;
  isHearted: boolean;
  bottomInset: number;
  isDark: boolean;
  colors: {
    text: string; textMuted: string; aqua: string; aquaBright: string;
    border: string; textSoft: string; coral: string;
  };
}) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const color = getVibeColor(venue.vibe_score);
  const statusInfo = getStatusInfo(venue.open_status);
  const vibeLabel = getVibeLabel(venue.vibe_score);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 10,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const dismiss = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, onClose]);

  const cardBg = isDark ? 'rgba(22, 26, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)';
  const subtleBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';

  return (
    <Animated.View style={[styles.cardContainer, { bottom: bottomInset, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.card, {
        backgroundColor: cardBg,
        shadowColor: isDark ? '#000' : '#2a3a4a',
        shadowOpacity: isDark ? 0.4 : 0.12,
      }]}>
        <View style={styles.cardHandle}>
          <View style={[styles.handleBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]} />
        </View>

        <View style={styles.cardTopActions}>
          <Pressable
            onPress={onHeart}
            style={[styles.cardHeartBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
            testID="sheet-heart"
          >
            <Heart
              color={isHearted ? colors.coral : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)')}
              size={14}
              fill={isHearted ? colors.coral : 'transparent'}
            />
          </Pressable>
          <Pressable
            onPress={dismiss}
            style={[styles.cardClose, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
            testID="sheet-close"
          >
            <X color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} size={14} />
          </Pressable>
        </View>

        <View style={styles.cardHeader}>
          <View style={styles.cardAvatarWrap}>
            <Image source={{ uri: venue.avatar }} style={styles.cardAvatar} contentFit="cover" />
            <View style={[styles.cardAvatarBorder, { borderColor: color + '80' }]} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{venue.name}</Text>
            <View style={styles.cardMetaRow}>
              <Text style={[styles.cardCategory, { color: colors.textMuted }]}>{venue.categoryLabel}</Text>
              <View style={[styles.cardMetaDot, { backgroundColor: colors.textMuted }]} />
              <Text style={[styles.cardNeighborhood, { color: colors.textMuted }]}>{venue.neighborhood}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={[styles.cardStat, { backgroundColor: color + '10' }]}>
            <Zap color={color} size={11} />
            <Text style={[styles.cardStatValue, { color }]}>{venue.vibe_score}</Text>
            <Text style={[styles.cardStatLabel, { color: colors.textSoft }]}>{vibeLabel}</Text>
          </View>
          <View style={[styles.cardStat, { backgroundColor: subtleBg }]}>
            <Users color={colors.aqua} size={11} />
            <Text style={[styles.cardStatValue, { color: colors.text }]}>{venue.people}</Text>
          </View>
          <View style={[styles.cardStat, { backgroundColor: subtleBg }]}>
            <Clock color={colors.aqua} size={11} />
            <Text style={[styles.cardStatValue, { color: colors.text }]}>{venue.eta}</Text>
          </View>
          <View style={[styles.cardStat, { backgroundColor: statusInfo.color + '0C' }]}>
            <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.cardStatValue, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        {venue.blurb ? (
          <Text style={[styles.cardBlurb, { color: colors.textSoft }]} numberOfLines={2}>
            {venue.blurb}
          </Text>
        ) : null}

        <View style={styles.cardActions}>
          <Pressable
            onPress={onHeart}
            style={({ pressed }) => [
              styles.heartBtn,
              {
                backgroundColor: isHearted ? (isDark ? 'rgba(255,109,94,0.12)' : 'rgba(224,85,69,0.08)') : subtleBg,
                borderColor: isHearted ? colors.coral + '40' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
              },
              pressed && styles.pressed,
            ]}
            testID="sheet-heart-action"
          >
            <Heart color={isHearted ? colors.coral : colors.textMuted} size={15} fill={isHearted ? colors.coral : 'transparent'} />
          </Pressable>
          <Pressable
            onPress={onDirections}
            style={({ pressed }) => [styles.directionsBtn, { backgroundColor: colors.aqua }, pressed && styles.pressed]}
            testID="sheet-directions"
          >
            <Navigation color="#fff" size={13} />
            <Text style={styles.directionsBtnText}>Directions</Text>
          </Pressable>
          <Pressable
            onPress={onDetails}
            style={({ pressed }) => [
              styles.detailsBtn,
              { backgroundColor: subtleBg, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
              pressed && styles.pressed,
            ]}
            testID="sheet-details"
          >
            <Text style={[styles.detailsBtnText, { color: colors.text }]}>Details</Text>
            <ChevronRight color={colors.textMuted} size={13} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<MapFilterId[]>(['all']);
  const [mapRegion, setMapRegion] = useState<Region>(DENVER_REGION);
  const { userLocation, isLocating, requestLocation } = useMapLocation();
  const { isFavorited, toggleFavorite } = useFavorites();
  const router = useRouter();
  const [directionsVisible, setDirectionsVisible] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchInputRef = useRef<TextInput | null>(null);

  const filteredVenues = useMemo(() => filterVenues(pulzeVenues, activeFilters), [activeFilters]);
  const { clusters, singles } = useMemo(() => clusterVenues(filteredVenues, mapRegion), [filteredVenues, mapRegion]);

  const selectedVenue = useMemo(() => {
    if (!selectedId) return undefined;
    return pulzeVenues.find((v) => v.id === selectedId);
  }, [selectedId]);

  const heatmapPoints = useMemo(() => buildHeatmapPoints(pulzeVenues), []);

  const handleToggleFilter = useCallback((id: MapFilterId) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveFilters((prev) => {
      if (id === 'all') return ['all'];
      const next = prev.filter((f) => f !== 'all');
      if (next.includes(id)) {
        const result = next.filter((f) => f !== id);
        return result.length === 0 ? ['all'] : result;
      }
      return [...next, id];
    });
  }, []);

  const handleRegionChange = useCallback((region: Region) => {
    setMapRegion(region);
  }, []);

  const handlePressVenue = useCallback((venueId: string) => {
    const venue = pulzeVenues.find((v) => v.id === venueId);
    if (!venue) return;
    console.log('[MapScreen] Selected venue:', venue.name);
    setSelectedId(venue.id);
    const focusRegion: Region = {
      latitude: venue.latitude - 0.003,
      longitude: venue.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
    mapRef.current?.animateToRegion(focusRegion, 400);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handlePressCluster = useCallback((cluster: MapCluster) => {
    console.log('[MapScreen] Expanding cluster with', cluster.count, 'venues');
    const zoomRegion: Region = {
      latitude: cluster.latitude,
      longitude: cluster.longitude,
      latitudeDelta: mapRegion.latitudeDelta / 2.5,
      longitudeDelta: mapRegion.longitudeDelta / 2.5,
    };
    mapRef.current?.animateToRegion(zoomRegion, 400);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [mapRegion]);

  const handleRecenter = useCallback(async () => {
    console.log('[MapScreen] Recenter pressed, userLocation:', userLocation);
    if (userLocation) {
      const region: Region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
      mapRef.current?.animateToRegion(region, 400);
      Haptics.selectionAsync().catch(() => {});
      return;
    }
    console.log('[MapScreen] No cached location, requesting fresh...');
    const coords = await requestLocation();
    console.log('[MapScreen] Got coords from request:', coords);
    if (coords) {
      const region: Region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
      mapRef.current?.animateToRegion(region, 400);
      Haptics.selectionAsync().catch(() => {});
    }
  }, [userLocation, requestLocation]);

  const handleDirections = useCallback(() => {
    if (!selectedVenue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDirectionsVisible(true);
  }, [selectedVenue]);

  const handleViewDetails = useCallback(() => {
    if (!selectedVenue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[MapScreen] Navigating to venue detail:', selectedVenue.id);
    router.push({ pathname: '/venue-detail', params: { venueId: selectedVenue.id } });
  }, [selectedVenue, router]);

  const handleHeartVenue = useCallback(() => {
    if (!selectedVenue) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFavorite(selectedVenue.id, 'venue', selectedVenue.name);
  }, [selectedVenue, toggleFavorite]);

  const handleMapPress = useCallback(() => {
    setSelectedId(null);
    setIsSearchFocused(false);
    setSearchQuery('');
    Keyboard.dismiss();
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return pulzeVenues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.neighborhood.toLowerCase().includes(q) ||
        v.categoryLabel.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  const handleSearchSelect = useCallback((venue: PulzeVenue) => {
    console.log('[MapScreen] Search selected:', venue.name);
    setSearchQuery('');
    setIsSearchFocused(false);
    Keyboard.dismiss();
    setSelectedId(venue.id);
    const focusRegion: Region = {
      latitude: venue.latitude - 0.003,
      longitude: venue.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
    mapRef.current?.animateToRegion(focusRegion, 400);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchFocused(false);
    Keyboard.dismiss();
  }, []);

  const userCoordinate = useMemo(
    () => userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null,
    [userLocation]
  );

  return (
    <View style={styles.screen} testID="map-screen">
      {Platform.OS === 'web' ? (
        <View style={styles.webPlaceholder}>
          <View style={styles.webPlaceholderIcon}>
            <MapPin color="#35D4CF" size={36} />
          </View>
          <Text style={styles.webPlaceholderTitle}>Map preview is available on device only.</Text>
          <Text style={styles.webPlaceholderSub}>Scan the QR code to view the native Google map style.</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={DENVER_REGION}
          onRegionChangeComplete={handleRegionChange}
          showsCompass={false}
          rotateEnabled
          pitchEnabled
          toolbarEnabled={false}
          onPress={handleMapPress}
          showsUserLocation={false}
          testID="pulze-map-view"
          {...({ mapId: GOOGLE_MAP_ID } as any)}
        >
          {MapHeatmap && heatmapPoints.length > 0 ? (
            <MapHeatmap
              points={heatmapPoints}
              radius={40}
              opacity={0.7}
              gradient={{
                colors: ['rgba(80,152,192,0)', 'rgba(80,184,128,0.4)', 'rgba(200,184,80,0.6)', 'rgba(232,160,64,0.8)', 'rgba(232,93,80,1)'],
                startPoints: [0.05, 0.25, 0.5, 0.75, 0.95],
                colorMapSize: 256,
              }}
            />
          ) : null}
          {singles.map((venue) => (
            <RefinedMarker
              key={venue.id}
              venue={venue}
              onPress={() => handlePressVenue(venue.id)}
              isDark={isDark}
            />
          ))}
          {clusters.map((cluster) => (
            <ClusterDot
              key={cluster.id}
              cluster={cluster}
              onPress={() => handlePressCluster(cluster)}
              isDark={isDark}
            />
          ))}
          {userCoordinate ? (
            <Marker
              coordinate={userCoordinate}
              title="You are here"
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              testID="map-user-marker"
            >
              <View style={styles.userMarker}>
                <View style={styles.userPulseRing} />
                <View style={styles.userCenter} />
              </View>
            </Marker>
          ) : null}
        </MapView>
      )}

      <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
        <View style={styles.searchRow}>
          <View style={[
            styles.searchBar,
            {
              backgroundColor: isDark ? 'rgba(22, 26, 42, 0.88)' : 'rgba(255,255,255,0.92)',
              borderColor: isSearchFocused
                ? (isDark ? 'rgba(53, 212, 207, 0.3)' : 'rgba(26, 168, 163, 0.3)')
                : 'transparent',
            },
          ]}>
            <Search color={isSearchFocused ? colors.aqua : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)')} size={16} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search places..."
              placeholderTextColor={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              testID="map-search-input"
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={handleClearSearch} hitSlop={10} style={styles.clearBtn}>
                <X color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)'} size={14} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => void handleRecenter()}
            style={({ pressed }) => [
              styles.recenterBtn,
              {
                backgroundColor: isDark ? 'rgba(22, 26, 42, 0.88)' : 'rgba(255,255,255,0.92)',
              },
              pressed && styles.pressed,
            ]}
            testID="map-recenter"
          >
            {isLocating ? (
              <ActivityIndicator color={colors.aqua} size="small" />
            ) : (
              <LocateFixed color={colors.aqua} size={18} />
            )}
          </Pressable>
        </View>

        {isSearchFocused && searchQuery.trim().length > 0 ? (
          <View style={[
            styles.searchDropdown,
            {
              backgroundColor: isDark ? 'rgba(22, 26, 42, 0.96)' : 'rgba(255,255,255,0.98)',
            },
          ]}>
            {searchResults.length > 0 ? (
              searchResults.map((venue, idx) => {
                const vColor = getVibeColor(venue.vibe_score);
                return (
                  <Pressable
                    key={venue.id}
                    onPress={() => handleSearchSelect(venue)}
                    style={({ pressed }) => [
                      styles.searchItem,
                      idx < searchResults.length - 1 && {
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                      pressed && { opacity: 0.6 },
                    ]}
                    testID={`search-result-${venue.id}`}
                  >
                    <View style={[styles.searchItemDot, { backgroundColor: vColor }]} />
                    <View style={styles.searchItemInfo}>
                      <Text style={[styles.searchItemName, { color: colors.text }]} numberOfLines={1}>
                        {venue.name}
                      </Text>
                      <Text style={[styles.searchItemSub, { color: colors.textMuted }]} numberOfLines={1}>
                        {venue.categoryLabel} · {venue.neighborhood}
                      </Text>
                    </View>
                    <View style={styles.searchItemRight}>
                      <Text style={[styles.searchItemScore, { color: vColor }]}>{venue.vibe_score}</Text>
                      <Text style={[styles.searchItemEta, { color: colors.textMuted }]}>{venue.eta}</Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.searchEmpty}>
                <Text style={[styles.searchEmptyText, { color: colors.textMuted }]}>
                  No results for "{searchQuery}"
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {!isSearchFocused ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            bounces={false}
            style={styles.filterScroll}
          >
            {MAP_FILTERS.map((filter) => (
              <FilterPill
                key={filter.id}
                filterId={filter.id}
                label={filter.label}
                iconName={filter.icon}
                isActive={activeFilters.includes(filter.id)}
                onPress={() => handleToggleFilter(filter.id)}
                isDark={isDark}
                colors={colors}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {selectedVenue ? (
        <VenueCard
          venue={selectedVenue}
          onClose={() => setSelectedId(null)}
          onDirections={handleDirections}
          onDetails={handleViewDetails}
          onHeart={handleHeartVenue}
          isHearted={isFavorited(selectedVenue.id)}
          bottomInset={insets.bottom + 80}
          isDark={isDark}
          colors={colors}
        />
      ) : null}

      {selectedVenue ? (
        <DirectionsSheet
          visible={directionsVisible}
          onClose={() => setDirectionsVisible(false)}
          latitude={selectedVenue.latitude}
          longitude={selectedVenue.longitude}
          address={selectedVenue.address}
          name={selectedVenue.name}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  topControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
    paddingHorizontal: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400' as const,
    padding: 0,
    margin: 0,
    letterSpacing: 0.1,
  },
  clearBtn: {
    padding: 2,
  },
  searchDropdown: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  searchItemInfo: {
    flex: 1,
    gap: 2,
  },
  searchItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  searchItemSub: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  searchItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  searchItemScore: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  searchItemEta: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  searchEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  searchEmptyText: {
    fontSize: 13,
  },
  filterScroll: {
    marginTop: 10,
  },
  filterRow: {
    gap: 6,
    flexDirection: 'row',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  recenterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  userMarker: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulseRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(53, 140, 220, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  userCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90D9',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  cardContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cardHandle: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  cardTopActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 6,
    zIndex: 10,
  },
  cardHeartBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 32,
  },
  cardAvatarWrap: {
    position: 'relative',
  },
  cardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  cardAvatarBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 23,
    borderWidth: 2,
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  cardMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.4,
  },
  cardNeighborhood: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  cardStats: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },
  cardStatValue: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  cardStatLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  statusIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cardBlurb: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  heartBtn: {
    width: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  directionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 11,
  },
  directionsBtnText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.1,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  webPlaceholder: {
    flex: 1,
    backgroundColor: '#0e1524',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  webPlaceholderIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(53, 212, 207, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  webPlaceholderTitle: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  webPlaceholderSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center' as const,
    lineHeight: 19,
    letterSpacing: 0.2,
  },
});

const mStyles = StyleSheet.create({
  root: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dot: {
    width: DOT_INNER,
    height: DOT_INNER,
    borderRadius: DOT_INNER / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 3,
  },
  avatar: {
    width: DOT_AVATAR,
    height: DOT_AVATAR,
    borderRadius: DOT_AVATAR / 2,
  },
  scoreBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 16,
    alignItems: 'center',
  },
  scoreText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800' as const,
  },
  clusterRoot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterOuter: {
    position: 'absolute',
  },
  clusterInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800' as const,
  },
});
