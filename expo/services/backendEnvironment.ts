// Pure mapping from a Supabase project URL to "is this staging?". Kept free
// of native imports so it can be unit tested in Node. Only staging is named:
// every other project, production included, is "other".

const STAGING_PROJECT_REF = 'noxkfboguoyggyhaqrbx';

export type BackendEnvironment = 'staging' | 'other';

/** The project ref (public subdomain) of a Supabase URL; "none" if unreadable. */
export function projectRefFrom(url: string): string {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.supabase.co') ? host.split('.')[0] : host;
  } catch {
    return 'none';
  }
}

export function environmentFor(projectRef: string): BackendEnvironment {
  return projectRef === STAGING_PROJECT_REF ? 'staging' : 'other';
}
