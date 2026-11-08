/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Professional A4 PDF Generator for STOA PICTURES Booking Invoices
 * Uses jsPDF and jspdf-autotable for clean, luxury editorial layout.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BookingInvoice, Payment } from '../types/database';
import { formatCurrencyIDR, formatDateIndonesian } from './formatters';
import { getPackageByName } from '../data/stoaPricelist';

const LOGO_SRC = '/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png';

/**
 * Loads an image URL into a base64 Data URL for embedding into jsPDF
 */
async function loadImageDataUrl(url: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function generateInvoicePDF(
  invoice: BookingInvoice,
  confirmedPayments: Payment[] = []
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4' // 210 x 297 mm
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Try loading STOA logo
  const logoData = await loadImageDataUrl(LOGO_SRC);

  // Background subtle aesthetic
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top header accent line (Luxury Gold)
  doc.setFillColor(180, 83, 9); // Amber-700 / Gold
  doc.rect(0, 0, pageWidth, 4.5, 'F');

  let currentY = 16;

  // Header: Logo on left, Invoice title & metadata on right
  if (logoData) {
    try {
      // 18mm square elegant icon
      doc.addImage(logoData, 'PNG', margin, currentY, 18, 18, undefined, 'FAST');
      doc.setFont('times', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('STOA PICTURES', margin + 22, currentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.text('WEDDING PHOTOGRAPHY & VIDEOGRAPHY', margin + 22, currentY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Jl. Raider No. 15, Bukit Sofa, Kec. Siantar Sitalasari, Pematang Siantar', margin + 22, currentY + 14);
      doc.text('WhatsApp: +62 813-7258-1671 | Instagram: @stoapictures', margin + 22, currentY + 18);
    } catch {
      // fallback text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('STOA PICTURES', margin, currentY + 6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      doc.text('WEDDING PHOTOGRAPHY & VIDEOGRAPHY', margin, currentY + 11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('Jl. Raider No. 15, Bukit Sofa, Kec. Siantar Sitalasari, Pematang Siantar', margin, currentY + 15);
      doc.text('WhatsApp: +62 813-7258-1671 | Instagram: @stoapictures', margin, currentY + 19);
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text('STOA PICTURES', margin, currentY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text('WEDDING PHOTOGRAPHY & VIDEOGRAPHY', margin, currentY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Jl. Raider No. 15, Bukit Sofa, Kec. Siantar Sitalasari, Pematang Siantar', margin, currentY + 15);
    doc.text('WhatsApp: +62 813-7258-1671 | Instagram: @stoapictures', margin, currentY + 19);
  }

  // Right Header: INVOICE title & number
  const rightX = pageWidth - margin;
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE BOOKING', rightX, currentY + 6, { align: 'right' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9); // Gold
  doc.text(invoice.invoice_number, rightX, currentY + 12, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Tgl Terbit: ${formatDateIndonesian(invoice.issue_date)}`, rightX, currentY + 17, { align: 'right' });

  // Status Badge on PDF
  const statusColors: Record<string, [number, number, number]> = {
    LUNAS: [16, 185, 129], // Emerald
    'DP DITERIMA': [59, 130, 246], // Blue
    CICILAN: [168, 85, 247], // Purple
    TERBIT: [245, 158, 11], // Amber
    DRAFT: [148, 163, 184], // Slate
    DIBATALKAN: [239, 68, 68] // Red
  };
  const badgeColor = statusColors[invoice.status] || [100, 116, 139];

  // Draw pill badge
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(rightX - 34, currentY + 23, 34, 6.5, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(invoice.status, rightX - 17, currentY + 27.5, { align: 'center' });

  // Divider Line
  currentY = 50;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, rightX, currentY);

  // Client and Event Information (2-Column Box)
  currentY += 5;
  const colWidth = (contentWidth - 6) / 2;

  // Box 1: Billed To (Klien)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, colWidth, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colWidth, 26, 2, 2, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9);
  doc.text('DITUJUKAN KEPADA (KLIEN):', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.client_name || 'Klien STOA', margin + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`WhatsApp: ${invoice.client_phone || '-'}`, margin + 4, currentY + 17);
  doc.text(`Lokasi Acara: ${invoice.event_location || 'Pematangsiantar'}`, margin + 4, currentY + 21.5);

  // Box 2: Event Details
  const col2X = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, currentY, colWidth, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(col2X, currentY, colWidth, 26, 2, 2, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(180, 83, 9);
  doc.text('RINCIAN JADWAL & PAKET:', col2X + 4, currentY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.package_name || 'Paket Wedding', col2X + 4, currentY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Acara: ${formatDateIndonesian(invoice.event_date)}`, col2X + 4, currentY + 17);
  doc.text(`No. Referensi: ${invoice.project_id ? `STOA-PROJ-${invoice.project_id.slice(-6).toUpperCase()}` : '-'}`, col2X + 4, currentY + 21.5);

  // Table of Order Items & Specs
  currentY += 31;

  // Build items rows
  const tableRows: any[] = [];
  const snapshot = invoice.snapshot_data;

  // Primary package item
  const pkg = getPackageByName(invoice.package_name);
  let specDetails = '';

  if (pkg?.deliverables && pkg.deliverables.length > 0) {
    const lines = pkg.deliverables.map(d => `   •  ${d.label}`);
    specDetails = `\n\nSpesifikasi & Rincian Layanan (Pricelist STOA):\n${lines.join('\n')}`;
  } else if (snapshot?.package_specs) {
    const s = snapshot.package_specs;
    const parts: string[] = ['   •  Unlimited Photo (Semua file foto diambil)'];
    if (s.album) parts.push(`   •  ${s.album}`);
    if (s.weddingCinema) parts.push('   •  Wedding Cinema (Video Cinematic Pernikahan)');
    if (s.drone) parts.push('   •  Aerial Drone Footage Included');
    if (s.videoDocumentation) parts.push(`   •  ${s.videoDocumentation}`);
    if (s.printFrame && s.printFrame !== '-') parts.push(`   •  ${s.printFrame}`);
    specDetails = `\n\nSpesifikasi & Rincian Layanan:\n${parts.join('\n')}`;
  }

  const basePrice = (snapshot?.original_price && snapshot.original_price > 0)
    ? snapshot.original_price
    : (invoice.total_amount + (snapshot?.discount || 0) - (snapshot?.transport_fee || 0) - (snapshot?.additional_album_fee || 0));

  tableRows.push([
    '1',
    `${invoice.package_name}${specDetails}`,
    '1 Paket',
    formatCurrencyIDR(basePrice),
    formatCurrencyIDR(basePrice)
  ]);

  let itemIndex = 2;

  // Transport fee item if exists
  if (snapshot?.transport_fee && snapshot.transport_fee > 0) {
    tableRows.push([
      (itemIndex++).toString(),
      `Biaya Operasional & Transportasi Acara (${invoice.event_location || 'Luar Kota'})`,
      '1 Trip',
      formatCurrencyIDR(snapshot.transport_fee),
      formatCurrencyIDR(snapshot.transport_fee)
    ]);
  }

  // Additional album fee if exists
  if (snapshot?.additional_album_fee && snapshot.additional_album_fee > 0) {
    tableRows.push([
      (itemIndex++).toString(),
      'Biaya Tambahan Cetak Album Custom / Penambahan Halaman Eksklusif',
      '1 Unit',
      formatCurrencyIDR(snapshot.additional_album_fee),
      formatCurrencyIDR(snapshot.additional_album_fee)
    ]);
  }

  // Discount item if exists
  if (snapshot?.discount && snapshot.discount > 0) {
    const discountLabel = snapshot.discount_reason 
      ? `Potongan Harga Promo / Diskon Spesial (${snapshot.discount_reason})`
      : 'Potongan Harga Promo / Diskon Spesial';
    tableRows.push([
      (itemIndex++).toString(),
      discountLabel,
      '1 Potongan',
      `- ${formatCurrencyIDR(snapshot.discount)}`,
      `- ${formatCurrencyIDR(snapshot.discount)}`
    ]);
  }

  if (typeof (doc as any).setLineHeightFactor === 'function') {
    (doc as any).setLineHeightFactor(1.4);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['No', 'Deskripsi Layanan & Spesifikasi', 'Kuantitas', 'Harga Satuan', 'Subtotal']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 3.5
    },
    styles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 4,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 29, halign: 'right', fontStyle: 'bold' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  const afterTableY = (doc as any).lastAutoTable.finalY + 5;

  // Two-column bottom section: Left = Bank Info & Terms; Right = Payment Calculations
  const bottomColWidth = (contentWidth - 6) / 2;

  // Right column: Financial breakdown
  const calcX = margin + bottomColWidth + 6;
  let calcY = afterTableY;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(calcX, calcY, bottomColWidth, 48, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(calcX, calcY, bottomColWidth, 48, 2, 2, 'S');

  // Rows in summary
  const renderSummaryRow = (label: string, value: string, yPos: number, isBold = false, isHighlight = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(isHighlight ? 180 : 71, isHighlight ? 83 : 85, isHighlight ? 9 : 105);
    doc.text(label, calcX + 4, yPos);
    doc.text(value, calcX + bottomColWidth - 4, yPos, { align: 'right' });
  };

  renderSummaryRow('Total Harga Paket:', formatCurrencyIDR(invoice.total_amount), calcY + 8, true);
  
  const initialDpVal = snapshot?.initial_dp || 0;
  if (initialDpVal > 0) {
    renderSummaryRow('DP Awal Booking:', formatCurrencyIDR(initialDpVal), calcY + 14);
  } else {
    renderSummaryRow('DP Awal Booking:', 'Rp 0', calcY + 14);
  }

  renderSummaryRow('Total Pembayaran Tercatat:', formatCurrencyIDR(invoice.paid_amount), calcY + 20, true, true);

  // Line before remaining
  doc.setDrawColor(203, 213, 225);
  doc.line(calcX + 4, calcY + 24, calcX + bottomColWidth - 4, calcY + 24);

  // Outstanding Box
  const isLunas = invoice.remaining_amount <= 0;
  doc.setFillColor(isLunas ? 240 : 254, isLunas ? 253 : 243, isLunas ? 244 : 242);
  doc.roundedRect(calcX + 3, calcY + 27, bottomColWidth - 6, 17, 1.5, 1.5, 'F');
  doc.setDrawColor(isLunas ? 16 : 245, isLunas ? 185 : 158, isLunas ? 129 : 11);
  doc.roundedRect(calcX + 3, calcY + 27, bottomColWidth - 6, 17, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(isLunas ? 16 : 180, isLunas ? 185 : 83, isLunas ? 129 : 9);
  doc.text(isLunas ? 'STATUS TAGIHAN:' : 'SISA PEMBAYARAN:', calcX + 6, calcY + 34);

  doc.setFontSize(11);
  doc.text(
    isLunas ? 'LUNAS (TERBAYAR PENUH)' : formatCurrencyIDR(invoice.remaining_amount),
    calcX + bottomColWidth - 6,
    calcY + 39,
    { align: 'right' }
  );

  // Left column: Payment Instructions & Bank Info (Mode Gelap)
  let leftY = afterTableY;
  doc.setFillColor(15, 23, 42); // Dark slate #0F172A
  doc.roundedRect(margin, leftY, bottomColWidth, 48, 2, 2, 'F');
  doc.setDrawColor(51, 65, 85); // Border #334155
  doc.roundedRect(margin, leftY, bottomColWidth, 48, 2, 2, 'S');

  doc.setFont('times', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11); // Amber / gold
  doc.text('METODE REKENING RESMI STOA:', margin + 4, leftY + 6.5);

  // Inner card table for Bank Account
  doc.setFillColor(2, 6, 23); // #020617 Slate-950
  doc.roundedRect(margin + 3, leftY + 9.5, bottomColWidth - 6, 28, 1.5, 1.5, 'F');
  doc.setDrawColor(51, 65, 85);
  doc.roundedRect(margin + 3, leftY + 9.5, bottomColWidth - 6, 28, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Bank Tujuan:', margin + 6, leftY + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Bank BCA (Bank Central Asia)', margin + 30, leftY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('No. Rekening:', margin + 6, leftY + 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(251, 191, 36); // Amber gold
  doc.text('8375119583', margin + 30, leftY + 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Atas Nama (A.N):', margin + 6, leftY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BUDI ANTO', margin + 30, leftY + 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('NPWP :', margin + 6, leftY + 33);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(251, 191, 36);
  doc.text('60.411.372.0-117.000', margin + 30, leftY + 33);

  if (invoice.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Catatan: ${invoice.notes.slice(0, 48)}`, margin + 4, leftY + 42);
  }

  // Payment History Log if payments exist
  let historyY = calcY + 52;
  if (confirmedPayments.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('RIWAYAT TRANSAKSI PEMBAYARAN TERKONFIRMASI:', margin, historyY);

    const payRows = confirmedPayments.map((p, idx) => [
      (idx + 1).toString(),
      formatDateIndonesian(p.payment_date),
      p.description || `Pembayaran ${p.payment_type.toUpperCase()}`,
      p.payment_method || 'Transfer Bank',
      formatCurrencyIDR(p.amount)
    ]);

    autoTable(doc, {
      startY: historyY + 2,
      head: [['No', 'Tanggal', 'Keterangan', 'Metode', 'Nominal']],
      body: payRows,
      theme: 'plain',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'left',
        cellPadding: 2
      },
      styles: {
        fontSize: 7,
        textColor: [51, 65, 85],
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 28 },
        2: { cellWidth: 80 },
        3: { cellWidth: 34 },
        4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
      }
    });

    historyY = (doc as any).lastAutoTable.finalY + 6;
  }

  // Footer: Signatures & STOA Official Stamp Note
  const footerY = Math.max(historyY, 252);

  // Notes or greetings
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    invoice.notes 
      ? `Catatan Khusus: ${invoice.notes}`
      : 'Terima kasih telah mempercayakan momen bahagia dan berharga Anda kepada STOA PICTURES.',
    margin,
    footerY
  );


  // Bottom brand banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    'STOA FINANCE v4.0 | INVOICE RESMI STOA PICTURES | NPWP: 60.411.372.0-117.000 | SIANTAR - MEDAN',
    pageWidth / 2,
    pageHeight - 2,
    { align: 'center' }
  );

  return doc;
}
