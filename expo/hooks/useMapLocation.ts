import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useMapLocation() {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  // True once the first attempt has finished, whether it produced a fix, was
  // denied, or failed. Screens wait for this before their first venue query,
  // so they never fetch a placeholder area and then swap to the real one.
  const [hasResolved, setHasResolved] = useState<boolean>(false);

  const requestLocation = useCallback(async () => {
    setIsLocating(true);
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

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { userLocation, isLocating, hasResolved, requestLocation };
}
