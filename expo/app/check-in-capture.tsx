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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import {
  Share2,
  Check,
  X,
} from 'lucide-react-native';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

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
  const [showCaption, setShowCaption] = useState<boolean>(false);
  const [stampPos, setStampPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [captionPos, setCaptionPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const stampOffset = useRef({ x: 0, y: 0 });
  const captionOffset = useRef({ x: 0, y: 0 });
  const captionInputRef = useRef<TextInput>(null);

  // Pinch-to-resize via PinchGestureHandler
  const [stampScale, setStampScale] = useState<number>(1);
  const [captionScale, setCaptionScale] = useState<number>(1);
  const stampBaseScale = useRef<number>(1);
  const captionBaseScale = useRef<number>(1);

  const onStampPinch = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setStampScale(Math.min(3, Math.max(0.5, stampBaseScale.current * event.nativeEvent.scale)));
    }
    if (event.nativeEvent.state === State.END) {
      stampBaseScale.current = Math.min(3, Math.max(0.5, stampBaseScale.current * event.nativeEvent.scale));
    }
  }, []);

  const onCaptionPinch = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setCaptionScale(Math.min(3, Math.max(0.5, captionBaseScale.current * event.nativeEvent.scale)));
    }
    if (event.nativeEvent.state === State.END) {
      captionBaseScale.current = Math.min(3, Math.max(0.5, captionBaseScale.current * event.nativeEvent.scale));
    }
  }, []);

  const stampPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_, gesture) => {
        setStampPos({
          x: stampOffset.current.x + gesture.dx,
          y: stampOffset.current.y + gesture.dy,
        });
      },
      onPanResponderRelease: (_, gesture) => {
        stampOffset.current = {
          x: stampOffset.current.x + gesture.dx,
          y: stampOffset.current.y + gesture.dy,
        };
      },
    }),
  ).current;

  const captionPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderMove: (_, gesture) => {
        setCaptionPos({
          x: captionOffset.current.x + gesture.dx,
          y: captionOffset.current.y + gesture.dy,
        });
      },
      onPanResponderRelease: (_, gesture) => {
        captionOffset.current = {
          x: captionOffset.current.x + gesture.dx,
          y: captionOffset.current.y + gesture.dy,
        };
        // Tap (minimal movement) → focus TextInput for typing
        if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
          captionInputRef.current?.focus();
        }
      },
    }),
  ).current;

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

  // Set quip when entering captured phase
  useEffect(() => {
    if (phase !== 'captured' || !capturedPhoto) return;
    setQuip(getQuip(venueType));
  }, [phase, capturedPhoto]);

  // User taps Continue after positioning stamp + caption
  const handleContinue = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

    // Brief quip then transition to result
    Animated.timing(quipOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

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
  }, [capturedPhoto]);

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
        <Text style={styles.permissionText}>Checking camera...</Text>
      </View>
    );
  }

  // Permission denied
  if (!hasCameraPermission) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: '#000' }]}>
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

  // Captured phase — photo with draggable+resizable stamp + caption overlay
  if (phase === 'captured' && capturedPhoto) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return (
      <View style={styles.screen}>
        <View style={StyleSheet.absoluteFill}>
          {/* Capturable view — photo + stamp overlay + caption overlay */}
          <Pressable
            ref={stampViewRef}
            style={styles.stampViewContainer}
            collapsable={false}
            onPress={() => setShowCaption(true)}
          >
            <Image source={{ uri: capturedPhoto }} style={styles.stampImage} />

            {/* Draggable stamp with pinch-to-resize */}
            <PinchGestureHandler onGestureEvent={onStampPinch} onHandlerStateChange={onStampPinch}>
              <Animated.View
                style={[
                  styles.stampOverlay,
                  { transform: [{ translateX: stampPos.x }, { translateY: stampPos.y }, { scale: stampScale }] },
                ]}
                {...stampPanResponder.panHandlers}
              >
                <View style={styles.stampBox}>
                  <Text style={styles.stampVenue}>{venueName}</Text>
                  <Text style={styles.stampNeighborhood}>{neighborhood}</Text>
                  <Text style={styles.stampTime}>{timeStr}</Text>
                </View>
              </Animated.View>
            </PinchGestureHandler>

            {/* Draggable caption text overlay with pinch-to-resize — only visible after user taps */}
            {showCaption && (
              <PinchGestureHandler onGestureEvent={onCaptionPinch} onHandlerStateChange={onCaptionPinch}>
                <Animated.View
                  style={{ position: 'absolute', top: 340, left: 20, transform: [{ translateX: captionPos.x }, { translateY: captionPos.y }, { scale: captionScale }] }}
                  {...captionPanResponder.panHandlers}
                >
                  <Text style={{ color: caption ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                    {caption || 'Add a caption...'}
                  </Text>
                </Animated.View>
              </PinchGestureHandler>
            )}
          </Pressable>
        </View>

        {/* Hidden TextInput for caption editing */}
        <TextInput
          ref={captionInputRef}
          value={caption}
          onChangeText={setCaption}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1, top: -100 }}
          maxLength={120}
          returnKeyType="done"
        />

        {/* Continue button */}
        <View style={[styles.continueWrap, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.continueBtnText}>📍 Check in</Text>
          </Pressable>
        </View>

        {/* Quip overlay */}
        <Animated.View
          style={[styles.quipOverlay, { opacity: quipOpacity }]}
          pointerEvents="none"
        >
          <Text style={styles.quipText}>{quip}</Text>
        </Animated.View>


      </View>
    );
  }

  // Result phase — two buttons
  return (
    <View style={[styles.screen, styles.resultScreen, { backgroundColor: '#000' }]}>
      <Animated.View style={[styles.resultContent, { opacity: resultOpacity }]}>
        {stampedPhoto && (
          <Image source={{ uri: stampedPhoto }} style={styles.resultPhoto} />
        )}

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
    flex: 1,
    width: '100%' as const,
  },
  stampImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover' as const,
  },
  stampOverlay: {
    position: 'absolute',
    top: 180,
    left: 20,
    alignItems: 'center',
  },
  stampBox: {
    alignItems: 'center',
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
    alignItems: 'center' as const,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#2BBFBA',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignSelf: 'center' as const,
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
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center' as const,
  },
  justCheckBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  // Caption overlay on photo
  captionOverlay: {
    position: 'absolute',
    top: 340,
    left: 20,
    alignItems: 'center',
  },
  captionOverlayInput: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    minWidth: 200,
  },
  // Continue button
  continueWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
  },
  continueBtn: {
    backgroundColor: '#2BBFBA',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center' as const,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#041318',
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
