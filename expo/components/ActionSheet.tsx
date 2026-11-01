import React, { useCallback, useEffect, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';

export interface SheetAction {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions: SheetAction[];
  testID?: string;
}

// Same look and motion as DirectionsSheet: a bottom sheet of icon rows.
export function ActionSheet({ visible, onClose, title, subtitle, actions, testID }: ActionSheetProps) {
  const { colors, isDark } = useTheme();
  // Created once per sheet; state (not refs) so render never reads a ref.
  const [slideAnim] = useState(() => new Animated.Value(500));
  const [backdropOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, friction: 10, tension: 50, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(500);
      backdropOpacity.setValue(0);
    }
  }, [visible, slideAnim, backdropOpacity]);

  const handleClose = useCallback((then?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      onClose();
      then?.();
    });
  }, [slideAnim, backdropOpacity, onClose]);

  const sheetBg = isDark ? 'rgba(10, 22, 30, 0.98)' : 'rgba(255, 255, 255, 0.99)';

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent testID={testID}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={styles.backdropPress} onPress={() => handleClose()} />
      </Animated.View>
      <Animated.View style={[styles.sheet, { backgroundColor: sheetBg, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle}>
          <View style={[styles.handleBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]} />
        </View>
        <Pressable
          onPress={() => handleClose()}
          style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          accessibilityLabel="Close"
        >
          <X color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} size={16} />
        </Pressable>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
        <View style={styles.list}>
          {actions.map((action) => {
            const Icon = action.icon;
            const tint = action.destructive ? colors.danger : colors.aqua;
            return (
              <Pressable
                key={action.id}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Close first, then act, so a follow-up Alert or sheet isn't hidden by this one.
                  handleClose(action.onPress);
                }}
                style={({ pressed }) => [
                  styles.row,
                  { backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : 'transparent' },
                ]}
                testID={`sheet-${action.id}`}
              >
                <View style={[styles.icon, { backgroundColor: tint + '18' }]}>
                  <Icon color={tint} size={18} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.label, { color: action.destructive ? colors.danger : colors.text }]}>{action.label}</Text>
                  {action.subtitle ? <Text style={[styles.rowSub, { color: colors.textMuted }]}>{action.subtitle}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  backdropPress: { flex: 1 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 15,
  },
  handle: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  closeBtn: {
    position: 'absolute', top: 14, right: 16, width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingRight: 50, gap: 2 },
  title: { fontSize: 17, fontWeight: '700' as const },
  subtitle: { fontSize: 13 },
  list: { paddingHorizontal: 12, gap: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 12, paddingVertical: 14, borderRadius: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 2 },
  label: { fontSize: 15, fontWeight: '600' as const },
  rowSub: { fontSize: 12 },
});
