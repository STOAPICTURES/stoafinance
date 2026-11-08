/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Indonesian Formatting Utilities & Financial Math
 */

import { Payment, Project, ProjectExpense } from '../types/database';

export const ID_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const ID_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Format currency in Indonesian Rupiah (Rp)
 */
export function formatIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('IDR', 'Rp').trim();
}

export const formatCurrencyIDR = formatIDR;

/**
 * Format date in Indonesian format: DD MMMM YYYY (e.g. 24 Oktober 2024)
 */
export function formatDateID(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // fallback to original text
    const day = date.getDate();
    const month = ID_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString || '-';
  }
}

export const formatDateIndonesian = formatDateID;

/**
 * Format short date: DD MMM YYYY
 */
export function formatShortDateID(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = date.getDate();
    const month = ID_MONTHS_SHORT[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString || '-';
  }
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value}%`;
}

/**
 * Extract Indonesian month name category from a date string (e.g. "2026-10-18" -> "Oktober")
 */
export function getMonthCategoryFromDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Belum Ditentukan';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Belum Ditentukan';
    return ID_MONTHS[date.getMonth()] || 'Belum Ditentukan';
  } catch {
    return 'Belum Ditentukan';
  }
}

/**
 * Extract Month + Year label (e.g. "2026-10-18" -> "Oktober 2026")
 */
export function getMonthYearCategoryFromDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Belum Ditentukan';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Belum Ditentukan';
    const m = ID_MONTHS[date.getMonth()];
    const y = date.getFullYear();
    return m ? `${m} ${y}` : 'Belum Ditentukan';
  } catch {
    return 'Belum Ditentukan';
  }
}

/**
 * Calculate financial totals strictly adhering to business rules:
 * - Total Project Revenue = Contract Value
 * - Total Payment Received = SUM(all confirmed payments)
 * - Outstanding Client Balance = Contract Value - Total Payment Received (NEVER minus expenses)
 * - Total Project Expenses = SUM(all project expenses)
 * - Project Gross Profit = Contract Value - Total Project Expenses
 * - Samura Fee = Project Gross Profit * (Fee Percentage / 100)
 * - Net Profit After Fee = Project Gross Profit - Samura Fee
 */
export function calculateProjectFinancials(
  project: Project,
  payments: Payment[],
  expenses: ProjectExpense[],
  feePercentage: number = 20
) {
  const projectPayments = payments.filter(
    p => p.project_id === project.id && p.status === 'confirmed'
  );
  const projectExpenses = expenses.filter(
    e => e.project_id === project.id
  );

  const contractValue = Number(project.contract_value) || 0;
  const totalPaymentsReceived = projectPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  
  // Strict formula: Piutang Client = Contract Value - Total Pembayaran Masuk
  const outstandingBalance = Math.max(0, contractValue - totalPaymentsReceived);
  
  const totalExpenses = projectExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const grossProfit = contractValue - totalExpenses;
  const netProfit = grossProfit;

  return {
    contractValue,
    totalPaymentsReceived,
    outstandingBalance,
    totalExpenses,
    grossProfit,
    samuraFee: 0,
    netProfitAfterFee: netProfit,
    netProfit,
    paymentCount: projectPayments.length,
    expenseCount: projectExpenses.length,
    isFullyPaid: outstandingBalance === 0 && contractValue > 0,
    hasLegacySisa: project.legacy_sisa !== null && project.legacy_sisa !== undefined
  };
}

/**
 * Format phone number into direct WhatsApp click-to-chat link
 * Handles Indonesian numbers starting with '0' -> '62', '+62' -> '62'
 */
export function formatWhatsAppLink(phone?: string | null): string | null {
  if (!phone) return null;
  let cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (!cleaned.startsWith('62') && cleaned.length >= 8) {
    cleaned = '62' + cleaned;
  }
  return `https://wa.me/${cleaned}`;
}

/**
 * Check if H+3 (3 days after wedding event date) has elapsed.
 * E.g., event on 2026-10-18 -> H+3 is 2026-10-21 end-of-day.
 */
export function isHPlus3Elapsed(eventDateStr: string | null | undefined): boolean {
  if (!eventDateStr) return false;
  try {
    const parts = eventDateStr.split('-');
    if (parts.length < 3) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const eventDate = new Date(year, month, day);
    if (isNaN(eventDate.getTime())) return false;

    // H+3 threshold: event date + 3 full days (end of day)
    const h3Threshold = new Date(eventDate);
    h3Threshold.setDate(h3Threshold.getDate() + 3);
    h3Threshold.setHours(23, 59, 59, 999);

    return new Date().getTime() >= h3Threshold.getTime();
  } catch {
    return false;
  }
}

