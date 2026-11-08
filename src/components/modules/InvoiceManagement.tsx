/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * InvoiceManagement - Dedicated Dashboard & Workflow for INVOICE BOOKING
 * Provides full lifecycle: Generation, Search, Filter, PDF, WhatsApp, and Payment Sync.
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Share2,
  Printer,
  Eye,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  ArrowUpDown
} from 'lucide-react';
import { BookingInvoice, InvoiceStatus } from '../../types/database';
import { dataService } from '../../services/dataService';
import { formatCurrencyIDR, formatDateIndonesian, ID_MONTHS, getLatestActiveYearAndMonth } from '../../lib/formatters';
import { generateInvoicePDF } from '../../lib/invoicePdfGenerator';
import { CreateInvoiceModal } from '../invoice/CreateInvoiceModal';
import { InvoiceDetailModal } from '../invoice/InvoiceDetailModal';

export const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<BookingInvoice[]>(() => dataService.getInvoices());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Selalu tampilkan data di tahun dan bulan terbaru
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return String(getLatestActiveYearAndMonth(dataService.getInvoices()).year);
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return String(getLatestActiveYearAndMonth(dataService.getInvoices()).month);
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<BookingInvoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pdfGeneratingId, setPdfGeneratingId] = useState<string | null>(null);

  // Subscribe to dataService updates
  React.useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setInvoices(dataService.getInvoices());
    });
    return () => unsubscribe();
  }, []);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Search query (client name or invoice number)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client_name.toLowerCase().includes(q) ||
        (inv.client_phone && inv.client_phone.includes(q)) ||
        inv.package_name.toLowerCase().includes(q);

      // Status filter
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

      // Year filter
      let matchesYear = true;
      if (selectedYear !== 'all') {
        const invYear = new Date(inv.issue_date || inv.event_date).getFullYear().toString();
        matchesYear = invYear === selectedYear;
      }

      // Month filter
      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        const invMonth = (new Date(inv.issue_date || inv.event_date).getMonth() + 1).toString();
        matchesMonth = invMonth === selectedMonth;
      }

      return matchesSearch && matchesStatus && matchesYear && matchesMonth;
    });
  }, [invoices, searchQuery, statusFilter, selectedYear, selectedMonth]);

  // Available years in records
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    invoices.forEach(inv => {
      if (inv.issue_date) {
        years.add(new Date(inv.issue_date).getFullYear().toString());
      }
    });
    years.add(new Date().getFullYear().toString());
    return Array.from(years).sort().reverse();
  }, [invoices]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const totalIssued = invoices.length;
    const totalContractValue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0);
    const lunasCount = invoices.filter(inv => inv.status === 'LUNAS').length;

    return {
      totalIssued,
      totalContractValue,
      totalCollected,
      totalOutstanding,
      lunasCount
    };
  }, [invoices]);

  // Actions
  const handleOpenDetail = (inv: BookingInvoice) => {
    setActiveInvoice(inv);
    setIsDetailModalOpen(true);
  };

  const handleDownloadPDF = async (inv: BookingInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPdfGeneratingId(inv.id);
    try {
      const payments = dataService.getPayments().filter(p => p.project_id === inv.project_id && p.status === 'confirmed');
      const doc = await generateInvoicePDF(inv, payments);
      const filename = `${inv.invoice_number.replace(/\//g, '_')}_${inv.client_name.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('PDF error:', err);
    } finally {
      setPdfGeneratingId(null);
    }
  };

  const handleCopyNumber = (num: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareWhatsApp = (inv: BookingInvoice, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = (inv.client_phone || '').replace(/[^0-9]/g, '');
    let targetPhone = cleanPhone;
    if (targetPhone.startsWith('0')) {
      targetPhone = '62' + targetPhone.slice(1);
    }
    const sisaText = inv.remaining_amount <= 0 ? '*LUNAS*' : `*${formatCurrencyIDR(inv.remaining_amount)}*`;
    const message = encodeURIComponent(
      `Halo Kak *${inv.client_name}*,\n\nBerikut rincian *INVOICE BOOKING STOA PICTURES*:\n\n` +
      `📄 *No. Invoice:* ${inv.invoice_number}\n` +
      `📅 *Tanggal Acara:* ${formatDateIndonesian(inv.event_date)}\n` +
      `📍 *Lokasi:* ${inv.event_location || 'Pematang Siantar'}\n` +
      `📸 *Paket:* ${inv.package_name}\n\n` +
      `💰 *Total Tagihan:* ${formatCurrencyIDR(inv.total_amount)}\n` +
      `💳 *Sudah Terbayar:* ${formatCurrencyIDR(inv.paid_amount)}\n` +
      `⚖️ *Sisa Tagihan:* ${sisaText}\n` +
      `📌 *Status:* ${inv.status}\n\n` +
      `🏦 *Metode Pembayaran Resmi STOA:*\n${inv.bank_info || 'Bank BCA: 8375119583 a.n. BUDI ANTO'}\n\n` +
      `Terima kasih! ✨\n_Official STOA PICTURES_`
    );
    const waUrl = targetPhone ? `https://wa.me/${targetPhone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleDeleteInvoice = (id: string, num: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Yakin ingin menghapus invoice ${num}?`)) {
      dataService.deleteInvoice(id);
    }
  };

  const getBadgeStyle = (status: InvoiceStatus) => {
    switch (status) {
      case 'LUNAS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DP DITERIMA':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'CICILAN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'TERBIT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DIBATALKAN':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-radial-gradient from-amber-500/10 to-transparent pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                STOA INVOICE MANAGEMENT
              </span>
              <span className="text-xs text-slate-500 font-medium">v4.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Manajemen Invoice Booking
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mt-1 leading-relaxed">
              Penerbitan faktur tagihan resmi, perhitungan pembayaran terintegrasi, cetak dokumen A4 siap kirim, dan pelacakan sisa piutang klien STOA PICTURES.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Terbitkan Invoice Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Total Invoice Diterbitkan</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {metrics.totalIssued}
            <span className="text-xs font-normal text-slate-400 ml-1.5">invoice</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="text-emerald-400 font-semibold">{metrics.lunasCount}</span> sudah lunas
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Nilai Tagihan Bruto</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {formatCurrencyIDR(metrics.totalContractValue)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Total seluruh komitmen kontrak invoice
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Total Pembayaran Masuk</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">
            {formatCurrencyIDR(metrics.totalCollected)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Dana masuk dari DP & cicilan terkonfirmasi
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
            <span>Sisa Piutang Berjalan</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-400">
            {formatCurrencyIDR(metrics.totalOutstanding)}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Tagihan jatuh tempo yang belum dilunasi
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama klien, nomor invoice, atau nomor WA..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Semua Status ({invoices.length})</option>
            <option value="TERBIT">TERBIT</option>
            <option value="DP DITERIMA">DP DITERIMA</option>
            <option value="CICILAN">CICILAN</option>
            <option value="LUNAS">LUNAS</option>
            <option value="DRAFT">DRAFT</option>
            <option value="DIBATALKAN">DIBATALKAN</option>
          </select>

          {/* Year select */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Semua Tahun</option>
            {availableYears.map(yr => (
              <option key={yr} value={yr}>Tahun {yr}</option>
            ))}
          </select>

          {/* Month select */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Semua Bulan</option>
            {ID_MONTHS.map((mName, idx) => (
              <option key={mName} value={String(idx + 1)}>
                {mName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Daftar Invoice Booking Resmi
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
              {filteredInvoices.length} ditemukan
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Format A4 Resmi STOA PICTURES</span>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
            <div className="text-base font-semibold text-slate-300">
              Belum ada invoice yang sesuai kriteria pencarian
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Silakan terbitkan invoice baru dari data booking atau sesuaikan filter pencarian Anda.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Terbitkan Invoice Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">No. Invoice</th>
                  <th className="py-3.5 px-4 font-semibold">Klien & WhatsApp</th>
                  <th className="py-3.5 px-4 font-semibold">Paket & Tgl Acara</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Total Tagihan</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Sudah Dibayar</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Sisa Tagihan</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Aksi Cepat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => handleOpenDetail(inv)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    {/* Invoice Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{inv.invoice_number}</span>
                        <button
                          onClick={(e) => handleCopyNumber(inv.invoice_number, inv.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:text-white rounded transition-opacity"
                          title="Salin Nomor Invoice"
                        >
                          {copiedId === inv.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 font-sans block mt-0.5">
                        Terbit: {formatDateIndonesian(inv.issue_date)}
                      </span>
                    </td>

                    {/* Client Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{inv.client_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span>{inv.client_phone || '-'}</span>
                      </div>
                    </td>

                    {/* Package & Event Date */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{inv.package_name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateIndonesian(inv.event_date)} • {inv.event_location || 'Siantar'}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3.5 px-4 text-right font-bold text-white whitespace-nowrap">
                      {formatCurrencyIDR(inv.total_amount)}
                    </td>

                    {/* Paid Amount */}
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-400 whitespace-nowrap">
                      {formatCurrencyIDR(inv.paid_amount)}
                    </td>

                    {/* Remaining Amount */}
                    <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                      <span className={inv.remaining_amount <= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                        {inv.remaining_amount <= 0 ? 'LUNAS' : formatCurrencyIDR(inv.remaining_amount)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeStyle(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        {/* Preview / Detail */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(inv);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Lihat Detail & Cetak"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Direct PDF Download */}
                        <button
                          onClick={(e) => handleDownloadPDF(inv, e)}
                          disabled={pdfGeneratingId === inv.id}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 transition-colors disabled:opacity-50"
                          title="Download PDF (A4)"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* WhatsApp Share */}
                        <button
                          onClick={(e) => handleShareWhatsApp(inv, e)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-colors"
                          title="Kirim ke WhatsApp Klien"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={(e) => handleDeleteInvoice(inv.id, inv.invoice_number, e)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Hapus Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create / Issue Invoice */}
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onInvoiceCreated={(newInv) => {
          setActiveInvoice(newInv);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Modal: Invoice Detail / Preview / Print */}
      <InvoiceDetailModal
        invoice={activeInvoice}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setActiveInvoice(null);
        }}
      />
    </div>
  );
};
