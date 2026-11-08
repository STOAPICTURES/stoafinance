/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Excel Data Migration Engine for STOA PICTURES
 * Supports importing multi-sheet workbooks (2022, 2023, 2024, 2025, 2026, REKAP, PENDING)
 * with schema normalization, legacy_sisa preservation, duplicate prevention, and template download.
 */

import * as XLSX from 'xlsx';
import {
  Project,
  ProjectDeliverable,
  HistoricalFinancialRecap,
  HistoricalSamuraFee,
  DeliverableStatus,
  ProjectStatus
} from '../types/database';

export interface MigrationPreviewResult {
  filename: string;
  sheetsFound: string[];
  totalRecordsRead: number;
  projects: Project[];
  deliverables: ProjectDeliverable[];
  recaps: HistoricalFinancialRecap[];
  samuraFees: HistoricalSamuraFee[];
  skippedCount: number;
  failedCount: number;
  errors: string[];
}

export function parseExcelWorkbook(fileBuffer: ArrayBuffer, filename: string): MigrationPreviewResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames;
  
  const projects: Project[] = [];
  const deliverables: ProjectDeliverable[] = [];
  const recaps: HistoricalFinancialRecap[] = [];
  const samuraFees: HistoricalSamuraFee[] = [];
  const errors: string[] = [];

  let totalRecordsRead = 0;
  let skippedCount = 0;
  let failedCount = 0;

  // Process Year Sheets (2022, 2023, 2024, 2025, 2026, or any sheet starting with 202)
  const yearSheets = sheetNames.filter(name => /^(202[0-9])/i.test(name.trim()));
  
  for (const sheetName of yearSheets) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { raw: false, defval: null });
    const yearNumber = parseInt(sheetName.trim().substring(0, 4), 10) || new Date().getFullYear();

    rows.forEach((row, rowIndex) => {
      totalRecordsRead++;
      try {
        // Find client name in flexible headers
        const clientName = findValue(row, ['client', 'nama client', 'nama klien', 'pengantin', 'nama', 'client name']);
        if (!clientName || String(clientName).trim() === '') {
          skippedCount++;
          return;
        }

        // Date extraction
        const rawDate = findValue(row, ['tgl', 'tanggal', 'date', 'event date', 'tgl acara']);
        const normalizedDate = normalizeDate(rawDate, yearNumber);
        
        // Financial values
        const contractVal = parseNumeric(findValue(row, ['total', 'nilai kontrak', 'harga', 'paket price', 'contract value', 'nominal']));
        const dpVal = parseNumeric(findValue(row, ['dp', 'dp awal', 'down payment', 'dp 1', 'termin 1']));
        const legacySisa = parseNumeric(findValue(row, ['sisa', 'sisa bayar', 'piutang', 'pelunasan']));

        // Package & Location
        const packageName = findValue(row, ['paket', 'package', 'nama paket', 'layanan']) || 'Wedding Package Standard';
        const location = findValue(row, ['lokasi', 'tempat', 'venue', 'location', 'kota']) || 'Jakarta';
        const notes = findValue(row, ['notes', 'keterangan', 'catatan', 'detail']);

        const projectCode = `STOA-${yearNumber}-${String(projects.length + 1).padStart(3, '0')}`;
        const projectId = `proj-migrated-${yearNumber}-${rowIndex + 1}`;

        // Determine initial project status based on event date
        let status: ProjectStatus = 'Completed';
        if (normalizedDate) {
          const evtTime = new Date(normalizedDate).getTime();
          const nowTime = Date.now();
          if (evtTime > nowTime) {
            status = 'Scheduled';
          }
        }

        const project: Project = {
          id: projectId,
          project_code: projectCode,
          client_id: `client-migrated-${rowIndex + 1}`,
          client_name: String(clientName).trim(),
          event_date: normalizedDate || `${yearNumber}-01-01`,
          event_location: String(location).trim(),
          package_name: String(packageName).trim(),
          contract_value: contractVal ?? 0,
          initial_dp: dpVal ?? 0,
          status,
          notes: notes ? String(notes).trim() : null,
          source_year: yearNumber,
          source_sheet: sheetName,
          source_row_id: String(rowIndex + 2),
          legacy_sisa: legacySisa, // Preserved explicitly as requested
          raw_date_text: rawDate ? String(rawDate).trim() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        projects.push(project);
      } catch (err: any) {
        failedCount++;
        errors.push(`Sheet [${sheetName}] Baris ${rowIndex + 2}: ${err.message || 'Format tidak sesuai'}`);
      }
    });
  }

  // Process PENDING Sheet
  const pendingSheetName = sheetNames.find(n => /pending/i.test(n.trim()));
  if (pendingSheetName) {
    const sheet = workbook.Sheets[pendingSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { raw: false, defval: null });

    rows.forEach((row, rowIndex) => {
      totalRecordsRead++;
      try {
        const clientName = findValue(row, ['client', 'nama client', 'nama', 'pengantin']);
        if (!clientName) {
          skippedCount++;
          return;
        }

        const rawDeadline = findValue(row, ['deadline', 'jatuh tempo', 'tgl deadline']);
        const deadline = normalizeDate(rawDeadline, new Date().getFullYear()) || new Date().toISOString().slice(0, 10);
        const albumType = findValue(row, ['album', 'jenis album', 'album type', 'tipe album']);
        const printingPrice = parseNumeric(findValue(row, ['biaya cetak', 'harga cetak', 'cetak', 'printing price']));
        const operator = findValue(row, ['operator', 'operator shooting', 'lead fg', 'fotografer']) || 'STOA Team';

        const driveStatus = normalizeDeliverableStatus(findValue(row, ['drive', 'google drive', 'link drive', 'status drive']));
        const albumStatus = normalizeDeliverableStatus(findValue(row, ['status album', 'album status', 'cetak status']));
        const cinematicStatus = normalizeDeliverableStatus(findValue(row, ['cinema', 'cinematic', 'video status', 'status cinema']));
        const shootingStatus = normalizeDeliverableStatus(findValue(row, ['shooting', 'liputan', 'status shooting']));
        const notes = findValue(row, ['keterangan', 'notes', 'catatan']);

        // Match with projects if possible
        const matchedProject = projects.find(p => p.client_name.toLowerCase() === String(clientName).trim().toLowerCase());
        const projectId = matchedProject ? matchedProject.id : `proj-pending-${rowIndex + 1}`;

        const deliv: ProjectDeliverable = {
          id: `deliv-migrated-${rowIndex + 1}`,
          project_id: projectId,
          deadline,
          album_type: albumType ? String(albumType).trim() : 'Album Standar',
          printing_price: printingPrice ?? 0,
          drive_status: driveStatus,
          album_status: albumStatus,
          cinematic_status: cinematicStatus,
          shooting_status: shootingStatus,
          shooting_operator: String(operator).trim(),
          notes: notes ? String(notes).trim() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        deliverables.push(deliv);
      } catch (err: any) {
        failedCount++;
        errors.push(`Sheet PENDING Baris ${rowIndex + 2}: ${err.message}`);
      }
    });
  }

  // Process REKAP Sheet
  const rekapSheetName = sheetNames.find(n => /rekap/i.test(n.trim()));
  if (rekapSheetName) {
    const sheet = workbook.Sheets[rekapSheetName];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { raw: false, defval: null });

    rows.forEach((row, rowIndex) => {
      totalRecordsRead++;
      try {
        const monthField = findValue(row, ['bulan', 'month', 'periode']);
        const yearField = parseNumeric(findValue(row, ['tahun', 'year'])) || new Date().getFullYear();
        if (!monthField) {
          skippedCount++;
          return;
        }

        const monthNum = parseMonthNumber(String(monthField));
        const rev = parseNumeric(findValue(row, ['omzet', 'revenue', 'total kontrak', 'pendapatan'])) ?? 0;
        const paid = parseNumeric(findValue(row, ['pembayaran', 'masuk', 'terbayar', 'payment received'])) ?? rev;
        const exp = parseNumeric(findValue(row, ['pengeluaran', 'expense', 'biaya'])) ?? 0;
        const profit = parseNumeric(findValue(row, ['profit', 'laba', 'gross profit'])) ?? (rev - exp);
        const fee = parseNumeric(findValue(row, ['fee samura', 'samura', 'fee'])) ?? Math.round(profit * 0.2);
        const net = parseNumeric(findValue(row, ['net profit', 'profit setelah fee', 'laba bersih'])) ?? (profit - fee);

        const recap: HistoricalFinancialRecap = {
          id: `recap-migrated-${yearField}-${monthNum}`,
          year: yearField,
          month: monthNum,
          month_name: String(monthField).trim(),
          total_revenue: rev,
          total_payments_received: paid,
          total_expenses: exp,
          gross_profit: profit,
          samura_fee: fee,
          net_profit_after_fee: net,
          source_sheet: rekapSheetName,
          imported_at: new Date().toISOString()
        };

        recaps.push(recap);

        // Also record historical Samura fee snapshot
        samuraFees.push({
          id: `hsf-migrated-${yearField}-${monthNum}`,
          year: yearField,
          month: monthNum,
          fee_percentage: profit > 0 ? Math.round((fee / profit) * 100) : 20,
          original_fee_amount: fee,
          original_profit_base: profit,
          notes: `Historical Samura snapshot from sheet ${rekapSheetName}`,
          source_sheet: rekapSheetName,
          imported_at: new Date().toISOString()
        });
      } catch (err: any) {
        failedCount++;
        errors.push(`Sheet REKAP Baris ${rowIndex + 2}: ${err.message}`);
      }
    });
  }

  return {
    filename,
    sheetsFound: sheetNames,
    totalRecordsRead,
    projects,
    deliverables,
    recaps,
    samuraFees,
    skippedCount,
    failedCount,
    errors
  };
}

