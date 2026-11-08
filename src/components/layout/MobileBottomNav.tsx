/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  ReceiptText,
  Menu,
  Plus
} from 'lucide-react';
import { NavItemKey } from './Sidebar';
import { triggerHaptic } from '../../lib/platform';

interface MobileBottomNavProps {
  activeTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  onOpenSidebar: () => void;
  onQuickAdd: () => void;
  activeProjectsCount?: number;
  pendingDeliverablesCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenSidebar,
  onQuickAdd,
  activeProjectsCount = 0,
  pendingDeliverablesCount = 0
}) => {
  const handleTabClick = (tab: NavItemKey) => {
    triggerHaptic('light');
    onSelectTab(tab);
  };

  const handleQuickAddClick = () => {
    triggerHaptic('medium');
    onQuickAdd();
  };

  const handleOpenMenu = () => {
    triggerHaptic('light');
    onOpenSidebar();
  };

  // Check if current tab is one of the secondary tabs opened via menu
  const isMenuTabActive = ['invoices', 'bookkeeping', 'payments', 'pending', 'clients', 'team', 'recap', 'reports', 'import', 'settings', 'calendar'].includes(activeTab);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#1E201E]/95 backdrop-blur-lg border-t border-[#E5E7DC] dark:border-[#353935] px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {/* 1. Dashboard */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`
            flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px]
            ${activeTab === 'dashboard'
              ? 'text-[#C06014] font-bold'
              : 'text-[#536162] dark:text-[#9BA39B] hover:text-[#424642]'
            }
          `}
        >
          <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Beranda</span>
        </button>

        {/* 2. Projects */}
        <button
          onClick={() => handleTabClick('projects')}
          className={`
            relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px]
            ${activeTab === 'projects'
              ? 'text-[#C06014] font-bold'
              : 'text-[#536162] dark:text-[#9BA39B] hover:text-[#424642]'
            }
          `}
        >
          <div className="relative">
            <FolderKanban className={`w-5 h-5 ${activeTab === 'projects' ? 'stroke-[2.5]' : ''}`} />
            {activeProjectsCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-[#C06014] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {activeProjectsCount > 9 ? '9+' : activeProjectsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Proyek</span>
        </button>

        {/* 3. Center CTA: Floating Quick Add Project */}
        <div className="flex items-center justify-center -mt-5">
          <button
            onClick={handleQuickAddClick}
            className="w-12 h-12 rounded-full bg-[#C06014] hover:bg-[#a65210] active:scale-95 text-white flex items-center justify-center shadow-lg shadow-[#C06014]/30 border-2 border-white dark:border-[#1E201E] transition-transform"
            aria-label="New Project"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Expenses */}
        <button
          onClick={() => handleTabClick('expenses')}
          className={`
            flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px]
            ${activeTab === 'expenses'
              ? 'text-[#C06014] font-bold'
              : 'text-[#536162] dark:text-[#9BA39B] hover:text-[#424642]'
            }
          `}
        >
          <ReceiptText className={`w-5 h-5 ${activeTab === 'expenses' ? 'stroke-[2.5]' : ''}`} />
          <span className="text-[10px] mt-0.5 tracking-tight">Biaya</span>
        </button>

        {/* 5. Menu Drawer */}
        <button
          onClick={handleOpenMenu}
          className={`
            relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[44px]
            ${isMenuTabActive
              ? 'text-[#C06014] font-bold'
              : 'text-[#536162] dark:text-[#9BA39B] hover:text-[#424642]'
            }
          `}
        >
          <div className="relative">
            <Menu className={`w-5 h-5 ${isMenuTabActive ? 'stroke-[2.5]' : ''}`} />
            {pendingDeliverablesCount > 0 && (
              <span className="absolute -top-1 -right-2 w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
        </button>
      </div>
    </div>
  );
};
