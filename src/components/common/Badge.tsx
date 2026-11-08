/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProjectStatus, DeliverableStatus } from '../../types/database';

interface BadgeProps {
  status: ProjectStatus | DeliverableStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<BadgeProps> = ({ status, size = 'sm' }) => {
  const getBadgeStyle = () => {
    switch (status) {
      // Completed / Done
      case 'Completed':
      case 'DONE':
        return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
      
      // In Progress / Confirmed / Scheduled
      case 'In Progress':
      case 'IN PROGRESS':
        return 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
      
      case 'Scheduled':
      case 'Confirmed':
        return 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40';

      // Booking / Pending / Warnings
      case 'Booking':
      case 'PENDING':
        return 'text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';

      // Cancelled
      case 'Cancelled':
        return 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/40';

      // Not applicable / Muted
      case 'NOT APPLICABLE':
      default:
        return 'text-[#536162] bg-[#F3F4ED] dark:bg-[#353935] dark:text-[#9BA39B] border-[#E5E7DC] dark:border-[#353935]';
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'Booking': return 'Booking Baru';
      case 'Confirmed': return 'Terkonfirmasi';
      case 'Scheduled': return 'Terjadwal';
      case 'In Progress': return 'Sedang Berjalan';
      case 'Completed': return 'Selesai';
      case 'Cancelled': return 'Dibatalkan';
      case 'PENDING': return 'Pending';
      case 'IN PROGRESS': return 'Proses';
      case 'DONE': return 'Selesai';
      case 'NOT APPLICABLE': return 'N/A';
      default: return s;
    }
  };

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${padding} ${getBadgeStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      <span>{getStatusLabel(status)}</span>
    </span>
  );
};
