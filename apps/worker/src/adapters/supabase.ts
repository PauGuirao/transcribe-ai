import type { Env } from '../types';

export async function rpc(env: Env, fn: string, body: Record<string,any>) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Accept':'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`RPC ${fn} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function upsertTranscription(env: Env, row: any) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/transcriptions`, {
    method: 'POST',
    headers: {
      'Content-Type':'application/json','Authorization':`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,'Prefer':'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify([row]),
  });
  if (!res.ok) throw new Error(`Upsert transcriptions ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function update(env: Env, table: string, match: Record<string,string>, values: Record<string,any>) {
  const qs = new URLSearchParams(
    Object.entries(match).map(([k, v]) => [k, `eq.${v}`] as [string, string]),
  );
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${qs}`, {
    method: 'PATCH',
    headers: { 'Content-Type':'application/json','Authorization':`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'apikey': env.SUPABASE_SERVICE_ROLE_KEY,'Prefer':'return=representation' },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error(`Update ${table} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function insertAudio(env: Env, audioRecord: any) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/audios`, {
    method:'POST',
    headers:{ 'Authorization':`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'apikey':env.SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json','Prefer':'return=representation' },
    body: JSON.stringify(audioRecord),
  });
  if (!res.ok) throw new Error(`Insert audios ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function consumeOrgMinutes(env: Env, orgId: string, minutes: number) {
  return rpc(env, 'consume_org_minutes', { p_org_id: orgId, p_minutes: minutes });
}

export async function select(env: Env, table: string, query: Record<string,string>, select='*') {
  const qp = new URLSearchParams([
    ['select', select] as [string, string],
    ...Object.entries(query).map(([k, v]) => [k, `eq.${v}`] as [string, string]),
  ]);
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${qp}`, {
    headers: { 'Authorization':`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'apikey': env.SUPABASE_SERVICE_ROLE_KEY, 'Accept':'application/json' },
  });
  if (!res.ok) throw new Error(`Select ${table} ${res.status}: ${await res.text()}`);
  const data = await res.json(); return Array.isArray(data) ? data[0] ?? null : data;
}
