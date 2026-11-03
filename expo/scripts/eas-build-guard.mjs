// Runs on EAS Build before dependencies are installed (package.json
// "eas-build-pre-install"). It fails the build early when the Supabase config
// baked into the JS bundle is wrong for the build profile. It never prints a
// value; it reports only which check failed.
//
//   node scripts/eas-build-guard.mjs            (reads process.env)
//
// Rules:
//   - Every profile except "development": the URL and anon key must both be set. Without them the
//     app starts with an unconfigured client and every request fails.
//   - Every other profile except "production" ("testflight", "preview", any
//     new one): the URL must be the staging project, and a JWT anon key must
//     be the staging anon key. So production is refused without this public
//     repo having to name the production project.

const STAGING_REF = 'noxkfboguoyggyhaqrbx';

export function checkBuildEnv(env) {
  const profile = env.EAS_BUILD_PROFILE ?? '(local)';
  const url = env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const errors = [];

  // A development client loads its JS from Metro, which supplies the env at
  // run time (pulze58), so the binary itself needs none.
  if (profile !== 'development') {
    if (!url) errors.push('EXPO_PUBLIC_SUPABASE_URL is not set');
    if (!key) errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY is not set');
  }

  let ref = 'none';
  try {
    const host = new URL(url).hostname;
    if (host.endsWith('.supabase.co')) ref = host.split('.')[0];
  } catch {
    if (url) errors.push('EXPO_PUBLIC_SUPABASE_URL is not a valid URL');
  }

  let keyRef = null;
  let keyRole = null;
  if (key.split('.').length === 3) {
    try {
      const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      keyRef = claims.ref ?? null;
      keyRole = claims.role ?? null;
    } catch {
      errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY looks like a JWT but cannot be decoded');
    }
  }
  if (keyRole && keyRole !== 'anon') errors.push(`the client key has role "${keyRole}", expected "anon"`);

  if (profile !== 'production' && profile !== 'development') {
    if (ref !== STAGING_REF) errors.push(`profile "${profile}" must use the staging URL (got project "${ref}")`);
    if (keyRef && keyRef !== STAGING_REF) errors.push(`profile "${profile}" anon key is not the staging key`);
  }
  if (keyRef && ref !== 'none' && keyRef !== ref) errors.push('the anon key belongs to a different project than the URL');

  return { profile, ref, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { profile, ref, errors } = checkBuildEnv(process.env);
  if (errors.length) {
    console.error(`[eas-build-guard] profile ${profile}: refusing to build`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`[eas-build-guard] profile ${profile}: Supabase project ${ref} OK`);
}