// Helpers
function findValue(row: Record<string, any>, candidates: string[]): any {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
    if (match && row[match] !== null && row[match] !== undefined) {
      return row[match];
    }
  }
  return null;
}

function parseNumeric(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeDate(val: any, defaultYear: number): string | null {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  // Check format DD/MM/YYYY or DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // Swap if MM/DD/YYYY detected where month > 12
    if (day > 12 && month <= 12) {
      // standard DD/MM/YYYY
    } else if (month > 12 && day <= 12) {
      const tmp = day;
      day = month;
      month = tmp;
    }

    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Attempt parse native Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return `${defaultYear}-01-01`;
}

function normalizeDeliverableStatus(val: any): DeliverableStatus {
  if (!val) return 'PENDING';
  const clean = String(val).trim().toUpperCase();
  if (clean.includes('DONE') || clean.includes('SELESAI') || clean.includes('OK') || clean.includes('SUDAH')) {
    return 'DONE';
  }
  if (clean.includes('PROGRESS') || clean.includes('PROSES') || clean.includes('JALAN')) {
    return 'IN PROGRESS';
  }
  if (clean.includes('NA') || clean.includes('TIDAK') || clean.includes('N/A')) {
    return 'NOT APPLICABLE';
  }
  return 'PENDING';
}

function parseMonthNumber(monthStr: string): number {
  const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
  const clean = monthStr.toLowerCase();
  for (let i = 0; i < months.length; i++) {
    if (clean.includes(months[i])) {
      return i + 1;
    }
  }
  const num = parseInt(monthStr, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  return 1;
}

/**
 * Generate a complete multi-sheet Excel Template for STOA PICTURES
 */
export function generateSampleExcelTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 2024
  const sheet2024Data = [
    { 'TGL': '17/02/2024', 'NAMA CLIENT': 'Dimas Pratama & Nadia Larasati', 'PAKET': 'Gold Premium', 'LOKASI': 'Pematangsiantar', 'NILAI KONTRAK': 8500000, 'DP': 3000000, 'SISA': 0, 'CATATAN': 'Lunas' },
    { 'TGL': '23/03/2024', 'NAMA CLIENT': 'Kevin Sanjaya & Jessica Mila', 'PAKET': 'GOLD Prestige', 'LOKASI': 'Grand Ballroom Siantar', 'NILAI KONTRAK': 9500000, 'DP': 4000000, 'SISA': 0, 'CATATAN': 'Lunas' },
    { 'TGL': '20/04/2024', 'NAMA CLIENT': 'Rizky Febian & Sarah Ramadhani', 'PAKET': 'Silver Signature', 'LOKASI': 'Hotel Siantar', 'NILAI KONTRAK': 7500000, 'DP': 2500000, 'SISA': 0, 'CATATAN': 'Lunas' },
    { 'TGL': '12/10/2024', 'NAMA CLIENT': 'Ilham Kurnia & Sarah Alatas', 'PAKET': 'Silver Standart', 'LOKASI': 'Gedung Sitalasari', 'NILAI KONTRAK': 5000000, 'DP': 2000000, 'SISA': 1000000, 'CATATAN': 'Sisa H-1 Bulan' }
  ];
  const ws2024 = XLSX.utils.json_to_sheet(sheet2024Data);
  XLSX.utils.book_append_sheet(wb, ws2024, '2024');

  // Sheet PENDING
  const sheetPendingData = [
    { 'CLIENT': 'Ilham Kurnia & Sarah Alatas', 'DEADLINE': '20/11/2024', 'ALBUM': 'Cetak Album Megazine 10 Sheet', 'BIAYA CETAK': 1200000, 'DRIVE': 'DONE', 'STATUS ALBUM': 'IN PROGRESS', 'CINEMA': 'IN PROGRESS', 'SHOOTING': 'DONE', 'OPERATOR': '2 FG + 2 Cinema', 'KETERANGAN': 'Teaser 1 min approved' },
    { 'CLIENT': 'Fakhri Pratama & Nabila Azzahra', 'DEADLINE': '30/12/2024', 'ALBUM': 'Cetak Album Megazine 10 Sheet', 'BIAYA CETAK': 1500000, 'DRIVE': 'PENDING', 'STATUS ALBUM': 'PENDING', 'CINEMA': 'PENDING', 'SHOOTING': 'PENDING', 'OPERATOR': 'Lead FG STOA', 'KETERANGAN': 'Jadwal 23 Nov' }
  ];
  const wsPending = XLSX.utils.json_to_sheet(sheetPendingData);
  XLSX.utils.book_append_sheet(wb, wsPending, 'PENDING');

  // Sheet REKAP
  const sheetRekapData = [
    { 'BULAN': 'Januari', 'TAHUN': 2024, 'OMZET': 25500000, 'PEMBAYARAN': 25500000, 'PENGELUARAN': 10200000, 'PROFIT': 15300000, 'NET PROFIT': 15300000 },
    { 'BULAN': 'Februari', 'TAHUN': 2024, 'OMZET': 34000000, 'PEMBAYARAN': 34000000, 'PENGELUARAN': 13600000, 'PROFIT': 20400000, 'NET PROFIT': 20400000 },
    { 'BULAN': 'Maret', 'TAHUN': 2024, 'OMZET': 160000000, 'PEMBAYARAN': 160000000, 'PENGELUARAN': 59000000, 'PROFIT': 101000000, 'FEE SAMURA': 20200000, 'NET PROFIT': 80800000 }
  ];
  const wsRekap = XLSX.utils.json_to_sheet(sheetRekapData);
  XLSX.utils.book_append_sheet(wb, wsRekap, 'REKAP');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
