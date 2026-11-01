import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useMapLocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  // The first lookup starts on mount, so the hook starts out locating.
  const [isLocating, setIsLocating] = useState<boolean>(true);
  // True once the first attempt has finished, whether it produced a fix, was
  // denied, or failed. Screens wait for this before their first venue query,
  // so they never fetch a placeholder area and then swap to the real one.
  const [hasResolved, setHasResolved] = useState<boolean>(false);

  const locate = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[useMapLocation] Permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (err) {
      console.log('[useMapLocation] Error:', err);
    } finally {
      setIsLocating(false);
      setHasResolved(true);
    }
  }, []);

  /** A fresh lookup on request (e.g. a "locate me" tap). */
  const requestLocation = useCallback(async () => {
    setIsLocating(true);
    await locate();
  }, [locate]);

  useEffect(() => {
    void (async () => {
      await locate();
    })();
  }, [locate]);

  return { userLocation, isLocating, hasResolved, requestLocation };
}
