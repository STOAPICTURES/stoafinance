/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * STOA FINANCE – Login Gate / Initial Authentication Screen
 * Clean, production-grade login screen for STOA PICTURES management system.
 * NOTE: Credentials are not exposed or displayed in text.
 */

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { authService, AuthUser } from '../../services/authService';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // Initial states must start completely empty (NO pre-filled credentials)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Silakan masukkan alamat email Anda.');
      return;
    }
    if (!password) {
      setErrorMessage('Silakan masukkan password akun Anda.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.login(email, password, rememberMe);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Email atau password yang Anda masukkan tidak sesuai.');
      }
    } catch (err) {
      setErrorMessage('Terjadi kesalahan koneksi. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#1A1C1A] text-[#F3F4ED] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background Decorative Ambience */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#C06014]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-black border border-[#353935] p-1 shadow-2xl shadow-black/60 mx-auto overflow-hidden">
            <img
              src="/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png"
              alt="STOA PICTURES"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
              STOA FINANCE
            </h1>
            <p className="text-xs sm:text-sm text-[#9BA39B]">
              Sistem Pembukuan & Manajemen Proyek Stoa Pictures
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C06014]/20 border border-[#C06014]/40 text-[#C06014] text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C06014] animate-pulse" />
              <span>Portal Masuk Resmi</span>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[#252825] border border-[#353935] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 backdrop-blur-md">
          <div className="border-b border-[#353935] pb-3">
            <h2 className="text-base font-bold text-white tracking-wide">
              Masuk ke Aplikasi
            </h2>
            <p className="text-xs text-[#9BA39B] mt-0.5">
              Silakan masukkan kredensial akun administrator Anda untuk melanjutkan.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#F3F4ED]">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9BA39B]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  autoComplete="email"
                  autoFocus
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-[#353935] bg-[#1E201E] text-white placeholder-[#536162] focus:outline-hidden focus:ring-2 focus:ring-[#C06014] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#F3F4ED]">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9BA39B]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-[#353935] bg-[#1E201E] text-white placeholder-[#536162] focus:outline-hidden focus:ring-2 focus:ring-[#C06014] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#9BA39B] hover:text-white transition-colors"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[#9BA39B] hover:text-[#F3F4ED] transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-[#353935] bg-[#1E201E] text-[#C06014] focus:ring-1 focus:ring-[#C06014] accent-[#C06014]"
                />
                <span>Ingat Sesi Saya</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#C06014] hover:bg-[#a65210] disabled:bg-[#C06014]/50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#C06014]/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[#9BA39B]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Koneksi Aman & Terproteksi Database Supabase</span>
          </div>
        </div>

        {/* Studio Address Footer */}
        <div className="text-center text-[11px] text-[#536162] space-y-1">
          <p className="font-semibold text-[#9BA39B]">STOA PICTURES OFFICIAL</p>
          <p>Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar, Sumatera Utara 21113</p>
        </div>
      </div>
    </div>
  );
};
