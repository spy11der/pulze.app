import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import {
  Car,
  Copy,
  ExternalLink,
  Map,
  MapPin,
  Navigation,
  X,
  Bike,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';

interface DirectionsSheetProps {
  visible: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  address: string;
  name: string;
}

interface TransportOption {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ color: string; size: number }>;
  color: string;
  getUrl: (lat: number, lng: number, addr: string) => string;
}

const TRANSPORT_OPTIONS: TransportOption[] = [
  {
    id: 'apple_maps',
    label: 'Apple Maps',
    subtitle: 'Turn-by-turn directions',
    icon: Map,
    color: '#34C759',
    getUrl: (lat, lng) => `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
  },
  {
    id: 'google_maps',
    label: 'Google Maps',
    subtitle: 'Navigate with Google',
    icon: Navigation,
    color: '#4285F4',
    getUrl: (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
  },
  {
    id: 'uber',
    label: 'Uber',
    subtitle: 'Request a ride',
    icon: Car,
    color: '#000000',
    getUrl: (lat, lng, addr) => `uber://?action=setPickup&dropoff[latitude]=${lat}&dropoff[longitude]=${lng}&dropoff[nickname]=${encodeURIComponent(addr)}`,
  },
  {
    id: 'lyft',
    label: 'Lyft',
    subtitle: 'Get a Lyft there',
    icon: Car,
    color: '#FF00BF',
    getUrl: (lat, lng) => `lyft://ridetype?id=lyft&destination[latitude]=${lat}&destination[longitude]=${lng}`,
  },
  {
    id: 'lime',
    label: 'Lime',
    subtitle: 'Scooter or bike nearby',
    icon: Bike,
    color: '#00DE00',
    getUrl: () => 'https://limebike.app.link/',
  },
];

export function DirectionsSheet({
  visible,
  onClose,
  latitude,
  longitude,
  address,
  name,
}: DirectionsSheetProps) {
  const { colors, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [slideAnim, backdropOpacity, onClose]);

  const handleOptionPress = useCallback(async (option: TransportOption) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = option.getUrl(latitude, longitude, address);
    console.log('[Directions] Opening:', option.id, url);

    try {
      if (Platform.OS === 'web') {
        if (option.id === 'google_maps' || option.id === 'apple_maps') {
          await Linking.openURL(url);
        } else {
          await Linking.openURL(url).catch(() => {
            const webFallback = option.id === 'uber'
              ? 'https://m.uber.com/'
              : option.id === 'lyft'
              ? 'https://www.lyft.com/'
              : url;
            void Linking.openURL(webFallback);
          });
        }
      } else {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          const webFallbacks: Record<string, string> = {
            uber: 'https://m.uber.com/',
            lyft: 'https://www.lyft.com/',
            lime: 'https://www.li.me/',
            apple_maps: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
            google_maps: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
          };
          const fallback = webFallbacks[option.id];
          if (fallback) await Linking.openURL(fallback);
        }
      }
    } catch (e) {
      console.log('[Directions] Error opening URL:', e);
    }
    handleClose();
  }, [latitude, longitude, address, handleClose]);

  const handleCopyAddress = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Clipboard.setStringAsync(address);
    console.log('[Directions] Address copied:', address);
    handleClose();
  }, [address, handleClose]);

  const sheetBg = isDark ? 'rgba(10, 22, 30, 0.98)' : 'rgba(255, 255, 255, 0.99)';

  const filteredOptions = Platform.OS === 'ios'
    ? TRANSPORT_OPTIONS
    : TRANSPORT_OPTIONS.filter(o => o.id !== 'apple_maps');

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent testID="directions-sheet">
      <Animated.View style={[dStyles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={dStyles.backdropPress} onPress={handleClose} />
      </Animated.View>
      <Animated.View style={[dStyles.sheet, { backgroundColor: sheetBg, transform: [{ translateY: slideAnim }] }]}>
        <View style={dStyles.handle}>
          <View style={[dStyles.handleBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]} />
        </View>

        <Pressable
          onPress={handleClose}
          style={[dStyles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
          testID="directions-close"
        >
          <X color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'} size={16} />
        </Pressable>

        <View style={dStyles.header}>
          <View style={[dStyles.headerIcon, { backgroundColor: isDark ? 'rgba(53,212,207,0.1)' : 'rgba(26,168,163,0.08)' }]}>
            <MapPin color={colors.aqua} size={20} />
          </View>
          <View style={dStyles.headerInfo}>
            <Text style={[dStyles.headerName, { color: colors.text }]} numberOfLines={1}>{name}</Text>
            <Text style={[dStyles.headerAddr, { color: colors.textMuted }]} numberOfLines={1}>{address}</Text>
          </View>
        </View>

        <View style={dStyles.optionsList}>
          {filteredOptions.map((option) => {
            const IconComp = option.icon;
            return (
              <Pressable
                key={option.id}
                onPress={() => void handleOptionPress(option)}
                style={({ pressed }) => [
                  dStyles.optionRow,
                  { backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : 'transparent' },
                ]}
                testID={`directions-${option.id}`}
              >
                <View style={[dStyles.optionIcon, { backgroundColor: option.color + '18' }]}>
                  <IconComp color={option.color} size={18} />
                </View>
                <View style={dStyles.optionInfo}>
                  <Text style={[dStyles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                  <Text style={[dStyles.optionSub, { color: colors.textMuted }]}>{option.subtitle}</Text>
                </View>
                <ExternalLink color={colors.textSoft} size={14} />
              </Pressable>
            );
          })}

          <View style={[dStyles.divider, { backgroundColor: colors.border }]} />

          <Pressable
            onPress={() => void handleCopyAddress()}
            style={({ pressed }) => [
              dStyles.optionRow,
              { backgroundColor: pressed ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)') : 'transparent' },
            ]}
            testID="directions-copy"
          >
            <View style={[dStyles.optionIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
              <Copy color={colors.textMuted} size={18} />
            </View>
            <View style={dStyles.optionInfo}>
              <Text style={[dStyles.optionLabel, { color: colors.text }]}>Copy Address</Text>
              <Text style={[dStyles.optionSub, { color: colors.textMuted }]} numberOfLines={1}>{address}</Text>
            </View>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const dStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropPress: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 15,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingRight: 50,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700' as const,
  },
  headerAddr: {
    fontSize: 13,
  },
  optionsList: {
    paddingHorizontal: 12,
    gap: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  optionSub: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 8,
    marginVertical: 4,
  },
});
