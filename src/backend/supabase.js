import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

const validateConfig = () => {
  if (!url && !key) return null;
  if (!url || !key) return 'Supabase URL ve publishable key birlikte ayarlanmalı.';
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.host || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return 'Supabase URL proje kök adresi olmalı; /rest/v1/ veya /auth/v1/ eklemeyin.';
    }
  } catch {
    return 'Supabase URL geçersiz. Dashboard üzerindeki Project URL değerini kullanın.';
  }
  return null;
};

export const backendConfigError = validateConfig();
export const backendConfigured = Boolean(url && key && !backendConfigError);
export const supabase = backendConfigured
  ? createClient(url, key, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
