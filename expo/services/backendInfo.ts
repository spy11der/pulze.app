// Which backend and which JS source this running app is using, read from the
// runtime configuration (the URL the Supabase client was created with, and
// what Expo reports about where the bundle came from). Never includes keys
// or tokens: a project ref is the public subdomain of the project URL.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SUPABASE_URL } from '@/services/supabase';
import { environmentFor, projectRefFrom, type BackendEnvironment } from '@/services/backendEnvironment';

export interface BackendInfo {
  environment: BackendEnvironment;
  /** e.g. "noxkfboguoyggyhaqrbx"; "none" when the URL is missing or unreadable. */
  projectRef: string;
  /** Where this JS came from, e.g. "Expo Go · c-…on.expo.app". */
  bundleSource: string;
  sdkVersion: string;
}

function bundleSourceFrom(): string {
  // StoreClient covers both Expo Go and development builds; appOwnership tells them apart.
  const runtime =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? (Constants.appOwnership === 'expo' ? 'Expo Go' : 'Development build')
      : Constants.executionEnvironment === ExecutionEnvironment.Bare ? 'Bare build'
        : 'Release build';
  const host = Constants.expoConfig?.hostUri ?? null;
  return host ? `${runtime} · ${host}` : `${runtime} · embedded bundle`;
}

export function getBackendInfo(): BackendInfo {
  const projectRef = projectRefFrom(SUPABASE_URL);
  return {
    environment: environmentFor(projectRef),
    projectRef,
    bundleSource: bundleSourceFrom(),
    sdkVersion: Constants.expoConfig?.sdkVersion ?? 'unknown',
  };
}
