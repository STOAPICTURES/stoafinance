/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Users,
  Phone,
  Mail,
  Instagram,
  MapPin,
  FolderKanban,
  CreditCard,
  Eye,
  CheckCircle2,
  MessageCircle,
  Trash2
} from 'lucide-react';
import { Client, Project, Payment } from '../../types/database';
import { formatIDR, formatDateID, formatWhatsAppLink, isHPlus3Elapsed, getProjectBookingStatus } from '../../lib/formatters';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface ClientDatabaseProps {
  clients: Client[];
  projects: Project[];
  payments: Payment[];
  onAddClient: (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>) => void;
  onOpenProjectDetail: (project: Project) => void;
  onClearAllClients?: () => void;
}

export const ClientDatabase: React.FC<ClientDatabaseProps> = ({
  clients,
  projects,
  payments,
  onAddClient,
  onOpenProjectDetail,
  onClearAllClients
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClearClientsConfirmOpen, setIsClearClientsConfirmOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone && c.phone.includes(searchQuery)) ||
        (c.instagram && c.instagram.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [clients, searchQuery]);

  // Projects associated with selected client
  const clientProjects = useMemo(() => {
    if (!selectedClient) return [];
    return projects.filter(p => 
      p.client_id === selectedClient.id || 
      p.client_name.toLowerCase() === selectedClient.name.toLowerCase()
    );
  }, [projects, selectedClient]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Nama klien wajib diisi.');
      return;
    }
    onAddClient({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      instagram: instagram.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null
    });
    setName('');
    setPhone('');
    setEmail('');
    setInstagram('');
    setAddress('');
    setNotes('');
    setError('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536162]" />
          <input
            type="text"
            placeholder="Cari nama klien, instagram, nomor telepon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {clients.length > 0 && onClearAllClients && (
            <button
              onClick={() => setIsClearClientsConfirmOpen(true)}
              className="px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Klien</span>
            </button>
          )}

          <button
            onClick={() => {
              setError('');
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-[#C06014] hover:bg-[#a65210] text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Klien</span>
          </button>
        </div>
      </div>

      {/* Clients Cards Grid */}
      {filteredClients.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-xs text-[#536162]">
          <Users className="w-8 h-8 text-[#536162] mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-sm text-[#424642] dark:text-[#F3F4ED]">Belum ada data klien</p>
          <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-1">
            Klien yang booking proyek baru akan otomatis tersimpan di sini, atau Anda dapat menambahkan secara manual.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const hasOutstanding = (client.outstanding_balance || 0) > 0;
            const waLink = formatWhatsAppLink(client.phone);
            return (
              <div
                key={client.id}
                className="p-5 rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-[#424642] dark:text-[#F3F4ED]">
                        {client.name}
                      </h3>
                      {client.instagram && (
                        <p className="text-xs font-medium text-[#C06014] mt-0.5">
                          {client.instagram}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F4ED] dark:bg-[#353935] text-[#536162] dark:text-[#9BA39B]">
                      {client.total_projects || 0} Acara
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#536162] dark:text-[#9BA39B] pt-2 border-t border-[#F3F4ED] dark:border-[#353935]">
                    {client.phone && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-[#536162]" />
                          <span className="font-mono text-xs">{client.phone}</span>
                        </div>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                            title="Buka Chat WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#536162]" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                    {client.notes && (
                      <p className="text-[11px] italic text-[#536162] pt-1">
                        "{client.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Financial Snapshot */}
                <div className="mt-4 pt-3 border-t border-[#E5E7DC] dark:border-[#353935] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#536162] dark:text-[#9BA39B]">
                      Sisa Piutang
                    </span>
                    <p className={`text-xs font-bold tabular-nums ${hasOutstanding ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {hasOutstanding ? formatIDR(client.outstanding_balance) : 'Lunas'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedClient(client)}
                    className="px-3 py-1.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-medium text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Riwayat</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Klien Baru"
        subtitle="STOA PICTURES Client Relationship Directory"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
              Nama Klien / Pengantin *
            </label>
            <input
              type="text"
              placeholder="Dimas Pratama & Nadia Larasati"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                placeholder="0812-3456-7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                Instagram
              </label>
              <input
                type="text"
                placeholder="@nadialaras"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
              Alamat Domisili
            </label>
            <input
              type="text"
              placeholder="Menteng, Jakarta Pusat"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
              Catatan / Referensi
            </label>
            <input
              type="text"
              placeholder="Rekomendasi WO Amora, Wedding luxury ballroom"
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
              Simpan Klien
            </button>
          </div>
        </form>
      </Modal>

      {/* Client Detail & Projects History Modal */}
      {selectedClient && (
        <Modal
          isOpen={selectedClient !== null}
          onClose={() => setSelectedClient(null)}
          title={`Profil Klien: ${selectedClient.name}`}
          subtitle="Riwayat Proyek Pernikahan & Status Finansial"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#536162] dark:text-[#9BA39B]">Total Kontrak</span>
                <p className="text-base font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-0.5">
                  {formatIDR(selectedClient.total_contract_value)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#536162] dark:text-[#9BA39B]">Total Terbayar</span>
                <p className="text-base font-bold text-emerald-600 tabular-nums mt-0.5">
                  {formatIDR(selectedClient.total_paid)}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#536162] dark:text-[#9BA39B]">Sisa Piutang</span>
                <p className="text-base font-bold text-rose-600 tabular-nums mt-0.5">
                  {formatIDR(selectedClient.outstanding_balance)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED] mb-3">
                Daftar Proyek Terhubung ({clientProjects.length})
              </h4>
              {clientProjects.length > 0 ? (
                <div className="space-y-2">
                  {clientProjects.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setSelectedClient(null);
                        onOpenProjectDetail(p);
                      }}
                      className="p-3.5 rounded-xl border border-[#E5E7DC] dark:border-[#353935] hover:bg-[#FDFBF7] dark:hover:bg-[#252825] cursor-pointer flex items-center justify-between gap-4 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED]">
                          {p.package_name} ({p.project_code})
                        </p>
                        <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                          {formatDateID(p.event_date)} · {p.event_location}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums">
                          {formatIDR(p.contract_value)}
                        </span>
                        {(() => {
                          const status = getProjectBookingStatus(p);
                          return (
                            <p className={`text-[10px] font-semibold ${status.isLunas ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {status.label}
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#536162] italic">Belum ada proyek terhubung dengan klien ini.</p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Clear Clients Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isClearClientsConfirmOpen}
        onClose={() => setIsClearClientsConfirmOpen(false)}
        onConfirm={() => {
          onClearAllClients?.();
          setIsClearClientsConfirmOpen(false);
        }}
        title="Kosongkan Semua Database Klien"
        message="PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh database klien? Seluruh profil klien akan dihapus secara permanen."
        confirmLabel="Ya, Kosongkan Klien"
      />
    </div>
  );
};
