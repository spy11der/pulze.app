import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { CalendarDays, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useMapEvents, type MapEventItem } from '@/hooks/useEvents';

interface VenueGroup {
  key: string;
  latitude: number;
  longitude: number;
  venueName: string;
  events: MapEventItem[];
}

function groupByVenue(events: MapEventItem[]): VenueGroup[] {
  const map = new Map<string, VenueGroup>();
  for (const e of events) {
    const lat = Number(e.latitude.toFixed(4));
    const lng = Number(e.longitude.toFixed(4));
    const key = `${e.venueName ?? 'venue'}::${lat}::${lng}`;
    const g = map.get(key);
    if (g) {
      g.events.push(e);
    } else {
      map.set(key, {
        key,
        latitude: e.latitude,
        longitude: e.longitude,
        venueName: e.venueName ?? 'Venue',
        events: [e],
      });
    }
  }
  return Array.from(map.values());
}

interface Props {
  visible: boolean;
  onSelectVenue: (group: VenueGroup) => void;
}

export const LiveEventMarkers = React.memo(function LiveEventMarkers({ visible, onSelectVenue }: Props) {
  const { data } = useMapEvents(200);

  const groups = useMemo(() => groupByVenue(data ?? []), [data]);

  if (!visible || groups.length === 0) return null;

  return (
    <>
      {groups.map((g) => (
        <Marker
          key={g.key}
          coordinate={{ latitude: g.latitude, longitude: g.longitude }}
          onPress={() => onSelectVenue(g)}
          anchor={{ x: 0.5, y: 1 }}
          tracksViewChanges={false}
          testID={`live-event-marker-${g.key}`}
        >
          <View style={styles.pinWrap}>
            <View style={styles.pin}>
              <CalendarDays color="#fff" size={12} />
              {g.events.length > 1 ? (
                <Text style={styles.pinCount}>{g.events.length}</Text>
              ) : null}
            </View>
            <View style={styles.pinTail} />
          </View>
        </Marker>
      ))}
    </>
  );
});

interface SheetProps {
  group: VenueGroup | null;
  onClose: () => void;
  bottomInset: number;
  isDark: boolean;
}

export function LiveEventsSheet({ group, onClose, bottomInset, isDark }: SheetProps) {
  const router = useRouter();
  if (!group) return null;

  const handlePress = (eventId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push({ pathname: '/event-detail', params: { eventId } });
  };

  return (
    <View
      style={[
        sheetStyles.container,
        {
          bottom: bottomInset,
          backgroundColor: isDark ? 'rgba(14,33,41,0.97)' : 'rgba(255,255,255,0.97)',
          borderColor: isDark ? 'rgba(43,191,186,0.18)' : 'rgba(0,0,0,0.06)',
        },
      ]}
      testID="live-events-sheet"
    >
      <View style={sheetStyles.headerRow}>
        <View style={sheetStyles.headerInfo}>
          <Text style={[sheetStyles.title, { color: isDark ? '#ECF4F6' : '#0C1A20' }]} numberOfLines={1}>
            {group.venueName}
          </Text>
          <Text style={[sheetStyles.sub, { color: isDark ? '#7BA3AD' : '#4A6872' }]}>
            {group.events.length} upcoming event{group.events.length === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={[sheetStyles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          testID="live-events-sheet-close"
        >
          <X color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} size={14} />
        </Pressable>
      </View>

      <View style={sheetStyles.list}>
        {group.events.slice(0, 6).map((e) => (
          <Pressable
            key={e.id}
            onPress={() => handlePress(e.id)}
            style={({ pressed }) => [
              sheetStyles.row,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            testID={`live-event-row-${e.id}`}
          >
            {e.imageUrl ? (
              <Image source={{ uri: e.imageUrl }} style={sheetStyles.thumb} contentFit="cover" />
            ) : (
              <View style={[sheetStyles.thumb, { backgroundColor: 'rgba(43,191,186,0.18)' }]} />
            )}
            <View style={sheetStyles.rowInfo}>
              <Text style={[sheetStyles.rowName, { color: isDark ? '#ECF4F6' : '#0C1A20' }]} numberOfLines={1}>
                {e.name}
              </Text>
              <Text style={[sheetStyles.rowDate, { color: isDark ? '#7BA3AD' : '#4A6872' }]} numberOfLines={1}>
                {e.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}
                {e.date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
            <View style={[sheetStyles.sourceBadge, {
              backgroundColor: e.source === 'ticketmaster' ? 'rgba(43,191,186,0.16)' : 'rgba(232,168,48,0.16)',
            }]}>
              <Text style={[sheetStyles.sourceText, {
                color: e.source === 'ticketmaster' ? '#2BBFBA' : '#E8A830',
              }]}>
                {e.source === 'ticketmaster' ? 'TM' : 'SD'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pinWrap: {
    alignItems: 'center',
  },
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#1E9E9A',
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: Platform.OS === 'android' ? 4 : 0,
  },
  pinCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800' as const,
    letterSpacing: 0.2,
  },
  pinTail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1E9E9A',
  },
});

const sheetStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 90,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  sub: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: -0.1,
  },
  rowDate: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.4,
  },
});
