/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * STOA FINANCE – PWA Mobile App Install Popup Modal & Trigger Buttons
 * Provides a clean modal popup for installing the app across Android, iOS, and Desktop.
 * Persistent intrusive instruction banners are hidden; all instructions are served via Popup.
 */

import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle2, Smartphone, Sparkles, MonitorSmartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { triggerHaptic } from '../../lib/platform';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'badge' | 'card' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button'
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showInstallPopup, setShowInstallPopup] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running in standalone mode (already installed), hide
  if (isInstalled && !installSuccess) {
    return null;
  }

  const handleOpenPopup = () => {
    triggerHaptic('medium');
    setShowInstallPopup(true);
  };

  const handleDirectInstall = async () => {
    triggerHaptic('medium');
    if (isInstallable) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setShowInstallPopup(false);
      }
    }
  };

  return (
    <>
      {/* 1. Header or Standard Button Variant */}
      {variant === 'button' && (
        <button
          onClick={handleOpenPopup}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
            bg-[#1E201E] text-white hover:bg-[#353935] dark:bg-[#C06014] dark:hover:bg-[#a65210]
            shadow-xs transition-all active:scale-95 border border-white/10
            ${className}
          `}
          title="Buka petunjuk pasang STOA Mobile App"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#C06014] dark:text-white" />
          <span>Pasang App</span>
        </button>
      )}

      {/* 2. Compact Sidebar / Footer Button Variant */}
      {variant === 'compact' && (
        <button
          onClick={handleOpenPopup}
          className={`
            w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium
            text-[#536162] dark:text-[#9BA39B] hover:text-[#424642] dark:hover:text-[#F3F4ED]
            hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors border border-[#E5E7DC] dark:border-[#353935]
            ${className}
          `}
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-[#C06014]" />
            <span>Pasang Mobile App</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C06014]/15 text-[#C06014] font-bold">
            PWA
          </span>
        </button>
      )}

      {/* 3. Card Variant: Replaced with clean popup trigger button (persistent instruction card hidden) */}
      {variant === 'card' && (
        <button
          onClick={handleOpenPopup}
          className={`
            w-full flex items-center justify-between p-2.5 rounded-xl text-xs
            bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]
            hover:border-[#C06014]/50 transition-colors shadow-xs group
            ${className}
          `}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#C06014]/15 text-[#C06014] flex items-center justify-center shrink-0">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-tight">
              <p className="font-bold text-[#424642] dark:text-[#F3F4ED] text-xs group-hover:text-[#C06014] transition-colors">
                STOA Mobile App
              </p>
              <p className="text-[10px] text-[#536162] dark:text-[#9BA39B]">
                Klik untuk pasang di HP/Tablet
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#C06014] text-white font-semibold shadow-xs">
            Pasang
          </span>
        </button>
      )}

      {/* POPUP MODAL: Petunjuk Pasang STOA Mobile App (PWA) */}
      {showInstallPopup && (
        <div className="fixed inset-0 z-50 bg-[#1E201E]/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#252825] rounded-2xl shadow-2xl border border-[#E5E7DC] dark:border-[#353935] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5E7DC] dark:border-[#353935] flex items-center justify-between bg-[#FDFBF7] dark:bg-[#1E201E]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black border border-[#353935] p-0.5 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                  <img
                    src="/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png"
                    alt="STOA PICTURES"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
                    Pasang STOA Mobile App (PWA)
                  </h3>
                  <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                    Akses cepat dan lancar di HP, Tablet, atau Laptop Anda
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallPopup(false)}
                className="p-1.5 rounded-lg text-[#536162] hover:bg-[#F3F4ED] dark:hover:bg-[#353935] dark:text-[#9BA39B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Direct 1-Click Install Button if supported by browser */}
              {isInstallable && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#C06014]/15 to-amber-500/10 border-2 border-[#C06014]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#C06014] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Browser Mendukung 1-Klik Install!</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C06014] text-white font-semibold">
                      Tersedia
                    </span>
                  </div>
                  <button
                    onClick={handleDirectInstall}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#C06014] hover:bg-[#a65210] text-white font-bold text-xs shadow-md shadow-[#C06014]/30 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pasang Aplikasi Sekarang</span>
                  </button>
                </div>
              )}

              {/* OS Guide Tabs */}
              <div>
                <div className="flex items-center bg-[#FDFBF7] dark:bg-[#1E201E] p-1 rounded-xl border border-[#E5E7DC] dark:border-[#353935] mb-3">
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('android')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors text-center ${
                      activeGuideTab === 'android'
                        ? 'bg-[#C06014] text-white shadow-xs'
                        : 'text-[#536162] hover:text-[#424642] dark:text-[#9BA39B]'
                    }`}
                  >
                    Android / Chrome / PC
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuideTab('ios')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors text-center ${
                      activeGuideTab === 'ios'
                        ? 'bg-[#C06014] text-white shadow-xs'
                        : 'text-[#536162] hover:text-[#424642] dark:text-[#9BA39B]'
                    }`}
                  >
                    iPhone & iPad (Safari)
                  </button>
                </div>

                {/* Android / Chrome Instructions */}
                {activeGuideTab === 'android' && (
                  <div className="space-y-3 bg-[#FDFBF7] dark:bg-[#1E201E] p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C06014] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-[#424642] dark:text-[#F3F4ED]">
                          Buka Menu Browser Chrome
                        </p>
                        <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                          Ketuk ikon titik tiga (⋮) di pojok kanan atas browser Google Chrome.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C06014] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-[#424642] dark:text-[#F3F4ED]">
                          Pilih "Install app" atau "Tambahkan ke Layar Utama"
                        </p>
                        <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                          Pilih opsi install pada daftar menu yang muncul.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C06014] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-[#424642] dark:text-[#F3F4ED]">
                          Konfirmasi Pasang
                        </p>
                        <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                          Ketuk tombol <strong>Install</strong>. Ikon STOA FINANCE akan langsung muncul di layar beranda HP Anda layaknya aplikasi Play Store.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* iOS Safari Instructions */}
                {activeGuideTab === 'ios' && (
                  <div className="space-y-3 bg-[#FDFBF7] dark:bg-[#1E201E] p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C06014] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-semibold text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1.5 flex-wrap">
                          Ketuk tombol Share <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-[#252825] border border-gray-200 dark:border-gray-700 font-mono text-[11px]"><Share2 className="w-3 h-3 text-sky-600" /> Share</span>
                        </p>
                        <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                          Terletak di bilah bawah pada layar Safari iPhone.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C06014] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-semibold text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1.5 flex-wrap">
                          Pilih <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-[#252825] border border-gray-200 dark:border-gray-700 font-mono text-[11px]"><PlusSquare className="w-3 h-3 text-[#C06014]" /> Add to Home Screen</span>
                        </p>
                        <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                          Gulir ke bawah pada menu opsi Safari hingga menemukan "Tambah ke Layar Utama".
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-[#C06014] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <p className="font-semibold text-[#424642] dark:text-[#F3F4ED]">
                          Ketuk "Add" di Kanan Atas
                        </p>
                        <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                          Selesai! Aplikasi akan terpasang di Home Screen iPhone tanpa memerlukan App Store.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PWA Key Advantages */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935] text-center space-y-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                  <p className="text-[11px] font-bold text-[#424642] dark:text-[#F3F4ED]">Akses Offline</p>
                  <p className="text-[10px] text-[#536162] dark:text-[#9BA39B]">Tetap bisa dibuka saat sinyal lemah</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935] text-center space-y-1">
                  <MonitorSmartphone className="w-4 h-4 text-[#C06014] mx-auto" />
                  <p className="text-[11px] font-bold text-[#424642] dark:text-[#F3F4ED]">Layar Penuh</p>
                  <p className="text-[10px] text-[#536162] dark:text-[#9BA39B]">Bebas gangguan bilah browser</p>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FDFBF7] dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935] text-center space-y-1">
                  <Sparkles className="w-4 h-4 text-amber-500 mx-auto" />
                  <p className="text-[11px] font-bold text-[#424642] dark:text-[#F3F4ED]">Sync Supabase</p>
                  <p className="text-[10px] text-[#536162] dark:text-[#9BA39B]">Otomatis sinkron ke cloud</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FDFBF7] dark:bg-[#1E201E] border-t border-[#E5E7DC] dark:border-[#353935] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowInstallPopup(false)}
                className="px-4 py-2 rounded-xl bg-[#424642] dark:bg-[#353935] hover:bg-[#536162] text-white text-xs font-semibold transition-colors"
              >
                Tutup Popup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
