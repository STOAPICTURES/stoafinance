/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderSync,
  FileSpreadsheet,
  Edit2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { ProjectDeliverable, DeliverableStatus } from '../../types/database';
import { formatDateID, formatIDR } from '../../lib/formatters';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { exportDeliverablesToExcel } from '../../lib/exportUtils';

interface MonitoringPendingProps {
  deliverables: ProjectDeliverable[];
  onUpdateDeliverable: (id: string, updates: Partial<ProjectDeliverable>) => void;
  selectedYear: number | 'all';
  selectedMonth: number | 'all';
}

export const MonitoringPending: React.FC<MonitoringPendingProps> = ({
  deliverables,
  onUpdateDeliverable,
  selectedYear,
  selectedMonth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [editingDeliverable, setEditingDeliverable] = useState<ProjectDeliverable | null>(null);

  // Modal form state
  const [formDriveStatus, setFormDriveStatus] = useState<DeliverableStatus>('PENDING');
  const [formAlbumStatus, setFormAlbumStatus] = useState<DeliverableStatus>('PENDING');
  const [formCinemaStatus, setFormCinemaStatus] = useState<DeliverableStatus>('PENDING');
  const [formShootingStatus, setFormShootingStatus] = useState<DeliverableStatus>('PENDING');
  const [formDeadline, setFormDeadline] = useState('');
  const [formOperator, setFormOperator] = useState('');
  const [formAlbumType, setFormAlbumType] = useState('');
  const [formPrintingPrice, setFormPrintingPrice] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Extract operators list for filter
  const operators = useMemo(() => {
    const set = new Set<string>();
    deliverables.forEach(d => {
      if (d.shooting_operator) set.add(d.shooting_operator);
    });
    return Array.from(set);
  }, [deliverables]);

  // Filtering
  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => {
      const matchSearch = !searchQuery ||
        (d.client_name && d.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.project_code && d.project_code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.album_type && d.album_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (d.shooting_operator && d.shooting_operator.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchOperator = operatorFilter === 'all' || d.shooting_operator === operatorFilter;

      let matchStatus = true;
      if (statusFilter === 'overdue') {
        const isDone = d.drive_status === 'DONE' && d.album_status === 'DONE' && d.cinematic_status === 'DONE';
        const isPastDeadline = new Date(d.deadline).getTime() < Date.now();
        matchStatus = !isDone && isPastDeadline;
      } else if (statusFilter === 'pending') {
        matchStatus = d.drive_status !== 'DONE' || d.album_status !== 'DONE' || d.cinematic_status !== 'DONE';
      } else if (statusFilter === 'done') {
        matchStatus = d.drive_status === 'DONE' && d.album_status === 'DONE' && d.cinematic_status === 'DONE';
      }

      const now = new Date();
      const dYear = d.deadline ? new Date(d.deadline).getFullYear() : now.getFullYear();
      const dMonth = d.deadline ? new Date(d.deadline).getMonth() + 1 : now.getMonth() + 1;
      const matchYear = selectedYear === 'all' || dYear === selectedYear;
      const matchMonth = selectedMonth === 'all' || dMonth === selectedMonth;

      return matchSearch && matchOperator && matchStatus && matchYear && matchMonth;
    });
  }, [deliverables, searchQuery, operatorFilter, statusFilter, selectedYear, selectedMonth]);

  // Quick stats
  const totalOverdue = useMemo(() => {
    const now = Date.now();
    return deliverables.filter(d => {
      const isDone = d.drive_status === 'DONE' && d.album_status === 'DONE' && d.cinematic_status === 'DONE';
      return !isDone && new Date(d.deadline).getTime() < now;
    }).length;
  }, [deliverables]);

  const totalDone = useMemo(() => {
    return deliverables.filter(d => d.drive_status === 'DONE' && d.album_status === 'DONE' && d.cinematic_status === 'DONE').length;
  }, [deliverables]);

  const handleOpenEdit = (d: ProjectDeliverable) => {
    setEditingDeliverable(d);
    setFormDriveStatus(d.drive_status);
    setFormAlbumStatus(d.album_status);
    setFormCinemaStatus(d.cinematic_status);
    setFormShootingStatus(d.shooting_status);
    setFormDeadline(d.deadline);
    setFormOperator(d.shooting_operator);
    setFormAlbumType(d.album_type || '');
    setFormPrintingPrice(String(d.printing_price || 0));
    setFormNotes(d.notes || '');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeliverable) return;

    onUpdateDeliverable(editingDeliverable.id, {
      drive_status: formDriveStatus,
      album_status: formAlbumStatus,
      cinematic_status: formCinemaStatus,
      shooting_status: formShootingStatus,
      deadline: formDeadline,
      shooting_operator: formOperator.trim() || 'STOA Team',
      album_type: formAlbumType.trim() || null,
      printing_price: parseFloat(formPrintingPrice.replace(/[^0-9]/g, '')) || 0,
      notes: formNotes.trim() || null
    });

    setEditingDeliverable(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Alert Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-[#1E201E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Total Tugas Dalam Proses
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-1">
            {deliverables.length - totalDone} Deliverables
          </p>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-[#1E201E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Melewati Deadline (Overdue)
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-1">
            {totalOverdue} Proyek
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#1E201E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Deliverables Selesai 100%
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
            {totalDone} Proyek
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536162]" />
            <input
              type="text"
              placeholder="Cari deliverable klien, operator, album..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Belum Selesai (Pending/Proses)</option>
            <option value="overdue">Overdue Deadline</option>
            <option value="done">Selesai Semua (Done)</option>
          </select>

          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="hidden lg:block text-xs px-3 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
          >
            <option value="all">Semua Operator</option>
            {operators.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>

        <button
          onClick={() => exportDeliverablesToExcel(filteredDeliverables)}
          className="px-3.5 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-medium text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span>Export Excel Pending</span>
        </button>
      </div>

      {/* Deliverables Table */}
      <div className="rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935] text-[#536162] dark:text-[#9BA39B]">
                <th className="py-3 px-4 font-semibold">Klien & Proyek</th>
                <th className="py-3 px-4 font-semibold">Tgl Acara</th>
                <th className="py-3 px-4 font-semibold">Deadline Target</th>
                <th className="py-3 px-4 font-semibold">Jenis Album & Cetak</th>
                <th className="py-3 px-4 font-semibold text-center">Liputan</th>
                <th className="py-3 px-4 font-semibold text-center">G-Drive</th>
                <th className="py-3 px-4 font-semibold text-center">Cinema</th>
                <th className="py-3 px-4 font-semibold text-center">Album</th>
                <th className="py-3 px-4 font-semibold">Operator</th>
                <th className="py-3 px-4 font-semibold text-right">Progres</th>
                <th className="py-3 px-4 font-semibold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
              {filteredDeliverables.length > 0 ? (
                filteredDeliverables.map((deliv) => {
                  const isPastDeadline = new Date(deliv.deadline).getTime() < Date.now();
                  const isAllDone = deliv.drive_status === 'DONE' && deliv.album_status === 'DONE' && deliv.cinematic_status === 'DONE';
                  const isOverdue = !isAllDone && isPastDeadline;

                  return (
                    <tr 
                      key={deliv.id} 
                      className={`hover:bg-[#FDFBF7]/60 dark:hover:bg-[#252825]/60 transition-colors ${
                        isOverdue ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#424642] dark:text-[#F3F4ED]">
                        <div>{deliv.client_name}</div>
                        <div className="text-[11px] font-mono text-[#536162] dark:text-[#9BA39B]">{deliv.project_code}</div>
                      </td>
                      <td className="py-3.5 px-4 text-[#536162] dark:text-[#9BA39B]">
                        {formatDateID(deliv.event_date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-[#424642] dark:text-[#F3F4ED]'}`}>
                          {formatDateID(deliv.deadline)}
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                            Overdue!
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#536162] dark:text-[#9BA39B]">
                        <div className="font-medium text-[#424642] dark:text-[#F3F4ED]">{deliv.album_type || '-'}</div>
                        {deliv.printing_price ? (
                          <div className="text-[11px] tabular-nums text-[#C06014]">
                            Biaya: {formatIDR(deliv.printing_price)}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={deliv.shooting_status} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={deliv.drive_status} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={deliv.cinematic_status} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={deliv.album_status} />
                      </td>
                      <td className="py-3.5 px-4 text-[#536162] dark:text-[#9BA39B] font-medium">
                        {deliv.shooting_operator}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-bold tabular-nums ${deliv.completion_percentage === 100 ? 'text-emerald-600' : 'text-[#C06014]'}`}>
                          {deliv.completion_percentage ?? 0}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(deliv)}
                          className="p-1.5 rounded-md hover:bg-[#F3F4ED] dark:hover:bg-[#353935] text-[#536162] hover:text-[#424642]"
                          title="Update Status Deliverable"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-xs text-[#536162]">
                    Tidak ada pending deliverable ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Deliverable Modal */}
      {editingDeliverable && (
        <Modal
          isOpen={editingDeliverable !== null}
          onClose={() => setEditingDeliverable(null)}
          title={`Update Deliverables: ${editingDeliverable.client_name}`}
          subtitle={`${editingDeliverable.project_code} · Target Deadline: ${formatDateID(editingDeliverable.deadline)}`}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Status Liputan / Shooting
                </label>
                <select
                  value={formShootingStatus}
                  onChange={(e) => setFormShootingStatus(e.target.value as DeliverableStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN PROGRESS">IN PROGRESS</option>
                  <option value="DONE">DONE</option>
                  <option value="NOT APPLICABLE">NOT APPLICABLE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Status Link Google Drive Foto
                </label>
                <select
                  value={formDriveStatus}
                  onChange={(e) => setFormDriveStatus(e.target.value as DeliverableStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN PROGRESS">IN PROGRESS</option>
                  <option value="DONE">DONE</option>
                  <option value="NOT APPLICABLE">NOT APPLICABLE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Status Cinematic Video Teaser
                </label>
                <select
                  value={formCinemaStatus}
                  onChange={(e) => setFormCinemaStatus(e.target.value as DeliverableStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN PROGRESS">IN PROGRESS</option>
                  <option value="DONE">DONE</option>
                  <option value="NOT APPLICABLE">NOT APPLICABLE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Status Cetak Album & Box
                </label>
                <select
                  value={formAlbumStatus}
                  onChange={(e) => setFormAlbumStatus(e.target.value as DeliverableStatus)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN PROGRESS">IN PROGRESS</option>
                  <option value="DONE">DONE</option>
                  <option value="NOT APPLICABLE">NOT APPLICABLE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Target Tanggal Deadline
                </label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Operator / Lead Fotografer
                </label>
                <input
                  type="text"
                  value={formOperator}
                  onChange={(e) => setFormOperator(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Tipe / Spesifikasi Album
                </label>
                <input
                  type="text"
                  placeholder="20x30 Box Kayu Leather"
                  value={formAlbumType}
                  onChange={(e) => setFormAlbumType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Biaya Cetak Lab (IDR)
                </label>
                <input
                  type="number"
                  placeholder="2500000"
                  value={formPrintingPrice}
                  onChange={(e) => setFormPrintingPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Catatan Progres
              </label>
              <input
                type="text"
                placeholder="Layout album sudah di-ACC klien, sedang masuk antrian cetak lab."
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>

            <div className="pt-4 border-t border-[#E5E7DC] dark:border-[#353935] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingDeliverable(null)}
                className="px-4 py-2 text-xs text-[#536162] hover:bg-[#F3F4ED] rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#C06014] hover:bg-[#a65210] rounded-lg"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
