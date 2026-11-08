/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileUp,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Eye,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import {
  parseExcelWorkbook,
  generateSampleExcelTemplate,
  MigrationPreviewResult
} from '../../services/excelMigration';
import { ImportLog, Project, ProjectDeliverable, HistoricalFinancialRecap, HistoricalSamuraFee } from '../../types/database';
import { formatIDR, formatDateID } from '../../lib/formatters';

interface ExcelImportProps {
  importLogs: ImportLog[];
  onCommitImport: (payload: {
    projects: Project[];
    deliverables: ProjectDeliverable[];
    recaps: HistoricalFinancialRecap[];
    samuraFees: HistoricalSamuraFee[];
    log: Omit<ImportLog, 'id' | 'imported_at'>;
  }) => void;
  onResetToDefault: () => void;
}

export const ExcelImport: React.FC<ExcelImportProps> = ({
  importLogs,
  onCommitImport,
  onResetToDefault
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewResult, setPreviewResult] = useState<MigrationPreviewResult | null>(null);
  const [commitSuccessMessage, setCommitSuccessMessage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setCommitSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const result = parseExcelWorkbook(buffer, file.name);
        setPreviewResult(result);
      } catch (err: any) {
        alert(`Gagal membaca file Excel: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const templateBytes = generateSampleExcelTemplate();
    const blob = new Blob([templateBytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'STOA_Template_Pembukuan_Wedding.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmMigration = () => {
    if (!previewResult) return;

    onCommitImport({
      projects: previewResult.projects,
      deliverables: previewResult.deliverables,
      recaps: previewResult.recaps,
      samuraFees: previewResult.samuraFees,
      log: {
        filename: previewResult.filename,
        imported_by: 'Admin Finance',
        sheets_processed: previewResult.sheetsFound,
        total_records_read: previewResult.totalRecordsRead,
        projects_imported: previewResult.projects.length,
        deliverables_imported: previewResult.deliverables.length,
        recaps_imported: previewResult.recaps.length,
        skipped_records: previewResult.skippedCount,
        failed_records: previewResult.failedCount,
        error_details: previewResult.errors.length > 0 ? previewResult.errors : null
      }
    });

    setCommitSuccessMessage(`Migrasi data selesai! ${previewResult.projects.length} Proyek dan ${previewResult.deliverables.length} Deliverable berhasil diintegrasikan ke sistem.`);
    setPreviewResult(null);
    setActiveTab('history');
  };

  return (
    <div className="space-y-6">
      {/* Top Tabs */}
      <div className="flex items-center justify-between border-b border-[#E5E7DC] dark:border-[#353935] pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('upload')}
            className={`text-xs font-bold pb-2 border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-[#C06014] text-[#C06014]'
                : 'border-transparent text-[#536162] hover:text-[#424642]'
            }`}
          >
            Upload & Migrasi Excel
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-xs font-bold pb-2 border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-[#C06014] text-[#C06014]'
                : 'border-transparent text-[#536162] hover:text-[#424642]'
            }`}
          >
            Riwayat Log Migrasi ({importLogs.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-[#C06014]" />
            <span>Unduh Template Multi-Sheet (.xlsx)</span>
          </button>
        </div>
      </div>

      {commitSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{commitSuccessMessage}</span>
        </div>
      )}

      {activeTab === 'upload' ? (
        <div className="space-y-6">
          {/* Instructions Box */}
          <div className="p-5 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
            <h3 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C06014]" />
              <span>Panduan Migrasi Buku Kas Excel STOA PICTURES (2022 - 2026)</span>
            </h3>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-1 leading-relaxed">
              Sistem ini secara otomatis menormalkan struktur kolom Excel multi-sheet yang berbeda setiap tahunnya:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs text-[#536162] dark:text-[#9BA39B]">
              <div className="p-3 rounded-lg bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                <strong className="text-[#424642] dark:text-[#F3F4ED] block mb-1">Sheet Tahun (2022 - 2026)</strong>
                Membaca Tanggal, Nama Klien, Paket, Nilai Kontrak, DP, dan menyimpan kolom <code>SISA</code> Excel asli secara terpisah sebagai <code>legacy_sisa</code>.
              </div>
              <div className="p-3 rounded-lg bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                <strong className="text-[#424642] dark:text-[#F3F4ED] block mb-1">Sheet PENDING</strong>
                Mendeteksi status Google Drive, Album Cetak, Cinema, Shooting Liputan, Operator, Biaya Cetak, dan Target Deadline.
              </div>
              <div className="p-3 rounded-lg bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                <strong className="text-[#424642] dark:text-[#F3F4ED] block mb-1">Sheet REKAP</strong>
                Menyimpan snapshot historis rekapitulasi bulanan, omzet, pengeluaran, dan Fee Samura asli untuk keperluan rekonsiliasi audit.
              </div>
            </div>
          </div>

          {/* Upload Drag & Drop Area */}
          <div className="p-8 rounded-2xl border-2 border-dashed border-[#E5E7DC] dark:border-[#353935] hover:border-[#C06014] transition-colors bg-white dark:bg-[#1E201E] text-center">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#C06014]/10 text-[#C06014] flex items-center justify-center">
                <FileUp className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">
                  Pilih atau Tarik File Excel (.xlsx / .xls)
                </h4>
                <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-0.5">
                  Mendukung file workbook gabungan berisi sheet 2022, 2023, 2024, 2025, 2026, REKAP, dan PENDING
                </p>
              </div>

              <div>
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#424642] hover:bg-[#2D2F2D] text-white text-xs font-semibold shadow-xs transition-colors">
                  <span>Pilih File Excel</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {isProcessing && (
                <p className="text-xs text-[#C06014] font-medium animate-pulse">
                  Menganalisis lembar kerja dan mencocokkan skema database...
                </p>
              )}
            </div>
          </div>

          {/* Preview Before Saving */}
          {previewResult && (
            <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7DC] dark:border-[#353935] pb-4">
                <div>
                  <h4 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
                    Pratinjau Migrasi Data: {previewResult.filename}
                  </h4>
                  <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
                    Sheet Ditemukan: {previewResult.sheetsFound.join(', ')}
                  </p>
                </div>

                <button
                  onClick={handleConfirmMigration}
                  className="px-4 py-2 rounded-lg bg-[#C06014] hover:bg-[#a65210] text-xs font-bold text-white transition-colors flex items-center gap-2 shadow-xs"
                >
                  <span>Simpan ke Database Supabase</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Counts Badge Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                  <span className="text-[10px] font-bold text-[#536162] uppercase">Proyek Terbaca</span>
                  <p className="text-lg font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-0.5">
                    {previewResult.projects.length} Records
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                  <span className="text-[10px] font-bold text-[#536162] uppercase">Deliverables (Pending)</span>
                  <p className="text-lg font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-0.5">
                    {previewResult.deliverables.length} Records
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                  <span className="text-[10px] font-bold text-[#536162] uppercase">Rekap Bulanan (REKAP)</span>
                  <p className="text-lg font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-0.5">
                    {previewResult.recaps.length} Records
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
                  <span className="text-[10px] font-bold text-[#536162] uppercase">Dilewati / Gagal</span>
                  <p className="text-lg font-bold text-amber-600 tabular-nums mt-0.5">
                    {previewResult.skippedCount + previewResult.failedCount} Baris
                  </p>
                </div>
              </div>

              {/* Sample Projects Preview */}
              <div>
                <h5 className="text-xs font-bold uppercase text-[#424642] dark:text-[#F3F4ED] mb-2">
                  Cuplikan Proyek yang Akan Dimigrasi (5 Pertama)
                </h5>
                <div className="border border-[#E5E7DC] dark:border-[#353935] rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FDFBF7] dark:bg-[#252825] text-[#536162]">
                      <tr>
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Klien</th>
                        <th className="py-2.5 px-3">Tgl Acara</th>
                        <th className="py-2.5 px-3">Paket</th>
                        <th className="py-2.5 px-3 text-right">Nilai Kontrak</th>
                        <th className="py-2.5 px-3 text-right">DP Awal</th>
                        <th className="py-2.5 px-3 text-right">Legacy Sisa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7DC]">
                      {previewResult.projects.slice(0, 5).map(p => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-mono">{p.project_code}</td>
                          <td className="py-2 px-3 font-bold">{p.client_name}</td>
                          <td className="py-2 px-3">{formatDateID(p.event_date)}</td>
                          <td className="py-2 px-3">{p.package_name}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{formatIDR(p.contract_value)}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{formatIDR(p.initial_dp)}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-mono text-[#C06014]">
                            {p.legacy_sisa !== null ? formatIDR(p.legacy_sisa) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History / Logs Tab */
        <div className="rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] overflow-hidden">
          <div className="p-4 bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935]">
            <h4 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">
              Log & Audit Riwayat Migrasi Data Excel
            </h4>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
              Catatan lengkap proses impor, waktu eksekusi, dan integritas data
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E5E7DC] text-[#536162]">
                  <th className="py-3 px-4 font-semibold">Waktu Impor</th>
                  <th className="py-3 px-4 font-semibold">Nama File</th>
                  <th className="py-3 px-4 font-semibold">Sheet Diproses</th>
                  <th className="py-3 px-4 font-semibold text-right">Proyek Diimpor</th>
                  <th className="py-3 px-4 font-semibold text-right">Deliverables</th>
                  <th className="py-3 px-4 font-semibold text-right">Rekap</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7DC]">
                {importLogs.length > 0 ? (
                  importLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#FDFBF7]">
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-[#424642]">
                        {formatDateID(log.imported_at)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#424642]">
                        {log.filename}
                      </td>
                      <td className="py-3 px-4 text-[#536162]">
                        {log.sheets_processed.join(', ')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 tabular-nums">
                        {log.projects_imported}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#C06014] tabular-nums">
                        {log.deliverables_imported}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {log.recaps_imported}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          BERHASIL
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#536162]">
                      Belum ada riwayat impor Excel. Silakan unggah file buku kas pada tab Upload.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
