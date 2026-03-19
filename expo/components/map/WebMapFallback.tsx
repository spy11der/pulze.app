import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Flame } from 'lucide-react-native';
import type { Region } from 'react-native-maps';
import type { PulzeVenue } from '@/types/venue';

function getVibeColor(score: number): string {
  if (score >= 80) return '#FF4D3A';
  if (score >= 60) return '#FFAA2E';
  if (score >= 40) return '#E8D544';
  if (score >= 20) return '#5BE89E';
  return '#4DB8E8';
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

  const mSize = isHot ? 40 : 32;
  const glowSize = isHot ? 50 : 42;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.markerWrap,
        {
          left: left - glowSize / 2,
          top: top - glowSize / 2,
          width: glowSize,
          height: glowSize,
          zIndex: isSelected ? 20 : isHot ? 10 : 5,
        },
      ]}
    >
      <View
        style={[
          styles.markerGlow,
          {
            width: glowSize,
            height: glowSize,
            borderRadius: glowSize / 2,
            backgroundColor: color,
            opacity: isHot ? 0.3 : 0.2,
          },
        ]}
      />
      <View
        style={[
          styles.markerBody,
          {
            width: mSize,
            height: mSize,
            borderRadius: mSize / 2,
            borderColor: color,
            borderWidth: isSelected ? 3 : 2,
          },
        ]}
      >
        <Image
          source={{ uri: venue.avatar }}
          style={{ width: mSize - 6, height: mSize - 6, borderRadius: (mSize - 6) / 2 }}
          contentFit="cover"
        />
      </View>
      <View style={[styles.markerBadge, { backgroundColor: color }]}>
        {isHot ? <Flame color="#fff" size={6} /> : null}
        <Text style={styles.markerBadgeText}>{venue.vibe_score}</Text>
      </View>
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
  markerGlow: {
    position: 'absolute',
  },
  markerBody: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B1820',
    overflow: 'hidden',
  },
  markerBadge: {
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
  markerBadgeText: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '900' as const,
  },
});
