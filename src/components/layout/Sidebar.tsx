/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  BookOpenCheck,
  CreditCard,
  ReceiptText,
  Clock,
  Users,
  UserCheck,
  TrendingUp,
  Percent,
  FileSpreadsheet,
  FileUp,
  Settings,
  Database,
  Camera,
  X,
  LogOut,
  CalendarDays,
  FileText
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { Project } from '../../types/database';
import { SidebarBookingCalendar } from '../calendar/SidebarBookingCalendar';

export type NavItemKey =
  | 'dashboard'
  | 'projects'
  | 'invoices'
  | 'bookkeeping'
  | 'payments'
  | 'expenses'
  | 'pending'
  | 'clients'
  | 'team'
  | 'recap'
  | 'reports'
  | 'import'
  | 'settings'
  | 'calendar';

interface SidebarProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  pendingDeliverablesCount?: number;
  activeProjectsCount?: number;
  onLogout?: () => void;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
  onQuickAddProjectDate?: (dateStr: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
  pendingDeliverablesCount = 0,
  activeProjectsCount = 0,
  onLogout,
  projects = [],
  onSelectProject,
  onQuickAddProjectDate
}) => {
  const isConnected = isSupabaseConfigured();

  const navItems = [
    { key: 'dashboard' as NavItemKey, label: 'Dashboard', icon: LayoutDashboard },
    { key: 'projects' as NavItemKey, label: 'Data Project', icon: FolderKanban, badge: activeProjectsCount > 0 ? String(activeProjectsCount) : undefined },
    { key: 'invoices' as NavItemKey, label: 'Invoice Booking', icon: FileText },
    { key: 'bookkeeping' as NavItemKey, label: 'Pembukuan', icon: BookOpenCheck },
    { key: 'payments' as NavItemKey, label: 'Pembayaran Client', icon: CreditCard },
    { key: 'expenses' as NavItemKey, label: 'Pengeluaran', icon: ReceiptText },
    { key: 'pending' as NavItemKey, label: 'Monitoring Pending', icon: Clock, badge: pendingDeliverablesCount > 0 ? String(pendingDeliverablesCount) : undefined, badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
    { key: 'clients' as NavItemKey, label: 'Database Client', icon: Users },
    { key: 'team' as NavItemKey, label: 'Database Tim', icon: UserCheck },
    { key: 'recap' as NavItemKey, label: 'Rekap Keuangan', icon: TrendingUp },
    { key: 'reports' as NavItemKey, label: 'Laporan', icon: FileSpreadsheet },
    { key: 'import' as NavItemKey, label: 'Import Excel', icon: FileUp },
    { key: 'settings' as NavItemKey, label: 'Pengaturan', icon: Settings },
    { key: 'calendar' as NavItemKey, label: 'Kalender Booking', icon: CalendarDays },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#424642]/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#1E201E] border-r border-[#E5E7DC] dark:border-[#353935] flex flex-col transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-[#E5E7DC] dark:border-[#353935]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-black border border-[#353935] p-0.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img
                src="/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png"
                alt="STOA PICTURES"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-serif font-bold text-base text-[#424642] dark:text-[#F3F4ED] tracking-wide truncate">
                STOA FINANCE
              </h1>
              <p className="text-[10px] tracking-wider uppercase font-semibold text-[#C06014] truncate">
                Stoa Pictures Official
              </p>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-[#536162] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] lg:hidden shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company Subtitle */}
        <div className="px-5 py-2.5 bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935] flex items-center justify-between text-xs text-[#536162] dark:text-[#9BA39B]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-medium text-[#424642] dark:text-[#F3F4ED] truncate">Pematang Siantar</span>
          </div>
          <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] shrink-0 font-mono">2022–2026</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelectTab(item.key);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group
                  ${isActive
                    ? 'bg-[#C06014] text-white shadow-xs font-semibold'
                    : 'text-[#536162] dark:text-[#9BA39B] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] hover:text-[#424642] dark:hover:text-[#F3F4ED]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-[#536162] dark:text-[#9BA39B] group-hover:text-[#424642] dark:group-hover:text-[#F3F4ED]'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : (item.badgeColor || 'bg-[#F3F4ED] dark:bg-[#353935] text-[#424642] dark:text-[#F3F4ED]')}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Interactive Booking Calendar widget below menu Pengaturan */}
          <div className="pt-3 mt-2 border-t border-[#E5E7DC] dark:border-[#353935]">
            <SidebarBookingCalendar
              projects={projects}
              onSelectProject={(proj) => {
                if (onSelectProject) onSelectProject(proj);
                onCloseMobile();
              }}
              onOpenFullCalendar={() => {
                onSelectTab('calendar');
                onCloseMobile();
              }}
              onQuickAddProjectDate={(dateStr) => {
                if (onQuickAddProjectDate) onQuickAddProjectDate(dateStr);
                onCloseMobile();
              }}
            />
          </div>
        </nav>

        {/* PWA Mobile App Popup Trigger Button (Compact, non-intrusive) */}
        <div className="px-3 pt-1">
          <PWAInstallButton variant="compact" />
        </div>

        {/* User Profile & Supabase Footer */}
        <div className="p-3 border-t border-[#E5E7DC] dark:border-[#353935] space-y-2">
          {/* Active Admin Profile Card with Logout */}
          <div className="p-2 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935] flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#C06014] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                BA
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED] truncate">
                  Budi Anto
                </p>
                <p className="text-[10px] text-[#536162] dark:text-[#9BA39B] truncate">
                  Owner & Studio Lead
                </p>
              </div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Keluar dari Akun (Logout)"
                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 dark:text-rose-400 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Supabase Connection Status */}
          <button
            onClick={() => onSelectTab('settings')}
            className="w-full p-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] hover:border-[#C06014]/40 transition-colors flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Database className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
              <div className="text-[11px] leading-tight">
                <p className="font-semibold text-[#424642] dark:text-[#F3F4ED]">
                  {isConnected ? 'Supabase Terhubung' : 'Supabase Config'}
                </p>
                <p className="text-[#536162] dark:text-[#9BA39B] text-[10px]">
                  {isConnected ? 'PostgreSQL Live RLS' : 'Koneksi Siap Disetel'}
                </p>
              </div>
            </div>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </button>
        </div>
      </aside>
    </>
  );
};
