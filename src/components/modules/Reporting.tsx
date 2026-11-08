/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  ReceiptText,
  Clock,
  Sparkles
} from 'lucide-react';
import { Project, Payment, ProjectExpense, ProjectDeliverable, TeamMember } from '../../types/database';
import { formatIDR, formatDateID, ID_MONTHS, getLatestActiveYearAndMonth } from '../../lib/formatters';
import {
  exportFinancialStatementPDF,
  exportProjectsToPDF,
  exportProjectsToExcel,
  exportPaymentsToExcel,
  exportExpensesToExcel,
  exportDeliverablesToExcel,
  exportExpensesToPDF,
  exportPaymentsToPDF,
  exportDeliverablesToPDF
} from '../../lib/exportUtils';

interface ReportingProps {
  projects: Project[];
  payments: Payment[];
  expenses: ProjectExpense[];
  deliverables: ProjectDeliverable[];
  teamMembers: TeamMember[];
}

type ReportType =
  | 'income_statement'
  | 'project_profitability'
  | 'client_payments'
  | 'production_expenses'
  | 'deliverables_pending';

export const Reporting: React.FC<ReportingProps> = ({
  projects,
  payments,
  expenses,
  deliverables,
  teamMembers
}) => {
  const [selectedReport, setSelectedReport] = useState<ReportType>('income_statement');
  
  // Selalu inisialisasi di tahun dan bulan terbaru
  const [reportYear, setReportYear] = useState<number>(() => getLatestActiveYearAndMonth(projects).year);
  const [reportMonth, setReportMonth] = useState<number | 'all'>(() => getLatestActiveYearAndMonth(projects).month);

  React.useEffect(() => {
    const latest = getLatestActiveYearAndMonth(projects);
    setReportYear(latest.year);
    setReportMonth(latest.month);
  }, [projects.length]);

  // Filter records for selected period
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (!p.event_date) return false;
      const d = new Date(p.event_date);
      const matchY = d.getFullYear() === reportYear;
      const matchM = reportMonth === 'all' || (d.getMonth() + 1) === reportMonth;
      return matchY && matchM;
    });
  }, [projects, reportYear, reportMonth]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map(p => p.id)), [filteredProjects]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const isProjectInPeriod = Boolean(p.project_id && filteredProjectIds.has(p.project_id));
      const d = new Date(p.payment_date);
      const isDateInPeriod = d.getFullYear() === reportYear && 
        (reportMonth === 'all' || (d.getMonth() + 1) === reportMonth);
      return isProjectInPeriod || isDateInPeriod;
    });
  }, [payments, filteredProjectIds, reportYear, reportMonth]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const isProjectInPeriod = Boolean(e.project_id && filteredProjectIds.has(e.project_id));
      const d = new Date(e.transaction_date);
      const isDateInPeriod = d.getFullYear() === reportYear && 
        (reportMonth === 'all' || (d.getMonth() + 1) === reportMonth);
      return isProjectInPeriod || isDateInPeriod;
    });
  }, [expenses, filteredProjectIds, reportYear, reportMonth]);

  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => {
      if (d.project_id && filteredProjectIds.has(d.project_id)) return true;
      if (d.deadline) {
        const date = new Date(d.deadline);
        return date.getFullYear() === reportYear && 
          (reportMonth === 'all' || (date.getMonth() + 1) === reportMonth);
      }
      return false;
    });
  }, [deliverables, filteredProjectIds, reportYear, reportMonth]);

  // Financial aggregates
  const totalOmzet = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (Number(p.contract_value) || 0), 0);
  }, [filteredProjects]);

  const totalPaid = useMemo(() => {
    return filteredPayments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  const totalPiutang = useMemo(() => {
    return Math.max(0, totalOmzet - totalPaid);
  }, [totalOmzet, totalPaid]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const netProfit = totalOmzet - totalExpenses;

  // Expense categories breakdown
  const expenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalExpenses]);

  const periodTitle = reportMonth === 'all' 
    ? `Tahun ${reportYear}` 
    : `${ID_MONTHS[reportMonth - 1]} ${reportYear}`;

  const handleExportPDF = () => {
    if (selectedReport === 'income_statement') {
      exportFinancialStatementPDF({
        periodTitle,
        totalRevenue: totalOmzet,
        totalReceived: totalPaid,
        totalReceivables: totalPiutang,
        totalExpenses: totalExpenses,
        netProfit: netProfit,
        expenseCategories: expenseCategories,
        projectCount: filteredProjects.length
      });
    } else if (selectedReport === 'project_profitability') {
      exportProjectsToPDF(filteredProjects, `Laporan Profitabilitas Proyek - ${periodTitle}`);
    } else if (selectedReport === 'production_expenses') {
      exportExpensesToPDF(filteredExpenses, `Laporan Rincian Pengeluaran - ${periodTitle}`);
    } else if (selectedReport === 'client_payments') {
      exportPaymentsToPDF(filteredPayments, `Laporan Pembayaran Klien - ${periodTitle}`);
    } else if (selectedReport === 'deliverables_pending') {
      exportDeliverablesToPDF(filteredDeliverables, `Laporan Deliverables & Cetak - ${periodTitle}`);
    } else {
      window.print();
    }
  };

  const handleExportExcel = () => {
    if (selectedReport === 'project_profitability' || selectedReport === 'income_statement') {
      exportProjectsToExcel(filteredProjects, `Laporan_Proyek_${periodTitle}`);
    } else if (selectedReport === 'client_payments') {
      exportPaymentsToExcel(filteredPayments, `Laporan_Pembayaran_${periodTitle}`);
    } else if (selectedReport === 'production_expenses') {
      exportExpensesToExcel(filteredExpenses, `Laporan_Pengeluaran_${periodTitle}`);
    } else if (selectedReport === 'deliverables_pending') {
      exportDeliverablesToExcel(filteredDeliverables, `Laporan_Pending_${periodTitle}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Selection Strip */}
      <div className="p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'income_statement' as ReportType, label: 'Laba Rugi & Arus Kas' },
            { id: 'project_profitability' as ReportType, label: 'Profitabilitas Proyek' },
            { id: 'client_payments' as ReportType, label: 'Pembayaran Klien' },
            { id: 'production_expenses' as ReportType, label: 'Rincian Pengeluaran' },
            { id: 'deliverables_pending' as ReportType, label: 'Deliverables & Cetak' },
          ].map(rep => (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedReport === rep.id
                  ? 'bg-[#424642] text-white shadow-xs'
                  : 'text-[#536162] hover:bg-[#F3F4ED] dark:hover:bg-[#252825]'
              }`}
            >
              {rep.label}
            </button>
          ))}
        </div>

        {/* Date Filter & Export CTAs */}
        <div className="flex items-center gap-2">
          <select
            value={reportYear}
            onChange={(e) => setReportYear(Number(e.target.value))}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
          >
            {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>Tahun {y}</option>)}
          </select>

          <select
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
          >
            <option value="all">Satu Tahun Penuh</option>
            {ID_MONTHS.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <button
            onClick={handleExportPDF}
            className="px-3 py-1.5 rounded-lg bg-[#C06014] hover:bg-[#a65210] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cetak PDF</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* Printable Report Preview Sheet */}
      <div className="p-8 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] max-w-4xl mx-auto shadow-sm">
        {/* Document Letterhead */}
        <div className="border-b-2 border-[#424642] pb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-black border border-[#353935] p-0.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img
                src="/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png"
                alt="STOA PICTURES"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#424642] dark:text-[#F3F4ED] tracking-tight">
                STOA PICTURES
              </h2>
              <p className="text-xs uppercase tracking-wider font-semibold text-[#C06014] mt-0.5">
                Wedding Photography & Cinematography System
              </p>
              <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-1">
                Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar, Sumatera Utara 21113
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold px-2 py-1 bg-[#F3F4ED] dark:bg-[#353935] rounded text-[#424642] dark:text-[#F3F4ED]">
              LAPORAN KEUANGAN RESMI
            </span>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-2">
              Periode: <strong className="text-[#424642] dark:text-[#F3F4ED]">{periodTitle}</strong>
            </p>
            <p className="text-[11px] text-[#536162]">
              Dicetak: {formatDateID(new Date().toISOString())}
            </p>
          </div>
        </div>

        {/* Report Content Body based on selected tab */}
        {selectedReport === 'income_statement' && (
          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED] border-b pb-2 border-[#E5E7DC]">
                1. Pendapatan & Arus Kas (Revenue & Inflows)
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-[#536162] dark:text-[#9BA39B]">Total Nilai Kontrak Proyek (Omzet)</span>
                  <span className="font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums">{formatIDR(totalOmzet)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#536162] dark:text-[#9BA39B]">Total Kas Masuk Diterima (DP & Pelunasan)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatIDR(totalPaid)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#536162] dark:text-[#9BA39B]">Total Piutang Klien (Belum Lunas)</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{formatIDR(totalPiutang)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED] border-b pb-2 border-[#E5E7DC]">
                2. Rincian Beban Biaya Produksi (Production Expenses)
              </h3>
              <div className="space-y-1.5 text-xs">
                {expenseCategories.map(cat => (
                  <div key={cat.name} className="flex justify-between py-1">
                    <span className="text-[#536162] dark:text-[#9BA39B]">
                      • {cat.name} ({cat.percentage.toFixed(1)}%)
                    </span>
                    <span className="font-medium text-rose-600 tabular-nums">{formatIDR(cat.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t font-bold text-xs text-[#424642] dark:text-[#F3F4ED]">
                  <span>Total Seluruh Beban Pengeluaran Produksi</span>
                  <span className="text-rose-600 tabular-nums">{formatIDR(totalExpenses)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED] border-b pb-2 border-[#E5E7DC]">
                3. Ringkasan Laba Bersih Studio
              </h3>
              <div className="p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935] space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="font-bold text-[#424642] dark:text-[#F3F4ED]">Laba Kotor (Omzet - Pengeluaran)</span>
                  <span className="font-bold text-base text-[#424642] dark:text-[#F3F4ED] tabular-nums">{formatIDR(netProfit)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-[#E5E7DC] text-emerald-700 dark:text-emerald-300">
                  <span className="font-bold text-sm">Net Profit Bersih Studio</span>
                  <span className="font-bold text-lg tabular-nums">{formatIDR(netProfit)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'project_profitability' && (
          <div className="py-6">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#424642] text-[#424642] dark:text-[#F3F4ED] font-bold">
                  <th className="py-2">Kode</th>
                  <th className="py-2">Klien & Lokasi</th>
                  <th className="py-2 text-right">Nilai Kontrak</th>
                  <th className="py-2 text-right">Pengeluaran</th>
                  <th className="py-2 text-right">Gross Profit</th>
                  <th className="py-2 text-right">Margin (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7DC]">
                {filteredProjects.map(p => {
                  const margin = p.contract_value > 0 
                    ? ((p.gross_profit || 0) / p.contract_value) * 100 
                    : 0;
                  return (
                    <tr key={p.id}>
                      <td className="py-2 font-mono">{p.project_code}</td>
                      <td className="py-2 font-medium">{p.client_name}</td>
                      <td className="py-2 text-right tabular-nums">{formatIDR(p.contract_value)}</td>
                      <td className="py-2 text-right text-rose-600 tabular-nums">{formatIDR(p.total_expenses)}</td>
                      <td className="py-2 text-right font-bold text-[#C06014] tabular-nums">{formatIDR(p.gross_profit)}</td>
                      <td className="py-2 text-right tabular-nums">{margin.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selectedReport === 'production_expenses' && (
          <div className="py-6 space-y-6">
            {/* Summary statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Total Beban Produksi</p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1 tabular-nums">{formatIDR(totalExpenses)}</p>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">{filteredExpenses.length} transaksi pengeluaran</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                <p className="text-[11px] font-semibold text-[#536162] dark:text-[#9BA39B] uppercase tracking-wider">Rata-rata per Transaksi</p>
                <p className="text-xl font-bold text-[#424642] dark:text-[#F3F4ED] mt-1 tabular-nums">
                  {formatIDR(filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length) : 0)}
                </p>
                <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">Dari {expenseCategories.length} pos kategori</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                <p className="text-[11px] font-semibold text-[#536162] dark:text-[#9BA39B] uppercase tracking-wider">Rasio Beban thd Omzet</p>
                <p className="text-xl font-bold text-[#C06014] mt-1 tabular-nums">
                  {totalOmzet > 0 ? ((totalExpenses / totalOmzet) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">Omzet Periode: {formatIDR(totalOmzet)}</p>
              </div>
            </div>

            {/* Category summary pills */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                Distribusi Kategori Beban
              </h3>
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map(cat => (
                  <div
                    key={cat.name}
                    className="px-2.5 py-1.5 rounded-lg bg-[#F3F4ED] dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935] flex items-center gap-2 text-xs"
                  >
                    <span className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{cat.name}:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">{formatIDR(cat.amount)}</span>
                    <span className="text-[10px] text-[#536162] dark:text-[#9BA39B]">({cat.percentage.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses Detailed Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                Rincian Transaksi Pengeluaran
              </h3>
              <div className="overflow-x-auto border border-[#E5E7DC] dark:border-[#353935] rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#F3F4ED] dark:bg-[#1E201E] border-b border-[#E5E7DC] dark:border-[#353935] text-[#424642] dark:text-[#F3F4ED] font-bold">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Kode / Klien</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Penerima / Tim</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                      <th className="py-2.5 px-3 text-right">Nominal (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#536162] dark:text-[#9BA39B]">
                          Tidak ada data pengeluaran pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((e, idx) => (
                        <tr key={e.id || idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-center text-[#536162] dark:text-[#9BA39B]">{idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">{e.transaction_date}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{e.client_name || '-'}</div>
                            <div className="text-[10px] font-mono text-[#536162] dark:text-[#9BA39B]">{e.project_code || '-'}</div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                              {e.category}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#424642] dark:text-[#F3F4ED]">{e.recipient_name || '-'}</td>
                          <td className="py-2 px-3 text-[#536162] dark:text-[#9BA39B] max-w-[200px] truncate">{e.description || '-'}</td>
                          <td className="py-2 px-3 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                            {formatIDR(e.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredExpenses.length > 0 && (
                    <tfoot>
                      <tr className="bg-[#FDFBF7] dark:bg-[#252825] border-t-2 border-[#424642] dark:border-[#536162] font-bold text-xs">
                        <td colSpan={6} className="py-2.5 px-3 text-right uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                          Total Pengeluaran Produksi:
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 tabular-nums text-sm">
                          {formatIDR(totalExpenses)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'client_payments' && (
          <div className="py-6 space-y-6">
            {/* Summary statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Total Kas Masuk (Confirmed)</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">{formatIDR(totalPaid)}</p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">{filteredPayments.filter(p => p.status === 'confirmed').length} transaksi berhasil</p>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider">Total Piutang Berjalan</p>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1 tabular-nums">{formatIDR(totalPiutang)}</p>
                <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">Dari total nilai kontrak {formatIDR(totalOmzet)}</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                <p className="text-[11px] font-semibold text-[#536162] dark:text-[#9BA39B] uppercase tracking-wider">Rasio Kas Terkumpul</p>
                <p className="text-xl font-bold text-[#C06014] mt-1 tabular-nums">
                  {totalOmzet > 0 ? ((totalPaid / totalOmzet) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">Tingkat kelancaran pembayaran</p>
              </div>
            </div>

            {/* Payments Detailed Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                Daftar Pembayaran Klien
              </h3>
              <div className="overflow-x-auto border border-[#E5E7DC] dark:border-[#353935] rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#F3F4ED] dark:bg-[#1E201E] border-b border-[#E5E7DC] dark:border-[#353935] text-[#424642] dark:text-[#F3F4ED] font-bold">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Kode / Klien</th>
                      <th className="py-2.5 px-3">Tahap Pembayaran</th>
                      <th className="py-2.5 px-3">Metode</th>
                      <th className="py-2.5 px-3">Catatan</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Nominal (IDR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#536162] dark:text-[#9BA39B]">
                          Tidak ada data pembayaran klien pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-center text-[#536162] dark:text-[#9BA39B]">{idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">{p.payment_date}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{p.client_name || '-'}</div>
                            <div className="text-[10px] font-mono text-[#536162] dark:text-[#9BA39B]">{p.project_code || '-'}</div>
                          </td>
                          <td className="py-2 px-3 font-medium uppercase text-[11px]">{p.payment_type || 'DP'}</td>
                          <td className="py-2 px-3 uppercase text-[11px] text-[#536162] dark:text-[#9BA39B]">{p.payment_method || 'Transfer'}</td>
                          <td className="py-2 px-3 text-[#536162] dark:text-[#9BA39B] max-w-[200px] truncate">{p.description || '-'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {p.status === 'confirmed' ? 'Diterima' : 'Pending'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatIDR(p.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredPayments.length > 0 && (
                    <tfoot>
                      <tr className="bg-[#FDFBF7] dark:bg-[#252825] border-t-2 border-[#424642] dark:border-[#536162] font-bold text-xs">
                        <td colSpan={7} className="py-2.5 px-3 text-right uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                          Total Kas Masuk Diterima:
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                          {formatIDR(totalPaid)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {selectedReport === 'deliverables_pending' && (
          <div className="py-6 space-y-6">
            {/* Summary statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                <p className="text-[11px] font-semibold text-[#536162] dark:text-[#9BA39B] uppercase tracking-wider">Total Item Deliverables</p>
                <p className="text-xl font-bold text-[#424642] dark:text-[#F3F4ED] mt-1 tabular-nums">{filteredDeliverables.length}</p>
                <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">Proyek dalam periode pemantauan</p>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Pending / In Progress</p>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
                  {filteredDeliverables.filter(d => (d.completion_percentage || 0) < 100).length}
                </p>
                <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">Memerlukan tindak lanjut tim</p>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Tuntas 100% (Completed)</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                  {filteredDeliverables.filter(d => (d.completion_percentage || 0) >= 100).length}
                </p>
                <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Semua output diserahkan ke klien</p>
              </div>
            </div>

            {/* Deliverables Detailed Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                Status Penyerahan Hasil Karya (Deliverables)
              </h3>
              <div className="overflow-x-auto border border-[#E5E7DC] dark:border-[#353935] rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-[#F3F4ED] dark:bg-[#1E201E] border-b border-[#E5E7DC] dark:border-[#353935] text-[#424642] dark:text-[#F3F4ED] font-bold">
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Kode / Klien</th>
                      <th className="py-2.5 px-3">Tgl Acara</th>
                      <th className="py-2.5 px-3">Deadline</th>
                      <th className="py-2.5 px-3">Paket</th>
                      <th className="py-2.5 px-3 text-center">Progress</th>
                      <th className="py-2.5 px-3 text-center">Google Drive</th>
                      <th className="py-2.5 px-3 text-center">Cetak Album</th>
                      <th className="py-2.5 px-3 text-center">Video Cinema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                    {filteredDeliverables.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-[#536162] dark:text-[#9BA39B]">
                          Tidak ada data penyerahan deliverables pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      filteredDeliverables.map((d, idx) => (
                        <tr key={d.id || idx} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                          <td className="py-2 px-3 text-center text-[#536162] dark:text-[#9BA39B]">{idx + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{d.client_name || '-'}</div>
                            <div className="text-[10px] font-mono text-[#536162] dark:text-[#9BA39B]">{d.project_code || '-'}</div>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">{d.event_date || '-'}</td>
                          <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px]">{d.deadline || '-'}</td>
                          <td className="py-2 px-3 text-[#536162] dark:text-[#9BA39B]">{d.package_name || '-'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="font-bold tabular-nums text-xs text-[#C06014]">
                              {d.completion_percentage || 0}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              d.drive_status === 'DONE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {d.drive_status || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              d.album_status === 'DONE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {d.album_status || 'PENDING'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              d.cinematic_status === 'DONE'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}>
                              {d.cinematic_status || 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Signature Approval Block */}
        <div className="pt-12 mt-8 border-t border-[#E5E7DC] dark:border-[#353935] grid grid-cols-2 text-center text-xs text-[#536162] dark:text-[#9BA39B]">
          <div>
            <p>Dibuat oleh,</p>
            <div className="h-16" />
            <p className="font-bold text-[#424642] dark:text-[#F3F4ED] underline">STOA Finance & Accounting</p>
            <p className="text-[11px]">Finance Controller</p>
          </div>
          <div>
            <p>Disetujui oleh,</p>
            <div className="h-16" />
            <p className="font-bold text-[#424642] dark:text-[#F3F4ED] underline">Budi Anto</p>
            <p className="text-[11px]">Director STOA Pictures</p>
          </div>
        </div>
      </div>
    </div>
  );
};
