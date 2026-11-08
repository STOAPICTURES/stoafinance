/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  ReceiptText,
  Trash2,
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { ProjectExpense, Project, ExpenseCategoryName, TeamMember } from '../../types/database';
import { formatIDR, formatDateID } from '../../lib/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { exportExpensesToExcel } from '../../lib/exportUtils';

interface ExpensesProps {
  expenses: ProjectExpense[];
  projects: Project[];
  teamMembers: TeamMember[];
  onAddExpense: (expense: Omit<ProjectExpense, 'id' | 'created_at' | 'updated_at'>) => void;
  onDeleteExpense: (id: string) => void;
  selectedYear: number | 'all';
  selectedMonth: number | 'all';
}

export const Expenses: React.FC<ExpensesProps> = ({
  expenses,
  projects,
  teamMembers,
  onAddExpense,
  onDeleteExpense,
  selectedYear,
  selectedMonth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Form State
  const [formProjectId, setFormProjectId] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategoryName>('Shooting');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState('');
  const [formRecipient, setFormRecipient] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formError, setFormError] = useState('');

  const categories: ExpenseCategoryName[] = [
    'FG 1',
    'FG 2',
    'Shooting',
    'Editor',
    'Cetak',
    'Cinema',
    'Transport / Akomodasi',
    'Other Expenses'
  ];

  // Filtering
  const filteredExpenses = useMemo(() => {
    const projectMap = new Map(projects.map(p => [p.id, p]));

    return expenses.filter(e => {
      const proj = e.project_id ? projectMap.get(e.project_id) : undefined;
      const clientName = e.client_name || proj?.client_name || '';
      const projectCode = e.project_code || proj?.project_code || '';

      const matchSearch = !searchQuery ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        projectCode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCat = categoryFilter === 'all' || e.category === categoryFilter;

      const d = new Date(e.transaction_date);
      const projDate = proj?.event_date ? new Date(proj.event_date) : null;

      const matchYear = selectedYear === 'all' || 
        d.getFullYear() === selectedYear || 
        (projDate !== null && projDate.getFullYear() === selectedYear);

      const matchMonth = selectedMonth === 'all' || 
        (d.getMonth() + 1) === selectedMonth || 
        (projDate !== null && (projDate.getMonth() + 1) === selectedMonth);

      return matchSearch && matchCat && matchYear && matchMonth;
    });
  }, [expenses, projects, searchQuery, categoryFilter, selectedYear, selectedMonth]);

  const totalExpenseAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach(c => map[c] = 0);
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return categories.map(cat => ({
      name: cat,
      amount: map[cat],
      percentage: totalExpenseAmount > 0 ? (map[cat] / totalExpenseAmount) * 100 : 0
    }));
  }, [filteredExpenses, totalExpenseAmount]);

  const handleOpenAdd = () => {
    setFormProjectId(projects[0]?.id || '');
    setFormCategory('Shooting');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormAmount('');
    setFormRecipient(teamMembers[0]?.name || 'Budi Anto');
    setFormDesc('Honor Fotografer Hari H');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId) {
      setFormError('Pilih proyek terkait terlebih dahulu.');
      return;
    }
    const amt = parseFloat(formAmount.replace(/[^0-9]/g, '')) || 0;
    if (amt <= 0) {
      setFormError('Nominal biaya harus lebih besar dari 0.');
      return;
    }
    if (!formRecipient.trim()) {
      setFormError('Nama penerima / vendor wajib diisi.');
      return;
    }

    const proj = projects.find(p => p.id === formProjectId);

    onAddExpense({
      project_id: formProjectId,
      category: formCategory,
      transaction_date: formDate,
      amount: amt,
      description: formDesc.trim() || `Biaya ${formCategory}`,
      recipient_name: formRecipient.trim(),
      project_code: proj?.project_code || 'N/A',
      client_name: proj?.client_name || 'Client'
    });

    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Category Pills Breakdown Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {categoryBreakdown.map(cat => (
          <button
            key={cat.name}
            onClick={() => setCategoryFilter(categoryFilter === cat.name ? 'all' : cat.name)}
            className={`p-3 rounded-xl border text-left transition-all ${
              categoryFilter === cat.name
                ? 'border-[#C06014] bg-[#C06014]/5 dark:bg-[#C06014]/10'
                : 'border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] hover:border-[#536162]'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#536162] dark:text-[#9BA39B] truncate">
              {cat.name}
            </p>
            <p className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-1">
              {formatIDR(cat.amount)}
            </p>
            <p className="text-[10px] text-[#536162] dark:text-[#9BA39B] tabular-nums">
              {cat.percentage.toFixed(0)}% dari beban
            </p>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536162]" />
            <input
              type="text"
              placeholder="Cari pengeluaran, vendor, honor tim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
          >
            <option value="all">Semua Kategori</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportExpensesToExcel(filteredExpenses)}
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
            <span>Catat Pengeluaran</span>
          </button>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] overflow-hidden">
        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935] text-[#536162] dark:text-[#9BA39B]">
                <th className="py-3 px-4 font-semibold">Tanggal</th>
                <th className="py-3 px-4 font-semibold">Kategori</th>
                <th className="py-3 px-4 font-semibold">Proyek Terkait</th>
                <th className="py-3 px-4 font-semibold">Penerima / Vendor / Tim</th>
                <th className="py-3 px-4 font-semibold">Deskripsi Biaya</th>
                <th className="py-3 px-4 font-semibold text-right">Nominal (IDR)</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FDFBF7]/60 dark:hover:bg-[#252825]/60 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#424642] dark:text-[#F3F4ED] whitespace-nowrap">
                      {formatDateID(exp.transaction_date)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-[#424642] dark:text-[#F3F4ED] bg-[#F3F4ED] dark:bg-[#353935] px-2 py-0.5 rounded-md text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{exp.client_name || '-'}</div>
                      <div className="text-[11px] font-mono text-[#536162] dark:text-[#9BA39B]">{exp.project_code || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[#424642] dark:text-[#F3F4ED] font-medium">
                      {exp.recipient_name}
                    </td>
                    <td className="py-3.5 px-4 text-[#536162] dark:text-[#9BA39B]">
                      {exp.description}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatIDR(exp.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setDeletingExpenseId(exp.id)}
                        className="p-1.5 rounded-md hover:bg-rose-50 text-rose-600 transition-colors"
                        title="Hapus Pengeluaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#536162]">
                    Belum ada pengeluaran produksi tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (< md) */}
        <div className="block md:hidden divide-y divide-[#E5E7DC] dark:divide-[#353935]">
          {filteredExpenses.length > 0 ? (
            filteredExpenses.map((exp) => (
              <div key={exp.id} className="p-4 space-y-2.5 bg-white dark:bg-[#1E201E]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-xs text-[#424642] dark:text-[#F3F4ED] bg-[#F3F4ED] dark:bg-[#353935] px-2 py-0.5 rounded-md">
                      {exp.category}
                    </span>
                    <div className="font-bold text-sm text-[#424642] dark:text-[#F3F4ED] mt-1.5">
                      {exp.recipient_name}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-rose-600 dark:text-rose-400 tabular-nums">
                      {formatIDR(exp.amount)}
                    </span>
                    <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] block">
                      {formatDateID(exp.transaction_date)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#536162] dark:text-[#9BA39B] bg-[#FDFBF7] dark:bg-[#252825] p-2.5 rounded-xl border border-[#E5E7DC] dark:border-[#353935]">
                  <p className="line-clamp-2">{exp.description}</p>
                  {(exp.client_name || exp.project_code) && (
                    <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-[#E5E7DC]/60 dark:border-[#353935]/60 text-[11px]">
                      <span className="font-medium text-[#424642] dark:text-[#F3F4ED]">{exp.client_name || 'Umum'}</span>
                      {exp.project_code && <span className="font-mono text-[#536162]">({exp.project_code})</span>}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => setDeletingExpenseId(exp.id)}
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
              Belum ada pengeluaran produksi tercatat.
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Catat Biaya Produksi Baru"
        subtitle="STOA PICTURES Production & Vendor Expense"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
              Pilih Proyek Terkait *
            </label>
            <select
              value={formProjectId}
              onChange={(e) => setFormProjectId(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.client_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Kategori Biaya Produksi *
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ExpenseCategoryName)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Tanggal Transaksi *
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
                Nominal Biaya (IDR) *
              </label>
              <input
                type="number"
                placeholder="2500000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                required
                min="1000"
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Penerima / Vendor / Tim *
              </label>
              <input
                type="text"
                placeholder="Budi Anto, Prima Grafika, dll"
                value={formRecipient}
                onChange={(e) => setFormRecipient(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
              Deskripsi Pengeluaran
            </label>
            <input
              type="text"
              placeholder="Contoh: Honor Lead Photographer Acara Pagi & Malam"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
            />
          </div>

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
              Simpan Biaya
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingExpenseId !== null}
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={() => {
          if (deletingExpenseId) {
            onDeleteExpense(deletingExpenseId);
            setDeletingExpenseId(null);
          }
        }}
        title="Hapus Biaya Pengeluaran"
        message="Apakah Anda yakin ingin menghapus catatan biaya ini? Perhitungan gross profit proyek dan studio akan dihitung ulang secara otomatis."
      />
    </div>
  );
};
