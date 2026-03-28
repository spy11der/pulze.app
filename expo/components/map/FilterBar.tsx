import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  Zap,
  Moon,
  UtensilsCrossed,
  Wine,
  CalendarDays,
  Coffee,
} from 'lucide-react-native';
import { useTheme } from '@/providers/ThemeProvider';
import type { MapFilterId } from '@/types/venue';
import { MAP_FILTERS } from '@/types/venue';

const ICON_MAP: Record<string, React.ComponentType<{ color: string; size: number }>> = {
  Sparkles,
  Zap,
  Moon,
  UtensilsCrossed,
  Wine,
  CalendarDays,
  Coffee,
};

interface FilterBarProps {
  activeFilters: MapFilterId[];
  onToggleFilter: (id: MapFilterId) => void;
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
  const IconComponent = ICON_MAP[iconName];

  const chipBg = isActive
    ? filterId === 'pulze'
      ? colors.coral + '22'
      : filterId === 'quiet'
        ? colors.quiet + '22'
        : colors.aqua + '18'
    : isDark
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(0,0,0,0.04)';

  const chipBorder = isActive
    ? filterId === 'pulze'
      ? colors.coral + '44'
      : filterId === 'quiet'
        ? colors.quiet + '44'
        : colors.aqua + '33'
    : isDark
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(0,0,0,0.06)';

  const textColor = isActive
    ? filterId === 'pulze'
      ? colors.coral
      : filterId === 'quiet'
        ? colors.quiet
        : colors.aqua
    : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: chipBg, borderColor: chipBorder },
        pressed && styles.pressed,
      ]}
      testID={`map-filter-${filterId}`}
    >
      {IconComponent ? <IconComponent color={textColor} size={12} /> : null}
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const MemoizedFilterChip = React.memo(FilterChip);

export default function FilterBar({ activeFilters, onToggleFilter }: FilterBarProps) {
  const handlePress = useCallback(
    (id: MapFilterId) => {
      Haptics.selectionAsync().catch(() => {});
      onToggleFilter(id);
    },
    [onToggleFilter]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {MAP_FILTERS.map((filter) => (
          <MemoizedFilterChip
            key={filter.id}
            filterId={filter.id}
            label={filter.label}
            iconName={filter.icon}
            isActive={activeFilters.includes(filter.id)}
            onPress={() => handlePress(filter.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 6,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
