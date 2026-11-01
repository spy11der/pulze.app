// One fresh, foreground location reading per check-in, sent to the server's
// verify_check_in(). The server decides the outcome (distance from the
// venue's stored coordinates, accuracy, freshness); nothing here can mark a
// check-in verified. No background tracking: this only runs when the user
// taps to check in, and the coordinates are not stored by the server.
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { supabase } from '@/services/supabase';
import { getMyCheckInVerificationConsent, setMyCheckInVerificationConsent } from '@/services/consent';

export interface CheckInFix {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  /** When the device took the reading (device clock). */
  takenAt: string;
  /** Android reports test/mock providers; iOS never sets this. */
  mocked: boolean;
}

const FIX_TIMEOUT_MS = 12_000;

/**
 * Asks for foreground location if it hasn't been decided yet, then takes a
 * fresh reading. Resolves to null when permission is denied, location
 * services are off, or no reading arrives in time: the check-in then stays a
 * normal, unverified social check-in.
 */
export async function captureCheckInFix(): Promise<CheckInFix | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status === 'undetermined' && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }
    if (permission.status !== 'granted') return null;
    if (!(await Location.hasServicesEnabledAsync())) return null;

    // A new reading, never the cached last-known position.
    const reading = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS)),
    ]);
    if (!reading) return null;
    return {
      latitude: reading.coords.latitude,
      longitude: reading.coords.longitude,
      accuracyM: reading.coords.accuracy ?? null,
      takenAt: new Date(reading.timestamp).toISOString(),
      mocked: reading.mocked === true,
    };
  } catch (e) {
    console.log('[CheckInVerify] No location reading:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Sends the reading (or its absence) for a check-in the server has just
 * created. Errors are logged, never surfaced: an unverified check-in is still
 * a complete check-in, it just doesn't count toward live activity.
 */
export async function submitCheckInVerification(checkInId: string, fix: CheckInFix | null): Promise<void> {
  const { data, error } = await (supabase.rpc as any)('verify_check_in', {
    p_check_in_id: checkInId,
    p_latitude: fix?.latitude ?? null,
    p_longitude: fix?.longitude ?? null,
    p_accuracy_m: fix?.accuracyM ?? null,
    p_fix_at: fix?.takenAt ?? null,
    p_is_mocked: fix?.mocked ?? false,
  });
  if (error) console.log('[CheckInVerify] Not evaluated:', error.message);
  else if (__DEV__) console.log('[CheckInVerify] Outcome:', data);
}

const ASKED_KEY = 'pulze_checkin_verify_asked_v1';

function ask(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Verify check-ins with your location?',
      "When you check in, Pulze can take one location reading to confirm you're at the venue. "
        + "Your exact location isn't stored, and nothing is collected in the background. "
        + 'Only verified check-ins count toward live activity. You can change this in Settings.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Verify my check-ins', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * Called when the user taps to check in. Returns a reading in progress when
 * the user has given Pulze's check-in verification consent (asking once, the
 * first time, before any OS prompt), otherwise undefined: the check-in is
 * then an ordinary unverified check-in and no location is read at all.
 */
export async function verificationFixForCheckIn(userId: string): Promise<{ fix: Promise<CheckInFix | null> } | undefined> {
  let { granted, decided } = await getMyCheckInVerificationConsent();
  if (!granted && !decided) {
    const askedKey = `${ASKED_KEY}_${userId}`;
    if ((await AsyncStorage.getItem(askedKey)) === null) {
      await AsyncStorage.setItem(askedKey, '1');
      granted = await ask();
      await setMyCheckInVerificationConsent(granted);
    }
  }
  // Wrapped so awaiting the consent decision doesn't also wait for the GPS
  // reading: the reading keeps running in parallel with the upload.
  return granted ? { fix: captureCheckInFix() } : undefined;
}
