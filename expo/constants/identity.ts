export const PULZE_ID = 'PZ-483921';
export const PULZE_USERNAME = 'jordan.pulze';
export const PULZE_DISPLAY_NAME = 'Jordan Pulze';
export const PULZE_BIO = 'City explorer. Finding the best vibes so you don\'t have to.';
export const PULZE_LOCATION = 'Lower East';
export const PULZE_AVATAR_INITIALS = 'JP';

export const PULZE_PROFILE_URL = `https://pulze.app/u/${PULZE_USERNAME}`;

export function generateQRCodeUrl(data: string, size: number = 400): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=0B232C&color=35D4CF&format=png&margin=2`;
}

export function generateQRCodeUrlLight(data: string, size: number = 400): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=FFFFFF&color=0B1D24&format=png&margin=2`;
}

export interface UserIdentity {
  pulzeId: string;
  username: string;
  displayName: string;
  bio: string;
  location: string;
  avatarInitials: string;
  profileUrl: string;
}

export const currentUser: UserIdentity = {
  pulzeId: PULZE_ID,
  username: PULZE_USERNAME,
  displayName: PULZE_DISPLAY_NAME,
  bio: PULZE_BIO,
  location: PULZE_LOCATION,
  avatarInitials: PULZE_AVATAR_INITIALS,
  profileUrl: PULZE_PROFILE_URL,
};
