import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image as RNImage,
  Modal,
  PanResponder,
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
  CarFront,
  Clock,
  Compass,
  Expand,
  Flame,
  LocateFixed,
  MapPin,
  Minimize2,
  Navigation,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react-native';

import { mapVenues, type MapVenue } from '@/mocks/city';
import { useTheme } from '@/providers/ThemeProvider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_COMPACT_HEIGHT = SCREEN_HEIGHT * 0.6;
const INITIAL_VISIBLE_VENUES = 2;

const INITIAL_REGION: Region = {
  latitude: 40.7199,
  longitude: -73.9921,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1b2a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a7d8a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#7eb8c9' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#5a7d8a' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f2b1a' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3a7d5c' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#162d3e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a3a50' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e4a5e' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255570' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#8ab4c4' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#142636' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#5a8d9e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071520' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3a6070' }] },
];

interface Coordinates {
  latitude: number;
  longitude: number;
}

function getEnergyColor(energy: number): string {
  if (energy >= 80) return '#FF4D3A';
  if (energy >= 60) return '#FFAA2E';
  if (energy >= 40) return '#E8D544';
  if (energy >= 20) return '#5BE89E';
  return '#4DB8E8';
}

function getEnergyLabel(energy: number): string {
  if (energy >= 80) return 'On fire';
  if (energy >= 60) return 'Buzzing';
  if (energy >= 40) return 'Lively';
  if (energy >= 20) return 'Chill';
  return 'Quiet';
}

function getHeatmapColor(energy: number): string {
  if (energy >= 80) return 'rgba(255, 77, 58, 0.18)';
  if (energy >= 60) return 'rgba(255, 170, 46, 0.14)';
  if (energy >= 40) return 'rgba(232, 213, 68, 0.10)';
  if (energy >= 20) return 'rgba(91, 232, 158, 0.08)';
  return 'rgba(77, 184, 232, 0.06)';
}

function getHeatmapRadius(energy: number): number {
  if (energy >= 80) return 320;
  if (energy >= 60) return 260;
  if (energy >= 40) return 200;
  return 140;
}

function getUberUrls(destination: MapVenue, pickup?: Coordinates | null) {
  const pickupQuery = pickup
    ? `&pickup[latitude]=${pickup.latitude}&pickup[longitude]=${pickup.longitude}`
    : '&pickup=my_location';
  const webUrl = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${destination.latitude}&dropoff[longitude]=${destination.longitude}&dropoff[nickname]=${encodeURIComponent(destination.name)}${pickupQuery}`;
  const nativeUrl = `uber://?action=setPickup&dropoff[latitude]=${destination.latitude}&dropoff[longitude]=${destination.longitude}&dropoff[nickname]=${encodeURIComponent(destination.name)}${pickupQuery}`;
  return { nativeUrl, webUrl };
}

function getLyftUrls(destination: MapVenue) {
  const webUrl = `https://ride.lyft.com/?destination[latitude]=${destination.latitude}&destination[longitude]=${destination.longitude}`;
  const nativeUrl = `lyft://ridetype?id=lyft&destination[latitude]=${destination.latitude}&destination[longitude]=${destination.longitude}`;
  return { nativeUrl, webUrl };
}

