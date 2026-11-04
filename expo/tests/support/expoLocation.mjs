export const Accuracy = { High: 4 };
export const getForegroundPermissionsAsync = async () => ({ status: 'denied', canAskAgain: false });
export const requestForegroundPermissionsAsync = getForegroundPermissionsAsync;
export const hasServicesEnabledAsync = async () => false;
export const getCurrentPositionAsync = async () => null;
