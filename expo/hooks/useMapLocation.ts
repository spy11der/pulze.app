import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function useMapLocation() {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const hasRequestedRef = useRef(false);

  const requestLocation = useCallback(async (): Promise<Coordinates | null> => {
    try {
      setIsLocating(true);
      console.log('[useMapLocation] Requesting location');

      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          Alert.alert('Location unavailable', 'Your browser does not support geolocation.');
          return null;
        }
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000,
          });
        });
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(coords);
        setPermissionGranted(true);
        console.log('[useMapLocation] Web location acquired', coords);
        return coords;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        console.log('[useMapLocation] Permission denied');
        Alert.alert('Location access needed', 'Turn on location to center the map around you.');
        return null;
      }
      setPermissionGranted(true);

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: Coordinates = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      };
      setUserLocation(coords);
      console.log('[useMapLocation] Native location acquired', coords);
      return coords;
    } catch (error) {
      console.log('[useMapLocation] Failed to get location', error);
      Alert.alert('Location unavailable', 'We could not get your location right now.');
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    if (!hasRequestedRef.current) {
      hasRequestedRef.current = true;
      void requestLocation();
    }
  }, [requestLocation]);

  return {
    userLocation,
    isLocating,
    permissionGranted,
    requestLocation,
  };
}