export interface BookingStatusResult {
  key: 'lunas' | 'lunas_h3' | 'belum_lunas';
  label: string;
  shortLabel: string;
  badgeClass: string;
  isLunas: boolean;
  isHPlus3: boolean;
  description: string;
}

/**
 * Resolve project booking status according to STOA rules:
 * - Paid in full (outstanding_balance <= 0) => LUNAS
 * - Passed H+3 (today >= event_date + 3 days) => LUNAS (H+3 Otomatis)
 * - Otherwise => BOOKING (DP)
 */
export function getProjectBookingStatus(project: {
  event_date: string;
  contract_value?: number;
  outstanding_balance?: number;
  total_payments_received?: number;
}): BookingStatusResult {
  const isH3 = isHPlus3Elapsed(project.event_date);
  const contractVal = Number(project.contract_value) || 0;
  const balance = project.outstanding_balance !== undefined
    ? Number(project.outstanding_balance)
    : Math.max(0, contractVal - (Number(project.total_payments_received) || 0));

  // Already paid in full
  if (balance <= 0 && contractVal > 0) {
    return {
      key: 'lunas',
      label: 'LUNAS',
      shortLabel: 'Lunas',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
      isLunas: true,
      isHPlus3: false,
      description: 'Pembayaran telah lunas 100%'
    };
  }

  // Automatic H+3 rule
  if (isH3) {
    return {
      key: 'lunas_h3',
      label: 'LUNAS (H+3 Otomatis)',
      shortLabel: 'Lunas (H+3)',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-400 dark:border-emerald-700 shadow-xs font-bold',
      isLunas: true,
      isHPlus3: true,
      description: 'Status otomatis Lunas setelah melewati H+3 hari pasca acara pernikahan'
    };
  }

  // Still pending payment
  return {
    key: 'belum_lunas',
    label: 'BOOKING (DP)',
    shortLabel: 'Booking DP',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800',
    isLunas: false,
    isHPlus3: false,
    description: 'Booking aktif dengan pembayaran DP / Belum Lunas'
  };
}

/**
 * Otomatis mendeteksi tahun dan bulan terbaru dari data proyek / invoice / transaksi di setiap menu,
 * dengan fallback ke kalender terkini (2026 / bulan berjalan) jika data kosong.
 */
export function getLatestActiveYearAndMonth(
  items?: Array<{
    event_date?: string | null;
    issue_date?: string | null;
    payment_date?: string | null;
    transaction_date?: string | null;
    created_at?: string | null;
    deadline?: string | null;
  }>
): { year: number; month: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (!items || items.length === 0) {
    return { year: currentYear, month: currentMonth };
  }

  const validDates = items
    .map(p => p.event_date || p.issue_date || p.payment_date || p.transaction_date || p.deadline || p.created_at)
    .filter(Boolean)
    .map(d => new Date(d as string))
    .filter(d => !isNaN(d.getTime()));

  if (validDates.length === 0) {
    return { year: currentYear, month: currentMonth };
  }

  const years = validDates.map(d => d.getFullYear());
  const maxYear = Math.max(...years);

  // Ambil tahun terbaru (atau currentYear jika maxYear lebih kecil)
  const targetYear = Math.max(maxYear, currentYear);

  const datesInTargetYear = validDates.filter(d => d.getFullYear() === targetYear);
  let targetMonth = currentMonth;
  if (datesInTargetYear.length > 0) {
    const monthsInTargetYear = datesInTargetYear.map(d => d.getMonth() + 1);
    targetMonth = Math.max(...monthsInTargetYear);
  } else {
    // Jika tidak ada data di targetYear (misal targetYear 2026 tapi data terakhir di 2024/2025)
    // gunakan tahun yang benar-benar memiliki data terbaru
    const datesInMaxYear = validDates.filter(d => d.getFullYear() === maxYear);
    if (datesInMaxYear.length > 0) {
      const monthsInMaxYear = datesInMaxYear.map(d => d.getMonth() + 1);
      return { year: maxYear, month: Math.max(...monthsInMaxYear) };
    }
  }

  return { year: targetYear, month: targetMonth };
}

