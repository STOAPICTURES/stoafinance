/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  Key,
  Globe,
  Copy,
  Check,
  RefreshCw,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Building,
  UploadCloud,
  Download,
  Code2,
  FolderArchive,
  ExternalLink
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  isSupabaseConfigured
} from '../../lib/supabase';
import { SUPABASE_SQL_SCHEMA } from '../../lib/sqlScript';
import { dataService } from '../../services/dataService';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface SettingsProps {
  onSyncSupabase: () => void;
  isSyncing?: boolean;
}

export const Settings: React.FC<SettingsProps> = ({ onSyncSupabase, isSyncing = false }) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [tableStatus, setTableStatus] = useState<{ connected: boolean; ready: boolean; missingTables: string[]; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearProjectsConfirmOpen, setIsClearProjectsConfirmOpen] = useState(false);
  const [isClearClientsConfirmOpen, setIsClearClientsConfirmOpen] = useState(false);
  const [isClearTeamConfirmOpen, setIsClearTeamConfirmOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey);
    setIsTesting(true);
    const res = await testSupabaseConnection(url, anonKey);
    setTestResult(res);
    const status = await dataService.checkSupabaseTables();
    setTableStatus(status);
    setIsTesting(false);
  };

  const handleTestOnly = async () => {
    setIsTesting(true);
    const res = await testSupabaseConnection(url, anonKey);
    setTestResult(res);
    const status = await dataService.checkSupabaseTables();
    setTableStatus(status);
    setIsTesting(false);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handlePushAllToSupabase = async () => {
    setPushStatus('Sedang menyinkronkan data proyek & klien ke Supabase...');
    const res = await dataService.syncWithSupabase();
    setPushStatus(res.message);
    setTimeout(() => setPushStatus(null), 8000);
  };

  const handleResetData = () => {
    dataService.resetToDefault();
    setIsResetConfirmOpen(false);
    alert('Seluruh database (Klien, Proyek, Tim, dan Transaksi) berhasil dikosongkan total.');
  };

  return (
    <div className="space-y-8 max-w-5xl pb-12">
      {/* Supabase Connection Setup */}
      <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C06014]">
              <Database className="w-4 h-4" />
              <span>Koneksi Database PostgreSQL & Supabase</span>
            </div>
            <h3 className="text-xl font-bold text-[#424642] dark:text-[#F3F4ED]">
              Konfigurasi Supabase Project (STOA FINANCE)
            </h3>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B] leading-relaxed max-w-2xl">
              Sistem STOA Finance menghubungkan pembukuan langsung ke PostgreSQL Supabase dengan Row Level Security (RLS). Seluruh data proyek, pembayaran, dan pengeluaran tersinkronisasi aman di cloud.
            </p>
          </div>

          <div className="shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isSupabaseConfigured()
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isSupabaseConfigured() ? 'Koneksi Siap / Aktif' : 'Belum Dikonfigurasi'}</span>
            </span>
          </div>
        </div>

        {/* Project Profile Banner */}
        <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
              ⚡
            </div>
            <div>
              <div className="font-bold text-[#424642] dark:text-[#F3F4ED] flex items-center gap-2">
                <span>STOA FINANCE</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold font-mono">
                  xdxhylnmbzqqsjccujyo
                </span>
              </div>
              <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] font-mono">
                https://xdxhylnmbzqqsjccujyo.supabase.co
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://supabase.com/dashboard/project/xdxhylnmbzqqsjccujyo/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-[#C06014] font-semibold bg-[#C06014]/10 hover:bg-[#C06014]/20 px-2.5 py-1 rounded-lg border border-[#C06014]/30 transition-colors"
            >
              Buka SQL Editor ↗
            </a>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
              ✓ Database Terhubung
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Project URL (VITE_SUPABASE_URL) *
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536162]" />
                <input
                  type="url"
                  placeholder="https://xdxhylnmbzqqsjccujyo.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Public Anon Key (VITE_SUPABASE_ANON_KEY) *
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536162]" />
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
                />
              </div>
            </div>
          </div>

          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs font-medium border flex items-center gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <div className="flex-1">
                <p>{testResult.message}</p>
                {tableStatus && !tableStatus.ready && (
                  <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                    {tableStatus.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {pushStatus && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800">
              {pushStatus}
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestOnly}
                disabled={isTesting}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-[#C06014]' : ''}`} />
                <span>Uji Koneksi & Cek Tabel</span>
              </button>

              <button
                type="button"
                onClick={handlePushAllToSupabase}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Sinkronisasi Cloud Dua Arah</span>
              </button>
            </div>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#C06014] hover:bg-[#a65210] rounded-lg transition-colors shadow-xs"
            >
              Simpan & Hubungkan
            </button>
          </div>
        </form>
      </div>

      {/* SQL DDL Schema Script Box */}
      <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED] flex items-center gap-2">
              <Server className="w-4 h-4 text-[#C06014]" />
              <span>Script DDL Skema PostgreSQL (Supabase SQL Editor)</span>
            </h4>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-0.5">
              Salin dan jalankan script ini di menu <strong>SQL Editor</strong> di dashboard Supabase Anda untuk membuat 15 tabel normalized, RLS, dan views pelaporan secara instan.
            </p>
          </div>

          <button
            onClick={handleCopySQL}
            className="px-3.5 py-2 rounded-lg bg-[#424642] hover:bg-[#2D2F2D] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#C06014]" />}
            <span>{isCopied ? 'Tersalin!' : 'Salin Script SQL'}</span>
          </button>
        </div>



        {/* Code Snippet Box */}
        <div className="relative rounded-xl overflow-hidden border border-[#E5E7DC] dark:border-[#353935] bg-[#1E201E]">
          <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      </div>

      {/* Business Profile & System Info */}
      <div className="p-6 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7DC] dark:border-[#353935] pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-black border border-[#353935] p-0.5 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img
                src="/assets/aistudio/TOMBOL_STOA_PICTURES_4062729d.png"
                alt="Logo STOA PICTURES"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#C06014]" />
                <h4 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
                  Profil Bisnis Studio STOA PICTURES
                </h4>
              </div>
              <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-0.5">
                Identitas resmi studio untuk invoice kuitansi, laporan keuangan, dan PWA
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold self-start sm:self-auto">
            ✓ Logo Resmi 2026 Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
            <span className="text-[#536162] dark:text-[#9BA39B] block mb-1">Nama Usaha:</span>
            <strong className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">STOA PICTURES</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
            <span className="text-[#536162] dark:text-[#9BA39B] block mb-1">Director & Lead:</span>
            <strong className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">Budi Anto</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
            <span className="text-[#536162] dark:text-[#9BA39B] block mb-1">Bidang Layanan:</span>
            <strong className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">Wedding Photography & Cinema</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
            <span className="text-[#536162] dark:text-[#9BA39B] block mb-1">Mata Uang & Wilayah:</span>
            <strong className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">IDR (Rp) · Indonesia (WIB)</strong>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935] text-xs">
          <span className="text-[#536162] dark:text-[#9BA39B] block font-semibold mb-1">Alamat Kantor Studio:</span>
          <p className="text-xs font-medium text-[#424642] dark:text-[#F3F4ED] leading-relaxed">
            Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar, Sumatera Utara 21113
          </p>
        </div>
      </div>

      {/* Source Code Export & Brand Duplication Section */}
      <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 dark:border-indigo-900/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <FolderArchive className="w-4 h-4" />
              <span>Ekspor & Duplikasi Source Code Lengkap</span>
            </div>
            <h4 className="text-base font-bold text-[#424642] dark:text-[#F3F4ED]">
              Download Kode Sumber Aplikasi (.ZIP) & Kustomisasi Brand Baru
            </h4>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B] max-w-2xl leading-relaxed">
              Anda dapat mengunduh seluruh berkas kode sumber aplikasi ini (semua komponen React, Tailwind CSS, TypeScript, modul akuntansi, generator PDF invoice, dan script SQL database) dalam format ZIP untuk menduplikasi aplikasi ini dengan nama brand atau studio baru Anda.
            </p>
          </div>

          <a
            href="/stoa_finance_source_code.zip"
            download="stoa_finance_source_code.zip"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Source Code (.ZIP)</span>
          </a>
        </div>

        {/* Panduan Kustomisasi Brand Baru */}
        <div className="space-y-3">
          <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>File & Baris Kode yang Perlu Diubah untuk Ganti Nama Brand:</span>
          </h5>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E201E] border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
              <div className="font-bold text-[#C06014] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C06014]" />
                <span>1. Nama Brand & Navigasi</span>
              </div>
              <ul className="text-[11px] text-[#536162] dark:text-[#9BA39B] space-y-1 list-disc list-inside">
                <li><code className="text-indigo-600 font-mono">src/components/layout/Sidebar.tsx</code> — Ganti tulisan STOA FINANCE & Stoa Pictures Official</li>
                <li><code className="text-indigo-600 font-mono">src/components/layout/TopNavbar.tsx</code> — Ganti nama brand di header</li>
                <li><code className="text-indigo-600 font-mono">index.html</code> — Ganti &lt;title&gt; dan meta tags</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E201E] border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
              <div className="font-bold text-[#C06014] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C06014]" />
                <span>2. Logo & Ikon Studio</span>
              </div>
              <ul className="text-[11px] text-[#536162] dark:text-[#9BA39B] space-y-1 list-disc list-inside">
                <li>Ganti file gambar di folder <code className="text-indigo-600 font-mono">public/assets/</code> dengan logo brand Anda</li>
                <li>Timpa <code className="text-indigo-600 font-mono">public/logo_stoa.png</code> dan <code className="text-indigo-600 font-mono">public/apple-touch-icon.png</code></li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E201E] border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
              <div className="font-bold text-[#C06014] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C06014]" />
                <span>3. Paket Layanan & Pricelist</span>
              </div>
              <ul className="text-[11px] text-[#536162] dark:text-[#9BA39B] space-y-1 list-disc list-inside">
                <li><code className="text-indigo-600 font-mono">src/data/stoaPricelist.ts</code> — Ubah nama-nama paket layanan, harga, spesifikasi cetak & liputan video</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-[#1E201E] border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
              <div className="font-bold text-[#C06014] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C06014]" />
                <span>4. Faktur Invoice & Rekening Bank</span>
              </div>
              <ul className="text-[11px] text-[#536162] dark:text-[#9BA39B] space-y-1 list-disc list-inside">
                <li><code className="text-indigo-600 font-mono">src/lib/invoicePdfGenerator.ts</code> — Sesuaikan nomor rekening bank, nama pemilik rekening, NPWP & kontak studio pada PDF invoice</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Data */}
      <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">
            Area Pemeliharaan Database STOA FINANCE
          </h4>
          <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-0.5">
            Kelola atau kosongkan data secara terpisah untuk data proyek, database tim/kru, atau seluruh database.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Clear Projects */}
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-[#1E201E] flex flex-col justify-between space-y-3">
            <div>
              <h5 className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED]">Database Proyek</h5>
              <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">
                Kosongkan seluruh data proyek, riwayat pembayaran, pengeluaran produksi, dan deliverables.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsClearProjectsConfirmOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              Kosongkan Proyek
            </button>
          </div>

          {/* Clear Clients */}
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-[#1E201E] flex flex-col justify-between space-y-3">
            <div>
              <h5 className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED]">Database Klien</h5>
              <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">
                Kosongkan seluruh kontak dan profil klien pengantin yang tersimpan di sistem.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsClearClientsConfirmOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              Kosongkan Klien
            </button>
          </div>

          {/* Clear Team */}
          <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-[#1E201E] flex flex-col justify-between space-y-3">
            <div>
              <h5 className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED]">Database Tim & Kru</h5>
              <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">
                Kosongkan seluruh profil anggota tim, kru foto/video, editor, dan vendor.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsClearTeamConfirmOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              Kosongkan Tim
            </button>
          </div>

          {/* Clear All Database */}
          <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-500/5 dark:bg-rose-950/30 flex flex-col justify-between space-y-3">
            <div>
              <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400">Reset Total Semua Data</h5>
              <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">
                Kosongkan total semua data proyek, database klien, database tim, dan transaksi pembukuan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              Reset Total Database
            </button>
          </div>
        </div>
      </div>

      {/* Clear Projects Dialog */}
      <ConfirmDialog
        isOpen={isClearProjectsConfirmOpen}
        onClose={() => setIsClearProjectsConfirmOpen(false)}
        onConfirm={() => {
          dataService.clearProjectsDatabase();
          setIsClearProjectsConfirmOpen(false);
        }}
        title="Kosongkan Semua Data Proyek"
        message="PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh data proyek? Seluruh data proyek, riwayat pembayaran, pengeluaran produksi, dan deliverables akan dihapus secara permanen."
        confirmLabel="Ya, Kosongkan Proyek"
      />

      {/* Clear Clients Dialog */}
      <ConfirmDialog
        isOpen={isClearClientsConfirmOpen}
        onClose={() => setIsClearClientsConfirmOpen(false)}
        onConfirm={() => {
          dataService.clearClientsDatabase();
          setIsClearClientsConfirmOpen(false);
        }}
        title="Kosongkan Semua Database Klien"
        message="PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh database klien? Seluruh profil dan kontak klien akan dihapus secara permanen."
        confirmLabel="Ya, Kosongkan Klien"
      />

      {/* Clear Team Dialog */}
      <ConfirmDialog
        isOpen={isClearTeamConfirmOpen}
        onClose={() => setIsClearTeamConfirmOpen(false)}
        onConfirm={() => {
          dataService.clearTeamDatabase();
          setIsClearTeamConfirmOpen(false);
        }}
        title="Kosongkan Database Tim"
        message="PERINGATAN: Apakah Anda yakin ingin mengosongkan database anggota tim? Seluruh profil kru dan vendor akan dihapus."
        confirmLabel="Ya, Kosongkan Tim"
      />

      {/* Full Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Reset Seluruh Database STOA"
        message="Tindakan ini akan mengosongkan seluruh database proyek, database klien, database tim, pembayaran, pengeluaran, dan invoice. Lanjutkan?"
        confirmLabel="Ya, Bersihkan Semua"
      />
    </div>
  );
};
