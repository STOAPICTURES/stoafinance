/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Accessible, lightweight popup action menu for table rows and cards
 */

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'accent' | 'emerald';
  badge?: string;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: 'right' | 'left';
  triggerAriaLabel?: string;
  triggerClassName?: string;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  items,
  align = 'right',
  triggerAriaLabel = 'Buka menu tindakan',
  triggerClassName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={triggerAriaLabel}
        className={triggerClassName || `
          p-1.5 rounded-lg text-[#536162] hover:text-[#424642] dark:hover:text-[#F3F4ED]
          hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors focus:outline-none
          focus:ring-2 focus:ring-[#C06014]/40
        `}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className={`
            absolute z-50 mt-1 w-52 rounded-xl bg-white dark:bg-[#1E201E]
            border border-[#E5E7DC] dark:border-[#353935] shadow-xl py-1.5
            animate-in fade-in zoom-in-95 duration-100
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
          role="menu"
          aria-orientation="vertical"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isDanger = item.variant === 'danger';
            const isEmerald = item.variant === 'emerald';
            const isAccent = item.variant === 'accent';

            return (
              <React.Fragment key={item.key || idx}>
                {idx > 0 && isDanger && (
                  <div className="my-1 border-t border-[#E5E7DC] dark:border-[#353935]" />
                )}
                <button
                  type="button"
                  disabled={item.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    item.onClick();
                  }}
                  role="menuitem"
                  className={`
                    w-full text-left px-3.5 py-2 text-xs font-medium flex items-center justify-between
                    transition-colors group disabled:opacity-50 disabled:cursor-not-allowed
                    ${isDanger
                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      : isEmerald
                      ? 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                      : isAccent
                      ? 'text-[#C06014] hover:bg-[#C06014]/10'
                      : 'text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825]'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {Icon && (
                      <Icon className={`
                        w-4 h-4 shrink-0 transition-transform group-hover:scale-110
                        ${isDanger
                          ? 'text-rose-500'
                          : isEmerald
                          ? 'text-emerald-600'
                          : isAccent
                          ? 'text-[#C06014]'
                          : 'text-[#536162] dark:text-[#9BA39B]'
                        }
                      `} />
                    )}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C06014]/10 text-[#C06014] font-semibold shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
