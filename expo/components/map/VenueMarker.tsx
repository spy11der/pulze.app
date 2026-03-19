import React from 'react';
import { Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Flame } from 'lucide-react-native';
import type { PulzeVenue } from '@/types/venue';

function getVibeColor(score: number): string {
  if (score >= 80) return '#FF4D3A';
  if (score >= 60) return '#FFAA2E';
  if (score >= 40) return '#E8D544';
  if (score >= 20) return '#5BE89E';
  return '#4DB8E8';
}

const MARKER_SIZE = 48;
const RING_HOT = 38;
const RING_NORMAL = 32;
const AVATAR_HOT = 30;
const AVATAR_NORMAL = 24;

interface VenueMarkerProps {
  venue: PulzeVenue;
  onPress: () => void;
}

function VenueMarkerInner({ venue, onPress }: VenueMarkerProps) {
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
      <View style={styles.root}>
        <View
          style={[
            styles.glow,
            { backgroundColor: color, opacity: isHot ? 0.3 : 0.18 },
          ]}
        />
        <View
          style={[
            styles.ring,
            isHot ? styles.ringHot : styles.ringNormal,
            { borderColor: color },
          ]}
        >
          <RNImage
            source={{ uri: venue.avatar }}
            style={isHot ? styles.avatarHot : styles.avatarNormal}
          />
        </View>
        <View style={[styles.badge, { backgroundColor: color }]}>
          {isHot ? <Flame color="#fff" size={6} /> : null}
          <Text style={styles.badgeText}>{venue.vibe_score}</Text>
        </View>
      </View>
    </Marker>
  );
}

export const VenueMarkerComponent = React.memo(VenueMarkerInner, () => true);

export function getVibeColorExport(score: number): string {
  return getVibeColor(score);
}

const styles = StyleSheet.create({
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
});
