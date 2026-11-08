/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calendar,
  Layers,
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { HistoricalFinancialRecap, Project, ProjectExpense, Payment } from '../../types/database';
import { formatIDR, ID_MONTHS, getLatestActiveYearAndMonth } from '../../lib/formatters';
import * as XLSX from 'xlsx';

interface FinancialRecapProps {
  historicalRecap: HistoricalFinancialRecap[];
  projects: Project[];
  payments: Payment[];
  expenses: ProjectExpense[];
}

export const FinancialRecap: React.FC<FinancialRecapProps> = ({
  historicalRecap,
  projects,
  payments,
  expenses
}) => {
  const availableYears = [2022, 2023, 2024, 2025, 2026];
  const [selectedYears, setSelectedYears] = useState<number[]>(() => {
    const latest = getLatestActiveYearAndMonth(projects);
    const prevYear = Math.max(2022, latest.year - 1);
    return [prevYear, latest.year];
  });
  const [activeTabYear, setActiveTabYear] = useState<number>(() => {
    return getLatestActiveYearAndMonth(projects).year;
  });

  React.useEffect(() => {
    const latest = getLatestActiveYearAndMonth(projects);
    setActiveTabYear(latest.year);
    const prevYear = Math.max(2022, latest.year - 1);
    setSelectedYears([prevYear, latest.year]);
  }, [projects.length]);

  const toggleYearSelection = (year: number) => {
    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter(y => y !== year));
      }
    } else {
      setSelectedYears([...selectedYears, year].sort());
    }
  };

  // Compute live monthly recap for a specific year
  const getYearMonthlyData = (year: number) => {
    const months = ID_MONTHS.map((name, idx) => {
      const monthNum = idx + 1;

      // Check if we have live projects for this year & month
      const monthProjects = projects.filter(p => {
        if (!p.event_date) return false;
        const d = new Date(p.event_date);
        return d.getFullYear() === year && (d.getMonth() + 1) === monthNum;
      });

      // Live calculations if data exists
      if (monthProjects.length > 0) {
        const rev = monthProjects.reduce((sum, p) => sum + (Number(p.contract_value) || 0), 0);
        const projectIds = new Set(monthProjects.map(p => p.id));
        const paid = payments
          .filter(p => projectIds.has(p.project_id) && p.status === 'confirmed')
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const exp = expenses
          .filter(e => projectIds.has(e.project_id))
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const net = rev - exp;

        return {
          monthNum,
          monthName: name,
          revenue: rev,
          paymentsReceived: paid,
          expenses: exp,
          netProfit: net,
          isHistorical: false
        };
      }

      // Fallback to historical snapshot from Excel REKAP sheet
      const hist = historicalRecap.find(r => r.year === year && r.month === monthNum);
      if (hist) {
        return {
          monthNum,
          monthName: name,
          revenue: hist.total_revenue,
          paymentsReceived: hist.total_payments_received,
          expenses: hist.total_expenses,
          netProfit: hist.gross_profit || (hist.total_revenue - hist.total_expenses),
          isHistorical: true
        };
      }

      return {
        monthNum,
        monthName: name,
        revenue: 0,
        paymentsReceived: 0,
        expenses: 0,
        netProfit: 0,
        isHistorical: false
      };
    });

    const totalRev = months.reduce((s, m) => s + m.revenue, 0);
    const totalPaid = months.reduce((s, m) => s + m.paymentsReceived, 0);
    const totalExp = months.reduce((s, m) => s + m.expenses, 0);
    const totalNet = months.reduce((s, m) => s + m.netProfit, 0);

    return {
      months,
      totals: {
        revenue: totalRev,
        paymentsReceived: totalPaid,
        expenses: totalExp,
        netProfit: totalNet
      }
    };
  };

  const activeYearData = useMemo(() => getYearMonthlyData(activeTabYear), [activeTabYear, projects, payments, expenses, historicalRecap]);

  // Comparison Bar Chart across Selected Years
  const comparisonChartData = useMemo(() => {
    return selectedYears.map(yr => {
      const data = getYearMonthlyData(yr);
      return {
        year: String(yr),
        Omzet: data.totals.revenue,
        Pengeluaran: data.totals.expenses,
        NetProfit: data.totals.netProfit
      };
    });
  }, [selectedYears, projects, payments, expenses, historicalRecap]);

  const exportYearRecapToExcel = () => {
    const rows = activeYearData.months.map(m => ({
      'Bulan': m.monthName,
      'Total Omzet (IDR)': m.revenue,
      'Kas Masuk (IDR)': m.paymentsReceived,
      'Pengeluaran (IDR)': m.expenses,
      'Laba Bersih Studio (IDR)': m.netProfit,
      'Sumber Data': m.isHistorical ? 'Snapshot Excel REKAP' : 'Sistem STOA Finance'
    }));

    // Add total row
    rows.push({
      'Bulan': 'TOTAL TAHUNAN',
      'Total Omzet (IDR)': activeYearData.totals.revenue,
      'Kas Masuk (IDR)': activeYearData.totals.paymentsReceived,
      'Pengeluaran (IDR)': activeYearData.totals.expenses,
      'Laba Bersih Studio (IDR)': activeYearData.totals.netProfit,
      'Sumber Data': 'Akumulasi'
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `REKAP_${activeTabYear}`);
    XLSX.writeFile(wb, `STOA_REKAP_KEUANGAN_${activeTabYear}_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Multi-Year Comparison Selector Strip */}
      <div className="p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">
            Pilih Tahun untuk Perbandingan Multi-Tahun
          </h3>
          <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-0.5">
            Bandingkan performa omzet dan laba bersih dari 2022 hingga 2026
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableYears.map(yr => {
            const isSelected = selectedYears.includes(yr);
            return (
              <button
                key={yr}
                onClick={() => toggleYearSelection(yr)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  isSelected
                    ? 'border-[#C06014] bg-[#C06014]/10 text-[#C06014]'
                    : 'border-[#E5E7DC] dark:border-[#353935] text-[#536162] hover:bg-[#F3F4ED] dark:hover:bg-[#252825]'
                }`}
              >
                {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{yr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Year Comparison Chart */}
      <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">
              Grafik Komparasi Finansial Multi-Tahun
            </h4>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
              Perbandingan Omzet, Pengeluaran, dan Profit Studio
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7DC" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#536162' }} axisLine={false} tickLine={false} />
              <YAxis 
                tick={{ fontSize: 11, fill: '#536162' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(val) => `Rp${val / 1000000}M`}
              />
              <Tooltip 
                formatter={(val: any) => formatIDR(Number(val))}
                contentStyle={{ 
                  backgroundColor: '#1E201E', 
                  borderColor: '#353935', 
                  borderRadius: '8px', 
                  color: '#F3F4ED',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="Omzet" fill="#424642" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="NetProfit" fill="#C06014" radius={[4, 4, 0, 0]} name="Laba Bersih Studio" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year Tabs & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
          {availableYears.map(yr => (
            <button
              key={yr}
              onClick={() => setActiveTabYear(yr)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTabYear === yr
                  ? 'bg-[#424642] text-white shadow-xs'
                  : 'text-[#536162] hover:text-[#424642] dark:hover:text-[#F3F4ED]'
              }`}
            >
              Sheet Rekap {yr}
            </button>
          ))}
        </div>

        <button
          onClick={exportYearRecapToExcel}
          className="px-3.5 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-medium text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Rekap {activeTabYear} (Excel)</span>
        </button>
      </div>

      {/* Monthly & Annual Financial Recap Table */}
      <div className="rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] overflow-hidden">
        <div className="p-4 bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">
              Tabel Rekapitulasi Keuangan Tahun {activeTabYear} (Format Sheet REKAP)
            </h4>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
              Rincian Januari sampai Desember, dihitung otomatis dari transaksi riil
            </p>
          </div>
        </div>

        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E5E7DC] dark:border-[#353935] text-[#536162] dark:text-[#9BA39B]">
                <th className="py-3 px-4 font-semibold">Bulan</th>
                <th className="py-3 px-4 font-semibold text-right">Total Omzet</th>
                <th className="py-3 px-4 font-semibold text-right">Kas Masuk</th>
                <th className="py-3 px-4 font-semibold text-right">Pengeluaran</th>
                <th className="py-3 px-4 font-semibold text-right">Laba Bersih Studio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
              {activeYearData.months.map((m) => (
                <tr key={m.monthNum} className="hover:bg-[#FDFBF7]/60 dark:hover:bg-[#252825]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#424642] dark:text-[#F3F4ED]">
                    {m.monthName}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-[#424642] dark:text-[#F3F4ED] tabular-nums">
                    {formatIDR(m.revenue)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatIDR(m.paymentsReceived)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatIDR(m.expenses)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                    {formatIDR(m.netProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Row */}
            <tfoot className="bg-[#F3F4ED] dark:bg-[#252825] font-bold border-t-2 border-[#E5E7DC] dark:border-[#353935]">
              <tr>
                <td className="py-3.5 px-4 uppercase text-[#424642] dark:text-[#F3F4ED]">
                  TOTAL {activeTabYear}
                </td>
                <td className="py-3.5 px-4 text-right tabular-nums text-[#424642] dark:text-[#F3F4ED]">
                  {formatIDR(activeYearData.totals.revenue)}
                </td>
                <td className="py-3.5 px-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatIDR(activeYearData.totals.paymentsReceived)}
                </td>
                <td className="py-3.5 px-4 text-right tabular-nums text-rose-600 dark:text-rose-400">
                  {formatIDR(activeYearData.totals.expenses)}
                </td>
                <td className="py-3.5 px-4 text-right tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatIDR(activeYearData.totals.netProfit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Cards (< md) */}
        <div className="block md:hidden divide-y divide-[#E5E7DC] dark:divide-[#353935]">
          {/* Annual Summary Card on Top */}
          <div className="p-4 bg-[#F3F4ED] dark:bg-[#252825] space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#C06014]">
              TOTAL KESELURUHAN TAHUN {activeTabYear}
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white dark:bg-[#1E201E] p-2.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935]">
                <span className="text-[10px] uppercase text-[#536162] block">Total Omzet</span>
                <span className="font-bold text-[#424642] dark:text-[#F3F4ED]">{formatIDR(activeYearData.totals.revenue)}</span>
              </div>
              <div className="bg-white dark:bg-[#1E201E] p-2.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935]">
                <span className="text-[10px] uppercase text-emerald-600 block">Kas Masuk</span>
                <span className="font-bold text-emerald-600">{formatIDR(activeYearData.totals.paymentsReceived)}</span>
              </div>
              <div className="bg-white dark:bg-[#1E201E] p-2.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935]">
                <span className="text-[10px] uppercase text-rose-600 block">Pengeluaran</span>
                <span className="font-bold text-rose-600">{formatIDR(activeYearData.totals.expenses)}</span>
              </div>
              <div className="bg-white dark:bg-[#1E201E] p-2.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935]">
                <span className="text-[10px] uppercase text-emerald-700 block">Laba Bersih</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatIDR(activeYearData.totals.netProfit)}</span>
              </div>
            </div>
          </div>

          {activeYearData.months.map((m) => (
            <div key={m.monthNum} className="p-3.5 space-y-2 bg-white dark:bg-[#1E201E]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#424642] dark:text-[#F3F4ED]">
                  {m.monthName}
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Laba: {formatIDR(m.netProfit)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px] text-[#536162] dark:text-[#9BA39B] bg-[#FDFBF7] dark:bg-[#252825] p-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935]">
                <div>
                  <span className="text-[9px] uppercase block">Omzet</span>
                  <span className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{formatIDR(m.revenue)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-emerald-600 block">Masuk</span>
                  <span className="font-semibold text-emerald-600">{formatIDR(m.paymentsReceived)}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-rose-600 block">Beban</span>
                  <span className="font-semibold text-rose-600">{formatIDR(m.expenses)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
