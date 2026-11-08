/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  CreditCard,
  ReceiptText,
  FileSpreadsheet
} from 'lucide-react';
import { Payment, ProjectExpense, Project } from '../../types/database';
import { formatIDR, formatDateID } from '../../lib/formatters';
import * as XLSX from 'xlsx';

interface BookkeepingProps {
  payments: Payment[];
  expenses: ProjectExpense[];
  projects: Project[];
  selectedYear: number | 'all';
  selectedMonth: number | 'all';
}

interface LedgerEntry {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  project_code: string;
  client_name: string;
  categoryOrMethod: string;
  description: string;
  reference: string;
  amount: number;
}

export const Bookkeeping: React.FC<BookkeepingProps> = ({
  payments,
  expenses,
  projects,
  selectedYear,
  selectedMonth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  // Build unified chronological ledger
  const ledgerEntries = useMemo(() => {
    const projectMap = new Map(projects.map(p => [p.id, p]));

    const incomeEntries: LedgerEntry[] = payments.map(p => {
      const proj = projectMap.get(p.project_id);
      return {
        id: p.id,
        date: p.payment_date,
        type: 'INCOME',
        project_code: proj?.project_code || p.project_code || 'N/A',
        client_name: proj?.client_name || p.client_name || 'Client',
        categoryOrMethod: p.payment_method,
        description: `${p.payment_type.toUpperCase()} - ${p.description}`,
        reference: p.reference_number || '-',
        amount: Number(p.amount) || 0
      };
    });

    const expenseEntries: LedgerEntry[] = expenses.map(e => {
      const proj = projectMap.get(e.project_id);
      return {
        id: e.id,
        date: e.transaction_date,
        type: 'EXPENSE',
        project_code: proj?.project_code || e.project_code || 'N/A',
        client_name: proj?.client_name || e.client_name || 'Operational',
        categoryOrMethod: e.category,
        description: `${e.recipient_name}: ${e.description}`,
        reference: '-',
        amount: Number(e.amount) || 0
      };
    });

    return [...incomeEntries, ...expenseEntries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses, projects]);

  // Filtered entries
  const filteredLedger = useMemo(() => {
    return ledgerEntries.filter(entry => {
      const matchType = typeFilter === 'ALL' || entry.type === typeFilter;
      const matchSearch = !searchQuery ||
        entry.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.categoryOrMethod.toLowerCase().includes(searchQuery.toLowerCase());

      const d = new Date(entry.date);
      const matchYear = selectedYear === 'all' || d.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === 'all' || (d.getMonth() + 1) === selectedMonth;

      return matchType && matchSearch && matchYear && matchMonth;
    });
  }, [ledgerEntries, typeFilter, searchQuery, selectedYear, selectedMonth]);

  // Totals for filtered records
  const totalIncome = useMemo(() => {
    return filteredLedger
      .filter(e => e.type === 'INCOME')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredLedger]);

  const totalExpense = useMemo(() => {
    return filteredLedger
      .filter(e => e.type === 'EXPENSE')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [filteredLedger]);

  const netCashflow = totalIncome - totalExpense;

  const exportLedgerToExcel = () => {
    const rows = filteredLedger.map((e, idx) => ({
      'No': idx + 1,
      'Tanggal': e.date,
      'Jenis': e.type === 'INCOME' ? 'Kas Masuk' : 'Pengeluaran',
      'Kode Proyek': e.project_code,
      'Klien / Acara': e.client_name,
      'Kategori / Metode': e.categoryOrMethod,
      'Deskripsi': e.description,
      'Referensi': e.reference,
      'Nominal Masuk (IDR)': e.type === 'INCOME' ? e.amount : 0,
      'Nominal Keluar (IDR)': e.type === 'EXPENSE' ? e.amount : 0
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Pembukuan');
    XLSX.writeFile(wb, `Jurnal_Pembukuan_STOA_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#1E201E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Total Kas Masuk
            </span>
            <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-2">
            {formatIDR(totalIncome)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#1E201E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Total Pengeluaran
            </span>
            <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-2">
            {formatIDR(totalExpense)}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-[#C06014]/30 bg-white dark:bg-[#1E201E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#C06014] uppercase tracking-wider">
              Net Arus Kas (Cash Flow)
            </span>
            <div className="p-1.5 rounded-md bg-[#C06014]/10 text-[#C06014]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-[#C06014] tabular-nums mt-2">
            {formatIDR(netCashflow)}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536162]" />
            <input
              type="text"
              placeholder="Cari transaksi, klien, deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
            />
          </div>

          {/* Segmented type buttons */}
          <div className="flex items-center gap-1 bg-[#F3F4ED] dark:bg-[#252825] p-1 rounded-lg border border-[#E5E7DC] dark:border-[#353935]">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === 'ALL' ? 'bg-white dark:bg-[#353935] text-[#424642] dark:text-[#F3F4ED] shadow-xs font-bold' : 'text-[#536162]'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setTypeFilter('INCOME')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === 'INCOME' ? 'bg-white dark:bg-[#353935] text-emerald-700 dark:text-emerald-400 shadow-xs font-bold' : 'text-[#536162]'}`}
            >
              Kas Masuk
            </button>
            <button
              onClick={() => setTypeFilter('EXPENSE')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === 'EXPENSE' ? 'bg-white dark:bg-[#353935] text-rose-700 dark:text-rose-400 shadow-xs font-bold' : 'text-[#536162]'}`}
            >
              Pengeluaran
            </button>
          </div>
        </div>

        <button
          onClick={exportLedgerToExcel}
          className="px-3.5 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-medium text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Jurnal Excel</span>
        </button>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] overflow-hidden">
        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935] text-[#536162] dark:text-[#9BA39B]">
                <th className="py-3 px-4 font-semibold">Tanggal</th>
                <th className="py-3 px-4 font-semibold">Tipe</th>
                <th className="py-3 px-4 font-semibold">Proyek & Klien</th>
                <th className="py-3 px-4 font-semibold">Kategori / Metode</th>
                <th className="py-3 px-4 font-semibold">Deskripsi Transaksi</th>
                <th className="py-3 px-4 font-semibold text-right">Kas Masuk (IDR)</th>
                <th className="py-3 px-4 font-semibold text-right">Pengeluaran (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
              {filteredLedger.length > 0 ? (
                filteredLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FDFBF7]/60 dark:hover:bg-[#252825]/60 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#424642] dark:text-[#F3F4ED] whitespace-nowrap">
                      {formatDateID(entry.date)}
                    </td>
                    <td className="py-3 px-4">
                      {entry.type === 'INCOME' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                          <ArrowUpRight className="w-3 h-3" />
                          Masuk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                          <ArrowDownRight className="w-3 h-3" />
                          Keluar
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{entry.client_name}</div>
                      <div className="text-[11px] font-mono text-[#536162] dark:text-[#9BA39B]">{entry.project_code}</div>
                    </td>
                    <td className="py-3 px-4 text-[#536162] dark:text-[#9BA39B] font-medium">
                      {entry.categoryOrMethod}
                    </td>
                    <td className="py-3 px-4 text-[#536162] dark:text-[#9BA39B] max-w-xs truncate">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {entry.type === 'INCOME' ? formatIDR(entry.amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {entry.type === 'EXPENSE' ? formatIDR(entry.amount) : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#536162]">
                    Belum ada transaksi pada periode yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (< md) */}
        <div className="block md:hidden divide-y divide-[#E5E7DC] dark:divide-[#353935]">
          {filteredLedger.length > 0 ? (
            filteredLedger.map((entry) => (
              <div key={entry.id} className="p-4 space-y-2 bg-white dark:bg-[#1E201E]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {entry.type === 'INCOME' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        <ArrowUpRight className="w-3 h-3" />
                        Masuk
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                        <ArrowDownRight className="w-3 h-3" />
                        Keluar
                      </span>
                    )}
                    <span className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                      {formatDateID(entry.date)}
                    </span>
                  </div>
                  <span className={`font-bold text-sm tabular-nums ${entry.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {entry.type === 'INCOME' ? '+' : '-'}{formatIDR(entry.amount)}
                  </span>
                </div>

                <div>
                  <div className="font-semibold text-xs text-[#424642] dark:text-[#F3F4ED]">
                    {entry.client_name}
                  </div>
                  <div className="text-[11px] font-mono text-[#536162] dark:text-[#9BA39B]">
                    {entry.project_code} · {entry.categoryOrMethod}
                  </div>
                </div>

                <p className="text-xs text-[#536162] dark:text-[#9BA39B] bg-[#FDFBF7] dark:bg-[#252825] p-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935]">
                  {entry.description}
                </p>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-[#536162]">
              Belum ada transaksi pada periode yang dipilih.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
