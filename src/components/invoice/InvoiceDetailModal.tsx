/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * InvoiceDetailModal - Interactive preview, A4 PDF download, Print, and WhatsApp sharing
 * Styled with STOA brand identity: Gold aperture logo, charcoal aesthetics, and editorial elegance.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  Copy,
  Check,
  Calendar,
  Building,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  CreditCard,
  FileCheck,
  Sparkles,
  Clock,
  Film,
  Camera,
  DollarSign
} from 'lucide-react';
import { BookingInvoice } from '../../types/database';
import { dataService } from '../../services/dataService';
import { generateInvoicePDF } from '../../lib/invoicePdfGenerator';
import { formatCurrencyIDR, formatDateIndonesian } from '../../lib/formatters';
import { getPackageByName } from '../../data/stoaPricelist';

interface InvoiceDetailModalProps {
  invoice: BookingInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (newStatus: any) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onStatusChange
}) => {
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Retrieve package metadata and pricelist deliverables
  const pkg = invoice ? getPackageByName(invoice.package_name) : undefined;
  const snapshot = invoice?.snapshot_data;

  // Susun deliverables persis seperti katalog pricelist resmi STOA PICTURES
  const packageDeliverables = useMemo(() => {
    if (pkg?.deliverables && pkg.deliverables.length > 0) {
      return pkg.deliverables;
    }

    const items: Array<{ label: string; isHighlight?: boolean }> = [];
    const specs = snapshot?.package_specs;
    if (specs) {
      items.push({ label: 'Unlimited Photo (Semua file foto diambil)' });
      if (specs.album) items.push({ label: specs.album, isHighlight: true });
      if (specs.weddingCinema) items.push({ label: 'Wedding Cinema (Video Cinematic)', isHighlight: true });
      if (specs.drone) items.push({ label: 'Aerial Drone Footage Included', isHighlight: true });
      if (specs.videoDocumentation) items.push({ label: specs.videoDocumentation });
      if (specs.printFrame && specs.printFrame !== '-') items.push({ label: specs.printFrame });
      if (specs.coverage) items.push({ label: specs.coverage });
      if (specs.storage) items.push({ label: specs.storage, isHighlight: true });
      if (specs.crew) items.push({ label: specs.crew });
    } else {
      items.push(
        { label: 'Unlimited Photo (Semua file diambil)' },
        { label: 'Dokumentasi Foto & Video Hari H' },
        { label: 'All Edited Files' },
        { label: 'All files in Flashdisc', isHighlight: true }
      );
    }
    return items;
  }, [pkg, snapshot]);

  if (!isOpen || !invoice) return null;

  // Retrieve confirmed payments for this project
  const payments = dataService
    .getPayments()
    .filter(p => p.project_id === invoice.project_id && p.status === 'confirmed');

  // Copy invoice number
  const handleCopyNumber = () => {
    navigator.clipboard.writeText(invoice.invoice_number);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  // Generate WhatsApp message
  const generateWhatsAppMessage = (): string => {
    const sisaText = invoice.remaining_amount <= 0 
      ? '*LUNAS*' 
      : `*${formatCurrencyIDR(invoice.remaining_amount)}*`;

    return `Halo Kak *${invoice.client_name}*,\n\nBerikut kami sampaikan rincian *INVOICE BOOKING STOA PICTURES*:\n\n` +
      `📄 *No. Invoice:* ${invoice.invoice_number}\n` +
      `📅 *Tanggal Acara:* ${formatDateIndonesian(invoice.event_date)}\n` +
      `📍 *Lokasi Acara:* ${invoice.event_location || 'Pematang Siantar'}\n` +
      `📸 *Paket Layanan:* ${invoice.package_name}\n\n` +
      `💰 *Total Tagihan:* ${formatCurrencyIDR(invoice.total_amount)}\n` +
      `💳 *Sudah Terbayar:* ${formatCurrencyIDR(invoice.paid_amount)}\n` +
      `⚖️ *Sisa Tagihan:* ${sisaText}\n` +
      `📌 *Status:* ${invoice.status}\n\n` +
      `🏦 *Metode Rekening Resmi STOA:*\n` +
      `Bank BCA: 8375119583 a.n. BUDI ANTO\n` +
      `NPWP: 60.411.372.0-117.000\n\n` +
      `Terima kasih telah mempercayakan dokumentasi momen spesial Kakak bersama STOA PICTURES! ✨\n` +
      `_Official STOA PICTURES Finance_`;
  };

  // Open WhatsApp
  const handleShareWhatsApp = () => {
    const cleanPhone = (invoice.client_phone || '').replace(/[^0-9]/g, '');
    let targetPhone = cleanPhone;
    if (targetPhone.startsWith('0')) {
      targetPhone = '62' + targetPhone.slice(1);
    }
    const message = encodeURIComponent(generateWhatsAppMessage());
    const waUrl = targetPhone 
      ? `https://wa.me/${targetPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  // Copy formatted text
  const handleCopyText = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const doc = await generateInvoicePDF(invoice, payments);
      const filename = `${invoice.invoice_number.replace(/\//g, '_')}_${invoice.client_name.replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Print invoice
  const handlePrint = () => {
    window.print();
  };

  // Status badge styling
  const getBadgeStyle = (status: string) => {
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none print:bg-white">
        
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold text-amber-400">
              {invoice.invoice_number}
            </span>
            <button
              onClick={handleCopyNumber}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title="Salin Nomor Invoice"
            >
              {copiedNumber ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getBadgeStyle(invoice.status)}`}>
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Kirim WhatsApp</span>
            </button>

            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Salin Teks Format WhatsApp"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Tersalin' : 'Salin Teks'}</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? 'Membuat PDF...' : 'Download PDF (A4)'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container (Luxury A4 Document) */}
        <div className="overflow-y-auto p-6 sm:p-10 flex-1 bg-white text-slate-900 print:p-8 print:overflow-visible font-['Outfit',sans-serif]">
          {/* Gold Top Accent Line */}
          <div className="w-full h-1.5 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 mb-8 rounded-full"></div>

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-slate-200">
            <div className="flex items-center space-x-4">
              <img
                src="/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png"
                alt="STOA PICTURES"
                className="h-16 w-16 rounded-2xl object-cover shadow-sm border border-slate-200"
              />
              <div>
                <h1 className="text-2xl font-black tracking-wider text-slate-950 font-['Cinzel',serif]">
                  STOA PICTURES
                </h1>
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.2em] font-['Outfit',sans-serif]">
                  Wedding Photography & Videography
                </p>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Jl. Raider No.15, Bukit Sofa, Siantar Sitalasari, Pematang Siantar
                </p>
                <p className="text-xs text-slate-500 font-normal">
                  WhatsApp: +62 813-7258-1671 | Instagram: @stoapictures
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700 font-['Cinzel',serif]">
                Official Booking Bill
              </span>
              <h2 className="text-3xl font-black text-slate-950 mt-0.5 tracking-[0.16em] font-['Cinzel',serif]">
                INVOICE
              </h2>
              <p className="text-base font-mono font-bold text-amber-700 mt-1 tracking-wider">
                {invoice.invoice_number}
              </p>
              <div className="text-xs text-slate-500 mt-2 space-y-0.5">
                <p>Tanggal Terbit: <strong className="text-slate-800">{formatDateIndonesian(invoice.issue_date)}</strong></p>
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getBadgeStyle(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Client & Event Info (2 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-2">
                Ditujukan Kepada (Klien):
              </span>
              <h3 className="text-lg font-bold text-slate-950 mb-1">
                {invoice.client_name}
              </h3>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>WhatsApp: {invoice.client_phone || '-'}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lokasi: {invoice.event_location || 'Pematangsiantar'}</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-2">
                Rincian Jadwal & Layanan:
              </span>
              <h3 className="text-lg font-bold text-slate-950 mb-1">
                {invoice.package_name}
              </h3>
              <div className="text-xs text-slate-600 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tanggal Acara: {formatDateIndonesian(invoice.event_date)}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ref Booking: STOA-PROJ-{invoice.project_id.slice(-6).toUpperCase()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Order Breakdown Table */}
          <div className="overflow-x-auto my-6 border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-white uppercase text-[10.5px] tracking-[0.14em] font-bold">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Deskripsi Layanan & Spesifikasi</th>
                  <th className="py-3 px-4 text-center">Kuantitas</th>
                  <th className="py-3 px-4 text-right">Harga Satuan</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Package Row */}
                <tr className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-400 align-top text-xs">1</td>
                  <td className="py-3.5 px-4 align-top">
                    {/* Header Paket: Nama, Kategori & Tier Badge */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-extrabold text-slate-950 text-sm tracking-tight">
                        {invoice.package_name}
                      </span>
                      {pkg?.tierBadge && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                          {pkg.tierBadge}
                        </span>
                      )}
                      {pkg?.categoryLabel && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {pkg.categoryLabel}
                        </span>
                      )}
                    </div>

                    {/* Susunan Deliverables Rapi Persis Pricelist Resmi STOA */}
                    <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/90">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between border-b border-slate-200/70 pb-1.5 mb-2">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Spesifikasi & Rincian Layanan (Pricelist STOA):</span>
                        </span>
                        <span className="text-[9.5px] font-semibold text-slate-400 normal-case">
                          Katalog Resmi STOA
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {packageDeliverables.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-snug">
                            <CheckCircle2
                              className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                                item.isHighlight ? 'text-amber-600' : 'text-slate-400'
                              }`}
                            />
                            <span
                              className={
                                item.isHighlight
                                  ? 'font-bold text-slate-950'
                                  : 'text-slate-600 font-medium'
                              }
                            >
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Info Tambahan: Coverage, Storage & Crew */}
                      <div className="pt-2 mt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium shadow-2xs">
                          <Clock className="w-2.5 h-2.5 text-amber-600" />
                          <span>{pkg?.coverage || 'Morning Preparation s/d Selesai'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium shadow-2xs">
                          <Film className="w-2.5 h-2.5 text-amber-600" />
                          <span>{pkg?.storage || 'All files in Flashdisc'}</span>
                        </span>
                        {pkg?.crew && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium shadow-2xs">
                            <Camera className="w-2.5 h-2.5 text-amber-600" />
                            <span>{pkg.crew}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-700 align-top font-medium">1 Paket</td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-700 align-top">
                    {formatCurrencyIDR(
                      snapshot?.original_price || (invoice.total_amount + (snapshot?.discount || 0) - (snapshot?.transport_fee || 0) - (snapshot?.additional_album_fee || 0))
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 align-top">
                    {formatCurrencyIDR(
                      snapshot?.original_price || (invoice.total_amount + (snapshot?.discount || 0) - (snapshot?.transport_fee || 0) - (snapshot?.additional_album_fee || 0))
                    )}
                  </td>
                </tr>

                {/* Transport Fee Row */}
                {snapshot?.transport_fee && snapshot.transport_fee > 0 && (
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-400">2</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">Biaya Transportasi & Akomodasi Crew</div>
                      <div className="text-slate-500 text-[11px]">Mobilisasi lokasi acara ({invoice.event_location})</div>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">1 Trip</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{formatCurrencyIDR(snapshot.transport_fee)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrencyIDR(snapshot.transport_fee)}</td>
                  </tr>
                )}

                {/* Additional Album Row */}
                {snapshot?.additional_album_fee && snapshot.additional_album_fee > 0 && (
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-400">3</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">Biaya Tambahan Cetak Album Custom</div>
                      <div className="text-slate-500 text-[11px]">Penambahan album fisik eksklusif</div>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700">1 Unit</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{formatCurrencyIDR(snapshot.additional_album_fee)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrencyIDR(snapshot.additional_album_fee)}</td>
                  </tr>
                )}

                {/* Discount Row */}
                {snapshot?.discount && snapshot.discount > 0 && (
                  <tr className="bg-amber-50/60">
                    <td className="py-3 px-4 font-mono text-amber-700">4</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-amber-900">Potongan Harga Diskon Spesial</div>
                      <div className="text-amber-700 text-[11px]">{snapshot.discount_reason || 'Promo Khusus Klien'}</div>
                    </td>
                    <td className="py-3 px-4 text-center text-amber-800">1 Potongan</td>
                    <td className="py-3 px-4 text-right font-medium text-amber-800">- {formatCurrencyIDR(snapshot.discount)}</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-900">- {formatCurrencyIDR(snapshot.discount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Grid: Bank Info (Left) & Financial Summary (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            {/* Left: Payment Method & Notes (Mode Gelap) */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 text-slate-100 border border-slate-800 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.14em] flex items-center gap-1.5 font-['Cinzel',serif]">
                    <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                    Metode Rekening Resmi STOA
                  </span>
                  <span className="text-[9.5px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold uppercase tracking-wider">
                    Bank Transfer
                  </span>
                </div>

                {/* Dark Mode Bank Details Table */}
                <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 font-mono text-xs text-slate-200 space-y-2 leading-relaxed">
                  <div className="flex justify-between items-center text-slate-400 text-[11px] pb-1.5 border-b border-slate-800/80">
                    <span>Bank Tujuan:</span>
                    <span className="font-bold text-white">Bank BCA (Bank Central Asia)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 text-[11px] pb-1.5 border-b border-slate-800/80">
                    <span>Nomor Rekening:</span>
                    <span className="font-extrabold text-amber-400 text-sm tracking-wider">8375119583</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 text-[11px] pb-1.5 border-b border-slate-800/80">
                    <span>Atas Nama (A.N):</span>
                    <span className="font-bold text-white">BUDI ANTO</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 text-[11px]">
                    <span>NPWP :</span>
                    <span className="font-bold text-amber-400">60.411.372.0-117.000</span>
                  </div>
                </div>

                {invoice.bank_info && !invoice.bank_info.includes('8375119583') && (
                  <div className="mt-2 text-xs text-slate-300 font-mono whitespace-pre-line bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    {invoice.bank_info}
                  </div>
                )}

                {invoice.notes && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs text-slate-400 italic">
                    <span className="font-bold not-italic text-amber-400">Catatan: </span>
                    {invoice.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Total Pembayaran (Sesuai Format Lampiran Resmi STOA) */}
            <div className="p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3 font-['Outfit',sans-serif]">
              {/* Rows Subtotal Layanan & Biaya Tambahan */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-600 font-normal">Subtotal Layanan:</span>
                  <span className="font-semibold text-slate-900 font-mono tabular-nums">
                    {formatCurrencyIDR(
                      snapshot?.original_price && snapshot.original_price > 0
                        ? snapshot.original_price
                        : (invoice.total_amount + (snapshot?.discount || 0) - (snapshot?.transport_fee || 0) - (snapshot?.additional_album_fee || 0))
                    )}
                  </span>
                </div>

                {Boolean(snapshot?.transport_fee && snapshot.transport_fee > 0) && (
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-600 font-normal">Biaya Transport & Akomodasi:</span>
                    <span className="font-semibold text-slate-900 font-mono tabular-nums">
                      +{formatCurrencyIDR(snapshot!.transport_fee)}
                    </span>
                  </div>
                )}

                {Boolean(snapshot?.additional_album_fee && snapshot.additional_album_fee > 0) && (
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-600 font-normal">Biaya Tambahan Cetak Album:</span>
                    <span className="font-semibold text-slate-900 font-mono tabular-nums">
                      +{formatCurrencyIDR(snapshot!.additional_album_fee)}
                    </span>
                  </div>
                )}

                {Boolean(snapshot?.discount && snapshot.discount > 0) && (
                  <div className="flex justify-between items-center py-0.5 text-emerald-700">
                    <span className="font-normal">Potongan Diskon Promo:</span>
                    <span className="font-semibold font-mono tabular-nums">
                      -{formatCurrencyIDR(snapshot!.discount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Pembayaran Header Row */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                <div>
                  <span className="block text-xs font-black text-slate-900 uppercase tracking-wider leading-none">
                    TOTAL
                  </span>
                  <span className="block text-xs font-black text-slate-900 uppercase tracking-wider leading-tight">
                    PEMBAYARAN:
                  </span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-950 font-mono tabular-nums">
                  {formatCurrencyIDR(invoice.total_amount)}
                </div>
              </div>

              {/* DP Terkonfirmasi Strip / Card (Mint / Teal Box Persis Lampiran) */}
              {(() => {
                const isLunas = invoice.remaining_amount <= 0;
                const dpAmount = snapshot?.initial_dp && snapshot.initial_dp > 0 ? snapshot.initial_dp : invoice.paid_amount;
                const dpPercent = invoice.total_amount > 0 ? Math.round((dpAmount / invoice.total_amount) * 100) : 20;

                return (
                  <div className="bg-[#E8F8F5] border border-[#A3E4D7] rounded-lg p-2.5 sm:p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E6251]">
                        <CheckCircle2 className="w-4 h-4 text-[#16A085] shrink-0" />
                        <span>
                          {isLunas
                            ? 'Pembayaran Lunas (100%):'
                            : `DP Terkonfirmasi (${dpPercent}%):`}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#117A65] pl-5.5 font-medium">
                        {isLunas
                          ? 'Layanan & Acara Resmi Terbayar Penuh'
                          : 'Jadwal Acara Resmi Terkunci'}
                      </div>
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-[#0E6251] font-mono tabular-nums">
                      {formatCurrencyIDR(isLunas ? invoice.paid_amount : dpAmount)}
                    </div>
                  </div>
                );
              })()}

              {/* Sisa Pelunasan Row */}
              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-slate-800 font-semibold">
                  {invoice.remaining_amount <= 0 ? 'Sisa Pelunasan:' : 'Sisa Pelunasan (Maks H+1):'}
                </span>
                <span className={`font-extrabold text-sm sm:text-base font-mono tabular-nums ${
                  invoice.remaining_amount <= 0 ? 'text-emerald-700' : 'text-slate-950'
                }`}>
                  {invoice.remaining_amount <= 0 ? 'Rp 0 (LUNAS)' : formatCurrencyIDR(invoice.remaining_amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History Log (if payments exist) */}
          {payments.length > 0 && (
            <div className="my-6 border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Riwayat Transaksi Pembayaran Terkonfirmasi
              </div>
              <div className="p-3 text-xs divide-y divide-slate-100">
                {payments.map((p, idx) => (
                  <div key={p.id} className="py-2 flex justify-between items-center text-slate-700">
                    <div>
                      <span className="font-semibold text-slate-900">{idx + 1}. {p.description || `Pembayaran ${p.payment_type.toUpperCase()}`}</span>
                      <span className="text-slate-500 text-[11px] block">{formatDateIndonesian(p.payment_date)} via {p.payment_method}</span>
                    </div>
                    <div className="font-bold text-emerald-700 text-sm">
                      {formatCurrencyIDR(p.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Footer note */}
          <div className="mt-10 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 space-y-0.5">
            <p className="font-semibold text-slate-600">NPWP : 60.411.372.0-117.000 | STOA PICTURES FOTO STUDIO</p>
            <p>Invoice ini diterbitkan secara sah oleh Sistem Keuangan STOA FINANCE v4.0. Harap simpan invoice ini sebagai bukti pemesanan resmi.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