function getDirectionsUrl(destination: MapVenue) {
  if (Platform.OS === 'ios') {
    return `http://maps.apple.com/?daddr=${destination.latitude},${destination.longitude}&dirflg=d`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
}



const STABLE_MARKERS = mapVenues.map((v) => ({
  id: v.id,
  coordinate: Object.freeze({ latitude: v.latitude, longitude: v.longitude }),
  energy: v.energy,
  avatar: v.avatar,
  color: getEnergyColor(v.energy),
  isHot: v.energy >= 60,
}));

const MARKER_SIZE = 56;
const RING_SIZE_HOT = 44;
const RING_SIZE_NORMAL = 38;
const AVATAR_SIZE_HOT = 36;
const AVATAR_SIZE_NORMAL = 30;

const VibeMarker = React.memo(function VibeMarker({
  marker,
  onPress,
}: {
  marker: typeof STABLE_MARKERS[number];
  onPress: () => void;
}) {
  return (
    <Marker
      coordinate={marker.coordinate}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      flat
      stopPropagation
      testID={`map-marker-${marker.id}`}
    >
      <View style={staticMarkerStyles.root}>
        <View
          style={[
            staticMarkerStyles.glow,
            { backgroundColor: marker.color, opacity: marker.isHot ? 0.35 : 0.22 },
          ]}
        />
        <View
          style={[
            staticMarkerStyles.ring,
            marker.isHot ? staticMarkerStyles.ringHot : staticMarkerStyles.ringNormal,
            { borderColor: marker.color },
          ]}
        >
          <RNImage
            source={{ uri: marker.avatar }}
            style={marker.isHot ? staticMarkerStyles.avatarHot : staticMarkerStyles.avatarNormal}
          />
        </View>
        <View style={[staticMarkerStyles.badge, { backgroundColor: marker.color }]}>
          <Text style={staticMarkerStyles.badgeText}>{marker.energy}</Text>
        </View>
      </View>
    </Marker>
  );
}, () => true)

function BottomSheet({
  venue,
  onClose,
  onDirections,
  onUber,
  onLyft,
  bottomOffset,
}: {
  venue: MapVenue;
  onClose: () => void;
  onDirections: () => void;
  onUber: () => void;
  onLyft: () => void;
  bottomOffset: number;
}) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const color = getEnergyColor(venue.energy);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 65,
      useNativeDriver: true,
    }).start();
  }, [slideAnim]);

  const dismissSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            slideAnim.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 80 || gestureState.vy > 0.5) {
            dismissSheet();
          } else {
            Animated.spring(slideAnim, {
              toValue: 0,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [slideAnim, dismissSheet]
  );

  const sheetBg = isDark ? 'rgba(8, 28, 35, 0.98)' : 'rgba(255, 255, 255, 0.99)';

  return (
    <Animated.View
      style={[
        styles.bottomSheet,
        { bottom: bottomOffset, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[styles.sheetInner, { backgroundColor: sheetBg, borderColor: colors.border }]}>
        <View {...panResponder.panHandlers} style={styles.sheetDragZone}>
          <View style={[styles.sheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
        </View>

        <Pressable
          onPress={dismissSheet}
          style={[styles.sheetCloseBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
          testID="sheet-close"
        >
          <X color={colors.textMuted} size={16} />
        </Pressable>

        <View style={styles.sheetHeader}>
          <View style={styles.sheetAvatarWrap}>
            <Image source={{ uri: venue.avatar }} style={styles.sheetAvatar} contentFit="cover" />
            <View style={[styles.sheetAvatarRing, { borderColor: color }]} />
          </View>
          <View style={styles.sheetHeaderText}>
            <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>{venue.name}</Text>
            <View style={styles.sheetSubRow}>
              <MapPin color={colors.textMuted} size={11} />
              <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>{venue.category} · {venue.neighborhood}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sheetEnergyBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }]}>
          <View style={styles.sheetEnergyLeft}>
            <View style={[styles.sheetEnergyDot, { backgroundColor: color }]} />
            <Text style={[styles.sheetEnergyLabel, { color }]}>{getEnergyLabel(venue.energy)}</Text>
            <Text style={[styles.sheetEnergyNum, { color: colors.textMuted }]}>· {venue.energy}/100</Text>
          </View>
          <View style={styles.sheetEnergyTrack}>
            <View style={[styles.sheetEnergyFill, { width: `${Math.min(100, venue.energy)}%`, backgroundColor: color }]} />
          </View>
        </View>

        <Text style={[styles.sheetBlurb, { color: colors.textSoft }]} numberOfLines={2}>{venue.blurb}</Text>

        {venue.photo ? (
          <View style={styles.sheetPhotoWrap}>
            <Image source={{ uri: venue.photo }} style={styles.sheetPhoto} contentFit="cover" />
            <LinearGradient
              colors={['transparent', isDark ? 'rgba(8,28,35,0.6)' : 'rgba(255,255,255,0.4)']}
              style={styles.sheetPhotoGradient}
            />
          </View>
        ) : null}

        <View style={styles.sheetChips}>
          <View style={[styles.sheetChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Users color={colors.aqua} size={12} />
            <Text style={[styles.sheetChipText, { color: colors.text }]}>{venue.people}</Text>
          </View>
          <View style={[styles.sheetChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Clock color={colors.aqua} size={12} />
            <Text style={[styles.sheetChipText, { color: colors.text }]}>{venue.postedAgo}</Text>
          </View>
          <View style={[styles.sheetChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Sparkles color={colors.aqua} size={12} />
            <Text style={[styles.sheetChipText, { color: colors.text }]}>{venue.mood}</Text>
          </View>
          <View style={[styles.sheetChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
            <Compass color={colors.aqua} size={12} />
            <Text style={[styles.sheetChipText, { color: colors.text }]}>{venue.eta}</Text>
          </View>
        </View>

        <View style={styles.sheetActions}>
          <Pressable
            onPress={onDirections}
            style={({ pressed }) => [styles.sheetPrimary, { backgroundColor: colors.aquaBright }, pressed && styles.btnPressed]}
            testID="sheet-directions"
          >
            <Navigation color={isDark ? '#041318' : '#fff'} size={15} />
            <Text style={[styles.sheetPrimaryText, { color: isDark ? '#041318' : '#fff' }]}>Directions</Text>
          </Pressable>
          <Pressable
            onPress={onUber}
            style={({ pressed }) => [styles.sheetSecondary, { backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0', borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="sheet-uber"
          >
            <CarFront color={colors.text} size={14} />
            <Text style={[styles.sheetSecondaryText, { color: colors.text }]}>Uber</Text>
          </Pressable>
          <Pressable
            onPress={onLyft}
            style={({ pressed }) => [styles.sheetSecondary, { backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0', borderColor: colors.border }, pressed && styles.btnPressed]}
            testID="sheet-lyft"
          >
            <CarFront color={colors.text} size={14} />
            <Text style={[styles.sheetSecondaryText, { color: colors.text }]}>Lyft</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const WebVibeMarker = React.memo(function WebVibeMarker({
  venue,
  isSelected,
  onPress,
  xPct,
  yPct,
  containerWidth,
  containerHeight,
}: {
  venue: MapVenue;
  isSelected: boolean;
  onPress: () => void;
  xPct: number;
  yPct: number;
  containerWidth: number;
  containerHeight: number;
}) {
  const color = getEnergyColor(venue.energy);
  const isHot = venue.energy >= 60;

  const left = xPct * containerWidth;
  const top = yPct * containerHeight;

  if (xPct < -0.1 || xPct > 1.1 || yPct < -0.1 || yPct > 1.1) return null;

  const markerSize = isHot ? 44 : 36;
  const glowSize = isHot ? 56 : 46;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.webMarkerWrap,
        {
          left: left - glowSize / 2,
          top: top - glowSize / 2,
          width: glowSize,
          height: glowSize,
          zIndex: isSelected ? 20 : (isHot ? 10 : 5),
        },
      ]}
    >
      <View
        style={[
          styles.webMarkerGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: color,
            opacity: isHot ? 0.35 : 0.22,
          },
        ]}
      />
      <View
        style={[
          styles.webMarkerBody,
          {
            width: markerSize,
            height: markerSize,
            borderRadius: markerSize / 2,
            borderColor: color,
            borderWidth: isSelected ? 3 : 2.5,
          },
        ]}
      >
        <Image
          source={{ uri: venue.avatar }}
          style={{
            width: markerSize - 8,
            height: markerSize - 8,
            borderRadius: (markerSize - 8) / 2,
          }}
          contentFit="cover"
        />
      </View>
      <View style={[styles.webMarkerBadge, { backgroundColor: color }]}>
        {isHot ? <Flame color="#fff" size={7} /> : null}
        <Text style={styles.webMarkerBadgeText}>{venue.energy}</Text>
      </View>
    </Pressable>
  );
})

function WebMapFallback({
  region,
  venues,
  selectedVenue,
  onSelectVenue,
}: {
  region: Region;
  venues: MapVenue[];
  selectedVenue: MapVenue | undefined;
  onSelectVenue: (venue: MapVenue) => void;
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
      onLayout={(e) => {
        setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
      }}
    >
      {Platform.OS === 'web' ? (
        // @ts-ignore
        <iframe src={tileUrl} style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'auto' }} allowFullScreen loading="lazy" />
      ) : null}
      {containerSize.width > 0 ? (
        <View style={styles.webMarkerLayer} pointerEvents="box-none">
          {venuePositions.map(({ venue, xPct, yPct }) => (
            <WebVibeMarker
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

const HEATMAP_CIRCLES = mapVenues.map((venue) => ({
  id: venue.id,
  center: { latitude: venue.latitude, longitude: venue.longitude },
  outerRadius: getHeatmapRadius(venue.energy),
  innerRadius: getHeatmapRadius(venue.energy) * 0.45,
  outerColor: getHeatmapColor(venue.energy),
  innerColor: getHeatmapColor(venue.energy).replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 2.2})`),
}));

const MemoizedMarkers = React.memo(function MemoizedMarkers({
  onPressVenue,
}: {
  onPressVenue: (id: string) => void;
}) {
  const pressHandlers = useMemo(() => {
    const handlers: Record<string, () => void> = {};
    STABLE_MARKERS.forEach((m) => {
      handlers[m.id] = () => onPressVenue(m.id);
    });
    return handlers;
  }, [onPressVenue]);

  return (
    <>
      {STABLE_MARKERS.map((marker) => (
        <VibeMarker
          key={marker.id}
          marker={marker}
          onPress={pressHandlers[marker.id]}
        />
      ))}
    </>
  );
});

function NativeMapContent({
  mapRef,
  mapRegion,
  onRegionChange,
  selectedVenue,
  setSelectedId,
  onPressVenue,
  userLocation,
}: {
  mapRef: React.RefObject<MapView | null>;
  mapRegion: Region;
  onRegionChange: (r: Region) => void;
  selectedVenue: MapVenue | undefined;
  setSelectedId: (id: string | null) => void;
  onPressVenue: (id: string) => void;
  userLocation: Coordinates | null;
}) {
  const userCoordinate = useMemo(
    () => userLocation ? { latitude: userLocation.latitude, longitude: userLocation.longitude } : null,
    [userLocation]
  );

  const handleMapPress = useCallback(() => setSelectedId(null), [setSelectedId]);

  const handleSelectVenueWeb = useCallback((venue: MapVenue) => {
    onPressVenue(venue.id);
  }, [onPressVenue]);

  return (
    <>
      {Platform.OS === 'web' ? (
        <WebMapFallback
          region={mapRegion}
          venues={mapVenues}
          selectedVenue={selectedVenue}
          onSelectVenue={handleSelectVenueWeb}
        />
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          initialRegion={INITIAL_REGION}
          onRegionChangeComplete={onRegionChange}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          showsCompass={false}
          showsBuildings
          rotateEnabled
          pitchEnabled
          toolbarEnabled={false}
          onPress={handleMapPress}
          customMapStyle={DARK_MAP_STYLE}
          testID="city-map-view"
        >
          {HEATMAP_CIRCLES.map((circle) => (
            <Circle
              key={`heat-${circle.id}`}
              center={circle.center}
              radius={circle.outerRadius}
              fillColor={circle.outerColor}
              strokeColor="transparent"
              strokeWidth={0}
            />
          ))}
          {HEATMAP_CIRCLES.map((circle) => (
            <Circle
              key={`heat-inner-${circle.id}`}
              center={circle.center}
              radius={circle.innerRadius}
              fillColor={circle.innerColor}
              strokeColor="transparent"
              strokeWidth={0}
            />
          ))}
          <MemoizedMarkers onPressVenue={onPressVenue} />
          {userCoordinate ? (
            <Marker
              coordinate={userCoordinate}
              title="You are here"
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              testID="map-user-marker"
            >
              <View style={styles.userMarkerOuter}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
          ) : null}
        </MapView>
      )}
    </>
  );
}

function VenueCard({
  venue,
  isActive,
  onPress,
}: {
  venue: MapVenue;
  isActive: boolean;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const color = getEnergyColor(venue.energy);
  const isHot = venue.energy >= 70;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.venueCard,
        {
          backgroundColor: isDark ? colors.surface : '#fff',
          borderColor: isActive ? color + '66' : colors.border,
        },
        isActive && { shadowColor: color, shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
        pressed && styles.btnPressed,
      ]}
      testID={`venue-card-${venue.id}`}
    >
      <View style={styles.venueCardAvatarWrap}>
        <Image source={{ uri: venue.avatar }} style={styles.venueCardAvatar} contentFit="cover" />
        {isHot ? (
          <View style={[styles.venueCardHotDot, { backgroundColor: color }]}>
            <Zap color="#fff" size={7} />
          </View>
        ) : null}
      </View>
      <View style={styles.venueCardBody}>
        <Text style={[styles.venueCardName, { color: colors.text }]} numberOfLines={1}>{venue.name}</Text>
        <Text style={[styles.venueCardMeta, { color: colors.textMuted }]}>{venue.category} · {venue.neighborhood}</Text>
        <View style={styles.venueCardBottom}>
          <View style={styles.venueCardChip}>
            <Users color={colors.textMuted} size={10} />
            <Text style={[styles.venueCardChipText, { color: colors.textMuted }]}>{venue.people}</Text>
          </View>
          <View style={styles.venueCardChip}>
            <Compass color={colors.textMuted} size={10} />
            <Text style={[styles.venueCardChipText, { color: colors.textMuted }]}>{venue.eta}</Text>
          </View>
        </View>
      </View>
      <View style={styles.venueCardRight}>
        <View style={[styles.venueEnergyBadge, { backgroundColor: color + '18' }]}>
          <View style={[styles.venueEnergyDotSmall, { backgroundColor: color }]} />
          <Text style={[styles.venueEnergyVal, { color }]}>{venue.energy}</Text>
        </View>
        <Text style={[styles.venueCardAgo, { color: colors.textSoft }]}>{venue.postedAgo}</Text>
      </View>
    </Pressable>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const mapRef = useRef<MapView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const mapRegionRef = useRef<Region>(INITIAL_REGION);
  const [webMapRegion, setWebMapRegion] = useState<Region>(INITIAL_REGION);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const selectedVenue = useMemo(() => {
    if (!selectedId) return undefined;
    return mapVenues.find((venue) => venue.id === selectedId);
  }, [selectedId]);

  const openUrl = useCallback(async (url: string, fallbackUrl?: string) => {
    try {
      console.log('[MapScreen] Opening URL', { url, fallbackUrl });
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) { await Linking.openURL(url); return; }
      if (fallbackUrl) { await Linking.openURL(fallbackUrl); return; }
      Alert.alert('Unable to open link', 'Try again in a moment.');
    } catch (error) {
      console.log('[MapScreen] Failed to open URL', error);
      if (fallbackUrl) { await Linking.openURL(fallbackUrl); return; }
      Alert.alert('Unable to open link', 'Try again in a moment.');
    }
  }, []);

  const handleRegionChange = useCallback((region: Region) => {
    mapRegionRef.current = region;
  }, []);

  const handlePressVenue = useCallback((venueId: string) => {
    const venue = mapVenues.find((v) => v.id === venueId);
    if (!venue) return;
    const nextRegion: Region = {
      latitude: venue.latitude - 0.003,
      longitude: venue.longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    };
    console.log('[MapScreen] Focusing venue', { venueId: venue.id });
    setSelectedId(venue.id);
    mapRegionRef.current = nextRegion;
    if (Platform.OS === 'web') {
      setWebMapRegion(nextRegion);
    }
    mapRef.current?.animateToRegion(nextRegion, 500);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const focusVenue = useCallback((venue: MapVenue) => {
    handlePressVenue(venue.id);
  }, [handlePressVenue]);

  const locateUser = useCallback(async () => {
    try {
      setIsLocating(true);
      console.log('[MapScreen] Requesting location');
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          Alert.alert('Location unavailable', 'Your browser does not support geolocation.');
          return;
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
        });
        const coords: Coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(coords);
        const nextRegion: Region = { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
        mapRegionRef.current = nextRegion;
        if (Platform.OS === 'web') { setWebMapRegion(nextRegion); }
        mapRef.current?.animateToRegion(nextRegion, 500);
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location access needed', 'Turn on location to center the map around you.');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords: Coordinates = { latitude: result.coords.latitude, longitude: result.coords.longitude };
      setUserLocation(coords);
      const nextRegion: Region = { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      mapRegionRef.current = nextRegion;
      mapRef.current?.animateToRegion(nextRegion, 500);
    } catch (error) {
      console.log('[MapScreen] Failed to get location', error);
      Alert.alert('Location unavailable', 'We could not get your location right now.');
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => { void locateUser(); }, [locateUser]);

  const handleDirections = useCallback(async () => {
    if (!selectedVenue) return;
    await openUrl(getDirectionsUrl(selectedVenue));
  }, [openUrl, selectedVenue]);

  const handleUber = useCallback(async () => {
    if (!selectedVenue) return;
    const urls = getUberUrls(selectedVenue, userLocation);
    await openUrl(urls.nativeUrl, urls.webUrl);
  }, [openUrl, selectedVenue, userLocation]);

  const handleLyft = useCallback(async () => {
    if (!selectedVenue) return;
    const urls = getLyftUrls(selectedVenue);
    await openUrl(urls.nativeUrl, urls.webUrl);
  }, [openUrl, selectedVenue]);

  const handleRecenter = useCallback(() => {
    if (userLocation) {
      const nextRegion: Region = { latitude: userLocation.latitude, longitude: userLocation.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      mapRegionRef.current = nextRegion;
      if (Platform.OS === 'web') { setWebMapRegion(nextRegion); }
      mapRef.current?.animateToRegion(nextRegion, 500);
      return;
    }
    void locateUser();
  }, [locateUser, userLocation]);

  const closeSheet = useCallback(() => { setSelectedId(null); }, []);

  const toggleFullscreen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIsFullscreen((prev) => !prev);
  }, []);

  const [showAllVenues, setShowAllVenues] = useState<boolean>(false);

  const sortedVenues = useMemo(() => {
    return [...mapVenues].sort((a, b) => b.energy - a.energy);
  }, []);

  const visibleVenues = useMemo(() => {
    return showAllVenues ? sortedVenues : sortedVenues.slice(0, INITIAL_VISIBLE_VENUES);
  }, [sortedVenues, showAllVenues]);

  const remainingCount = sortedVenues.length - INITIAL_VISIBLE_VENUES;

  const legendBar = (
    <View style={[styles.legend, { backgroundColor: isDark ? 'rgba(4, 19, 24, 0.85)' : 'rgba(255,255,255,0.92)' }]}>
      <View style={[styles.legendDot, { backgroundColor: '#4DB8E8' }]} />
      <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Quiet</Text>
      <View style={styles.legendBar}>
        <LinearGradient colors={['#4DB8E8', '#5BE89E', '#E8D544', '#FFAA2E', '#FF4D3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.legendFill} />
      </View>
      <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Packed</Text>
      <View style={[styles.legendDot, { backgroundColor: '#FF4D3A' }]} />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID="map-screen">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        bounces
        testID="map-scroll"
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={[styles.kicker, { color: colors.aqua }]}>Live city map</Text>
            <Text style={[styles.title, { color: colors.text }]}>City Pulse</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={toggleFullscreen}
              style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.btnPressed]}
              testID="map-fullscreen-button"
            >
              <Expand color={colors.aqua} size={18} />
            </Pressable>
            <Pressable
              onPress={handleRecenter}
              style={({ pressed }) => [styles.locateButton, { backgroundColor: colors.lime }, pressed && styles.btnPressed]}
              testID="map-locate-button"
            >
              {isLocating ? (
                <ActivityIndicator color={isDark ? '#041318' : '#fff'} size="small" />
              ) : (
                <LocateFixed color={isDark ? '#041318' : '#fff'} size={18} />
              )}
            </Pressable>
          </View>
        </View>

        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
          <NativeMapContent
            mapRef={mapRef}
            mapRegion={webMapRegion}
            onRegionChange={handleRegionChange}
            selectedVenue={selectedVenue}
            setSelectedId={setSelectedId}
            onPressVenue={handlePressVenue}
            userLocation={userLocation}
          />
          {legendBar}
          {selectedVenue && !isFullscreen ? (
            <BottomSheet
              venue={selectedVenue}
              onClose={closeSheet}
              onDirections={() => void handleDirections()}
              onUber={() => void handleUber()}
              onLyft={() => void handleLyft()}
              bottomOffset={48}
            />
          ) : null}
        </View>

        <View style={styles.venueListSection}>
          <View style={styles.venueListHeader}>
            <View style={styles.venueListHeaderLeft}>
              <Text style={[styles.venueListTitle, { color: colors.text }]}>Nearby spots</Text>
              <Text style={[styles.venueListSubtitle, { color: colors.textMuted }]}>Sorted by energy</Text>
            </View>
            <View style={styles.spotCount}>
              <Flame color={colors.coral} size={12} />
              <Text style={[styles.spotCountText, { color: colors.textMuted }]}>{mapVenues.length} live</Text>
            </View>
          </View>

          {visibleVenues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              isActive={venue.id === selectedVenue?.id}
              onPress={() => focusVenue(venue)}
            />
          ))}

          {!showAllVenues && remainingCount > 0 ? (
            <Pressable
              onPress={() => {
                setShowAllVenues(true);
                Haptics.selectionAsync().catch(() => {});
              }}
              style={({ pressed }) => [
                styles.seeMoreBtn,
                {
                  backgroundColor: isDark ? colors.surface : '#fff',
                  borderColor: colors.border,
                },
                pressed && styles.btnPressed,
              ]}
              testID="see-more-venues"
            >
              <Text style={[styles.seeMoreText, { color: colors.aqua }]}>
                See {remainingCount} more spot{remainingCount > 1 ? 's' : ''}
              </Text>
            </Pressable>
          ) : null}

          {showAllVenues && sortedVenues.length > INITIAL_VISIBLE_VENUES ? (
            <Pressable
              onPress={() => {
                setShowAllVenues(false);
                Haptics.selectionAsync().catch(() => {});
              }}
              style={({ pressed }) => [
                styles.seeMoreBtn,
                {
                  backgroundColor: isDark ? colors.surface : '#fff',
                  borderColor: colors.border,
                },
                pressed && styles.btnPressed,
              ]}
              testID="show-less-venues"
            >
              <Text style={[styles.seeMoreText, { color: colors.textMuted }]}>Show less</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Modal visible={isFullscreen} animationType="slide" statusBarTranslucent testID="fullscreen-map-modal">
        <View style={[styles.fullscreenContainer, { backgroundColor: colors.background }]}>
          <NativeMapContent
            mapRef={mapRef}
            mapRegion={webMapRegion}
            onRegionChange={handleRegionChange}
            selectedVenue={selectedVenue}
            setSelectedId={setSelectedId}
            onPressVenue={handlePressVenue}
            userLocation={userLocation}
          />

          <View style={[styles.fullscreenTopBar, { top: insets.top + 8 }]}>
            <Pressable
              onPress={toggleFullscreen}
              style={({ pressed }) => [
                styles.fullscreenBtn,
                { backgroundColor: isDark ? 'rgba(4, 19, 24, 0.88)' : 'rgba(255,255,255,0.92)' },
                pressed && styles.btnPressed,
              ]}
              testID="fullscreen-close-button"
            >
              <Minimize2 color={colors.text} size={18} />
            </Pressable>
            <Pressable
              onPress={handleRecenter}
              style={({ pressed }) => [styles.fullscreenBtn, { backgroundColor: colors.lime }, pressed && styles.btnPressed]}
            >
              {isLocating ? (
                <ActivityIndicator color={isDark ? '#041318' : '#fff'} size="small" />
              ) : (
                <LocateFixed color={isDark ? '#041318' : '#fff'} size={18} />
              )}
            </Pressable>
          </View>

          <View style={{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + (selectedVenue ? 16 : 12) }}>
            {!selectedVenue ? legendBar : null}
          </View>

          {selectedVenue ? (
            <BottomSheet
              venue={selectedVenue}
              onClose={closeSheet}
              onDirections={() => void handleDirections()}
              onUber={() => void handleUber()}
              onLyft={() => void handleLyft()}
              bottomOffset={insets.bottom + 12}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' as const },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, maxWidth: '100%' as const },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerCopy: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 10 },
  kicker: {
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    marginTop: 1,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  locateButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    height: MAP_COMPACT_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
    borderWidth: 1,
  },
  mapInner: {
    flex: 1,
    overflow: 'hidden',
  },



  userMarkerOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(53, 212, 207, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#67F2E5',
  },

  legend: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendLabel: { fontSize: 11, fontWeight: '600' as const },
  legendBar: { flex: 1, height: 6, borderRadius: 999, overflow: 'hidden' },
  legendFill: { flex: 1 },

  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
  sheetInner: {
    marginHorizontal: 8,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  sheetDragZone: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 32,
  },
  sheetAvatarWrap: {
    position: 'relative',
  },
  sheetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sheetAvatarRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 24,
    borderWidth: 2,
  },
  sheetHeaderText: { flex: 1, gap: 2 },
  sheetTitle: { fontSize: 17, fontWeight: '800' as const },
  sheetSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sheetSubtitle: { fontSize: 12 },
  sheetEnergyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  sheetEnergyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sheetEnergyDot: { width: 8, height: 8, borderRadius: 4 },
  sheetEnergyLabel: { fontSize: 12, fontWeight: '700' as const },
  sheetEnergyNum: { fontSize: 12 },
  sheetEnergyTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.15)',
    overflow: 'hidden',
  },
  sheetEnergyFill: {
    height: '100%',
    borderRadius: 3,
  },
  sheetBlurb: { fontSize: 13, lineHeight: 19 },
  sheetPhotoWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    height: 110,
  },
  sheetPhoto: { width: '100%', height: '100%' },
  sheetPhotoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 40,
  },
  sheetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sheetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sheetChipText: { fontSize: 11, fontWeight: '600' as const },
  sheetActions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  sheetPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 12,
  },
  sheetPrimaryText: { fontSize: 13, fontWeight: '800' as const },
  sheetSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  sheetSecondaryText: { fontSize: 12, fontWeight: '700' as const },

  venueListSection: { marginTop: 20, gap: 10 },
  venueListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  venueListHeaderLeft: { flex: 1 },
  venueListTitle: { fontSize: 17, fontWeight: '800' as const },
  venueListSubtitle: { fontSize: 11, marginTop: 1 },
  spotCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  spotCountText: { fontSize: 12, fontWeight: '700' as const },
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  venueCardAvatarWrap: { position: 'relative' },
  venueCardAvatar: { width: 42, height: 42, borderRadius: 13 },
  venueCardHotDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#041318',
  },
  venueCardBody: { flex: 1, gap: 2 },
  venueCardName: { fontSize: 14, fontWeight: '700' as const },
  venueCardMeta: { fontSize: 11 },
  venueCardBottom: { flexDirection: 'row', gap: 10, marginTop: 4 },
  venueCardChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  venueCardChipText: { fontSize: 11, fontWeight: '600' as const },
  venueCardRight: { alignItems: 'flex-end', gap: 6 },
  venueEnergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  venueEnergyDotSmall: { width: 6, height: 6, borderRadius: 3 },
  venueEnergyVal: { fontSize: 13, fontWeight: '800' as const },
  venueCardAgo: { fontSize: 11 },
  seeMoreBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  seeMoreText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  bottomSpacer: { height: 180 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },

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
  webMarkerGlow: {
    position: 'absolute',
  },
  webMarkerBody: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#041318',
    overflow: 'hidden',
  },
  webMarkerBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 7,
    minWidth: 20,
    justifyContent: 'center',
  },
  webMarkerBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900' as const,
  },

  fullscreenContainer: { flex: 1 },
  fullscreenTopBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  fullscreenBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
});

const staticMarkerStyles = StyleSheet.create({
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
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#041318',
    overflow: 'hidden',
  },
  ringHot: {
    width: RING_SIZE_HOT,
    height: RING_SIZE_HOT,
    borderRadius: RING_SIZE_HOT / 2,
  },
  ringNormal: {
    width: RING_SIZE_NORMAL,
    height: RING_SIZE_NORMAL,
    borderRadius: RING_SIZE_NORMAL / 2,
  },
  avatarHot: {
    width: AVATAR_SIZE_HOT,
    height: AVATAR_SIZE_HOT,
    borderRadius: AVATAR_SIZE_HOT / 2,
  },
  avatarNormal: {
    width: AVATAR_SIZE_NORMAL,
    height: AVATAR_SIZE_NORMAL,
    borderRadius: AVATAR_SIZE_NORMAL / 2,
  },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900' as const,
  },
});
