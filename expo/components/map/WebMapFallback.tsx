import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Region } from 'react-native-maps';
import type { PulzeVenue } from '@/types/venue';

function getVibeColor(score: number): string {
  if (score >= 80) return '#E85D50';
  if (score >= 60) return '#E8A040';
  if (score >= 40) return '#C8B850';
  if (score >= 20) return '#50B880';
  return '#5098C0';
}

interface WebMarkerProps {
  venue: PulzeVenue;
  isSelected: boolean;
  onPress: () => void;
  xPct: number;
  yPct: number;
  containerWidth: number;
  containerHeight: number;
}

const DOT_SIZE = 28;

const WebVibeMarker = React.memo(function WebVibeMarker({
  venue,
  isSelected,
  onPress,
  xPct,
  yPct,
  containerWidth,
  containerHeight,
}: WebMarkerProps) {
  const color = getVibeColor(venue.vibe_score);
  const isHot = venue.vibe_score >= 60;
  const left = xPct * containerWidth;
  const top = yPct * containerHeight;

  if (xPct < -0.1 || xPct > 1.1 || yPct < -0.1 || yPct > 1.1) return null;

  const outerSize = DOT_SIZE + 8;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.markerWrap,
        {
          left: left - outerSize / 2,
          top: top - outerSize / 2,
          width: outerSize,
          height: outerSize,
          zIndex: isSelected ? 20 : isHot ? 10 : 5,
        },
      ]}
    >
      {isHot ? (
        <View
          style={[
            styles.markerPulse,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              backgroundColor: color,
              opacity: 0.15,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.markerDot,
          {
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            borderColor: color,
            borderWidth: isSelected ? 2.5 : 2,
          },
        ]}
      >
        <Image
          source={{ uri: venue.avatar }}
          style={styles.markerAvatar}
          contentFit="cover"
        />
      </View>
      {isHot ? (
        <View style={[styles.markerBadge, { backgroundColor: color }]}>
          <Text style={styles.markerBadgeText}>{venue.vibe_score}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

interface WebMapFallbackProps {
  region: Region;
  venues: PulzeVenue[];
  selectedVenue: PulzeVenue | undefined;
  onSelectVenue: (venue: PulzeVenue) => void;
}

export default function WebMapFallback({
  region,
  venues,
  selectedVenue,
  onSelectVenue,
}: WebMapFallbackProps) {
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
      onLayout={(e) =>
        setContainerSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {/* @ts-ignore - iframe for web */}
      <iframe
        src={tileUrl}
        style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'auto' }}
        allowFullScreen
        loading="lazy"
      />
      {containerSize.width > 0 ? (
        <View style={styles.markerLayer} pointerEvents="box-none">
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

const styles = StyleSheet.create({
  markerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  markerWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: {
    position: 'absolute',
  },
  markerDot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e2438',
    overflow: 'hidden',
  },
  markerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  markerBadge: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 5,
    minWidth: 14,
    alignItems: 'center',
  },
  markerBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800' as const,
  },
});
