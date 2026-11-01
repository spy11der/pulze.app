// push-dispatch: sends queued notification pushes through Expo's push service
// and checks Expo receipts so dead device tokens are removed.
//
// Called every minute by pg_cron (public.push_dispatch_tick, via pg_net) with
// the shared secret in x-pulze-dispatch-secret. Deployed with verify_jwt off:
// the secret IS the authentication, and nothing else can reach the work, which
// runs through service-role-only RPCs (push_claim_batch, push_record_result,
// push_receipts_due, push_receipts_done). What a push says is decided in
// Postgres (push_message_for), not here. Logs carry counts only: never tokens
// or message text.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS = 'https://exp.host/--/api/v2/push/getReceipts';

type Item = { id: string; tokens: string[]; message: { title: string; body: string }; data: Record<string, unknown> };
type Ticket = { status: 'ok'; id: string } | { status: 'error'; message?: string; details?: { error?: string } };

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function chunks<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

async function postJson(url: string, body: unknown): Promise<any | null> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_DISPATCH_SECRET') ?? '';
  const given = req.headers.get('x-pulze-dispatch-secret') ?? '';
  if (!secret || !sameSecret(given, secret)) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });

  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return new Response(JSON.stringify({ error: 'misconfigured' }), { status: 500 });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // ---- send ----------------------------------------------------------------
  const { data: batch, error: claimErr } = await admin.rpc('push_claim_batch', { p_limit: 100 });
  if (claimErr) {
    console.error('[push-dispatch] claim failed:', claimErr.message);
    return new Response(JSON.stringify({ error: 'claim_failed' }), { status: 500 });
  }
  const items = (batch ?? []) as Item[];
  const messages: { item: Item; token: string }[] = [];
  for (const it of items) for (const token of it.tokens) messages.push({ item: it, token });

  const tickets = new Map<string, { ok: { ticket: string; token: string }[]; dead: string[]; transient: boolean }>();
  for (const it of items) tickets.set(it.id, { ok: [], dead: [], transient: false });

  for (const group of chunks(messages, 100)) {
    const res = await postJson(EXPO_SEND, group.map(({ item, token }) => ({
      to: token, title: item.message.title, body: item.message.body, data: item.data, sound: 'default',
    })));
    const data = (res?.data ?? null) as Ticket[] | null;
    group.forEach(({ item, token }, i) => {
      const t = tickets.get(item.id)!;
      const ticket = data?.[i];
      if (!ticket) t.transient = true;
      else if (ticket.status === 'ok') t.ok.push({ ticket: ticket.id, token });
      else if (ticket.details?.error === 'DeviceNotRegistered') t.dead.push(token);
      else t.transient = true;
    });
  }

  let sent = 0, retried = 0, skipped = 0, dead = 0;
  for (const it of items) {
    const t = tickets.get(it.id)!;
    const outcome = t.ok.length > 0 ? 'sent' : t.transient ? 'retry' : 'skipped';
    if (outcome === 'sent') sent++; else if (outcome === 'retry') retried++; else skipped++;
    dead += t.dead.length;
    const { error } = await admin.rpc('push_record_result', {
      p_id: it.id, p_outcome: outcome, p_ok_tickets: t.ok, p_dead_tokens: t.dead,
    });
    if (error) console.error('[push-dispatch] record failed:', error.message);
  }

  // ---- receipts --------------------------------------------------------------
  const { data: due } = await admin.rpc('push_receipts_due', { p_limit: 300 });
  const dueList = (due ?? []) as { ticket: string; token: string }[];
  let receiptsDead = 0;
  if (dueList.length) {
    const res = await postJson(EXPO_RECEIPTS, { ids: dueList.map((d) => d.ticket) });
    const receipts = (res?.data ?? null) as Record<string, { status: string; details?: { error?: string } }> | null;
    if (receipts) {
      const deadTokens = dueList.filter((d) => receipts[d.ticket]?.details?.error === 'DeviceNotRegistered').map((d) => d.token);
      receiptsDead = deadTokens.length;
      await admin.rpc('push_receipts_done', { p_tickets: Object.keys(receipts), p_dead_tokens: deadTokens });
    }
  }

  const summary = { claimed: items.length, sent, retried, skipped, dead_tokens: dead + receiptsDead, receipts_checked: dueList.length };
  console.log('[push-dispatch]', JSON.stringify(summary));
  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } });
});
