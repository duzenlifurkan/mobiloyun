import { File } from 'expo-file-system';
import { backendConfigured, supabase } from './supabase';

const requireClient = () => {
  if (!backendConfigured || !supabase) throw new Error('Supabase URL ve publishable key ayarlanmamış.');
  return supabase;
};
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const currentUserId = async () => {
  const { data, error } = await requireClient().auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Bu işlem için giriş yapmalısın.');
  return data.user.id;
};
const edge = async (action, payload = {}) => {
  const { data, error } = await requireClient().functions.invoke('profile-api', { body: { action, ...payload } });
  if (error?.context?.status === 404) {
    throw new Error('profile-api Edge Function bulunamadı. SUPABASE_SETUP.md içindeki deploy adımını tamamlayın.');
  }
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

export const authService = {
  signUp: (email, password, username) => requireClient().auth.signUp({
    email: email.trim(), password, options: { data: { username: username.trim() } },
  }).then(unwrap),
  signIn: (email, password) => requireClient().auth.signInWithPassword({ email: email.trim(), password }).then(unwrap),
  signOut: () => requireClient().auth.signOut().then(unwrap),
  getSession: () => requireClient().auth.getSession().then(({ data, error }) => { if (error) throw error; return data.session; }),
  onAuthStateChange: callback => requireClient().auth.onAuthStateChange((_event, session) => callback(session)).data.subscription,
};

export const profileService = {
  getMine: () => edge('get_my_profile'),
  rotateCode: () => edge('rotate_code'),
  findByCode: code => edge('find_by_code', { code: code.trim().toUpperCase() }),
  listVisible: () => requireClient().from('profiles')
    .select('id,username,avatar_url,role,ban_type,admin_title,is_private,created_at')
    .neq('ban_type', 'full_ban').order('created_at', { ascending: false }).then(unwrap),
  listFalci: () => requireClient().from('profiles')
    .select('id,username,avatar_url,admin_title').eq('role', 'falci').eq('ban_type', 'none').then(unwrap),
  updateMine: async patch => {
    const allowed = {};
    for (const field of ['username', 'avatar_url', 'is_private']) {
      if (Object.prototype.hasOwnProperty.call(patch, field)) allowed[field] = patch[field];
    }
    if (!Object.keys(allowed).length) throw new Error('Güncellenecek alan yok.');
    const id = await currentUserId();
    return unwrap(await requireClient().from('profiles').update(allowed).eq('id', id)
      .select('id,username,avatar_url,role,ban_type,admin_title,is_private').single());
  },
  setAvatar: async uri => {
    const path = await uploadImage(uri, 'avatars');
    const { data } = requireClient().storage.from('avatars').getPublicUrl(path);
    try { return await profileService.updateMine({ avatar_url: data.publicUrl }); }
    catch (error) {
      await requireClient().storage.from('avatars').remove([path]);
      throw error;
    }
  },
};

const imageType = uri => {
  const lower = uri.toLowerCase().split('?')[0];
  if (lower.endsWith('.png')) return { ext: 'png', type: 'image/png' };
  if (lower.endsWith('.webp')) return { ext: 'webp', type: 'image/webp' };
  return { ext: 'jpg', type: 'image/jpeg' };
};

export async function uploadImage(uri, bucket) {
  if (!uri || typeof uri !== 'string') throw new Error('Fotoğraf URI gerekli.');
  if (!['story-media', 'coffee-photos', 'avatars'].includes(bucket)) throw new Error('Geçersiz görsel kovası.');
  const id = await currentUserId();
  const response = uri.startsWith('http') ? await fetch(uri) : null;
  if (response && !response.ok) throw new Error('Örnek fotoğraf indirilemedi.');
  const bytes = response ? await response.arrayBuffer() : await new File(uri).arrayBuffer();
  const { ext, type } = imageType(uri);
  const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  unwrap(await requireClient().storage.from(bucket).upload(path, bytes, { contentType: type, upsert: false }));
  return path;
}

export async function signedImageUrl(bucket, path, expiresIn = 3600) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const data = unwrap(await requireClient().storage.from(bucket).createSignedUrl(path, expiresIn));
  return data.signedUrl;
}

