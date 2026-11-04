// What the user is told after a check-in attempt. Pure, so it is unit tested
// (tests/checkInFlow.test.mjs). A check-in that did not reach the server is
// never presented as done, and every failure carries its reference.
import type { CheckInResult } from '@/services/checkInDatabase';

export function checkInOutcomeMessage(
  result: Pick<CheckInResult, 'status' | 'error' | 'reference'>,
  venueName: string,
): { title: string; body: string } {
  const ref = result.reference ? `\n\nRef: ${result.reference}` : '';
  if (result.status === 'synced') return { title: 'Checked in', body: `You're checked in at ${venueName}.` };
  if (result.status === 'pending') {
    return { title: 'Not sent yet', body: `${result.error ?? 'The check-in is saved on this phone and will be sent later.'}${ref}` };
  }
  return { title: 'Check-in failed', body: `${result.error ?? 'Something went wrong.'}${ref}` };
}

/** Why Activity's "Check in manually" has no venue to open. */
export function manualCheckInUnavailable(hasLocation: boolean, lookupDone: boolean): { title: string; body: string } {
  if (!hasLocation) {
    return {
      title: 'Location needed',
      body: 'Pulze checks you in at the venue nearest to you. Turn on location for Pulze in Settings, or open a venue and check in from its page.',
    };
  }
  if (!lookupDone) return { title: 'Finding venues near you', body: 'Try again in a moment.' };
  return {
    title: 'No venues nearby',
    body: "There's no Pulze venue near you to check in to. Open a venue from Discover to check in there.",
  };
}
