import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image as RNImage,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Circle, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import {
  Flame,
  LocateFixed,
  Zap,
  Moon,
  Sparkles,
  UtensilsCrossed,
  Wine,
  CalendarDays,
  Coffee,
  X,
  Navigation,
  Users,
  Clock,
  MapPin,
  ChevronRight,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { pulzeVenues } from '@/mocks/venues';
import type { PulzeVenue, MapCluster, MapFilterId } from '@/types/venue';
import { MAP_FILTERS } from '@/types/venue';
import { useMapLocation } from '@/hooks/useMapLocation';




const DENVER_REGION: Region = {
  latitude: 39.7475,
  longitude: -104.9903,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0a1a22' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a1a22' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4a7080' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#6ab0c0' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#4a7080' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0c2418' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#2a6a48' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#122430' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#16303e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#183848' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e4858' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#70a0b0' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#101e28' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#4a7888' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#061018' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2a4858' }] },
];

function getVibeColor(score: number): string {
  if (score >= 80) return '#FF4D3A';
  if (score >= 60) return '#FFAA2E';
  if (score >= 40) return '#E8D544';
  if (score >= 20) return '#5BE89E';
  return '#4DB8E8';
}

function getVibeLabel(score: number): string {
  if (score >= 80) return 'On Fire';
  if (score >= 60) return 'Buzzing';
  if (score >= 40) return 'Lively';
  if (score >= 20) return 'Chill';
  return 'Quiet';
}

function getStatusInfo(status: string): { label: string; color: string } {
  switch (status) {
    case 'open': return { label: 'Open', color: '#5BE89E' };
    case 'closing_soon': return { label: 'Closing Soon', color: '#FFAA2E' };
    case 'closed': return { label: 'Closed', color: '#FF4D3A' };
    default: return { label: 'Unknown', color: '#86AEB7' };
  }
}

function getHeatmapColor(score: number): string {
  if (score >= 80) return 'rgba(255, 77, 58, 0.14)';
  if (score >= 60) return 'rgba(255, 170, 46, 0.10)';
  if (score >= 40) return 'rgba(232, 213, 68, 0.07)';
  if (score >= 20) return 'rgba(91, 232, 158, 0.05)';
  return 'rgba(77, 184, 232, 0.04)';
}

function getHeatmapRadius(score: number): number {
  if (score >= 80) return 280;
  if (score >= 60) return 220;
  if (score >= 40) return 170;
  return 120;
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

  if (zoomLevel < 0.02) {
    return { clusters: [], singles: venues };
  }

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

const HEATMAP_DATA = pulzeVenues.map((v) => ({
  id: v.id,
  center: { latitude: v.latitude, longitude: v.longitude },
  radius: getHeatmapRadius(v.vibe_score),
  color: getHeatmapColor(v.vibe_score),
}));

const MARKER_SIZE = 46;
const RING_HOT = 36;
const RING_NORMAL = 30;
const AVATAR_HOT = 28;
const AVATAR_NORMAL = 22;

const VibeMarker = React.memo(function VibeMarker({
  venue,
  onPress,
}: {
  venue: PulzeVenue;
  onPress: () => void;
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
      <View style={markerStyles.root}>
        <View style={[markerStyles.glow, { backgroundColor: color, opacity: isHot ? 0.28 : 0.16 }]} />
        <View style={[
          markerStyles.ring,
          isHot ? markerStyles.ringHot : markerStyles.ringNormal,
          { borderColor: color },
        ]}>
          <RNImage
            source={{ uri: venue.avatar }}
            style={isHot ? markerStyles.avatarHot : markerStyles.avatarNormal}
          />
        </View>
        <View style={[markerStyles.badge, { backgroundColor: color }]}>
          {isHot ? <Flame color="#fff" size={6} /> : null}
          <Text style={markerStyles.badgeText}>{venue.vibe_score}</Text>
        </View>
      </View>
    </Marker>
  );
}, () => true);

const ClusterBubble = React.memo(function ClusterBubble({
  cluster,
  onPress,
}: {
  cluster: MapCluster;
  onPress: () => void;
}) {
  const color = getVibeColor(cluster.avgVibeScore);
  const size = Math.min(50, 32 + cluster.count * 3);

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      testID={`cluster-${cluster.id}`}
    >
      <View style={[markerStyles.clusterRoot, { width: size + 10, height: size + 10 }]}>
        <View style={[markerStyles.clusterGlow, {
          width: size + 10, height: size + 10, borderRadius: (size + 10) / 2,
          backgroundColor: color, opacity: 0.22,
        }]} />
        <View style={[markerStyles.clusterBody, {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: color + 'DD', borderColor: color,
        }]}>
          <Text style={markerStyles.clusterCount}>{cluster.count}</Text>
        </View>
      </View>
    </Marker>
  );
});

function WebVibeMarker({
  venue,
  isSelected,
  onPress,
  xPct,
  yPct,
  containerWidth,
  containerHeight,
}: {
  venue: PulzeVenue;
  isSelected: boolean;
  onPress: () => void;
  xPct: number;
  yPct: number;
  containerWidth: number;
  containerHeight: number;
}) {
  const color = getVibeColor(venue.vibe_score);
  const isHot = venue.vibe_score >= 60;
  const left = xPct * containerWidth;
  const top = yPct * containerHeight;

  if (xPct < -0.1 || xPct > 1.1 || yPct < -0.1 || yPct > 1.1) return null;

  const mSize = isHot ? 40 : 32;
  const glowSize = isHot ? 50 : 42;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.webMarkerWrap,
        { left: left - glowSize / 2, top: top - glowSize / 2, width: glowSize, height: glowSize,
          zIndex: isSelected ? 20 : isHot ? 10 : 5 },
      ]}
    >
      <View style={[styles.webMarkerGlow, {
        width: glowSize, height: glowSize, borderRadius: glowSize / 2,
        backgroundColor: color, opacity: isHot ? 0.3 : 0.2,
      }]} />
      <View style={[styles.webMarkerBody, {
        width: mSize, height: mSize, borderRadius: mSize / 2,
        borderColor: color, borderWidth: isSelected ? 3 : 2,
      }]}>
        <Image
          source={{ uri: venue.avatar }}
          style={{ width: mSize - 6, height: mSize - 6, borderRadius: (mSize - 6) / 2 }}
          contentFit="cover"
        />
      </View>
      <View style={[styles.webMarkerBadge, { backgroundColor: color }]}>
        {isHot ? <Flame color="#fff" size={6} /> : null}
        <Text style={styles.webMarkerBadgeText}>{venue.vibe_score}</Text>
      </View>
    </Pressable>
  );
}

