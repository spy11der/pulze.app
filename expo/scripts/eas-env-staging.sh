#!/usr/bin/env bash
# One-time setup: put the STAGING Supabase client config into the EAS
# "preview" environment, which the "preview" and "testflight" build profiles
# use. Run from expo/:   bash scripts/eas-env-staging.sh
#
# The anon key is fetched from the Supabase CLI and validated by
# eas-build-guard.mjs, then stored with visibility "sensitive" (masked in
# build logs). It is never printed. Free; touches no Apple service and nothing
# in production. Re-running fails on existing names; use
#   npx eas-cli env:update --environment preview --variable-name <NAME> ...
# to change one.
set -euo pipefail
cd "$(dirname "$0")/.."
REF="noxkfboguoyggyhaqrbx"   # pulze-staging
URL="https://$REF.supabase.co"
EAS="npx -y eas-cli@latest"

ANON=$(supabase projects api-keys --project-ref "$REF" -o json 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const k = (JSON.parse(s) || []).find(x => x.name === "anon");
    process.stdout.write(k && k.api_key ? k.api_key : "");
  });') || ANON=""
[ -n "$ANON" ] || { echo "Could not read the staging anon key (supabase login?)"; exit 1; }

EAS_BUILD_PROFILE=testflight EXPO_PUBLIC_SUPABASE_URL="$URL" EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON" \
  node scripts/eas-build-guard.mjs

$EAS env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL \
  --value "$URL" --visibility plaintext --non-interactive
$EAS env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "$ANON" --visibility sensitive --non-interactive 2>&1 | grep -v -F "$ANON"
unset ANON
echo "Done. Check names: $EAS env:list --environment preview"
