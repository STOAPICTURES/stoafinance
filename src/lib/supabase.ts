/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Supabase Client Configuration & Live Connection Manager
 * Pre-configured for STOA PICTURES (Project: Pembukuan Stoa Pictures)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Pre-configured credentials for STOA PICTURES (Project: STOA FINANCE)
export const DEFAULT_SUPABASE_PROJECT_NAME = 'STOA FINANCE';
export const DEFAULT_SUPABASE_PROJECT_ID = 'xdxhylnmbzqqsjccujyo';
export const DEFAULT_SUPABASE_URL = 'https://xdxhylnmbzqqsjccujyo.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeGh5bG5tYnpxcXNqY2N1anlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MTcxMjcsImV4cCI6MjEwOTI5MzEyN30.LD0Q7uRGJN6o_otEk-_ye71nmBhXN-wD1I7SqXIsmW0';
export const DEFAULT_SUPABASE_PUBLIC_KEY = 'sb_publishable_Eh9jlfwxALYBWa9BL7xqgQ_J2aMkdK1';

// Local storage key for runtime configured credentials (if not injected via env)
const STORAGE_KEY_URL = 'stoa_supabase_url';
const STORAGE_KEY_ANON = 'stoa_supabase_anon_key';

/**
 * Normalizes Supabase URL by stripping trailing slashes or /rest/v1/ suffix
 * (Prevents double path appending like /rest/v1//rest/v1/)
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let clean = rawUrl.trim();
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');
  // Strip trailing /rest/v1 or /rest/v1/
  clean = clean.replace(/\/rest\/v1\/?$/, '');
  return clean;
}

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  let storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  let storedAnonKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) : null;

  // Clear legacy dead project if stored in localStorage
  if (storedUrl && storedUrl.includes('dbzlpcdjicuvofvxcofp')) {
    storedUrl = null;
    storedAnonKey = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_URL);
      localStorage.removeItem(STORAGE_KEY_ANON);
    }
  }

  const resolvedUrl = envUrl || storedUrl || DEFAULT_SUPABASE_URL;
  const resolvedKey = envAnonKey || storedAnonKey || DEFAULT_SUPABASE_ANON_KEY;

  return {
    url: normalizeSupabaseUrl(resolvedUrl),
    anonKey: (resolvedKey || '').trim()
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    const cleanUrl = normalizeSupabaseUrl(url);
    localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
    // Invalidate cached client
    cachedClient = null;
  }
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
    cachedClient = null;
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (!cachedClient) {
    try {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        }
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  const config = getStoredSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string; code?: string }> {
  const rawUrl = url || getStoredSupabaseConfig().url;
  const rawKey = anonKey || getStoredSupabaseConfig().anonKey;
  const testUrl = normalizeSupabaseUrl(rawUrl);
  const testKey = (rawKey || '').trim();

  if (!testUrl || !testKey) {
    return {
      success: false,
      message: 'Supabase URL dan Anon Key belum dikonfigurasi.'
    };
  }

  try {
    const client = createClient(testUrl, testKey);
    // Ping to check if Supabase REST endpoint responds
    const { error } = await client.from('app_settings').select('key').limit(1);
    
    if (error) {
      // 42P01: Postgres table does not exist
      // PGRST205: PostgREST table not found in schema cache
      if (error.code === '42P01' || error.code === 'PGRST205') {
        return {
          success: true,
          code: 'TABLES_NEED_SETUP',
          message: 'Tersambung ke Supabase! (Catatan: Tabel database belum dibuat. Silakan jalankan script SQL Schema di Supabase SQL Editor).'
        };
      }
      return {
        success: false,
        message: `Koneksi Supabase gagal: ${error.message} (${error.code || 'ERR'})`
      };
    }

    return {
      success: true,
      message: 'Koneksi ke database Supabase aktif dan berhasil!'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal terhubung: ${err?.message || 'Periksa URL dan kunci koneksi.'}`
    };
  }
}
