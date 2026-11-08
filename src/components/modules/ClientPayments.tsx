/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  CreditCard,
  Trash2,
  Download,
  Calendar,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { Payment, Project, PaymentType, PaymentMethod } from '../../types/database';
import { formatIDR, formatDateID } from '../../lib/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportPaymentsToExcel } from '../../lib/exportUtils';

interface ClientPaymentsProps {
  payments: Payment[];
  projects: Project[];
  onAddPayment: (payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) => void;
  onDeletePayment: (id: string) => void;
  selectedYear: number | 'all';
  selectedMonth: number | 'all';
}

export const ClientPayments: React.FC<ClientPaymentsProps> = ({
  payments,
  projects,
  onAddPayment,
  onDeletePayment,
  selectedYear,
  selectedMonth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Form State
  const [formProjectId, setFormProjectId] = useState('');
  const [formType, setFormType] = useState<PaymentType>('installment');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('Transfer Bank');
  const [formDesc, setFormDesc] = useState('');
  const [formRef, setFormRef] = useState('');
  const [formError, setFormError] = useState('');

  // Selected project for preview in modal
  const selectedProjectObj = useMemo(() => {
    return projects.find(p => p.id === formProjectId);
  }, [projects, formProjectId]);

  const newBalancePreview = useMemo(() => {
    if (!selectedProjectObj) return null;
    const currentOutstanding = selectedProjectObj.outstanding_balance || 0;
    const paymentAmt = parseFloat(formAmount.replace(/[^0-9]/g, '')) || 0;
    return Math.max(0, currentOutstanding - paymentAmt);
  }, [selectedProjectObj, formAmount]);

  // Filtering
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchSearch = !searchQuery ||
        (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.project_code && p.project_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.reference_number && p.reference_number.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchType = typeFilter === 'all' || p.payment_type === typeFilter;

      const d = new Date(p.payment_date);
      const matchYear = selectedYear === 'all' || d.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === 'all' || (d.getMonth() + 1) === selectedMonth;

      return matchSearch && matchType && matchYear && matchMonth;
    });
  }, [payments, searchQuery, typeFilter, selectedYear, selectedMonth]);

  const totalAmountReceived = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  const handleOpenAdd = () => {
    setFormProjectId(projects[0]?.id || '');
    setFormType('installment');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormAmount('');
    setFormMethod('Transfer Bank');
    setFormDesc('Pembayaran Termin Proyek');
    setFormRef('');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId) {
      setFormError('Pilih proyek terlebih dahulu.');
      return;
    }

    const amt = parseFloat(formAmount.replace(/[^0-9]/g, '')) || 0;
    if (amt <= 0) {
      setFormError('Nominal pembayaran harus lebih besar dari 0.');
      return;
    }

    const proj = projects.find(p => p.id === formProjectId);

    onAddPayment({
      project_id: formProjectId,
      client_id: proj?.client_id || null,
      client_name: proj?.client_name || 'Client',
      project_code: proj?.project_code || 'N/A',
      payment_type: formType,
      payment_date: formDate,
      amount: amt,
      payment_method: formMethod,
      description: formDesc.trim() || `Pembayaran ${formType.toUpperCase()}`,
      reference_number: formRef.trim() || null,
      status: 'confirmed'
    });

    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536162]" />
            <input
              type="text"
              placeholder="Cari pembayaran klien, no ref, bukti..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
          >
            <option value="all">Semua Tipe</option>
            <option value="dp">Down Payment (DP)</option>
            <option value="installment">Termin / Cicilan</option>
            <option value="final">Pelunasan</option>
            <option value="additional">Tambahan</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportPaymentsToExcel(filteredPayments)}
            className="px-3.5 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-medium text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-lg bg-[#C06014] hover:bg-[#a65210] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pembayaran</span>
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
            Total Pembayaran Masuk Diterima
          </span>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5">
            {formatIDR(totalAmountReceived)}
          </p>
        </div>
        <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          {filteredPayments.length} Bukti Transaksi
        </span>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] overflow-hidden">
        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935] text-[#536162] dark:text-[#9BA39B]">
                <th className="py-3 px-4 font-semibold">Tanggal</th>
                <th className="py-3 px-4 font-semibold">Klien & Proyek</th>
                <th className="py-3 px-4 font-semibold">Tipe Pembayaran</th>
                <th className="py-3 px-4 font-semibold">Metode & Referensi</th>
                <th className="py-3 px-4 font-semibold">Keterangan</th>
                <th className="py-3 px-4 font-semibold text-right">Nominal (IDR)</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-[#FDFBF7]/60 dark:hover:bg-[#252825]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#424642] dark:text-[#F3F4ED] whitespace-nowrap">
                      {formatDateID(pay.payment_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{pay.client_name}</div>
                      <div className="text-[11px] font-mono text-[#536162] dark:text-[#9BA39B]">{pay.project_code}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F3F4ED] dark:bg-[#353935] text-[#C06014]">
                        {pay.payment_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#536162] dark:text-[#9BA39B]">
                      <div className="font-medium text-[#424642] dark:text-[#F3F4ED]">{pay.payment_method}</div>
                      <div className="text-[11px] font-mono">{pay.reference_number || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#536162] dark:text-[#9BA39B]">
                      {pay.description}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatIDR(pay.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setDeletingPaymentId(pay.id)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600 transition-colors"
                        title="Hapus Pembayaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#536162]">
                    Belum ada pembayaran client ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (< md) */}
        <div className="block md:hidden divide-y divide-[#E5E7DC] dark:divide-[#353935]">
          {filteredPayments.length > 0 ? (
            filteredPayments.map((pay) => (
              <div key={pay.id} className="p-4 space-y-2.5 bg-white dark:bg-[#1E201E]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#C06014]/10 text-[#C06014]">
                      {pay.payment_type}
                    </span>
                    <div className="font-bold text-sm text-[#424642] dark:text-[#F3F4ED] mt-1">
                      {pay.client_name}
                    </div>
                    <div className="text-[11px] font-mono text-[#536162] dark:text-[#9BA39B]">
                      {pay.project_code}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums block">
                      {formatIDR(pay.amount)}
                    </span>
                    <span className="text-[10px] text-[#536162] dark:text-[#9BA39B]">
                      {formatDateID(pay.payment_date)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#536162] dark:text-[#9BA39B] bg-[#FDFBF7] dark:bg-[#252825] p-2.5 rounded-xl border border-[#E5E7DC] dark:border-[#353935] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold block text-[#536162]">Metode</span>
                    <span className="font-medium text-[#424642] dark:text-[#F3F4ED]">{pay.payment_method}</span>
                  </div>
                  {pay.reference_number && (
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold block text-[#536162]">No. Ref</span>
                      <span className="font-mono text-[11px]">{pay.reference_number}</span>
                    </div>
                  )}
                </div>

                {pay.description && (
                  <p className="text-xs text-[#536162] dark:text-[#9BA39B] italic px-1">
                    "{pay.description}"
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setDeletingPaymentId(pay.id)}
                    className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-[#536162]">
              Belum ada pembayaran client ditemukan.
            </div>
          )}
        </div>
      </div>

      {/* Add Payment Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Catat Pembayaran Klien (Kas Masuk)"
        subtitle="STOA PICTURES Bookkeeping System"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
              Pilih Proyek Klien *
            </label>
            <select
              value={formProjectId}
              onChange={(e) => setFormProjectId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.client_name} ({p.package_name})
                </option>
              ))}
            </select>
          </div>

          {/* Project Contract & Outstanding Balance Preview */}
          {selectedProjectObj && (
            <div className="p-3 rounded-xl bg-[#F3F4ED] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935] grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[#536162] dark:text-[#9BA39B]">Total Kontrak:</span>
                <p className="font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums">
                  {formatIDR(selectedProjectObj.contract_value)}
                </p>
              </div>
              <div>
                <span className="text-[#536162] dark:text-[#9BA39B]">Sisa Piutang Saat Ini:</span>
                <p className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {formatIDR(selectedProjectObj.outstanding_balance)}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Tipe Pembayaran *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as PaymentType)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              >
                <option value="dp">DP (Down Payment)</option>
                <option value="installment">Termin / Cicilan</option>
                <option value="final">Pelunasan Kontrak</option>
                <option value="additional">Biaya Tambahan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Tanggal Pembayaran *
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Nominal Pembayaran (IDR) *
              </label>
              <input
                type="number"
                placeholder="10000000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                min="1000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Metode Pembayaran
              </label>
              <select
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              >
                <option value="Transfer Bank">Transfer Bank</option>
                <option value="BCA">BCA</option>
                <option value="Mandiri">Mandiri</option>
                <option value="BNI">BNI</option>
                <option value="BRI">BRI</option>
                <option value="Cash">Cash / Tunai</option>
                <option value="QRIS">QRIS</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Nomor Referensi / Bukti Transfer
              </label>
              <input
                type="text"
                placeholder="BCA-98127391"
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Keterangan
              </label>
              <input
                type="text"
                placeholder="Pelunasan H-3 Acara Pernikahan"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>
          </div>

          {/* Real-time remaining balance calculation */}
          {newBalancePreview !== null && (
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between">
              <span>Sisa Piutang Setelah Pembayaran Ini:</span>
              <span className="font-bold tabular-nums">{formatIDR(newBalancePreview)}</span>
            </div>
          )}

          <div className="pt-4 border-t border-[#E5E7DC] dark:border-[#353935] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs text-[#536162] hover:bg-[#F3F4ED] rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#C06014] hover:bg-[#a65210] rounded-lg"
            >
              Simpan Pembayaran
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingPaymentId !== null}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={() => {
          if (deletingPaymentId) {
            onDeletePayment(deletingPaymentId);
            setDeletingPaymentId(null);
          }
        }}
        title="Hapus Catatan Pembayaran"
        message="Apakah Anda yakin ingin menghapus catatan pembayaran ini? Saldo piutang klien akan dihitung ulang secara otomatis."
      />
    </div>
  );
};
