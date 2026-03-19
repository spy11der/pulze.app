import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import type { MapCluster } from '@/types/venue';

function getClusterColor(avgScore: number): string {
  if (avgScore >= 80) return '#FF4D3A';
  if (avgScore >= 60) return '#FFAA2E';
  if (avgScore >= 40) return '#E8D544';
  if (avgScore >= 20) return '#5BE89E';
  return '#4DB8E8';
}

interface ClusterMarkerProps {
  cluster: MapCluster;
  onPress: () => void;
}

function ClusterMarkerInner({ cluster, onPress }: ClusterMarkerProps) {
  const color = getClusterColor(cluster.avgVibeScore);
  const size = Math.min(52, 34 + cluster.count * 3);

  return (
    <Marker
      coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      testID={`cluster-marker-${cluster.id}`}
    >
      <View style={[styles.root, { width: size + 12, height: size + 12 }]}>
        <View
          style={[
            styles.outerGlow,
            {
              width: size + 12,
              height: size + 12,
              borderRadius: (size + 12) / 2,
              backgroundColor: color,
              opacity: 0.2,
            },
          ]}
        />
        <View
          style={[
            styles.body,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color + 'CC',
              borderColor: color,
            },
          ]}
        >
          <Text style={styles.count}>{cluster.count}</Text>
        </View>
      </View>
    </Marker>
  );
}

export const ClusterMarkerComponent = React.memo(ClusterMarkerInner);

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerGlow: {
    position: 'absolute',
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  count: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900' as const,
  },
});
