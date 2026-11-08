/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  UserCheck,
  Phone,
  Mail,
  Instagram,
  Briefcase,
  DollarSign,
  Eye,
  CheckCircle2,
  Trash2,
  MessageCircle
} from 'lucide-react';
import { TeamMember, TeamRole, ProjectExpense, Project } from '../../types/database';
import { formatIDR, formatDateID, formatWhatsAppLink } from '../../lib/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface TeamManagementProps {
  teamMembers: TeamMember[];
  expenses: ProjectExpense[];
  projects: Project[];
  onAddTeamMember: (member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => void;
  onDeleteTeamMember?: (id: string) => void;
  onClearAllTeamMembers?: () => void;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({
  teamMembers,
  expenses,
  projects,
  onAddTeamMember,
  onDeleteTeamMember,
  onClearAllTeamMembers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<TeamRole>('Lead Photographer');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const roles: TeamRole[] = [
    'Lead Photographer',
    'First Photographer (FG 1)',
    'Second Photographer (FG 2)',
    'Cinematographer / Videographer',
    'Drone Pilot',
    'Video Editor',
    'Photo Editor',
    'Album Designer',
    'Crew / Assistant',
    'Vendor'
  ];

  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m => {
      const matchSearch = !searchQuery ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.phone && m.phone.includes(searchQuery)) ||
        (m.instagram && m.instagram.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (m.notes && m.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRole = roleFilter === 'all' || m.primary_role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [teamMembers, searchQuery, roleFilter]);

  // Expenses paid to selected member
  const memberExpenses = useMemo(() => {
    if (!selectedMember) return [];
    return expenses.filter(e => 
      e.recipient_name.toLowerCase() === selectedMember.name.toLowerCase() ||
      e.recipient_id === selectedMember.id
    );
  }, [selectedMember, expenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama anggota tim wajib diisi.');
      return;
    }

    onAddTeamMember({
      name: name.trim(),
      primary_role: role,
      phone: phone.trim() || null,
      email: email.trim() || null,
      instagram: instagram.trim() || null,
      bank_account: bankAccount.trim() || null,
      notes: notes.trim() || null,
      is_active: true
    });

    setName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setBankAccount('');
    setNotes('');
    setError('');
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
              placeholder="Cari nama kru, fotografer, editor, nomor rekening..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
          >
            <option value="all">Semua Role</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {onClearAllTeamMembers && teamMembers.length > 0 && (
            <button
              onClick={() => setIsClearAllConfirmOpen(true)}
              className="px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium text-rose-600 transition-colors flex items-center gap-1.5"
              title="Kosongkan Seluruh Database Tim"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kosongkan Tim</span>
            </button>
          )}

          <button
            onClick={() => {
              setError('');
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-[#C06014] hover:bg-[#a65210] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggota Tim</span>
          </button>
        </div>
      </div>

      {/* Team Cards Grid or Empty State */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="p-5 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#424642] dark:text-[#F3F4ED]">
                      {member.name}
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-semibold text-[#C06014] bg-[#C06014]/10 px-2 py-0.5 rounded-md">
                      {member.primary_role}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4ED] dark:bg-[#353935] text-[#536162] dark:text-[#9BA39B]">
                    {member.project_count || 0} Proyek
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#536162] dark:text-[#9BA39B] pt-2 border-t border-[#F3F4ED] dark:border-[#353935]">
                  {member.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#536162]" />
                        <span className="font-mono text-xs">{member.phone}</span>
                      </div>
                      {formatWhatsAppLink(member.phone) && (
                        <a
                          href={formatWhatsAppLink(member.phone)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                          title="Buka Chat WhatsApp Kru"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  )}
                  {member.instagram && (
                    <div className="flex items-center gap-2">
                      <Instagram className="w-3.5 h-3.5 text-[#536162]" />
                      <span>{member.instagram}</span>
                    </div>
                  )}
                  {member.bank_account && (
                    <div className="text-[11px] font-mono text-[#424642] dark:text-[#F3F4ED] pt-1">
                      Rek: {member.bank_account}
                    </div>
                  )}
                  {member.notes && (
                    <p className="text-[11px] italic text-[#536162] pt-1">
                      "{member.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Total Earned / Honor & Actions */}
              <div className="mt-4 pt-3 border-t border-[#E5E7DC] dark:border-[#353935] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#536162] dark:text-[#9BA39B]">
                    Total Honor Diterima
                  </span>
                  <p className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums">
                    {formatIDR(member.total_earned)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedMember(member)}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-medium text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1"
                    title="Lihat Rincian Honor"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Rincian</span>
                  </button>
                  {onDeleteTeamMember && (
                    <button
                      onClick={() => setDeletingMemberId(member.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Hapus Anggota Tim"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#C06014]/10 text-[#C06014] flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED]">
            {searchQuery || roleFilter !== 'all' ? 'Tidak Ditemukan Anggota Tim' : 'Database Tim Masih Kosong'}
          </h3>
          <p className="text-xs text-[#536162] dark:text-[#9BA39B] max-w-md mx-auto">
            {searchQuery || roleFilter !== 'all'
              ? 'Tidak ada kru atau vendor yang cocok dengan filter pencarian.'
              : 'Belum ada kru atau vendor yang terdaftar di database tim. Klik tombol di bawah untuk mendaftarkan Lead Photographer, FG 2, Videographer, Editor, atau Vendor STOA PICTURES.'}
          </p>
          <button
            onClick={() => {
              setError('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C06014] hover:bg-[#a65210] text-xs font-semibold text-white shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggota Tim Baru</span>
          </button>
        </div>
      )}

      {/* Add Team Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Anggota Tim / Kru Produksi"
        subtitle="STOA PICTURES Team & Vendor Directory"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
              Nama Lengkap Anggota Tim *
            </label>
            <input
              type="text"
              placeholder="Contoh: Budi Anto"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Peran Utama (Primary Role) *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              >
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                placeholder="0812-9843-1120"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Akun Instagram
              </label>
              <input
                type="text"
                placeholder="@budianto.photo"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Rekening Bank untuk Pembayaran Honor
              </label>
              <input
                type="text"
                placeholder="BCA 8291039481 a.n Budi Anto"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
              Catatan Spesialisasi / Portofolio
            </label>
            <input
              type="text"
              placeholder="Lead Photographer & Colorist Spesialis Candid Wedding"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              Simpan Anggota
            </button>
          </div>
        </form>
      </Modal>

      {/* Honor & Project Involvement Modal */}
      {selectedMember && (
        <Modal
          isOpen={selectedMember !== null}
          onClose={() => setSelectedMember(null)}
          title={`Riwayat Honor: ${selectedMember.name}`}
          subtitle={`${selectedMember.primary_role} · Rek: ${selectedMember.bank_account || '-'}`}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                Total Akumulasi Honor Diterima
              </span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatIDR(selectedMember.total_earned)}
              </span>
            </div>

            {memberExpenses.length > 0 ? (
              <div className="border border-[#E5E7DC] dark:border-[#353935] rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FDFBF7] dark:bg-[#252825] text-[#536162] dark:text-[#9BA39B]">
                    <tr>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Proyek & Deskripsi</th>
                      <th className="py-2.5 px-3 text-right">Nominal Honor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                    {memberExpenses.map(e => (
                      <tr key={e.id}>
                        <td className="py-2.5 px-3 font-medium whitespace-nowrap">{formatDateID(e.transaction_date)}</td>
                        <td className="py-2.5 px-3 text-[11px] font-semibold text-[#424642] dark:text-[#F3F4ED]">{e.category}</td>
                        <td className="py-2.5 px-3 text-[#536162] dark:text-[#9BA39B]">
                          <div>{e.description}</div>
                          <div className="text-[10px] font-mono">{e.project_code}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 tabular-nums">
                          {formatIDR(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-[#536162] italic">Belum ada catatan honor untuk anggota tim ini.</p>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Member Confirmation */}
      <ConfirmDialog
        isOpen={deletingMemberId !== null}
        onClose={() => setDeletingMemberId(null)}
        onConfirm={() => {
          if (deletingMemberId && onDeleteTeamMember) {
            onDeleteTeamMember(deletingMemberId);
            setDeletingMemberId(null);
          }
        }}
        title="Hapus Anggota Tim"
        message="Apakah Anda yakin ingin menghapus anggota tim ini dari database?"
        confirmLabel="Hapus Anggota"
      />

      {/* Clear All Team Members Confirmation */}
      {onClearAllTeamMembers && (
        <ConfirmDialog
          isOpen={isClearAllConfirmOpen}
          onClose={() => setIsClearAllConfirmOpen(false)}
          onConfirm={() => {
            onClearAllTeamMembers();
            setIsClearAllConfirmOpen(false);
          }}
          title="Kosongkan Seluruh Database Tim"
          message="PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh anggota tim dari database? Data profil tim dan vendor akan dihapus."
          confirmLabel="Ya, Kosongkan Database Tim"
        />
      )}
    </div>
  );
};
