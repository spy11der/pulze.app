import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import {
  Share2,
  Check,
  X,
} from 'lucide-react-native';

import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { insertCheckIn } from '@/services/checkInDatabase';
import { getQuip } from '@/utils/quips';
import { pulzeVenues } from '@/mocks/venues';
import type { VenueType } from '@/types/venue';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COUNTDOWN_SECONDS = 5;
const CIRCLE_SIZE = 80;
const CIRCLE_STROKE = 4;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE * 2) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const QUIP_DISPLAY_MS = 2800;

type CapturePhase = 'countdown' | 'captured' | 'result';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CheckInCaptureScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    venueId: string;
    venueName: string;
    neighborhood: string;
  }>();

  const cameraRef = useRef<CameraView>(null);
  const stampViewRef = useRef<View>(null);
  const countdownAnim = useRef(new Animated.Value(COUNTDOWN_SECONDS)).current;
  const quipOpacity = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<CapturePhase>('countdown');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [stampedPhoto, setStampedPhoto] = useState<string | null>(null);
  const [quip, setQuip] = useState<string>('');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [caption, setCaption] = useState<string>('');
  const [stampPos, setStampPos] = useState<{ x: number; y: number }>({ x: 0, y: 180 });

  const venue = pulzeVenues.find((v) => v.id === params.venueId);
  const venueName = params.venueName ?? venue?.name ?? 'Unknown Venue';
  const neighborhood = params.neighborhood ?? venue?.neighborhood ?? 'Denver';
  const venueType: VenueType = venue?.type ?? 'bar';

  // Request camera permission
  const [camPermission, requestCamPermission] = useCameraPermissions();
  useEffect(() => {
    if (camPermission) {
      setHasCameraPermission(camPermission.granted);
    }
  }, [camPermission]);

  useEffect(() => {
    if (camPermission && !camPermission.granted) {
      void requestCamPermission();
    }
  }, []);

  // Countdown animation
  useEffect(() => {
    if (phase !== 'countdown') return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const startTime = Date.now();
    let rafId: number;

    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, COUNTDOWN_SECONDS - elapsed);
      countdownAnim.setValue(remaining);

      if (remaining <= 0) {
        void capturePhoto();
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
      });
      setCapturedPhoto(photo.uri);
      setPhase('captured');
    } catch (e) {
      console.log('[Capture] Error taking photo:', e);
      void handleSkip();
    }
  }, []);

  // After photo captured, generate stamp and show quip
  useEffect(() => {
    if (phase !== 'captured' || !capturedPhoto) return;

    const q = getQuip(venueType);
    setQuip(q);

    // Wait a beat then stamp
    const stampTimer = setTimeout(async () => {
      try {
        if (stampViewRef.current) {
          const uri = await captureRef(stampViewRef.current, {
            format: 'jpg',
            quality: 0.9,
          });
          setStampedPhoto(uri);
        }
      } catch (e) {
        console.log('[Capture] Stamp error:', e);
        setStampedPhoto(capturedPhoto);
      }

      // Show quip
      Animated.timing(quipOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      // Then transition to result
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(quipOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(resultOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => setPhase('result'));
      }, QUIP_DISPLAY_MS);
    }, 300);

    return () => clearTimeout(stampTimer);
  }, [phase, capturedPhoto]);

  const handleShareWithCrew = useCallback(async () => {
    if (isSharing) return;
    setIsSharing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const photoUri = stampedPhoto ?? capturedPhoto;
    const userId = user?.id ?? 'unknown';

    await insertCheckIn({
      userId,
      venueId: params.venueId ?? '',
      venueName,
      neighborhood,
      photoUri,
      photoVisibility: true,
      capturedAt: new Date().toISOString(),
      quip: caption || quip,
    });

    // Dismiss camera and go back
    router.back();
  }, [isSharing, stampedPhoto, capturedPhoto, user, params.venueId, venueName, neighborhood, quip, router]);

  const handleJustCheckIn = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userId = user?.id ?? 'unknown';
    await insertCheckIn({
      userId,
      venueId: params.venueId ?? '',
      venueName,
      neighborhood,
      photoUri: null,
      photoVisibility: false,
      capturedAt: new Date().toISOString(),
      quip,
    });

    router.back();
  }, [user, params.venueId, venueName, neighborhood, quip, router]);

  const handleSkip = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userId = user?.id ?? 'unknown';
    await insertCheckIn({
      userId,
      venueId: params.venueId ?? '',
      venueName,
      neighborhood,
      photoUri: null,
      photoVisibility: false,
      capturedAt: new Date().toISOString(),
      quip: null,
    });

    router.back();
  }, [user, params.venueId, venueName, neighborhood, router]);

  // Permission not yet checked
  if (hasCameraPermission === null) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: '#000' }]}>
        <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
        <Text style={styles.permissionText}>Checking camera...</Text>
      </View>
    );
  }

  // Permission denied
  if (!hasCameraPermission) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: '#000' }]}>
        <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
        <Text style={styles.permissionText}>Camera access is required</Text>
        <Pressable
          onPress={() => router.back()}
          style={styles.skipBtn}
        >
          <Text style={styles.skipBtnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Countdown phase — live camera with circular timer
  if (phase === 'countdown') {
    const strokeDashoffset = countdownAnim.interpolate({
      inputRange: [0, COUNTDOWN_SECONDS],
      outputRange: [0, CIRCLE_CIRCUMFERENCE],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          ratio="16:9"
        >
          {/* Darken overlay */}
          <View style={styles.cameraOverlay} />

          {/* Skip button top-right */}
          <Pressable
            onPress={handleSkip}
            style={[styles.topRightBtn, { top: insets.top + 12 }]}
          >
            <X color="rgba(255,255,255,0.7)" size={24} />
          </Pressable>

          {/* Countdown circle center */}
          <View style={styles.countdownContainer}>
            <View style={styles.countdownCircleWrap}>
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.countdownSvg}>
                {/* Background circle */}
                <Circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={CIRCLE_RADIUS}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={CIRCLE_STROKE}
                  fill="none"
                />
                {/* Animated foreground */}
                <AnimatedCircle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={CIRCLE_RADIUS}
                  stroke="#2BBFBA"
                  strokeWidth={CIRCLE_STROKE}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRCLE_CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                />
              </Svg>
            </View>
          </View>

          {/* Venue name below */}
          <View style={[styles.venueNameWrap, { paddingBottom: insets.bottom + 40 }]}>
            <Text style={styles.venueName}>{venueName}</Text>
            <Text style={styles.venueHood}>{neighborhood}</Text>
          </View>
        </CameraView>
      </View>
    );
  }

  // Draggable stamp pan responder
  const stampPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: (_, gesture) => {
        setStampPos((prev) => ({
          x: prev.x + gesture.dx * 0.3,
          y: prev.y + gesture.dy * 0.3,
        }));
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  // Captured phase — show photo with stamp overlay + quip
  if (phase === 'captured' && capturedPhoto) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />

        {/* Stampable view */}
        <View ref={stampViewRef} style={styles.stampViewContainer} collapsable={false}>
          <Image source={{ uri: capturedPhoto }} style={styles.stampImage} />
          {/* Draggable stamp overlay on photo */}
          <View
            style={[
              styles.stampOverlay,
              {
                bottom: undefined as any,
                top: stampPos.y,
                transform: [{ translateX: stampPos.x }],
              },
            ]}
            {...stampPan.panHandlers}
          >
            <View style={styles.stampBox}>
              <Text style={styles.stampVenue}>{venueName}</Text>
              <Text style={styles.stampNeighborhood}>{neighborhood}</Text>
              <Text style={styles.stampTime}>{timeStr}</Text>
            </View>
          </View>
        </View>

        {/* Quip overlay */}
        <Animated.View
          style={[styles.quipOverlay, { opacity: quipOpacity }]}
          pointerEvents="none"
        >
          <Text style={styles.quipText}>{quip}</Text>
        </Animated.View>

        {/* Hint: drag to reposition */}
        <View style={styles.dragHint} pointerEvents="none">
          <Text style={styles.dragHintText}>Press and drag the stamp to reposition</Text>
        </View>
      </View>
    );
  }

  // Result phase — two buttons
  return (
    <View style={[styles.screen, styles.resultScreen, { backgroundColor: '#000' }]}>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />

      <Animated.View style={[styles.resultContent, { opacity: resultOpacity }]}>
        {stampedPhoto && (
          <Image source={{ uri: stampedPhoto }} style={styles.resultPhoto} />
        )}

        {/* Caption input */}
        <View style={styles.captionContainer}>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Add a caption..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={120}
            returnKeyType="done"
            autoCorrect
          />
        </View>

        <View style={[styles.resultActions, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable
            onPress={handleShareWithCrew}
            disabled={isSharing}
            style={({ pressed }) => [
              styles.shareBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Share2 color="#041318" size={20} />
            <Text style={styles.shareBtnText}>Share with crew</Text>
          </Pressable>
          <Pressable
            onPress={handleJustCheckIn}
            style={({ pressed }) => [
              styles.justCheckBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Check color="rgba(255,255,255,0.8)" size={20} />
            <Text style={styles.justCheckBtnText}>Just check in</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  topRightBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  countdownContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    top: -60,
  },
  countdownCircleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  venueNameWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  venueHood: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  // Capture phase
  stampViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  stampImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    resizeMode: 'cover' as const,
  },
  stampOverlay: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stampBox: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(43,191,186,0.5)',
    transform: [{ rotate: '-3deg' }],
  },
  stampVenue: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  stampNeighborhood: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2BBFBA',
    marginTop: 2,
  },
  stampTime: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  // Quip
  quipOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  quipText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  // Result
  resultScreen: {
    justifyContent: 'flex-end',
  },
  resultContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  resultPhoto: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 140,
    resizeMode: 'cover' as const,
    opacity: 0.7,
  },
  resultActions: {
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 16,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2BBFBA',
    borderRadius: 16,
    paddingVertical: 18,
  },
  shareBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#041318',
  },
  justCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  justCheckBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  // Caption input
  captionContainer: {
    paddingHorizontal: 20,
    marginTop: 12,
  },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  // Drag hint
  dragHint: {
    position: 'absolute',
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dragHintText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.4)',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Permission
  permissionText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20,
  },
  skipBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#2BBFBA',
  },
});
