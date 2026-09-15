import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const safeFields = 'id,username,avatar_url,role,ban_type,admin_title,is_private,created_at';
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const freshCode = () => Array.from(crypto.getRandomValues(new Uint8Array(12)))
  .map(byte => alphabet[byte % alphabet.length]).join('');

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const configuredSecrets = Deno.env.get('SUPABASE_SECRET_KEYS');
  let serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (configuredSecrets) {
    try { serviceKey = JSON.parse(configuredSecrets)?.default || serviceKey; } catch { /* Legacy key fallback. */ }
  }
  if (!url || !serviceKey) return json({ error: 'Server configuration missing' }, 500);
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Giriş gerekli.' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Geçersiz oturum.' }, 401);
  const userId = authData.user.id;
  const { data: caller, error: callerError } = await admin.from('profiles')
    .select('id,role,ban_type').eq('id', userId).single();
  if (callerError || !caller) return json({ error: 'Profil bulunamadı.' }, 404);

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return json({ error: 'Geçersiz JSON.' }, 400); }

  if (body.action === 'get_my_profile') {
    const { data, error } = await admin.from('profiles').select('*').eq('id', userId).single();
    return error ? json({ error: 'Profil okunamadı.' }, 500) : json(data);
  }
  if (caller.ban_type === 'full_ban') return json({ error: 'Hesap banlı.' }, 403);

  if (body.action === 'rotate_code') {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = freshCode();
      const { data, error } = await admin.from('profiles').update({ secret_code: code })
        .eq('id', userId).select('secret_code').single();
      if (!error) return json(data);
      if (error.code !== '23505') return json({ error: 'Kod yenilenemedi.' }, 500);
    }
    return json({ error: 'Benzersiz kod üretilemedi.' }, 500);
  }

  if (body.action === 'find_by_code') {
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{12}$/.test(code)) return json({ error: 'Kod 12 karakter olmalı.' }, 400);
    const { data, error } = await admin.from('profiles').select(safeFields)
      .eq('secret_code', code).neq('ban_type', 'full_ban').maybeSingle();
    return error ? json({ error: 'Arama başarısız.' }, 500) : json(data);
  }

  if (body.action === 'set_moderation') {
    if (caller.role !== 'admin' || caller.ban_type !== 'none') return json({ error: 'Admin yetkisi gerekli.' }, 403);
    const targetId = String(body.target_id || '');
    if (!/^[0-9a-f-]{36}$/i.test(targetId) || targetId === userId) return json({ error: 'Geçersiz hedef.' }, 400);
    const patch: Record<string, string | null> = {};
    if (body.ban_type !== undefined) {
      const ban = String(body.ban_type);
      if (!['none', 'full_ban', 'chat_only_ban'].includes(ban)) return json({ error: 'Geçersiz ceza.' }, 400);
      patch.ban_type = ban;
    }
    if (body.admin_title !== undefined) {
      const title = body.admin_title == null ? null : String(body.admin_title).trim();
      if (title && title.length > 30) return json({ error: 'Ünvan çok uzun.' }, 400);
      patch.admin_title = title || null;
    }
    if (!Object.keys(patch).length) return json({ error: 'Güncellenecek alan yok.' }, 400);
    const { data, error } = await admin.from('profiles').update(patch).eq('id', targetId)
      .select(safeFields).single();
    return error ? json({ error: 'Moderasyon güncellenemedi.' }, 500) : json(data);
  }

  return json({ error: 'Bilinmeyen işlem.' }, 400);
});
