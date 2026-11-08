/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Professional PDF & Excel Export Engine for STOA FINANCE
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Project, Payment, ProjectExpense, ProjectDeliverable, HistoricalFinancialRecap } from '../types/database';
import { formatDateID, formatIDR, getMonthCategoryFromDate } from './formatters';

// Palette constants matching STOA PICTURES
const COLOR_CHARCOAL: [number, number, number] = [66, 70, 66]; // #424642
const COLOR_ACCENT: [number, number, number] = [192, 96, 20];   // #C06014
const COLOR_SLATE: [number, number, number] = [83, 97, 98];    // #536162
const COLOR_LIGHT_BG: [number, number, number] = [243, 244, 237]; // #F3F4ED

export function exportProjectsToPDF(projects: Project[], title = 'Laporan Data Proyek STOA Pictures') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Branding
  doc.setFillColor(...COLOR_CHARCOAL);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STOA PICTURES', 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Wedding Photography & Cinematography · Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar', 14, 18);

  doc.text(`Dicetak: ${formatDateID(new Date().toISOString())}`, 280, 18, { align: 'right' });

  // Title
  doc.setTextColor(...COLOR_CHARCOAL);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  // Table
  const tableData = projects.map((p, idx) => [
    idx + 1,
    p.project_code,
    p.client_name,
    p.client_phone || '-',
    formatDateID(p.event_date),
    p.package_name,
    formatIDR(p.contract_value),
    formatIDR(p.total_payments_received || 0),
    formatIDR(p.outstanding_balance || 0),
    formatIDR(p.total_expenses || 0),
    formatIDR(p.gross_profit || 0)
  ]);

  autoTable(doc, {
    startY: 38,
    head: [[
      'No', 'Kode', 'Klien', 'WhatsApp', 'Tgl Acara', 'Paket', 'Nilai Kontrak', 'Terbayar', 'Sisa Piutang', 'Pengeluaran', 'Gross Profit'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_CHARCOAL,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [248, 248, 245]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 32 },
      3: { cellWidth: 24 },
      4: { cellWidth: 22 },
      5: { cellWidth: 30 },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right', fontStyle: 'bold' },
      9: { halign: 'right' },
      10: { halign: 'right', fontStyle: 'bold' }
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

export function exportFinancialStatementPDF(params: {
  periodTitle: string;
  totalRevenue: number;
  totalReceived: number;
  totalReceivables: number;
  totalExpenses: number;
  netProfit: number;
  expenseCategories: { name: string; amount: number; percentage: number }[];
  projectCount: number;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Branding Banner
  doc.setFillColor(...COLOR_CHARCOAL);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('STOA PICTURES', 16, 13);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('LAPORAN KEUANGAN · Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar', 16, 21);
  doc.text(`Dicetak: ${formatDateID(new Date().toISOString())}`, 194, 21, { align: 'right' });

  // Period
  doc.setTextColor(...COLOR_CHARCOAL);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Periode: ${params.periodTitle}`, 16, 38);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_SLATE);
  doc.text(`Total Project Aktif: ${params.projectCount} Wedding Events`, 16, 44);

  // Financial Table
  const financialRows = [
    ['PENDAPATAN (REVENUE)', ''],
    ['  Total Nilai Kontrak Proyek (Omzet)', formatIDR(params.totalRevenue)],
    ['  Total Pembayaran Diterima (Kas Masuk)', formatIDR(params.totalReceived)],
    ['  Total Piutang Klien (Belum Lunas)', formatIDR(params.totalReceivables)],
    ['', ''],
    ['BEBAN BIAYA PRODUKSI (PRODUCTION EXPENSES)', ''],
    ...params.expenseCategories.map(c => [
      `  • ${c.name} (${c.percentage.toFixed(1)}%)`,
      formatIDR(c.amount)
    ]),
    ['  Total Seluruh Pengeluaran Produksi', formatIDR(params.totalExpenses)],
    ['', ''],
    ['LABA BERSIH STUDIO (NET PROFIT)', formatIDR(params.netProfit)]
  ];

  autoTable(doc, {
    startY: 48,
    head: [['Komponen Keuangan', 'Nominal (IDR)']],
    body: financialRows,
    theme: 'plain',
    headStyles: {
      fillColor: COLOR_CHARCOAL,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 30, 30]
    },
    didParseCell: (data) => {
      const rowIndex = data.row.index;
      // Style headers & totals
      const lastRowIndex = financialRows.length - 1;
      if (rowIndex === 0 || rowIndex === 5 || rowIndex === financialRows.length - 3 || rowIndex === lastRowIndex) {
        data.cell.styles.fontStyle = 'bold';
      }
      if (rowIndex === lastRowIndex) { // Net Profit
        data.cell.styles.fillColor = [235, 245, 255];
        data.cell.styles.textColor = [15, 60, 140];
        data.cell.styles.fontSize = 10;
      }
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', cellWidth: 58 }
    }
  });

  // Footer Signatures
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_SLATE);

  doc.text('Dibuat oleh,', 30, finalY + 20);
  doc.text('Finance & Accounting', 30, finalY + 25);
  doc.line(30, finalY + 45, 75, finalY + 45);
  doc.text('( STOA Finance )', 30, finalY + 50);

  doc.text('Disetujui oleh,', 140, finalY + 20);
  doc.text('Director & Lead Photographer', 140, finalY + 25);
  doc.line(140, finalY + 45, 185, finalY + 45);
  doc.text('( Budi Anto )', 140, finalY + 50);

  doc.save(`laporan_keuangan_${params.periodTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}

export function exportExpensesToPDF(expenses: ProjectExpense[], title = 'Laporan Rincian Pengeluaran Produksi STOA Pictures') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Branding Banner
  doc.setFillColor(...COLOR_CHARCOAL);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STOA PICTURES', 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Wedding Photography & Cinematography · Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar', 14, 18);
  doc.text(`Dicetak: ${formatDateID(new Date().toISOString())}`, 280, 18, { align: 'right' });

  // Title
  doc.setTextColor(...COLOR_CHARCOAL);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_SLATE);
  doc.text(`Total Transaksi: ${expenses.length} item · Total Pengeluaran: ${formatIDR(totalAmount)}`, 14, 40);

  const tableData: any[] = expenses.map((e, idx) => [
    idx + 1,
    formatDateID(e.transaction_date),
    e.category,
    e.project_code || '-',
    e.client_name || '-',
    e.recipient_name || '-',
    e.description || '-',
    formatIDR(e.amount)
  ]);

  tableData.push([
    '', '', '', '', '', '', 'TOTAL PENGELUARAN', formatIDR(totalAmount)
  ]);

  autoTable(doc, {
    startY: 44,
    head: [[
      'No', 'Tanggal', 'Kategori', 'Kode Proyek', 'Klien', 'Penerima / Tim', 'Deskripsi Biaya', 'Nominal (IDR)'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_CHARCOAL,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [248, 248, 245]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 28 },
      3: { cellWidth: 25, fontStyle: 'bold' },
      4: { cellWidth: 35 },
      5: { cellWidth: 40 },
      6: { cellWidth: 65 },
      7: { halign: 'right', fontStyle: 'bold' }
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

export function exportPaymentsToPDF(payments: Payment[], title = 'Laporan Pembayaran Klien STOA Pictures') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Branding Banner
  doc.setFillColor(...COLOR_CHARCOAL);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STOA PICTURES', 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Wedding Photography & Cinematography · Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar', 14, 18);
  doc.text(`Dicetak: ${formatDateID(new Date().toISOString())}`, 280, 18, { align: 'right' });

  // Title
  doc.setTextColor(...COLOR_CHARCOAL);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  const totalAmount = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_SLATE);
  doc.text(`Total Transaksi: ${payments.length} item · Total Pembayaran Diterima: ${formatIDR(totalAmount)}`, 14, 40);

  const tableData: any[] = payments.map((p, idx) => [
    idx + 1,
    formatDateID(p.payment_date),
    p.project_code || '-',
    p.client_name || '-',
    p.payment_type.toUpperCase(),
    p.payment_method,
    p.description || '-',
    p.status.toUpperCase(),
    formatIDR(p.amount)
  ]);

  tableData.push([
    '', '', '', '', '', '', '', 'TOTAL DITERIMA', formatIDR(totalAmount)
  ]);

  autoTable(doc, {
    startY: 44,
    head: [[
      'No', 'Tanggal', 'Kode Proyek', 'Klien', 'Tipe', 'Metode Bayar', 'Keterangan', 'Status', 'Nominal (IDR)'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_CHARCOAL,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [248, 248, 245]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 26, fontStyle: 'bold' },
      3: { cellWidth: 40 },
      4: { cellWidth: 20 },
      5: { cellWidth: 28 },
      6: { cellWidth: 65 },
      7: { cellWidth: 22, halign: 'center' },
      8: { halign: 'right', fontStyle: 'bold' }
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

export function exportDeliverablesToPDF(deliverables: ProjectDeliverable[], title = 'Laporan Monitoring Deliverables STOA Pictures') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header Branding Banner
  doc.setFillColor(...COLOR_CHARCOAL);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STOA PICTURES', 14, 12);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Wedding Photography & Cinematography · Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar', 14, 18);
  doc.text(`Dicetak: ${formatDateID(new Date().toISOString())}`, 280, 18, { align: 'right' });

  // Title
  doc.setTextColor(...COLOR_CHARCOAL);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 34);

  const tableData: any[] = deliverables.map((d, idx) => [
    idx + 1,
    d.project_code || '-',
    d.client_name || '-',
    d.event_date ? formatDateID(d.event_date) : '-',
    d.deadline ? formatDateID(d.deadline) : '-',
    d.package_name || '-',
    d.album_type || '-',
    d.drive_status,
    d.album_status,
    d.cinematic_status,
    `${d.completion_percentage ?? 0}%`
  ]);

  autoTable(doc, {
    startY: 40,
    head: [[
      'No', 'Kode Proyek', 'Klien', 'Tgl Acara', 'Deadline', 'Paket', 'Jenis Album', 'Drive', 'Album', 'Cinema', 'Progres'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLOR_CHARCOAL,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40]
    },
    alternateRowStyles: {
      fillColor: [248, 248, 245]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 35 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 30 },
      6: { cellWidth: 45 },
      7: { cellWidth: 20 },
      8: { cellWidth: 20 },
      9: { cellWidth: 20 },
      10: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }
    }
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

export function exportProjectsToExcel(projects: Project[], filename = 'Data_Project_STOA') {
  const rows = projects.map((p, idx) => ({
    'No': idx + 1,
    'Kode Proyek': p.project_code,
    'Nama Klien': p.client_name,
    'No WhatsApp': p.client_phone || '-',
    'Tanggal Acara': p.event_date,
    'Kategori Bulan': p.month_category || getMonthCategoryFromDate(p.event_date),
    'Lokasi Acara': p.event_location,
    'Paket': p.package_name,
    'Harga Asli Paket (IDR)': p.original_price || p.contract_value,
    'Biaya Transport (IDR)': p.transport_fee || 0,
    'Tambahan Cetak Album (IDR)': p.additional_album_fee || 0,
    'Diskon (IDR)': p.discount || 0,
    'Keterangan Diskon': p.discount_reason || '-',
    'Nilai Kontrak Bersih (IDR)': p.contract_value,
    'DP Awal (IDR)': p.initial_dp,
    'Total Terbayar (IDR)': p.total_payments_received || 0,
    'Sisa Piutang (IDR)': p.outstanding_balance || 0,
    'Total Pengeluaran (IDR)': p.total_expenses || 0,
    'Gross Profit (IDR)': p.gross_profit || 0,
    'Net Profit (IDR)': p.net_profit_after_fee || p.gross_profit || 0
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Projects');
  XLSX.writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}

export function exportPaymentsToExcel(payments: Payment[], filename = 'Pembayaran_Klien_STOA') {
  const rows = payments.map((p, idx) => ({
    'No': idx + 1,
    'Kode Proyek': p.project_code || '-',
    'Klien': p.client_name || '-',
    'Tanggal Bayar': p.payment_date,
    'Tipe Pembayaran': p.payment_type.toUpperCase(),
    'Nominal (IDR)': p.amount,
    'Metode Bayar': p.payment_method,
    'No Referensi': p.reference_number || '-',
    'Keterangan': p.description,
    'Status': p.status
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pembayaran');
  XLSX.writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}

export function exportExpensesToExcel(expenses: ProjectExpense[], filename = 'Pengeluaran_Produksi_STOA') {
  const rows = expenses.map((e, idx) => ({
    'No': idx + 1,
    'Kode Proyek': e.project_code || '-',
    'Kategori': e.category,
    'Tanggal': e.transaction_date,
    'Nominal (IDR)': e.amount,
    'Penerima / Vendor / Tim': e.recipient_name,
    'Deskripsi': e.description
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');
  XLSX.writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}

export function exportDeliverablesToExcel(deliverables: ProjectDeliverable[], filename = 'Monitoring_Pending_STOA') {
  const rows = deliverables.map((d, idx) => ({
    'No': idx + 1,
    'Kode Proyek': d.project_code || '-',
    'Nama Klien': d.client_name || '-',
    'Tgl Acara': d.event_date || '-',
    'Deadline': d.deadline,
    'Paket': d.package_name || '-',
    'Jenis Album': d.album_type || '-',
    'Biaya Cetak (IDR)': d.printing_price || 0,
    'Status Drive': d.drive_status,
    'Status Album': d.album_status,
    'Status Cinema': d.cinematic_status,
    'Status Liputan': d.shooting_status,
    'Operator Shooting': d.shooting_operator,
    'Progres (%)': d.completion_percentage ?? 0,
    'Catatan': d.notes || ''
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pending Deliverables');
  XLSX.writeFile(wb, `${filename}_${Date.now()}.xlsx`);
}
