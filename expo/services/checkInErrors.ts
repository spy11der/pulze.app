// Check-in failure reporting. Every step of a check-in that can fail records
// what failed and the server's own answer, so a failure is never silent:
//   - logged with console.warn (visible in Xcode's device console / Metro),
//   - kept on the device (the last MAX_KEPT, newest first) for diagnosis,
//   - summarised in a short reference the user sees in the alert, so a beta
//     tester can report "upload · 403 · …" instead of "it didn't work".
// Never recorded: captions, photos, coordinates, tokens or emails. Only the
// step, an HTTP status / error code, and the error message (truncated).
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CheckInStage =
  | 'auth' // no signed-in user
  | 'venue' // venue id lookup
  | 'photo_read' // reading the captured file from disk
  | 'upload' // Storage upload
  | 'insert' // check_ins insert
  | 'verify' // verify_check_in RPC (never fails the check-in)
  | 'capture' // the camera did not return a photo
  | 'unexpected'; // anything thrown outside the steps above

export interface CheckInFailure {
  at: string;
  stage: CheckInStage;
  /** HTTP status or Postgres / Storage error code, when there is one. */
  code?: string;
  message: string;
}

export const FAILURES_KEY = 'pulze_checkin_failures';
const MAX_KEPT = 20;
const MAX_MESSAGE = 200;

/** Status / code / message of whatever supabase-js, fetch or native code threw or returned. */
export function describeError(err: unknown): { code?: string; message: string } {
  if (err == null) return { message: 'unknown error' };
  if (typeof err === 'string') return { message: err.slice(0, MAX_MESSAGE) };
  const e = err as { code?: unknown; status?: unknown; statusCode?: unknown; message?: unknown; error?: unknown };
  const code = [e.statusCode, e.status, e.code].find((v) => v !== undefined && v !== null && v !== '');
  const message = typeof e.message === 'string' && e.message
    ? e.message
    : typeof e.error === 'string' ? e.error : String(err);
  return { code: code === undefined ? undefined : String(code), message: message.slice(0, MAX_MESSAGE) };
}

/** The short reference shown to the user, e.g. "upload · 403 · new row violates row-level security policy". */
export function failureReference(f: Pick<CheckInFailure, 'stage' | 'code' | 'message'>): string {
  return [f.stage, f.code, f.message.slice(0, 90)].filter(Boolean).join(' · ');
}

export async function reportCheckInFailure(stage: CheckInStage, err: unknown): Promise<CheckInFailure> {
  const failure: CheckInFailure = { at: new Date().toISOString(), stage, ...describeError(err) };
  console.warn('[CheckIn] failed at', failureReference(failure));
  try {
    const raw = await AsyncStorage.getItem(FAILURES_KEY);
    const kept: CheckInFailure[] = raw ? JSON.parse(raw) : [];
    await AsyncStorage.setItem(FAILURES_KEY, JSON.stringify([failure, ...kept].slice(0, MAX_KEPT)));
  } catch {
    // Reporting must never break the check-in path itself.
  }
  return failure;
}

export async function getRecentCheckInFailures(): Promise<CheckInFailure[]> {
  try {
    const raw = await AsyncStorage.getItem(FAILURES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
