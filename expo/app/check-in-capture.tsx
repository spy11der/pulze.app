import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Animated,
  Dimensions,
  Image,
  Linking,
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
  X,
} from 'lucide-react-native';
import { PanGestureHandler, PinchGestureHandler, TapGestureHandler, State } from 'react-native-gesture-handler';

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

type CapturePhase = 'choice' | 'countdown' | 'captured' | 'result';

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
  const countdownAnim = useRef(new Animated.Value(COUNTDOWN_SECONDS)).current;
  const quipOpacity = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<CapturePhase>('choice');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [stampedPhoto, setStampedPhoto] = useState<string | null>(null);
  const [quip, setQuip] = useState<string>('');
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [caption, setCaption] = useState<string>('');
  const [showCaption, setShowCaption] = useState<boolean>(false);
  const [stampPos, setStampPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [captionPos, setCaptionPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const stampOffset = useRef({ x: 0, y: 0 });
  const captionOffset = useRef({ x: 0, y: 0 });
  const captionInputRef = useRef<TextInput>(null);
  const stampViewRef = useRef<View>(null);

  // Gesture handler refs for simultaneous pinch + pan coordination
  const stampPinchRef = useRef<any>(null);
  const stampPanRef = useRef<any>(null);
  const captionPinchRef = useRef<any>(null);
  const captionPanRef = useRef<any>(null);

  // Pinch-to-resize via PinchGestureHandler
  const [stampScale, setStampScale] = useState<number>(1);
  const [captionScale, setCaptionScale] = useState<number>(1);
  const stampBaseScale = useRef<number>(1);
  const captionBaseScale = useRef<number>(1);

  const onStampPinchGesture = useCallback((event: any) => {
    setStampScale(stampBaseScale.current * event.nativeEvent.scale);
  }, []);

  const onStampPinchState = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      stampBaseScale.current = stampBaseScale.current * event.nativeEvent.scale;
    }
  }, []);

  const onStampPan = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setStampPos({
        x: stampOffset.current.x + event.nativeEvent.translationX,
        y: stampOffset.current.y + event.nativeEvent.translationY,
      });
    }
    if (event.nativeEvent.state === State.END) {
      stampOffset.current = {
        x: stampOffset.current.x + event.nativeEvent.translationX,
        y: stampOffset.current.y + event.nativeEvent.translationY,
      };
    }
  }, []);

  const onCaptionPinchGesture = useCallback((event: any) => {
    setCaptionScale(captionBaseScale.current * event.nativeEvent.scale);
  }, []);

  const onCaptionPinchState = useCallback((event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      captionBaseScale.current = captionBaseScale.current * event.nativeEvent.scale;
    }
  }, []);

  const onCaptionPan = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setCaptionPos({
        x: captionOffset.current.x + event.nativeEvent.translationX,
        y: captionOffset.current.y + event.nativeEvent.translationY,
      });
    }
    if (event.nativeEvent.state === State.END) {
      captionOffset.current = {
        x: captionOffset.current.x + event.nativeEvent.translationX,
        y: captionOffset.current.y + event.nativeEvent.translationY,
      };
      if (Math.abs(event.nativeEvent.translationX) < 20 && Math.abs(event.nativeEvent.translationY) < 20) {
        captionInputRef.current?.focus();
      }
    }
  }, []);

  // Dedicated tap recognizer for edit mode. The pan above requires ~10px of
  // travel before activating (minDist={0} is treated as unspecified by RNGH),
  // so a clean stationary tap ends in State.FAILED and never reaches the
  // State.END focus call. Taps are handled natively here with no travel
  // requirement; pan/pinch behavior is untouched.
  const onCaptionTap = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      captionInputRef.current?.focus();
    }
  }, []);

  const handlePhotoTap = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setShowCaption(true);
    }
  }, []);

  const venue = pulzeVenues.find((v) => v.id === params.venueId);
  const venueName = params.venueName ?? venue?.name ?? 'Unknown Venue';
  const neighborhood = params.neighborhood ?? venue?.neighborhood ?? 'Denver';
  const venueType: VenueType = venue?.type ?? 'bar';

  // Camera permission: always call the real request API on first open so iOS
  // shows the system prompt. (The previous code guarded on `camPermission`,
  // which is null at mount, so the request never fired and iOS never prompted —
  // leaving Expo Go with no Camera toggle in Settings.)
  const [camPermission, requestCamPermission, getCamPermission] = useCameraPermissions();
  const didRequestCameraPermission = useRef(false);

  useEffect(() => {
    if (didRequestCameraPermission.current) return;
    didRequestCameraPermission.current = true;
    void requestCamPermission();
  }, [requestCamPermission]);

  const hasCameraPermission = camPermission?.granted ?? null;
  const isPermissionUndetermined =
    hasCameraPermission === null || camPermission?.status === 'undetermined';

  // If permission was denied and the user goes to Settings, re-check on return.
  useEffect(() => {
    if (hasCameraPermission !== false) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getCamPermission();
    });
    return () => subscription.remove();
  }, [hasCameraPermission, getCamPermission]);

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

    const result = await insertCheckIn({
      userId,
      venueId: params.venueId ?? '',
      venueName,
      neighborhood,
      photoUri,
      photoVisibility: true,
      capturedAt: new Date().toISOString(),
      quip: caption || quip,
    });
    if (result.status === 'failed') {
      Alert.alert('Check-in failed', result.error ?? 'Something went wrong');
    }

    // Dismiss camera and go back
    router.back();
  }, [isSharing, stampedPhoto, capturedPhoto, user, params.venueId, venueName, neighborhood, quip, router]);

  const handleJustCheckInChoice = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const userId = user?.id ?? 'unknown';
    const result = await insertCheckIn({
      userId,
      venueId: params.venueId ?? '',
      venueName,
      neighborhood,
      photoUri: null,
      photoVisibility: false,
      capturedAt: new Date().toISOString(),
      quip: null,
    });
    if (result.status === 'failed') {
      Alert.alert('Check-in failed', result.error ?? 'Something went wrong');
    }

    router.back();
  }, [user, params.venueId, venueName, neighborhood, router]);

  const handleSkip = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userId = user?.id ?? 'unknown';
    const result = await insertCheckIn({
      userId,
      venueId: params.venueId ?? '',
      venueName,
      neighborhood,
      photoUri: null,
      photoVisibility: false,
      capturedAt: new Date().toISOString(),
      quip: null,
    });
    if (result.status === 'failed') {
      Alert.alert('Check-in failed', result.error ?? 'Something went wrong');
    }

    router.back();
  }, [user, params.venueId, venueName, neighborhood, router]);

  // Permission check in flight / iOS system prompt showing
  if (hasCameraPermission === null || isPermissionUndetermined) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: '#000' }]}>
        <Text style={styles.permissionText}>Requesting camera access…</Text>
      </View>
    );
  }

  // Permission denied
  if (!hasCameraPermission) {
    const canAskAgain = camPermission?.canAskAgain ?? true;
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: '#000' }]}>
        <Text style={styles.permissionText}>Camera access is required</Text>
        <View style={styles.permissionActions}>
          {canAskAgain ? (
            <Pressable
              onPress={() => void requestCamPermission()}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Try again</Text>
            </Pressable>
          ) : Platform.OS !== 'web' ? (
            <Pressable
              onPress={() => void Linking.openSettings()}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Open Settings</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.back()} style={styles.skipBtn}>
            <Text style={styles.skipBtnText}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Choice phase — pre-camera picker
  if (phase === 'choice') {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: '#000' }]}>
        {/* Venue name */}
        <Text style={styles.choiceVenueName}>{venueName}</Text>
        <Text style={styles.choiceNeighborhood}>{neighborhood}</Text>

        {/* Buttons */}
        <View style={[styles.choiceButtons, { paddingBottom: insets.bottom + 40 }]}>
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPhase('countdown');
            }}
            style={({ pressed }) => [
              styles.choicePrimaryBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.choicePrimaryBtnText}>📍 Check in with a pic</Text>
          </Pressable>
          <Pressable
            onPress={handleJustCheckInChoice}
            style={({ pressed }) => [
              styles.choiceSecondaryBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.choiceSecondaryBtnText}>Just check in</Text>
          </Pressable>
        </View>
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
          <View
            ref={stampViewRef}
            style={styles.stampViewContainer}
            collapsable={false}
          >
            {/* Background tap layer — shows caption on tap, sits behind stamp and caption gesture handlers. Uses TapGestureHandler (native) to avoid JS touch conflict with Pan/Pinch handlers. */}
            <TapGestureHandler onHandlerStateChange={handlePhotoTap}>
              <View style={StyleSheet.absoluteFill}>
                <Image source={{ uri: capturedPhoto }} style={styles.stampImage} />
              </View>
            </TapGestureHandler>

            {/* Draggable stamp with pinch-to-resize */}
            <PanGestureHandler
              ref={stampPanRef}
              simultaneousHandlers={stampPinchRef}
              onGestureEvent={onStampPan}
              onHandlerStateChange={onStampPan}
              minDist={10}
            >
              <PinchGestureHandler
                ref={stampPinchRef}
                simultaneousHandlers={stampPanRef}
                onGestureEvent={onStampPinchGesture}
                onHandlerStateChange={onStampPinchState}
              >
                <Animated.View
                  style={[
                    styles.stampOverlay,
                    { transform: [{ translateX: stampPos.x }, { translateY: stampPos.y }, { scale: stampScale }] },
                  ]}
                >
                  <Animated.View style={styles.stampBox}>
                    <Text style={styles.stampVenue}>{venueName}</Text>
                    <Text style={styles.stampNeighborhood}>{neighborhood}</Text>
                    <Text style={styles.stampTime}>{timeStr}</Text>
                  </Animated.View>
                </Animated.View>
              </PinchGestureHandler>
            </PanGestureHandler>

            {/* Draggable caption text overlay with pinch-to-resize — only visible after user taps */}
            {showCaption && (
              <PanGestureHandler
                ref={captionPanRef}
                simultaneousHandlers={captionPinchRef}
                onGestureEvent={onCaptionPan}
                onHandlerStateChange={onCaptionPan}
                minDist={0}
                avgTouches={false}
                shouldCancelWhenOutside={false}
              >
                <PinchGestureHandler
                  ref={captionPinchRef}
                  simultaneousHandlers={captionPanRef}
                  onGestureEvent={onCaptionPinchGesture}
                  onHandlerStateChange={onCaptionPinchState}
                >
                  <TapGestureHandler
                    simultaneousHandlers={[captionPanRef, captionPinchRef]}
                    onHandlerStateChange={onCaptionTap}
                    maxDist={20}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  >
                    <Animated.View
                      style={{ position: 'absolute', top: 340, left: 20, minWidth: 120, minHeight: 44, padding: 12, transform: [{ translateX: captionPos.x }, { translateY: captionPos.y }, { scale: captionScale }] }}
                    >
                      <Text style={{ color: caption ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                        {caption || 'Add a caption...'}
                      </Text>
                    </Animated.View>
                  </TapGestureHandler>
                </PinchGestureHandler>
              </PanGestureHandler>
            )}
          </View>
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

  // Result phase — single compact share button
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
            <Text style={styles.shareBtnText}>Share with crew</Text>
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
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    position: 'absolute' as const,
    top: -60,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    paddingTop: 16,
    alignItems: 'center' as const,
  },
  shareBtn: {
    backgroundColor: '#2BBFBA',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center' as const,
  },

  shareBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#041318',
  },

  btnPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  // Choice screen
  choiceVenueName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 32,
    letterSpacing: 0.3,
  },
  choiceNeighborhood: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    marginBottom: 48,
  },
  choiceButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  choicePrimaryBtn: {
    backgroundColor: '#2BBFBA',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choicePrimaryBtnText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#041318',
  },
  choiceSecondaryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  choiceSecondaryBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
  },
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
  permissionActions: {
    gap: 12,
    alignItems: 'center' as const,
  },
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
