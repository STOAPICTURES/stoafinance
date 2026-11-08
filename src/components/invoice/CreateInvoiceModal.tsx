/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CreateInvoiceModal - Modal to issue and preview a new booking invoice
 * Auto-populates all booking info without re-typing.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  DollarSign,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Building,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Project, BookingInvoice, BookingInvoiceSnapshot, InvoiceStatus } from '../../types/database';
import { dataService } from '../../services/dataService';
import { formatCurrencyIDR, formatDateIndonesian } from '../../lib/formatters';
import { getPackageByName } from '../../data/stoaPricelist';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreated: (invoice: BookingInvoice) => void;
  selectedProject?: Project | null;
}

const DEFAULT_BANK_INFO = `Bank BCA: 8375119583
a.n. BUDI ANTO (STOA PICTURES)
NPWP: 60.411.372.0-117.000`;

const DEFAULT_TERMS = `1. Pembayaran DP minimal 20% dilakukan saat konfirmasi booking tanggal acara.
2. Pelunasan sisa pembayaran maksimal H+3 setelah acara pernikahan selesai dilaksanakan.
3. Bukti transfer mohon dikonfirmasi kepada admin / Owner STOA PICTURES via WhatsApp resmi.
4. Perubahan jadwal (reschedule) harap dikonfirmasi paling lambat 14 hari sebelum tanggal acara.`;

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onInvoiceCreated,
  selectedProject
}) => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [chosenProjectId, setChosenProjectId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>('');
  const [bankInfo, setBankInfo] = useState<string>(DEFAULT_BANK_INFO);
  const [terms, setTerms] = useState<string>(DEFAULT_TERMS);
  const [notes, setNotes] = useState<string>('');
  const [status, setStatus] = useState<InvoiceStatus>('TERBIT');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const projects = dataService.getProjects();
      setAllProjects(projects);

      const targetId = selectedProject ? selectedProject.id : (projects.length > 0 ? projects[0].id : '');
      setChosenProjectId(targetId);

      const autoNum = dataService.generateNextInvoiceNumber(issueDate);
      setInvoiceNumber(autoNum);
      setErrorMsg('');

      // Auto-compute due date if project available
      const p = selectedProject || projects.find(item => item.id === targetId);
      if (p && p.event_date) {
        try {
          const d = new Date(p.event_date);
          d.setDate(d.getDate() + 3); // H+3 default
          setDueDate(d.toISOString().slice(0, 10));
        } catch {
          setDueDate(p.event_date);
        }
      } else {
        setDueDate(new Date().toISOString().slice(0, 10));
      }
    }
  }, [isOpen, selectedProject]);

  // Recalculate number when issueDate changes
  useEffect(() => {
    if (isOpen) {
      const nextNum = dataService.generateNextInvoiceNumber(issueDate);
      setInvoiceNumber(nextNum);
    }
  }, [issueDate, isOpen]);

  if (!isOpen) return null;

  const currentProject = allProjects.find(p => p.id === chosenProjectId) || selectedProject;

  // Compute payment status from real payments
  const projectPayments = currentProject
    ? dataService.getPayments().filter(p => p.project_id === currentProject.id && p.status === 'confirmed')
    : [];
  const totalPaid = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalContract = currentProject ? currentProject.contract_value : 0;
  const remaining = Math.max(0, totalContract - totalPaid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) {
      setErrorMsg('Pilih proyek booking terlebih dahulu.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setErrorMsg('Nomor invoice tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create snapshot so future edits to project do not corrupt official issued invoice
      const pkg = getPackageByName(currentProject.package_name);
      const snapshot: BookingInvoiceSnapshot = {
        package_name: currentProject.package_name,
        package_specs: pkg ? {
          crew: pkg.crew,
          album: pkg.album,
          printFrame: pkg.printFrame,
          videoDocumentation: pkg.videoDocumentation,
          drone: pkg.drone,
          weddingCinema: pkg.weddingCinema,
          storage: pkg.storage
        } : undefined,
        original_price: currentProject.original_price,
        transport_fee: currentProject.transport_fee,
        additional_album_fee: currentProject.additional_album_fee,
        discount: currentProject.discount,
        discount_reason: currentProject.discount_reason,
        contract_value: currentProject.contract_value,
        initial_dp: currentProject.initial_dp,
        event_location: currentProject.event_location,
        event_date: currentProject.event_date,
        client_phone: currentProject.client_phone
      };

      // Determine accurate initial status based on real payments
      let determinedStatus: InvoiceStatus = status;
      if (status !== 'DRAFT') {
        if (remaining <= 0 && totalPaid > 0) {
          determinedStatus = 'LUNAS';
        } else if (totalPaid > 0) {
          if (totalPaid <= (currentProject.initial_dp || 0) || projectPayments.length === 1) {
            determinedStatus = 'DP DITERIMA';
          } else {
            determinedStatus = 'CICILAN';
          }
        } else {
          determinedStatus = 'TERBIT';
        }
      }

      const newInvoice = dataService.createInvoice({
        invoice_number: invoiceNumber.trim(),
        project_id: currentProject.id,
        client_id: currentProject.client_id || null,
        issue_date: issueDate,
        due_date: dueDate || null,
        total_amount: currentProject.contract_value,
        paid_amount: totalPaid,
        remaining_amount: remaining,
        status: determinedStatus,
        client_name: currentProject.client_name,
        client_phone: currentProject.client_phone || null,
        event_date: currentProject.event_date,
        event_location: currentProject.event_location,
        package_name: currentProject.package_name,
        bank_info: bankInfo,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        snapshot_data: snapshot,
        pdf_url: null
      });

      onInvoiceCreated(newInvoice);
      onClose();
    } catch (err: any) {
      setErrorMsg(`Gagal menerbitkan invoice: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Terbitkan Invoice Booking
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-medium">
                  STOA PICTURES
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Sistem otomatis mengambil data booking yang tersimpan tanpa input ulang.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-slate-200">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project Selector (if not locked to one) */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pilih Data Booking Klien
            </label>
            <select
              value={chosenProjectId}
              onChange={(e) => {
                setChosenProjectId(e.target.value);
                const proj = allProjects.find(p => p.id === e.target.value);
                if (proj?.event_date) {
                  try {
                    const d = new Date(proj.event_date);
                    d.setDate(d.getDate() + 3);
                    setDueDate(d.toISOString().slice(0, 10));
                  } catch {}
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.client_name} - {p.package_name} ({formatDateIndonesian(p.event_date)}) - {p.project_code}
                </option>
              ))}
            </select>
          </div>

          {/* Preview of auto-pulled Booking Information */}
          {currentProject && (
            <div className="bg-gradient-to-br from-slate-950/80 to-slate-900/80 rounded-xl p-4 border border-amber-500/20 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Data Booking Terintegrasi (Otomatis)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {currentProject.project_code}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 flex items-center gap-1 mb-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Nama Klien
                  </div>
                  <div className="font-semibold text-white text-sm">{currentProject.client_name}</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 flex items-center gap-1 mb-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    WhatsApp
                  </div>
                  <div className="font-semibold text-white text-sm">{currentProject.client_phone || '-'}</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 flex items-center gap-1 mb-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tanggal Acara
                  </div>
                  <div className="font-semibold text-white text-sm">{formatDateIndonesian(currentProject.event_date)}</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-slate-400 flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Lokasi Acara
                  </div>
                  <div className="font-semibold text-white text-sm">{currentProject.event_location || 'Pematangsiantar'}</div>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 sm:col-span-2">
                  <div className="text-slate-400 flex items-center gap-1 mb-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    Jenis Paket Layanan
                  </div>
                  <div className="font-semibold text-amber-400 text-sm">{currentProject.package_name}</div>
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Total Tagihan</div>
                  <div className="text-sm font-bold text-white mt-0.5">{formatCurrencyIDR(currentProject.contract_value)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">DP Awal</div>
                  <div className="text-sm font-semibold text-blue-400 mt-0.5">{formatCurrencyIDR(currentProject.initial_dp || 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Total Terbayar</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-0.5">{formatCurrencyIDR(totalPaid)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Sisa Tagihan</div>
                  <div className={`text-sm font-bold mt-0.5 ${remaining > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {remaining > 0 ? formatCurrencyIDR(remaining) : 'LUNAS'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Parameters Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nomor Invoice (Otomatis & Unik)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="STOA/INV/2026/0001"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-amber-400 font-mono font-semibold focus:outline-none focus:border-amber-500"
                required
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Format resmi: STOA/INV/TAHUN/NOMOR_URUT
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status Penerbitan
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="TERBIT">TERBIT (Siap Dikirim ke Klien)</option>
                <option value="DRAFT">DRAFT (Konsep Sementara)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Status pembayaran akan sinkron otomatis dengan riwayat pembayaran
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tanggal Penerbitan
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Jatuh Tempo Pembayaran (H+3)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Bank Accounts Info */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Rekening Pembayaran Resmi STOA PICTURES
            </label>
            <textarea
              rows={3}
              value={bankInfo}
              onChange={(e) => setBankInfo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ketentuan Pembayaran (Dicetak pada Invoice)
            </label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Paket termasuk cetak kanvas tambahan, serah terima flashdisk H+14..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !currentProject}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Menerbitkan...' : 'Terbitkan Invoice Resmi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