export const storyService = {
  list: async () => {
    const rows = unwrap(await requireClient().from('stories')
      .select('id,user_id,image_url,caption,created_at').order('created_at', { ascending: false }));
    return Promise.all(rows.map(async row => ({
      ...row, display_url: await signedImageUrl('story-media', row.image_url),
    })));
  },
  create: async ({ imageUri = null, caption = null }) => {
    if (!imageUri && !caption?.trim()) throw new Error('Story için fotoğraf veya metin gerekli.');
    const id = await currentUserId();
    let path = null;
    let inserted = false;
    try {
      if (imageUri) path = await uploadImage(imageUri, 'story-media');
      const row = unwrap(await requireClient().from('stories')
        .insert({ user_id: id, image_url: path, caption: caption?.trim() || null })
        .select('id,user_id,image_url,caption,created_at').single());
      inserted = true;
      return { ...row, display_url: await signedImageUrl('story-media', row.image_url) };
    } catch (error) {
      if (path && !inserted) await requireClient().storage.from('story-media').remove([path]).catch(() => {});
      throw error;
    }
  },
  remove: async id => {
    const client = requireClient();
    const row = unwrap(await client.from('stories').select('image_url').eq('id', id).single());
    unwrap(await client.from('stories').delete().eq('id', id));
    if (row.image_url && !row.image_url.startsWith('http')) await client.storage.from('story-media').remove([row.image_url]);
  },
  listReplies: storyId => requireClient().from('story_replies')
    .select('id,story_id,sender_id,message,created_at').eq('story_id', storyId)
    .order('created_at', { ascending: true }).then(unwrap),
  reply: async (storyId, message) => {
    const sender = await currentUserId();
    return unwrap(await requireClient().from('story_replies')
      .insert({ story_id: storyId, sender_id: sender, message: message.trim() })
      .select('id,story_id,sender_id,message,created_at').single());
  },
};

export const coffeeService = {
  create: async ({ photoUris, falciId = null, expertStyle = null }) => {
    if (!Array.isArray(photoUris) || photoUris.length !== 8 || new Set(photoUris).size !== 8 || photoUris.some(uri => !uri)) {
      throw new Error('Kahve falı için 8 farklı fotoğraf gerekli.');
    }
    const userId = await currentUserId();
    const paths = [];
    let inserted = false;
    try {
      for (const uri of photoUris) paths.push(await uploadImage(uri, 'coffee-photos'));
      const row = unwrap(await requireClient().from('coffee_fal_requests').insert({
        user_id: userId, falci_id: falciId, '8_photos_array': paths,
        expert_style: expertStyle, status: 'queued',
      }).select('id,user_id,falci_id,8_photos_array,expert_style,status,result_text,created_at').single());
      inserted = true;
      return row;
    } catch (error) {
      if (paths.length && !inserted) await requireClient().storage.from('coffee-photos').remove(paths).catch(() => {});
      throw error;
    }
  },
  listMine: async () => {
    const userId = await currentUserId();
    return unwrap(await requireClient().from('coffee_fal_requests')
      .select('id,user_id,falci_id,8_photos_array,expert_style,status,result_text,created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }));
  },
  listAssigned: () => requireClient().from('coffee_fal_requests')
    .select('id,user_id,falci_id,8_photos_array,expert_style,status,result_text,created_at')
    .order('created_at', { ascending: false }).then(unwrap),
  photoUrl: path => signedImageUrl('coffee-photos', path, 600),
  complete: (id, resultText) => requireClient().from('coffee_fal_requests')
    .update({ status: 'completed', result_text: resultText.trim() }).eq('id', id)
    .select('id,status,result_text').single().then(unwrap),
};

export const adminService = {
  listProfiles: () => requireClient().from('profiles')
    .select('id,username,avatar_url,role,ban_type,admin_title,is_private,created_at')
    .order('created_at', { ascending: false }).then(unwrap),
  updateModeration: (profileId, { banType, adminTitle }) => edge('set_moderation', {
    target_id: profileId, ban_type: banType, admin_title: adminTitle,
  }),
};
