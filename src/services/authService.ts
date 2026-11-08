/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * STOA FINANCE – Authentication Service
 * Manages user login, credential verification, and persistent session management.
 * Authorized user: Budi Anto (budi15139@gmail.com)
 */

import { getSupabase } from '../lib/supabase';

export interface AuthUser {
  email: string;
  name: string;
  role: string;
  avatar?: string;
  loggedInAt: number;
}

const AUTH_STORAGE_KEY = 'stoa_auth_user_session';

// Authorized master credentials
const MASTER_EMAIL = 'budi15139@gmail.com';
const MASTER_PASSWORD = '123123';
const MASTER_USER_NAME = 'Budi Anto';
const MASTER_USER_ROLE = 'Owner & Studio Lead';

class AuthService {
  private currentUser: AuthUser | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthUser;
        if (parsed && parsed.email) {
          this.currentUser = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse auth session:', e);
      this.currentUser = null;
    }
  }

  public getCurrentUser(): AuthUser | null {
    if (!this.currentUser && typeof window !== 'undefined') {
      this.loadSession();
    }
    return this.currentUser;
  }

  public isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  public async login(
    emailInput: string,
    passwordInput: string,
    remember: boolean = true
  ): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Silakan isi email dan password terlebih dahulu.' };
    }

    // Try Supabase auth if client available
    const supabase = getSupabase();
    let supabaseSuccess = false;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword
        });

        if (!error && data?.user) {
          supabaseSuccess = true;
        }
      } catch {
        // Fallback to credential check
      }
    }

    // Verify against authorized master credentials or successful Supabase auth
    const isMasterCredential =
      cleanEmail === MASTER_EMAIL.toLowerCase() && cleanPassword === MASTER_PASSWORD;

    if (isMasterCredential || supabaseSuccess) {
      const user: AuthUser = {
        email: cleanEmail,
        name: MASTER_USER_NAME,
        role: MASTER_USER_ROLE,
        loggedInAt: Date.now()
      };

      this.currentUser = user;

      if (remember && typeof window !== 'undefined') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      }

      this.notifyListeners();
      return { success: true, user };
    }

    return {
      success: false,
      error: 'Email atau password yang Anda masukkan salah. Silakan coba kembali.'
    };
  }

  public async logout(): Promise<void> {
    this.currentUser = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }

    this.notifyListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('Error in auth listener:', e);
      }
    });
  }
}

export const authService = new AuthService();
