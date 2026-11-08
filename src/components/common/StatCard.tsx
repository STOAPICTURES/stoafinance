/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  trend
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return 'border-[#C06014]/30 bg-gradient-to-br from-white to-[#FDFBF7] dark:from-[#252825] dark:to-[#2B2824]';
      case 'success':
        return 'border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#252825]';
      case 'warning':
        return 'border-amber-200 dark:border-amber-900/40 bg-white dark:bg-[#252825]';
      case 'danger':
        return 'border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#252825]';
      default:
        return 'border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#252825]';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'accent': return 'text-[#C06014] bg-[#C06014]/10';
      case 'success': return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'warning': return 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400';
      case 'danger': return 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400';
      default: return 'text-[#536162] bg-[#F3F4ED] dark:bg-[#353935] dark:text-[#9BA39B]';
    }
  };

  return (
    <div className={`p-5 rounded-xl border transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${getVariantStyles()}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide uppercase text-[#536162] dark:text-[#9BA39B]">
            {title}
          </p>
          <div className="text-2xl font-bold tracking-tight text-[#424642] dark:text-[#F3F4ED] tabular-nums">
            {value}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg shrink-0 ${getIconColor()}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-2.5 border-t border-[#F3F4ED] dark:border-[#353935] flex items-center justify-between text-xs text-[#536162] dark:text-[#9BA39B]">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <span className={`font-medium ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {trend.value} <span className="text-xs text-[#536162] font-normal">{trend.label}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
