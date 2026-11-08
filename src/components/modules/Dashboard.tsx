/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  ReceiptText,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/Badge';
import { Project, Payment, ProjectExpense, ProjectDeliverable } from '../../types/database';
import { formatIDR, formatDateID, ID_MONTHS_SHORT, isHPlus3Elapsed, getProjectBookingStatus } from '../../lib/formatters';
import { NavItemKey } from '../layout/Sidebar';

interface DashboardProps {
  projects: Project[];
  payments: Payment[];
  expenses: ProjectExpense[];
  deliverables: ProjectDeliverable[];
  samuraFeePercentage?: number;
  selectedYear: number | 'all';
  selectedMonth: number | 'all';
  onNavigate: (tab: NavItemKey) => void;
  onOpenProjectDetail: (project: Project) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  payments,
  expenses,
  deliverables,
  selectedYear,
  selectedMonth,
  onNavigate,
  onOpenProjectDetail
}) => {
  // Filter records by selected year & month
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const pYear = p.event_date ? new Date(p.event_date).getFullYear() : (p.source_year || 2024);
      const pMonth = p.event_date ? new Date(p.event_date).getMonth() + 1 : 1;
      
      const matchYear = selectedYear === 'all' || pYear === selectedYear;
      const matchMonth = selectedMonth === 'all' || pMonth === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [projects, selectedYear, selectedMonth]);

  const filteredProjectIds = useMemo(() => new Set(filteredProjects.map(p => p.id)), [filteredProjects]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (filteredProjectIds.size > 0 && !filteredProjectIds.has(p.project_id)) return false;
      if (selectedYear === 'all' && selectedMonth === 'all') return true;
      const d = new Date(p.payment_date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const matchYear = selectedYear === 'all' || y === selectedYear;
      const matchMonth = selectedMonth === 'all' || m === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [payments, filteredProjectIds, selectedYear, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filteredProjectIds.size > 0 && !filteredProjectIds.has(e.project_id)) return false;
      if (selectedYear === 'all' && selectedMonth === 'all') return true;
      const d = new Date(e.transaction_date);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const matchYear = selectedYear === 'all' || y === selectedYear;
      const matchMonth = selectedMonth === 'all' || m === selectedMonth;
      return matchYear && matchMonth;
    });
  }, [expenses, filteredProjectIds, selectedYear, selectedMonth]);

  // Financial KPI calculations
  const totalOmzet = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (Number(p.contract_value) || 0), 0);
  }, [filteredProjects]);

  const totalPembayaranMasuk = useMemo(() => {
    return filteredPayments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  const totalDP = useMemo(() => {
    return filteredPayments
      .filter(p => p.status === 'confirmed' && p.payment_type === 'dp')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  const totalPiutangClient = useMemo(() => {
    // Strictly: Contract Value - Total Payments Received
    return Math.max(0, totalOmzet - totalPembayaranMasuk);
  }, [totalOmzet, totalPembayaranMasuk]);

  const totalPengeluaran = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const totalNetProfit = useMemo(() => {
    return totalOmzet - totalPengeluaran;
  }, [totalOmzet, totalPengeluaran]);

  // Monthly trends data (Jan - Dec)
  const monthlyChartData = useMemo(() => {
    const months = ID_MONTHS_SHORT.map((name, idx) => ({
      name,
      monthNum: idx + 1,
      revenue: 0,
      expenses: 0,
      profit: 0,
      projects: 0
    }));

    filteredProjects.forEach(p => {
      if (!p.event_date) return;
      const m = new Date(p.event_date).getMonth();
      if (m >= 0 && m < 12) {
        months[m].revenue += Number(p.contract_value) || 0;
        months[m].projects += 1;
      }
    });

    filteredExpenses.forEach(e => {
      if (!e.transaction_date) return;
      const m = new Date(e.transaction_date).getMonth();
      if (m >= 0 && m < 12) {
        months[m].expenses += Number(e.amount) || 0;
      }
    });

    months.forEach(m => {
      m.profit = m.revenue - m.expenses;
    });

    return months;
  }, [filteredProjects, filteredExpenses]);

  // Expense categories breakdown
  const expensePieData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });

    const palette = ['#424642', '#C06014', '#536162', '#8C9A8E', '#D97706', '#2563EB', '#64748B'];
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: palette[i % palette.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Upcoming projects (closest to today)
  const upcomingProjects = useMemo(() => {
    return [...filteredProjects]
      .filter(p => p.status === 'Scheduled' || p.status === 'In Progress' || p.status === 'Booking')
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 5);
  }, [filteredProjects]);

  // Unpaid client invoices (where outstanding_balance > 0)
  const unpaidInvoices = useMemo(() => {
    return [...filteredProjects]
      .filter(p => (p.outstanding_balance || 0) > 0)
      .sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0))
      .slice(0, 5);
  }, [filteredProjects]);

  // Pending deliverables
  const pendingTasks = useMemo(() => {
    return deliverables
      .filter(d => d.drive_status !== 'DONE' || d.album_status !== 'DONE' || d.cinematic_status !== 'DONE')
      .slice(0, 5);
  }, [deliverables]);

  return (
    <div className="space-y-8 pb-12">
      {/* Brand & Editorial Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] p-6 lg:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-xl">
            <div className="w-16 h-16 rounded-2xl bg-black border border-[#353935] p-1 flex items-center justify-center shrink-0 shadow-md overflow-hidden hidden sm:flex">
              <img
                src="/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png"
                alt="STOA PICTURES"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#C06014]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>STOA PICTURES · PEMATANG SIANTAR</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-serif font-bold text-[#424642] dark:text-[#F3F4ED] tracking-tight">
                Sistem Pembukuan & Manajemen Proyek
              </h1>
              <p className="text-sm text-[#536162] dark:text-[#9BA39B] leading-relaxed">
                Ringkasan performa finansial pernikahan, status booking & pelunasan H+3 otomatis, arus kas masuk, beban produksi tim, dan laba bersih studio.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('recap')}
              className="px-4 py-2.5 rounded-xl border border-[#E5E7DC] dark:border-[#353935] text-xs font-medium text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4 text-[#C06014]" />
              <span>Rekap Tahunan</span>
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="px-4 py-2.5 rounded-xl bg-[#424642] text-white hover:bg-[#2D2F2D] text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Calendar className="w-4 h-4 text-[#C06014]" />
              <span>Laporan Lengkap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#536162] dark:text-[#9BA39B]">
            Indikator Finansial Utama ({selectedYear === 'all' ? 'Semua Tahun' : selectedYear})
          </h2>
          <span className="text-xs text-[#536162] dark:text-[#9BA39B]">
            {filteredProjects.length} Proyek Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Omzet (Kontrak)"
            value={formatIDR(totalOmzet)}
            subtitle="Nilai kontrak seluruh proyek"
            icon={TrendingUp}
            variant="default"
          />

          <StatCard
            title="Total Pembayaran Masuk"
            value={formatIDR(totalPembayaranMasuk)}
            subtitle={`Termasuk DP & Pelunasan (${filteredPayments.length} transaksi)`}
            icon={CreditCard}
            variant="success"
          />

          <StatCard
            title="Total DP Terkumpul"
            value={formatIDR(totalDP)}
            subtitle="Down Payment booking acara"
            icon={ArrowUpRight}
            variant="default"
          />

          <StatCard
            title="Total Piutang Client"
            value={formatIDR(totalPiutangClient)}
            subtitle="Sisa tagihan kontrak belum lunas"
            icon={AlertCircle}
            variant={totalPiutangClient > 0 ? "warning" : "default"}
          />

          <StatCard
            title="Total Pengeluaran"
            value={formatIDR(totalPengeluaran)}
            subtitle="Beban shooting, cetak & honor tim"
            icon={ReceiptText}
            variant="danger"
          />

          <StatCard
            title="Total Net Profit Studio"
            value={formatIDR(totalNetProfit)}
            subtitle="Omzet dikurangi pengeluaran produksi"
            icon={Sparkles}
            variant="accent"
          />
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Monthly Revenue & Profit Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
                Tren Pendapatan, Pengeluaran & Profit Bulanan
              </h3>
              <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-0.5">
                Perbandingan arus kas bulanan sepanjang tahun
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-[#424642] dark:text-[#F3F4ED]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#424642]" />
                Omzet
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Pengeluaran
              </span>
              <span className="flex items-center gap-1.5 text-[#C06014]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C06014]" />
                Profit
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7DC" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#536162' }} axisLine={false} tickLine={false} />
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
                <Bar dataKey="revenue" fill="#424642" radius={[4, 4, 0, 0]} name="Omzet" />
                <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Pengeluaran" />
                <Bar dataKey="profit" fill="#C06014" radius={[4, 4, 0, 0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown Pie Chart */}
        <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
              Distribusi Kategori Pengeluaran
            </h3>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-0.5">
              Alokasi biaya produksi shooting, cetak & tim
            </p>
          </div>

          {expensePieData.length > 0 ? (
            <div className="my-auto py-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {expensePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
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
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 mt-2">
                {expensePieData.slice(0, 7).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-[#536162] dark:text-[#9BA39B]">{item.name}</span>
                    </div>
                    <span className="font-semibold text-[#424642] dark:text-[#F3F4ED] tabular-nums">
                      {formatIDR(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#536162]">
              Belum ada data pengeluaran untuk periode ini.
            </div>
          )}

          <button
            onClick={() => onNavigate('expenses')}
            className="w-full mt-4 py-2 text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] border border-[#E5E7DC] dark:border-[#353935] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <span>Rincian Pengeluaran</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Operational Sections: Upcoming Projects & Unpaid Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Projects */}
        <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
                Jadwal Proyek Mendatang
              </h3>
              <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
                Pernikahan yang akan berlangsung dalam waktu dekat
              </p>
            </div>
            <button
              onClick={() => onNavigate('projects')}
              className="text-xs font-medium text-[#C06014] hover:underline flex items-center gap-1"
            >
              Lihat Semua
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
            {upcomingProjects.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => onOpenProjectDetail(proj)}
                className="py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FDFBF7] dark:hover:bg-[#252825] px-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-semibold text-[#424642] dark:text-[#F3F4ED] truncate">
                    {proj.client_name}
                  </p>
                  <p className="text-xs text-[#536162] dark:text-[#9BA39B] truncate">
                    {formatDateID(proj.event_date)} · {proj.event_location}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C06014]/10 text-[#C06014] border border-[#C06014]/20">
                    {proj.package_name}
                  </span>
                  <p className="text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mt-1 tabular-nums">
                    {formatIDR(proj.contract_value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid Client Invoices */}
        <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
                Piutang & Tagihan Belum Lunas
              </h3>
              <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
                Klien dengan sisa pembayaran kontrak aktif
              </p>
            </div>
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-medium text-[#C06014] hover:underline flex items-center gap-1"
            >
              Catat Pelunasan
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
            {unpaidInvoices.map((proj) => (
              <div 
                key={proj.id}
                onClick={() => onOpenProjectDetail(proj)}
                className="py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FDFBF7] dark:hover:bg-[#252825] px-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#424642] dark:text-[#F3F4ED] truncate">
                      {proj.client_name}
                    </p>
                    {isHPlus3Elapsed(proj.event_date) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold shrink-0">
                        Lunas (H+3)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
                    Paket: {proj.package_name} · {formatDateID(proj.event_date)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    {formatIDR(proj.outstanding_balance)}
                  </span>
                  <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                    Terbayar: {formatIDR(proj.total_payments_received)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deliverables Monitoring Snapshot */}
      <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
              Monitoring Deliverable & Deadline Pending
            </h3>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
              Tracking status pengiriman Google Drive, Cetak Album, Cinema & Liputan
            </p>
          </div>
          <button
            onClick={() => onNavigate('pending')}
            className="text-xs font-medium text-[#C06014] hover:underline flex items-center gap-1"
          >
            Buka Sheet Pending
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#E5E7DC] dark:border-[#353935] text-[#536162] dark:text-[#9BA39B]">
                <th className="py-2.5 font-semibold">Klien & Proyek</th>
                <th className="py-2.5 font-semibold">Deadline</th>
                <th className="py-2.5 font-semibold">Album Cetak</th>
                <th className="py-2.5 font-semibold">Status Drive</th>
                <th className="py-2.5 font-semibold">Status Cinema</th>
                <th className="py-2.5 font-semibold">Status Album</th>
                <th className="py-2.5 font-semibold text-right">Progres</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
              {pendingTasks.map((task) => (
                <tr key={task.id} className="hover:bg-[#FDFBF7] dark:hover:bg-[#252825]">
                  <td className="py-3 font-semibold text-[#424642] dark:text-[#F3F4ED]">
                    {task.client_name}
                  </td>
                  <td className="py-3 text-[#536162] dark:text-[#9BA39B]">
                    {formatDateID(task.deadline)}
                  </td>
                  <td className="py-3 text-[#536162] dark:text-[#9BA39B]">
                    {task.album_type || '-'}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={task.drive_status} />
                  </td>
                  <td className="py-3">
                    <StatusBadge status={task.cinematic_status} />
                  </td>
                  <td className="py-3">
                    <StatusBadge status={task.album_status} />
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-bold tabular-nums text-[#C06014]">
                      {task.completion_percentage ?? 0}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