const MemoWebMarker = React.memo(WebVibeMarker);

function WebMapFallback({
  region,
  venues,
  selectedVenue,
  onSelectVenue,
}: {
  region: Region;
  venues: PulzeVenue[];
  selectedVenue: PulzeVenue | undefined;
  onSelectVenue: (venue: PulzeVenue) => void;
}) {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const tileUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${region.longitude - region.longitudeDelta / 2},${region.latitude - region.latitudeDelta / 2},${region.longitude + region.longitudeDelta / 2},${region.latitude + region.latitudeDelta / 2}&layer=mapnik`;

  const west = region.longitude - region.longitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  const south = region.latitude - region.latitudeDelta / 2;

  const venuePositions = useMemo(() => {
    return venues.map((venue) => ({
      venue,
      xPct: (venue.longitude - west) / (east - west),
      yPct: (north - venue.latitude) / (north - south),
    }));
  }, [venues, west, east, north, south]);

  return (
    <View
      style={StyleSheet.absoluteFillObject}
      onLayout={(e) => setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      {Platform.OS === 'web' ? (
        // @ts-ignore
        <iframe src={tileUrl} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'auto' }} allowFullScreen loading="lazy" />
      ) : null}
      {containerSize.width > 0 ? (
        <View style={styles.webMarkerLayer} pointerEvents="box-none">
          {venuePositions.map(({ venue, xPct, yPct }) => (
            <MemoWebMarker
              key={venue.id}
              venue={venue}
              isSelected={venue.id === selectedVenue?.id}
              onPress={() => onSelectVenue(venue)}
              xPct={xPct}
              yPct={yPct}
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FilterChip({
  filterId,
  label,
  iconName,
  isActive,
  onPress,
}: {
  filterId: MapFilterId;
  label: string;
  iconName: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const IconComp = ICON_MAP[iconName];

  const chipBg = isActive
    ? filterId === 'pulze' ? colors.coral + '20' : filterId === 'quiet' ? colors.quiet + '20' : colors.aqua + '16'
    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  const chipBorder = isActive
    ? filterId === 'pulze' ? colors.coral + '40' : filterId === 'quiet' ? colors.quiet + '40' : colors.aqua + '30'
    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  const tColor = isActive
    ? filterId === 'pulze' ? colors.coral : filterId === 'quiet' ? colors.quiet : colors.aqua
    : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, { backgroundColor: chipBg, borderColor: chipBorder }, pressed && styles.pressed]}
      testID={`map-filter-${filterId}`}
    >
      {IconComp ? <IconComp color={tColor} size={11} /> : null}
      <Text style={[styles.filterChipText, { color: tColor }]}>{label}</Text>
    </Pressable>
  );
}

const MemoFilterChip = React.memo(FilterChip);

function BottomSheetCard({
  venue,
  onClose,
  onDirections,
  bottomInset,
}: {
  venue: PulzeVenue;
  onClose: () => void;
  onDirections: () => void;
  bottomInset: number;
}) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const color = getVibeColor(venue.vibe_score);
  const statusInfo = getStatusInfo(venue.open_status);
  const vibeLabel = getVibeLabel(venue.vibe_score);

  useEffect(() => {
    Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 55, useNativeDriver: true }).start();
  }, [slideAnim]);

  const dismiss = useCallback(() => {
    Animated.timing(slideAnim, { toValue: 300, duration: 160, useNativeDriver: true }).start(() => onClose());
  }, [slideAnim, onClose]);



  const sheetBg = isDark ? 'rgba(8, 22, 28, 0.97)' : 'rgba(255, 255, 255, 0.98)';

  return (
    <Animated.View style={[styles.bottomSheet, { bottom: bottomInset, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.sheetInner, { backgroundColor: sheetBg, borderColor: colors.border }]}>
        <View style={styles.sheetDragZone}>
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)' }]} />
        </View>

        <Pressable
          onPress={dismiss}
          style={[styles.sheetClose, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          testID="sheet-close"
        >
          <X color={colors.textMuted} size={13} />
        </Pressable>

        <View style={styles.sheetHeader}>
          <View style={styles.sheetAvatarWrap}>
            <Image source={{ uri: venue.avatar }} style={styles.sheetAvatar} contentFit="cover" />
            <View style={[styles.sheetAvatarRing, { borderColor: color }]} />
          </View>
          <View style={styles.sheetHeaderText}>
            <Text style={[styles.sheetName, { color: colors.text }]} numberOfLines={1}>{venue.name}</Text>
            <View style={styles.sheetSubRow}>
              <MapPin color={colors.textMuted} size={9} />
              <Text style={[styles.sheetSub, { color: colors.textMuted }]} numberOfLines={1}>
                {venue.categoryLabel} · {venue.neighborhood}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sheetStats}>
          <View style={[styles.sheetStat, { backgroundColor: color + '12' }]}>
            <Zap color={color} size={10} />
            <Text style={[styles.sheetStatVal, { color }]}>{venue.vibe_score}</Text>
            <Text style={[styles.sheetStatLabel, { color: colors.textMuted }]}>{vibeLabel}</Text>
          </View>
          <View style={[styles.sheetStat, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            <Users color={colors.aqua} size={10} />
            <Text style={[styles.sheetStatVal, { color: colors.text }]}>{venue.people}</Text>
          </View>
          <View style={[styles.sheetStat, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
            <Clock color={colors.aqua} size={10} />
            <Text style={[styles.sheetStatVal, { color: colors.text }]}>{venue.eta}</Text>
          </View>
          <View style={[styles.sheetStat, { backgroundColor: statusInfo.color + '12' }]}>
            <View style={[styles.sheetStatusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.sheetStatVal, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.sheetActions}>
          <Pressable
            onPress={onDirections}
            style={({ pressed }) => [styles.sheetDirBtn, { backgroundColor: colors.aquaBright }, pressed && styles.pressed]}
            testID="sheet-directions"
          >
            <Navigation color={isDark ? '#041318' : '#fff'} size={12} />
            <Text style={[styles.sheetDirText, { color: isDark ? '#041318' : '#fff' }]}>Directions</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              console.log('[MapScreen] View details for', venue.id);
            }}
            style={({ pressed }) => [
              styles.sheetDetailBtn,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.border },
              pressed && styles.pressed,
            ]}
            testID="sheet-details"
          >
            <Text style={[styles.sheetDetailText, { color: colors.text }]}>Details</Text>
            <ChevronRight color={colors.textMuted} size={12} />
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

  const filteredVenues = useMemo(() => filterVenues(pulzeVenues, activeFilters), [activeFilters]);
  const { clusters, singles } = useMemo(() => clusterVenues(filteredVenues, mapRegion), [filteredVenues, mapRegion]);

  const selectedVenue = useMemo(() => {
    if (!selectedId) return undefined;
    return pulzeVenues.find((v) => v.id === selectedId);
  }, [selectedId]);

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
    if (Platform.OS === 'web') {
      setMapRegion(focusRegion);
    }
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
    if (Platform.OS === 'web') {
      setMapRegion(zoomRegion);
    }
    mapRef.current?.animateToRegion(zoomRegion, 400);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, [mapRegion]);

  const handleRecenter = useCallback(async () => {
    if (userLocation) {
      const region: Region = {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
      if (Platform.OS === 'web') setMapRegion(region);
      mapRef.current?.animateToRegion(region, 400);
      return;
    }
    const coords = await requestLocation();
    if (coords) {
      const region: Region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      };
      if (Platform.OS === 'web') setMapRegion(region);
      mapRef.current?.animateToRegion(region, 400);
    }
  }, [userLocation, requestLocation]);

  const handleDirections = useCallback(() => {
    if (!selectedVenue) return;
    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${selectedVenue.latitude},${selectedVenue.longitude}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${selectedVenue.latitude},${selectedVenue.longitude}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  }, [selectedVenue]);

  const handleMapPress = useCallback(() => setSelectedId(null), []);

  const userCoordinate = useMemo(
    () => userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null,
    [userLocation]
  );

  const handleSelectVenueWeb = useCallback((venue: PulzeVenue) => {
    handlePressVenue(venue.id);
  }, [handlePressVenue]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="map-screen">
      {Platform.OS === 'web' ? (
        <WebMapFallback
          region={mapRegion}
          venues={filteredVenues}
          selectedVenue={selectedVenue}
          onSelectVenue={handleSelectVenueWeb}
        />
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={DENVER_REGION}
          onRegionChangeComplete={handleRegionChange}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsCompass={false}
          showsBuildings
          rotateEnabled
          pitchEnabled
          toolbarEnabled={false}
          onPress={handleMapPress}
          customMapStyle={DARK_MAP_STYLE}
          testID="pulze-map-view"
        >
          {HEATMAP_DATA.map((h) => (
            <Circle
              key={`heat-${h.id}`}
              center={h.center}
              radius={h.radius}
              fillColor={h.color}
              strokeColor="transparent"
              strokeWidth={0}
            />
          ))}
          {singles.map((venue) => (
            <VibeMarker
              key={venue.id}
              venue={venue}
              onPress={() => handlePressVenue(venue.id)}
            />
          ))}
          {clusters.map((cluster) => (
            <ClusterBubble
              key={cluster.id}
              cluster={cluster}
              onPress={() => handlePressCluster(cluster)}
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
              <View style={styles.userOuter}>
                <View style={styles.userPulse} />
                <View style={styles.userDot} />
              </View>
            </Marker>
          ) : null}
        </MapView>
      )}

      <View style={[styles.filterBar, { top: insets.top + 6 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          bounces={false}
        >
          {MAP_FILTERS.map((filter) => (
            <MemoFilterChip
              key={filter.id}
              filterId={filter.id}
              label={filter.label}
              iconName={filter.icon}
              isActive={activeFilters.includes(filter.id)}
              onPress={() => handleToggleFilter(filter.id)}
            />
          ))}
        </ScrollView>
      </View>

      <Pressable
        onPress={() => void handleRecenter()}
        style={({ pressed }) => [
          styles.recenterBtn,
          { top: insets.top + 50, backgroundColor: isDark ? 'rgba(8, 22, 28, 0.9)' : 'rgba(255,255,255,0.94)' },
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

      <View style={[styles.legendBar, { bottom: insets.bottom + (selectedVenue ? 180 : 90) }]}>
        <View style={[styles.legendInner, { backgroundColor: isDark ? 'rgba(8, 22, 28, 0.88)' : 'rgba(255,255,255,0.92)' }]}>
          <View style={[styles.legendDot, { backgroundColor: '#4DB8E8' }]} />
          <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Quiet</Text>
          <View style={styles.legendTrack}>
            <LinearGradient
              colors={['#4DB8E8', '#5BE89E', '#E8D544', '#FFAA2E', '#FF4D3A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.legendFill}
            />
          </View>
          <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Packed</Text>
          <View style={[styles.legendDot, { backgroundColor: '#FF4D3A' }]} />
        </View>
      </View>

      {selectedVenue ? (
        <BottomSheetCard
          venue={selectedVenue}
          onClose={() => setSelectedId(null)}
          onDirections={handleDirections}
          bottomInset={insets.bottom + 80}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  filterBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 5,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },

  recenterBtn: {
    position: 'absolute',
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  legendBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10,
  },
  legendInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  legendDot: { width: 5, height: 5, borderRadius: 3 },
  legendLabel: { fontSize: 10, fontWeight: '600' as const },
  legendTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  legendFill: { flex: 1 },

  userOuter: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(53, 212, 207, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  userDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#67F2E5',
  },

  bottomSheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    zIndex: 100,
  },
  sheetInner: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    gap: 7,
  },
  sheetDragZone: { alignItems: 'center', paddingBottom: 2 },
  sheetHandle: { width: 28, height: 3, borderRadius: 2 },
  sheetClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingRight: 26,
  },
  sheetAvatarWrap: { position: 'relative' },
  sheetAvatar: { width: 30, height: 30, borderRadius: 15 },
  sheetAvatarRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 17,
    borderWidth: 2,
  },
  sheetHeaderText: { flex: 1, gap: 1 },
  sheetName: { fontSize: 13, fontWeight: '800' as const },
  sheetSubRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sheetSub: { fontSize: 10, flex: 1 },
  sheetStats: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  sheetStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sheetStatVal: { fontSize: 10, fontWeight: '700' as const },
  sheetStatLabel: { fontSize: 9 },
  sheetStatusDot: { width: 4, height: 4, borderRadius: 2 },
  sheetActions: { flexDirection: 'row', gap: 5 },
  sheetDirBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 10,
    paddingVertical: 8,
  },
  sheetDirText: { fontSize: 11, fontWeight: '800' as const },
  sheetDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sheetDetailText: { fontSize: 11, fontWeight: '700' as const },

  webMarkerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    pointerEvents: 'box-none' as const,
  },
  webMarkerWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMarkerGlow: { position: 'absolute' },
  webMarkerBody: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1820',
    overflow: 'hidden',
  },
  webMarkerBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 16,
    justifyContent: 'center',
  },
  webMarkerBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '900' as const,
  },

  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});

const markerStyles = StyleSheet.create({
  root: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
  },
  ring: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1820',
    overflow: 'hidden',
  },
  ringHot: {
    width: RING_HOT,
    height: RING_HOT,
    borderRadius: RING_HOT / 2,
  },
  ringNormal: {
    width: RING_NORMAL,
    height: RING_NORMAL,
    borderRadius: RING_NORMAL / 2,
  },
  avatarHot: {
    width: AVATAR_HOT,
    height: AVATAR_HOT,
    borderRadius: AVATAR_HOT / 2,
  },
  avatarNormal: {
    width: AVATAR_NORMAL,
    height: AVATAR_NORMAL,
    borderRadius: AVATAR_NORMAL / 2,
  },
  badge: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 18,
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '900' as const,
  },
  clusterRoot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clusterGlow: {
    position: 'absolute',
  },
  clusterBody: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  clusterCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900' as const,
  },
});
