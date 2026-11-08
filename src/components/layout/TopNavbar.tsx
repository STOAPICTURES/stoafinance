/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, Plus, RefreshCw, Moon, Sun, Calendar, LogOut } from 'lucide-react';
import { NavItemKey } from './Sidebar';
import { ID_MONTHS_SHORT } from '../../lib/formatters';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface TopNavbarProps {
  activeTab: NavItemKey;
  onOpenMobileSidebar: () => void;
  selectedYear: number | 'all';
  onChangeYear?: (year: number | 'all') => void;
  selectedMonth: number | 'all';
  onChangeMonth?: (month: number | 'all') => void;
  onQuickAddProject: () => void;
  onSyncSupabase: () => void;
  isSyncing?: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onOpenMobileSidebar,
  selectedYear,
  selectedMonth,
  onQuickAddProject,
  onSyncSupabase,
  isSyncing = false,
  isDarkMode,
  onToggleDarkMode,
  onLogout
}) => {
  const getTabTitle = (tab: NavItemKey) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Ringkasan Keuangan';
      case 'projects': return 'Data & Manajemen Proyek';
      case 'invoices': return 'Manajemen Invoice Booking STOA';
      case 'bookkeeping': return 'Jurnal Pembukuan Terpadu';
      case 'payments': return 'Pembayaran Client (Kas Masuk)';
      case 'expenses': return 'Pengeluaran Biaya Produksi';
      case 'pending': return 'Monitoring Pending Deliverables';
      case 'clients': return 'Database Klien & Riwayat';
      case 'team': return 'Database Kru & Vendor Produksi';
      case 'recap': return 'Rekap Keuangan Multi-Tahun';
      case 'reports': return 'Laporan Keuangan & Cetak PDF';
      case 'import': return 'Import Excel & Migrasi Data';
      case 'settings': return 'Pengaturan Sistem & Database';
      case 'calendar': return 'Kalender Booking & Jadwal Acara';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#1E201E]/95 backdrop-blur-md border-b border-[#E5E7DC] dark:border-[#353935] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Zone 1: Mobile toggle, Brand Logo & Breadcrumb Title */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-xl text-[#536162] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] lg:hidden transition-colors"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 rounded-xl bg-black border border-[#353935] p-0.5 flex items-center justify-center shrink-0 lg:hidden shadow-xs overflow-hidden">
          <img
            src="/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png"
            alt="STOA"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-[#424642] dark:text-[#F3F4ED] tracking-tight truncate">
            {getTabTitle(activeTab)}
          </h2>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#536162] dark:text-[#9BA39B] truncate">
            <span className="font-semibold text-[#C06014]">STOA PICTURES</span>
            <span>·</span>
            <span>Pematang Siantar</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-[#F3F4ED] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935] font-mono text-[10px] font-semibold">
              <Calendar className="w-2.5 h-2.5 text-[#C06014]" />
              {selectedYear === 'all' ? 'Semua Thn' : selectedYear} {selectedMonth !== 'all' ? `· ${ID_MONTHS_SHORT[selectedMonth - 1]}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Zone 2: Neatly Organized Action Buttons & Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Sync Supabase Cloud */}
        <button
          onClick={onSyncSupabase}
          disabled={isSyncing}
          title="Sinkronisasi Data ke Supabase Cloud"
          className="px-2.5 py-1.5 text-xs font-semibold text-[#536162] hover:text-[#424642] dark:text-[#9BA39B] dark:hover:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] rounded-xl transition-colors border border-[#E5E7DC] dark:border-[#353935] flex items-center gap-1.5 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#C06014]' : 'text-[#C06014]'}`} />
          <span className="hidden md:inline text-xs">Sync Cloud</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          title={isDarkMode ? 'Beralih ke Tema Terang' : 'Beralih ke Tema Gelap'}
          className="p-2 text-[#536162] hover:text-[#424642] dark:text-[#9BA39B] dark:hover:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] rounded-xl transition-colors border border-[#E5E7DC] dark:border-[#353935] shadow-2xs"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[#536162]" />}
        </button>

        {/* Primary CTA: New Project Button */}
        <button
          onClick={onQuickAddProject}
          className="px-3 py-1.5 text-xs font-bold text-white bg-[#C06014] hover:bg-[#a65210] rounded-xl transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Project</span>
        </button>

        {/* User Profile & Logout */}
        {onLogout && (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#E5E7DC] dark:border-[#353935]">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
              <div className="w-6 h-6 rounded-lg bg-[#C06014] text-white flex items-center justify-center font-bold text-[11px] shadow-xs">
                BA
              </div>
              <div className="text-left leading-tight">
                <span className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED] block">Budi Anto</span>
                <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] block">Studio Lead</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Keluar dari Akun (Logout)"
              className="p-2 text-[#536162] hover:text-rose-600 dark:text-[#9BA39B] dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors border border-[#E5E7DC] dark:border-[#353935]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
