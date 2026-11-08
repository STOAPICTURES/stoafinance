/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Initial Seed Data for STOA PICTURES
 * Database client and projects initialized empty as requested.
 */

import {
  Client,
  Project,
  Payment,
  ProjectExpense,
  TeamMember,
  ProjectDeliverable,
  HistoricalFinancialRecap,
  HistoricalSamuraFee,
  ExpenseCategory
} from '../types/database';

export const INITIAL_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-1', name: 'Shooting', description: 'Honor fotografer utama & liputan hari H', is_active: true, display_order: 1 },
  { id: 'cat-2', name: 'FG 2', description: 'Honor second photographer / asisten kamera', is_active: true, display_order: 2 },
  { id: 'cat-3', name: 'Editor', description: 'Biaya editor foto tone & retoucher', is_active: true, display_order: 3 },
  { id: 'cat-4', name: 'Cetak', description: 'Biaya cetak album kulit, magazine, frame & canvas', is_active: true, display_order: 4 },
  { id: 'cat-5', name: 'Cinema', description: 'Honor videografer, teaser editor & audio engineer', is_active: true, display_order: 5 },
  { id: 'cat-6', name: 'Transport / Akomodasi', description: 'Bensin, tol, tiket pesawat, hotel kru luar kota', is_active: true, display_order: 6 },
  { id: 'cat-7', name: 'Other Expenses', description: 'Flashdisk, harddisk, sewa lensa/lighting khusus', is_active: true, display_order: 7 },
];

// Database tim diinisialisasi kosong sesuai permintaan
export const INITIAL_TEAM_MEMBERS: TeamMember[] = [];

// Empty database client & data project as requested
export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_EXPENSES: ProjectExpense[] = [];
export const INITIAL_DELIVERABLES: ProjectDeliverable[] = [];
export const INITIAL_HISTORICAL_RECAP: HistoricalFinancialRecap[] = [];
export const INITIAL_HISTORICAL_SAMURA_FEES: HistoricalSamuraFee[] = [];
