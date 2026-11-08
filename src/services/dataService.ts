/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Central Data Service for STOA FINANCE
 * Coordinates Supabase PostgreSQL sync, reactive state, and strict financial calculations.
 */

import {
  Project,
  Client,
  Payment,
  ProjectExpense,
  TeamMember,
  TeamRole,
  ProjectDeliverable,
  HistoricalFinancialRecap,
  HistoricalSamuraFee,
  ImportLog,
  ExpenseCategory,
  ExpenseCategoryName,
  BookingInvoice,
  InvoiceStatus,
  BookingInvoiceSnapshot
} from '../types/database';
import { getPackageByName } from '../data/stoaPricelist';
import {
  INITIAL_CLIENTS,
  INITIAL_DELIVERABLES,
  INITIAL_EXPENSES,
  INITIAL_EXPENSE_CATEGORIES,
  INITIAL_HISTORICAL_RECAP,
  INITIAL_HISTORICAL_SAMURA_FEES,
  INITIAL_PAYMENTS,
  INITIAL_PROJECTS,
  INITIAL_TEAM_MEMBERS
} from './initialData';
import { getSupabase } from '../lib/supabase';
import { calculateProjectFinancials, getMonthCategoryFromDate } from '../lib/formatters';

const STORAGE_KEYS = {
  PROJECTS: 'stoa_v5_projects',
  CLIENTS: 'stoa_v5_clients',
  PAYMENTS: 'stoa_v5_payments',
  EXPENSES: 'stoa_v5_expenses',
  DELIVERABLES: 'stoa_v5_deliverables',
  TEAM: 'stoa_v5_team',
  CATEGORIES: 'stoa_v5_categories',
  RECAP: 'stoa_v5_recap',
  IMPORT_LOGS: 'stoa_v5_import_logs',
  INVOICES: 'stoa_v5_invoices'
};

class DataService {
  private projects: Project[] = [];
  private clients: Client[] = [];
  private payments: Payment[] = [];
  private expenses: ProjectExpense[] = [];
  private deliverables: ProjectDeliverable[] = [];
  private teamMembers: TeamMember[] = [];
  private categories: ExpenseCategory[] = [];
  private historicalRecap: HistoricalFinancialRecap[] = [];
  private historicalSamuraFees: HistoricalSamuraFee[] = [];
  private importLogs: ImportLog[] = [];
  private samuraFeePercentage: number = 0;
  private invoices: BookingInvoice[] = [];

  private listeners: Set<() => void> = new Set();
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      // Clear legacy storage keys (stoa_v1_, stoa_v2_, stoa_v3_, stoa_v4_, stoa_data_)
      const legacyPrefixes = ['stoa_v1_', 'stoa_v2_', 'stoa_v3_', 'stoa_v4_', 'stoa_data_'];
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && legacyPrefixes.some(p => k.startsWith(p))) {
            localStorage.removeItem(k);
          }
        }
      } catch {}

      const storedProjects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
      const storedClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      const storedPayments = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      const storedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      const storedDeliverables = localStorage.getItem(STORAGE_KEYS.DELIVERABLES);
      const storedTeam = localStorage.getItem(STORAGE_KEYS.TEAM);
      const storedRecap = localStorage.getItem(STORAGE_KEYS.RECAP);
      const storedLogs = localStorage.getItem(STORAGE_KEYS.IMPORT_LOGS);
      const storedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);

      this.projects = storedProjects ? JSON.parse(storedProjects) : [];
      this.clients = storedClients ? JSON.parse(storedClients) : [];
      this.payments = storedPayments ? JSON.parse(storedPayments) : [];
      this.expenses = storedExpenses ? JSON.parse(storedExpenses) : [];
      this.deliverables = storedDeliverables ? JSON.parse(storedDeliverables) : [];
      this.teamMembers = storedTeam ? JSON.parse(storedTeam) : [];
      this.categories = INITIAL_EXPENSE_CATEGORIES;
      this.historicalRecap = storedRecap ? JSON.parse(storedRecap) : [];
      this.historicalSamuraFees = [];
      this.importLogs = storedLogs ? JSON.parse(storedLogs) : [];
      this.samuraFeePercentage = 0;
      this.invoices = storedInvoices ? JSON.parse(storedInvoices) : [];

      this.saveLocal();
      this.isInitialized = true;

      // Automatically sync and pull projects from Supabase in background
      setTimeout(() => {
        this.syncWithSupabase().catch(e => console.warn('Background Supabase init sync:', e));
      }, 300);
    } catch (err) {
      console.error('Failed to load local data:', err);
      this.projects = [];
      this.clients = [];
      this.payments = [];
      this.expenses = [];
      this.deliverables = [];
      this.teamMembers = [];
      this.categories = INITIAL_EXPENSE_CATEGORIES;
      this.historicalRecap = [];
      this.historicalSamuraFees = [];
      this.invoices = [];
    }
  }

  private saveLocal() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(this.projects));
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(this.clients));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(this.payments));
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(this.expenses));
      localStorage.setItem(STORAGE_KEYS.DELIVERABLES, JSON.stringify(this.deliverables));
      localStorage.setItem(STORAGE_KEYS.TEAM, JSON.stringify(this.teamMembers));
      localStorage.setItem(STORAGE_KEYS.RECAP, JSON.stringify(this.historicalRecap));
      localStorage.setItem(STORAGE_KEYS.IMPORT_LOGS, JSON.stringify(this.importLogs));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(this.invoices));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.saveLocal();
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('DataService subscriber error:', err);
      }
    });
  }

  // --- Supabase Remote Synchronization ---

  /**
   * Checks if required PostgreSQL tables exist in the configured Supabase database
   */
  public async checkSupabaseTables(): Promise<{
    connected: boolean;
    ready: boolean;
    missingTables: string[];
    message: string;
  }> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        connected: false,
        ready: false,
        missingTables: [],
        message: 'Supabase client belum dikonfigurasi.'
      };
    }

    const requiredTables = [
      'projects',
      'clients',
      'payments',
      'project_expenses',
      'project_deliverables',
      'team_members',
      'app_settings'
    ];

    const missing: string[] = [];

    for (const table of requiredTables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
          missing.push(table);
        }
      } catch {
        missing.push(table);
      }
    }

    if (missing.length > 0) {
      return {
        connected: true,
        ready: false,
        missingTables: missing,
        message: `Koneksi Supabase aktif, namun ${missing.length} tabel belum dibuat (${missing.join(', ')}). Silakan jalankan script SQL Schema di menu Pengaturan > Supabase Database.`
      };
    }

    return {
      connected: true,
      ready: true,
      missingTables: [],
      message: 'Semua tabel database Supabase siap & aktif!'
    };
  }

  /**
   * Pushes all local records to Supabase tables using upsert
   */
  public async pushAllToSupabase(): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'Supabase client belum dikonfigurasi.' };
    }

    try {
      // 1. Clients
      if (this.clients.length > 0) {
        const clientRows = this.clients.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || null,
          email: c.email || null,
          instagram: c.instagram || null,
          address: c.address || null,
          notes: c.notes || null,
          created_at: c.created_at || new Date().toISOString(),
          updated_at: c.updated_at || new Date().toISOString()
        }));
        const { error: cErr } = await supabase.from('clients').upsert(clientRows, { onConflict: 'id' });
        if (cErr && (cErr.code === 'PGRST205' || cErr.code === '42P01')) {
          return { success: false, message: 'Tabel clients belum dibuat di Supabase.' };
        }
      }

      // 2. Projects
      if (this.projects.length > 0) {
        const projectRows = this.projects.map(p => ({
          id: p.id,
          project_code: p.project_code,
          client_id: p.client_id || null,
          client_name: p.client_name,
          client_phone: p.client_phone || null,
          event_date: p.event_date,
          month_category: p.month_category,
          event_location: p.event_location || 'Pematangsiantar',
          package_name: p.package_name,
          contract_value: p.contract_value || 0,
          original_price: p.original_price || null,
          transport_fee: p.transport_fee || 0,
          additional_album_fee: p.additional_album_fee || 0,
          discount: p.discount || 0,
          discount_reason: p.discount_reason || null,
          initial_dp: p.initial_dp || 0,
          status: p.status || 'Confirmed',
          notes: p.notes || null,
          source_year: p.source_year || (p.event_date ? new Date(p.event_date).getFullYear() : 2024),
          created_at: p.created_at || new Date().toISOString(),
          updated_at: p.updated_at || new Date().toISOString()
        }));
        const { error: pErr } = await supabase.from('projects').upsert(projectRows, { onConflict: 'id' });
        if (pErr && (pErr.code === 'PGRST205' || pErr.code === '42P01')) {
          return { success: false, message: 'Tabel projects belum dibuat di Supabase.' };
        }
      }

      // 3. Payments
      if (this.payments.length > 0) {
        const payRows = this.payments.map(py => ({
          id: py.id,
          project_id: py.project_id,
          client_id: py.client_id || null,
          payment_type: py.payment_type || 'dp',
          payment_date: py.payment_date,
          amount: py.amount || 0,
          payment_method: py.payment_method || 'Transfer Bank',
          description: py.description || '',
          reference_number: py.reference_number || null,
          status: py.status || 'confirmed',
          created_at: py.created_at || new Date().toISOString(),
          updated_at: py.updated_at || new Date().toISOString()
        }));
        await supabase.from('payments').upsert(payRows, { onConflict: 'id' });
      }

      // 4. Project Expenses
      if (this.expenses.length > 0) {
        const expRows = this.expenses.map(e => ({
          id: e.id,
          project_id: e.project_id,
          category: e.category,
          transaction_date: e.transaction_date,
          amount: e.amount || 0,
          description: e.description || '',
          recipient_name: e.recipient_name || '',
          recipient_id: e.recipient_id || null,
          created_at: e.created_at || new Date().toISOString(),
          updated_at: e.updated_at || new Date().toISOString()
        }));
        await supabase.from('project_expenses').upsert(expRows, { onConflict: 'id' });
      }

      // 5. Project Deliverables
      if (this.deliverables.length > 0) {
        const delivRows = this.deliverables.map(d => ({
          id: d.id,
          project_id: d.project_id,
          deadline: d.deadline,
          album_type: d.album_type || '',
          printing_price: d.printing_price || 0,
          drive_status: d.drive_status || 'PENDING',
          album_status: d.album_status || 'PENDING',
          cinematic_status: d.cinematic_status || 'PENDING',
          shooting_status: d.shooting_status || 'PENDING',
          shooting_operator: d.shooting_operator || 'STOA Lead',
          notes: d.notes || '',
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString()
        }));
        await supabase.from('project_deliverables').upsert(delivRows, { onConflict: 'id' });
      }

      // 6. Team Members
      if (this.teamMembers.length > 0) {
        const teamRows = this.teamMembers.map(t => ({
          id: t.id,
          name: t.name,
          primary_role: t.primary_role,
          phone: t.phone || null,
          email: t.email || null,
          instagram: t.instagram || null,
          bank_account: t.bank_account || null,
          notes: t.notes || null,
          is_active: t.is_active ?? true,
          created_at: t.created_at || new Date().toISOString(),
          updated_at: t.updated_at || new Date().toISOString()
        }));
        await supabase.from('team_members').upsert(teamRows, { onConflict: 'id' });
      }

      // 7. Booking Invoices
      if (this.invoices.length > 0) {
        const invRows = this.invoices.map(inv => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          project_id: inv.project_id,
          client_id: inv.client_id || null,
          issue_date: inv.issue_date,
          due_date: inv.due_date || null,
          total_amount: inv.total_amount,
          paid_amount: inv.paid_amount,
          remaining_amount: inv.remaining_amount,
          status: inv.status,
          client_name: inv.client_name,
          client_phone: inv.client_phone || null,
          event_date: inv.event_date,
          event_location: inv.event_location,
          package_name: inv.package_name,
          bank_info: inv.bank_info || null,
          notes: inv.notes || null,
          terms: inv.terms || null,
          snapshot_data: inv.snapshot_data || null,
          pdf_url: inv.pdf_url || null,
          created_at: inv.created_at,
          updated_at: inv.updated_at
        }));
        await supabase.from('booking_invoices').upsert(invRows, { onConflict: 'id' });
      }

      return {
        success: true,
        message: `Berhasil mengunggah ${this.projects.length} proyek, ${this.clients.length} klien, dan ${this.invoices.length} invoice ke Supabase!`
      };
    } catch (err: any) {
      console.warn('pushAllToSupabase error:', err);
      return { success: false, message: `Gagal upload: ${err.message}` };
    }
  }

  /**
   * Pulls data from Supabase and merges into local state (Smart Merge)
   * Prevents local projects or clients from ever being wiped out!
   */
  public async pullFromSupabase(): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'Supabase client belum dikonfigurasi.' };
    }

    try {
      // 1. Projects (Merge)
      const { data: dbProjects, error: projErr } = await supabase.from('projects').select('*');
      if (!projErr && dbProjects && dbProjects.length > 0) {
        const projectMap = new Map<string, Project>();
        // Keep all local projects first
        this.projects.forEach(p => projectMap.set(p.id, p));
        // Merge remote projects
        dbProjects.forEach(rp => {
          const existing = projectMap.get(rp.id) || Array.from(projectMap.values()).find(p => p.project_code === rp.project_code);
          if (existing) {
            projectMap.set(existing.id, { ...existing, ...rp, id: existing.id });
          } else {
            projectMap.set(rp.id, rp);
          }
        });
        this.projects = Array.from(projectMap.values());
      }

      // 2. Clients (Merge)
      const { data: dbClients, error: clientErr } = await supabase.from('clients').select('*');
      if (!clientErr && dbClients && dbClients.length > 0) {
        const clientMap = new Map<string, Client>();
        this.clients.forEach(c => clientMap.set(c.id, c));
        dbClients.forEach(rc => {
          const existing = clientMap.get(rc.id) || Array.from(clientMap.values()).find(c => c.name.toLowerCase() === rc.name.toLowerCase());
          if (existing) {
            clientMap.set(existing.id, { ...existing, ...rc, id: existing.id });
          } else {
            clientMap.set(rc.id, rc);
          }
        });
        this.clients = Array.from(clientMap.values());
      }

      // 3. Payments (Merge)
      const { data: dbPayments, error: payErr } = await supabase.from('payments').select('*');
      if (!payErr && dbPayments && dbPayments.length > 0) {
        const payMap = new Map<string, Payment>();
        this.payments.forEach(p => payMap.set(p.id, p));
        dbPayments.forEach(rp => payMap.set(rp.id, rp));
        this.payments = Array.from(payMap.values());
      }

      // 4. Expenses (Merge)
      const { data: dbExpenses, error: expErr } = await supabase.from('project_expenses').select('*');
      if (!expErr && dbExpenses && dbExpenses.length > 0) {
        const expMap = new Map<string, ProjectExpense>();
        this.expenses.forEach(e => expMap.set(e.id, e));
        dbExpenses.forEach(re => expMap.set(re.id, re));
        this.expenses = Array.from(expMap.values());
      }

      // 5. Deliverables (Merge)
      const { data: dbDeliv, error: delivErr } = await supabase.from('project_deliverables').select('*');
      if (!delivErr && dbDeliv && dbDeliv.length > 0) {
        const delivMap = new Map<string, ProjectDeliverable>();
        this.deliverables.forEach(d => delivMap.set(d.id, d));
        dbDeliv.forEach(rd => delivMap.set(rd.id, rd));
        this.deliverables = Array.from(delivMap.values());
      }

      // 6. Team Members (Merge)
      const { data: dbTeam, error: teamErr } = await supabase.from('team_members').select('*');
      if (!teamErr && dbTeam && dbTeam.length > 0) {
        const teamMap = new Map<string, TeamMember>();
        this.teamMembers.forEach(t => teamMap.set(t.id, t));
        dbTeam.forEach(rt => teamMap.set(rt.id, rt));
        this.teamMembers = Array.from(teamMap.values());
      }

      // 7. Booking Invoices (Merge)
      try {
        const { data: dbInvoices, error: invErr } = await supabase.from('booking_invoices').select('*');
        if (!invErr && dbInvoices && dbInvoices.length > 0) {
          const invMap = new Map<string, BookingInvoice>();
          this.invoices.forEach(i => invMap.set(i.id, i));
          dbInvoices.forEach(ri => {
            const existing = invMap.get(ri.id) || Array.from(invMap.values()).find(i => i.invoice_number === ri.invoice_number);
            if (existing) {
              invMap.set(existing.id, { ...existing, ...ri, id: existing.id });
            } else {
              invMap.set(ri.id, ri);
            }
          });
          this.invoices = Array.from(invMap.values());
        }
      } catch (invPullErr) {
        console.warn('Pull booking_invoices notice:', invPullErr);
      }

      this.notify();
      return { success: true, message: 'Data berhasil ditarik dan disinkronkan dari Supabase.' };
    } catch (err: any) {
      return { success: false, message: `Gagal membaca dari Supabase: ${err.message}` };
    }
  }

  /**
   * Complete Two-Way Smart Sync (Push local + Pull remote + Smart Merge)
   * Guaranteed never to lose newly input projects!
   */
  public async syncWithSupabase(): Promise<{ success: boolean; message: string; code?: string }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { success: false, message: 'Supabase client belum dikonfigurasi.' };
    }

    // 1. Verify if tables exist first
    const tableStatus = await this.checkSupabaseTables();
    if (!tableStatus.ready) {
      return {
        success: false,
        code: 'TABLES_NEED_SETUP',
        message: 'Koneksi Supabase terhubung, namun tabel database belum dibuat di Supabase SQL Editor. Data proyek & klien Anda tetap aman tersimpan di perangkat. Silakan salin & jalankan script SQL Schema di menu Pengaturan.'
      };
    }

    // 2. Push all local records first so newly created projects are uploaded
    await this.pushAllToSupabase();

    // 3. Pull and merge from Supabase
    await this.pullFromSupabase();

    return {
      success: true,
      message: `Sinkronisasi Cloud Berhasil! ${this.projects.length} Proyek dan ${this.clients.length} Klien tersinkronisasi di Supabase Cloud.`
    };
  }

  // Alias for backward compatibility
  public async syncFromSupabase(): Promise<{ success: boolean; message: string }> {
    return this.syncWithSupabase();
  }

  public async syncAllToSupabase(): Promise<{ success: boolean; message: string }> {
    return this.syncWithSupabase();
  }

  // --- Getters with Financial Computations ---
  public getProjects(): Project[] {
    return this.projects.map(proj => {
      const calc = calculateProjectFinancials(proj, this.payments, this.expenses, this.samuraFeePercentage);
      return {
        ...proj,
        total_payments_received: calc.totalPaymentsReceived,
        outstanding_balance: calc.outstandingBalance,
        total_expenses: calc.totalExpenses,
        gross_profit: calc.grossProfit,
        samura_fee: calc.samuraFee,
        net_profit_after_fee: calc.netProfitAfterFee
      };
    });
  }

  public getProjectById(id: string): Project | undefined {
    return this.getProjects().find(p => p.id === id);
  }

  public getClients(): Client[] {
    const projects = this.getProjects();
    return this.clients.map(client => {
      const clientProjects = projects.filter(p => p.client_id === client.id || p.client_name.toLowerCase() === client.name.toLowerCase());
      const totalContract = clientProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
      const totalPaid = clientProjects.reduce((sum, p) => sum + (p.total_payments_received || 0), 0);
      const outstanding = Math.max(0, totalContract - totalPaid);

      return {
        ...client,
        total_projects: clientProjects.length,
        total_contract_value: totalContract,
        total_paid: totalPaid,
        outstanding_balance: outstanding
      };
    });
  }

  public getPayments(): Payment[] {
    return [...this.payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }

  public getExpenses(): ProjectExpense[] {
    const projectMap = new Map(this.projects.map(p => [p.id, p]));
    return this.expenses.map(e => {
      const proj = e.project_id ? projectMap.get(e.project_id) : undefined;
      return {
        ...e,
        project_code: e.project_code || proj?.project_code || '-',
        client_name: e.client_name || proj?.client_name || '-'
      };
    }).sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }

  public getDeliverables(): ProjectDeliverable[] {
    const projects = this.getProjects();
    return this.deliverables.map(deliv => {
      const proj = projects.find(p => p.id === deliv.project_id);
      
      // Calculate completion %
      const statuses = [deliv.shooting_status, deliv.drive_status, deliv.cinematic_status, deliv.album_status];
      const applicableStatuses = statuses.filter(s => s !== 'NOT APPLICABLE');
      const completedCount = applicableStatuses.filter(s => s === 'DONE').length;
      const inProgressCount = applicableStatuses.filter(s => s === 'IN PROGRESS').length;
      const completionPercentage = applicableStatuses.length > 0 
        ? Math.round(((completedCount * 100) + (inProgressCount * 50)) / applicableStatuses.length) 
        : 100;

      return {
        ...deliv,
        project_code: proj?.project_code || 'N/A',
        client_name: proj?.client_name || 'Client',
        event_date: proj?.event_date || '',
        package_name: proj?.package_name || '',
        completion_percentage: completionPercentage
      };
    }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }

  public getTeamMembers(): TeamMember[] {
    const expenses = this.getExpenses();
    return this.teamMembers.map(member => {
      const memberExpenses = expenses.filter(e => 
        e.recipient_name.toLowerCase() === member.name.toLowerCase() || e.recipient_id === member.id
      );
      const totalEarned = memberExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      return {
        ...member,
        project_count: new Set(memberExpenses.map(e => e.project_id)).size,
        total_earned: totalEarned
      };
    });
  }

  public getExpenseCategories(): ExpenseCategory[] {
    return this.categories;
  }

  public getHistoricalRecap(): HistoricalFinancialRecap[] {
    return this.historicalRecap;
  }

  public getHistoricalSamuraFees(): HistoricalSamuraFee[] {
    return this.historicalSamuraFees;
  }

  public getImportLogs(): ImportLog[] {
    return this.importLogs;
  }

  public getSamuraFeePercentage(): number {
    return this.samuraFeePercentage;
  }

  public setSamuraFeePercentage(pct: number) {
    this.samuraFeePercentage = pct;
    this.notify();
    
    // Save to Supabase
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('app_settings').upsert({
        key: 'samura_default_fee_percentage',
        value: pct,
        description: 'Default fee percentage for Samura management'
      }, { onConflict: 'key' }).then();
    }
  }

  // --- CRUD Operations for Projects ---
  public addProject(
    project: Omit<Project, 'id' | 'created_at' | 'updated_at'>,
    initialExpenses?: Array<{
      category: ExpenseCategoryName;
      amount: number;
      recipient_name?: string;
      description?: string;
    }>
  ): Project {
    const id = `proj-${Date.now()}`;
    const now = new Date().toISOString();
    const monthCategory = project.month_category || getMonthCategoryFromDate(project.event_date);
    
    // 1. Auto-sync Client into Database Klien (klien yang booking otomatis masuk database klien)
    const clientName = project.client_name.trim();
    const clientPhone = project.client_phone?.trim() || null;
    let client = this.clients.find(c => 
      c.name.toLowerCase() === clientName.toLowerCase() || 
      (clientPhone && c.phone && c.phone.replace(/\D/g, '') === clientPhone.replace(/\D/g, ''))
    );

    if (!client) {
      const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      client = {
        id: clientId,
        name: clientName,
        phone: clientPhone,
        address: project.event_location || null,
        notes: `Klien booking Proyek ${project.project_code} (${project.package_name})`,
        created_at: now,
        updated_at: now
      };
      this.clients.unshift(client);

      const supabase = getSupabase();
      if (supabase) {
        supabase.from('clients').upsert([{
          id: client.id,
          name: client.name,
          phone: client.phone,
          address: client.address,
          notes: client.notes,
          created_at: client.created_at,
          updated_at: client.updated_at
        }], { onConflict: 'id' }).then(({ error }) => {
          if (error) console.warn('Supabase auto-client upsert error:', error);
        });
      }
    } else {
      let updated = false;
      if (!client.phone && clientPhone) {
        client.phone = clientPhone;
        updated = true;
      }
      if (!client.address && project.event_location) {
        client.address = project.event_location;
        updated = true;
      }
      if (updated) {
        client.updated_at = now;
        const supabase = getSupabase();
        if (supabase) {
          supabase.from('clients').update({
            phone: client.phone,
            address: client.address,
            updated_at: client.updated_at
          }).eq('id', client.id).then();
        }
      }
    }

    const newProject: Project = {
      ...project,
      client_id: client.id,
      month_category: monthCategory,
      status: project.status || 'Confirmed',
      id,
      created_at: now,
      updated_at: now
    };

    this.projects.unshift(newProject);

    // If initial_dp > 0, automatically record initial payment
    if (newProject.initial_dp > 0) {
      this.addPayment({
        project_id: id,
        client_id: newProject.client_id,
        client_name: newProject.client_name,
        project_code: newProject.project_code,
        payment_type: 'dp',
        payment_date: newProject.event_date ? newProject.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
        amount: newProject.initial_dp,
        payment_method: 'Transfer Bank',
        description: `Down Payment (DP) Awal Booking: ${newProject.package_name}`,
        status: 'confirmed'
      }, false);
    }

    // Lookup pricelist package specs for deliverables
    const pkg = getPackageByName(newProject.package_name);

    // Auto create pending deliverable record based on selected package specs
    this.addDeliverable({
      project_id: id,
      deadline: this.computeDefaultDeadline(newProject.event_date),
      album_type: pkg?.album || 'Cetak Album Megazine 10 Sheet',
      printing_price: pkg?.defaultPrintingCost || 1200000,
      drive_status: 'PENDING',
      album_status: 'PENDING',
      cinematic_status: (pkg?.weddingCinema || newProject.package_name.toLowerCase().includes('cinema') || newProject.package_name.toLowerCase().includes('gold') || newProject.package_name.toLowerCase().includes('signature')) ? 'PENDING' : 'NOT APPLICABLE',
      shooting_status: 'PENDING',
      shooting_operator: pkg?.crew || 'Lead FG STOA',
      notes: `Deliverable untuk ${newProject.package_name}`
    }, false);

    // Record initial production expenses if provided (and auto-sync to Database Tim)
    if (initialExpenses && initialExpenses.length > 0) {
      for (const exp of initialExpenses) {
        if (exp.amount > 0) {
          this.addExpense({
            project_id: id,
            project_code: newProject.project_code,
            client_name: newProject.client_name,
            category: exp.category,
            transaction_date: newProject.event_date || new Date().toISOString().slice(0, 10),
            amount: exp.amount,
            recipient_name: exp.recipient_name?.trim() || `Tim / Vendor ${exp.category}`,
            description: exp.description?.trim() || `Alokasi Biaya ${exp.category} - ${newProject.client_name}`
          }, false);
        }
      }
    }

    this.notify();

    // Supabase Upsert Write (Saves project with exact ID and client relationship)
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('projects').upsert([{
        id: newProject.id,
        project_code: newProject.project_code,
        client_id: newProject.client_id,
        client_name: newProject.client_name,
        client_phone: newProject.client_phone || null,
        event_date: newProject.event_date,
        month_category: newProject.month_category,
        event_location: newProject.event_location,
        package_name: newProject.package_name,
        contract_value: newProject.contract_value,
        original_price: newProject.original_price || null,
        transport_fee: newProject.transport_fee || 0,
        additional_album_fee: newProject.additional_album_fee || 0,
        discount: newProject.discount || 0,
        discount_reason: newProject.discount_reason || null,
        initial_dp: newProject.initial_dp,
        status: newProject.status || 'Confirmed',
        source_year: newProject.source_year || (newProject.event_date ? new Date(newProject.event_date).getFullYear() : 2026),
        notes: newProject.notes || null,
        created_at: newProject.created_at,
        updated_at: newProject.updated_at
      }], { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Supabase addProject upsert error:', error);
      });
    }

    return newProject;
  }

  private computeDefaultDeadline(eventDate: string): string {
    try {
      const d = new Date(eventDate);
      d.setDate(d.getDate() + 45); // 45 days after wedding
      return d.toISOString().slice(0, 10);
    } catch {
      return eventDate;
    }
  }

  public updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const idx = this.projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;

    const oldProject = this.projects[idx];
    const monthCategory = updates.month_category !== undefined 
      ? updates.month_category 
      : (updates.event_date ? getMonthCategoryFromDate(updates.event_date) : oldProject.month_category);

    this.projects[idx] = {
      ...this.projects[idx],
      ...updates,
      month_category: monthCategory,
      updated_at: new Date().toISOString()
    };

    // If package was changed (revisi paket), synchronize associated deliverable specs!
    if (updates.package_name && updates.package_name !== oldProject.package_name) {
      const pkg = getPackageByName(updates.package_name);
      if (pkg) {
        const delivIdx = this.deliverables.findIndex(d => d.project_id === id);
        if (delivIdx !== -1) {
          this.deliverables[delivIdx] = {
            ...this.deliverables[delivIdx],
            package_name: updates.package_name,
            album_type: pkg.album || this.deliverables[delivIdx].album_type,
            printing_price: pkg.defaultPrintingCost || this.deliverables[delivIdx].printing_price,
            cinematic_status: (pkg.weddingCinema || updates.package_name.toLowerCase().includes('cinema') || updates.package_name.toLowerCase().includes('gold') || updates.package_name.toLowerCase().includes('signature')) ? 'PENDING' : 'NOT APPLICABLE',
            shooting_operator: pkg.crew || this.deliverables[delivIdx].shooting_operator,
            notes: `Spesifikasi deliverable disesuaikan dengan revisi paket: ${updates.package_name}`,
            updated_at: new Date().toISOString()
          };
        }
      }
    }

    // Sync client info in Database Klien if updated
    if (updates.client_name || updates.client_phone) {
      const cIdx = this.clients.findIndex(c => c.id === this.projects[idx].client_id || c.name.toLowerCase() === oldProject.client_name.toLowerCase());
      if (cIdx !== -1) {
        this.clients[cIdx] = {
          ...this.clients[cIdx],
          name: updates.client_name ? updates.client_name.trim() : this.clients[cIdx].name,
          phone: updates.client_phone !== undefined ? updates.client_phone : this.clients[cIdx].phone,
          address: updates.event_location || this.clients[cIdx].address,
          updated_at: new Date().toISOString()
        };
      }
    }

    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('projects').update({
        client_name: updates.client_name,
        client_phone: updates.client_phone,
        event_date: updates.event_date,
        month_category: monthCategory,
        event_location: updates.event_location,
        package_name: updates.package_name,
        contract_value: updates.contract_value,
        original_price: updates.original_price,
        transport_fee: updates.transport_fee,
        additional_album_fee: updates.additional_album_fee,
        discount: updates.discount,
        discount_reason: updates.discount_reason,
        initial_dp: updates.initial_dp,
        status: updates.status || 'Confirmed',
        notes: updates.notes
      }).eq('id', id).then();
    }

    return this.projects[idx];
  }

  public deleteProject(id: string): boolean {
    const initialLen = this.projects.length;
    this.projects = this.projects.filter(p => p.id !== id);
    // Also delete cascade local payments, expenses, deliverables
    this.payments = this.payments.filter(p => p.project_id !== id);
    this.expenses = this.expenses.filter(e => e.project_id !== id);
    this.deliverables = this.deliverables.filter(d => d.project_id !== id);

    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('projects').delete().eq('id', id).then();
    }

    return this.projects.length < initialLen;
  }

  // --- CRUD for Payments ---
  public addPayment(payment: Omit<Payment, 'id' | 'created_at' | 'updated_at'>, shouldNotify = true): Payment {
    const id = `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const newPayment: Payment = {
      ...payment,
      id,
      created_at: now,
      updated_at: now
    };

    this.payments.unshift(newPayment);
    this.syncInvoiceWithProjectPayments(newPayment.project_id);
    if (shouldNotify) this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('payments').upsert([{
        id: newPayment.id,
        project_id: newPayment.project_id,
        client_id: newPayment.client_id || null,
        payment_type: newPayment.payment_type || 'dp',
        payment_date: newPayment.payment_date,
        amount: newPayment.amount || 0,
        payment_method: newPayment.payment_method || 'Transfer Bank',
        description: newPayment.description || '',
        reference_number: newPayment.reference_number || null,
        status: newPayment.status || 'confirmed',
        created_at: newPayment.created_at,
        updated_at: newPayment.updated_at
      }], { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Supabase addPayment upsert error:', error);
      });
    }

    return newPayment;
  }

  public deletePayment(id: string): boolean {
    const target = this.payments.find(p => p.id === id);
    const initialLen = this.payments.length;
    this.payments = this.payments.filter(p => p.id !== id);
    if (target) {
      this.syncInvoiceWithProjectPayments(target.project_id);
    }
    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('payments').delete().eq('id', id).then();
    }

    return this.payments.length < initialLen;
  }

  /**
   * Settle project under H+3 policy (record final payment for remaining balance)
   */
  public settleHPlus3Project(projectId: string): boolean {
    const project = this.getProjectById(projectId);
    if (!project) return false;
    const balance = project.outstanding_balance || 0;
    if (balance <= 0) return true;

    // Use H+3 date or today
    let payDate = new Date().toISOString().slice(0, 10);
    if (project.event_date) {
      try {
        const d = new Date(project.event_date);
        d.setDate(d.getDate() + 3);
        payDate = d.toISOString().slice(0, 10);
      } catch {}
    }

    this.addPayment({
      project_id: projectId,
      client_id: project.client_id,
      payment_type: 'final',
      payment_date: payDate,
      amount: balance,
      payment_method: 'Transfer Bank',
      description: 'Pelunasan Otomatis H+3 Pasca Acara',
      reference_number: `H3-AUTO-${project.project_code}`,
      status: 'confirmed'
    });

    return true;
  }

  private mapCategoryToRole(category: ExpenseCategoryName): TeamRole {
    switch (category) {
      case 'FG 1':
        return 'First Photographer (FG 1)';
      case 'FG 2':
        return 'Second Photographer (FG 2)';
      case 'Shooting':
        return 'Lead Photographer';
      case 'Editor':
        return 'Photo Editor';
      case 'Cetak':
        return 'Vendor';
      case 'Cinema':
        return 'Cinematographer / Videographer';
      case 'Transport / Akomodasi':
        return 'Crew / Assistant';
      case 'Other Expenses':
      default:
        return 'Vendor';
    }
  }

  public addExpense(expense: Omit<ProjectExpense, 'id' | 'created_at' | 'updated_at'>, shouldNotify = true): ProjectExpense {
    const id = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const proj = expense.project_id ? this.getProjectById(expense.project_id) : undefined;
    const newExpense: ProjectExpense = {
      ...expense,
      project_code: expense.project_code || proj?.project_code || '-',
      client_name: expense.client_name || proj?.client_name || '-',
      id,
      created_at: now,
      updated_at: now
    };

    this.expenses.unshift(newExpense);

    // Auto-sync recipient into Database Tim (team_members)
    const recipient = expense.recipient_name?.trim();
    if (
      recipient &&
      recipient !== '-' &&
      !recipient.toLowerCase().startsWith('tim / vendor') &&
      !recipient.toLowerCase().startsWith('operasional') &&
      !recipient.toLowerCase().startsWith('pengeluaran') &&
      !recipient.toLowerCase().startsWith('lab percetakan') &&
      !recipient.toLowerCase().startsWith('lead photographer stoa') &&
      !recipient.toLowerCase().startsWith('second fg stoa') &&
      !recipient.toLowerCase().startsWith('team editor stoa') &&
      !recipient.toLowerCase().startsWith('cinema & drone crew')
    ) {
      const existingMember = this.teamMembers.find(m => 
        m.name.toLowerCase() === recipient.toLowerCase()
      );
      if (!existingMember) {
        const newMemberId = `team-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const primaryRole = this.mapCategoryToRole(expense.category);
        const newMember: TeamMember = {
          id: newMemberId,
          name: recipient,
          primary_role: primaryRole,
          phone: null,
          email: null,
          instagram: null,
          bank_account: null,
          notes: `Kru/Vendor otomatis dari pengeluaran ${expense.category}`,
          is_active: true,
          created_at: now,
          updated_at: now
        };
        this.teamMembers.unshift(newMember);

        const supabase = getSupabase();
        if (supabase) {
          supabase.from('team_members').upsert([{
            id: newMember.id,
            name: newMember.name,
            primary_role: newMember.primary_role,
            phone: newMember.phone || null,
            email: newMember.email || null,
            instagram: newMember.instagram || null,
            bank_account: newMember.bank_account || null,
            notes: newMember.notes,
            is_active: true,
            created_at: newMember.created_at,
            updated_at: newMember.updated_at
          }], { onConflict: 'id' }).then(({ error }) => {
            if (error) console.warn('Supabase auto-team upsert error:', error);
          });
        }
      }
    }

    if (shouldNotify) this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('project_expenses').upsert([{
        id: newExpense.id,
        project_id: newExpense.project_id,
        category: newExpense.category,
        transaction_date: newExpense.transaction_date,
        amount: newExpense.amount,
        description: newExpense.description,
        recipient_name: newExpense.recipient_name,
        recipient_id: newExpense.recipient_id || null,
        created_at: newExpense.created_at,
        updated_at: newExpense.updated_at
      }], { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Supabase addExpense upsert error:', error);
      });
    }

    return newExpense;
  }

  public syncProjectExpenses(
    projectId: string,
    expensesList: Array<{
      category: ExpenseCategoryName;
      amount: number;
      recipient_name?: string;
      description?: string;
    }>,
    transactionDate?: string
  ) {
    const proj = this.getProjectById(projectId);
    const categorySet = new Set(expensesList.map(e => e.category));
    // Remove existing expenses for these 7 categories on this project
    this.expenses = this.expenses.filter(e => !(e.project_id === projectId && categorySet.has(e.category)));

    // Re-add expenses where amount > 0
    for (const exp of expensesList) {
      if (exp.amount > 0) {
        this.addExpense({
          project_id: projectId,
          category: exp.category,
          transaction_date: transactionDate || (proj?.event_date || new Date().toISOString().slice(0, 10)),
          amount: exp.amount,
          recipient_name: exp.recipient_name?.trim() || `Tim / Vendor ${exp.category}`,
          description: exp.description?.trim() || `Biaya ${exp.category} - ${proj?.client_name || ''}`
        }, false);
      }
    }
    this.notify();
  }

  public deleteExpense(id: string): boolean {
    const initialLen = this.expenses.length;
    this.expenses = this.expenses.filter(e => e.id !== id);
    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('project_expenses').delete().eq('id', id).then();
    }

    return this.expenses.length < initialLen;
  }

  // --- Deliverables CRUD ---
  public addDeliverable(deliv: Omit<ProjectDeliverable, 'id' | 'created_at' | 'updated_at'>, shouldNotify = true): ProjectDeliverable {
    const id = `deliv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();
    const newDeliv: ProjectDeliverable = {
      ...deliv,
      id,
      created_at: now,
      updated_at: now
    };

    this.deliverables.unshift(newDeliv);
    if (shouldNotify) this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('project_deliverables').upsert([{
        id: newDeliv.id,
        project_id: newDeliv.project_id,
        deadline: newDeliv.deadline,
        album_type: newDeliv.album_type || null,
        printing_price: newDeliv.printing_price || 0,
        drive_status: newDeliv.drive_status || 'PENDING',
        album_status: newDeliv.album_status || 'PENDING',
        cinematic_status: newDeliv.cinematic_status || 'PENDING',
        shooting_status: newDeliv.shooting_status || 'PENDING',
        shooting_operator: newDeliv.shooting_operator || 'STOA Lead',
        notes: newDeliv.notes || null,
        created_at: newDeliv.created_at,
        updated_at: newDeliv.updated_at
      }], { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Supabase addDeliverable upsert error:', error);
      });
    }

    return newDeliv;
  }

  public updateDeliverable(id: string, updates: Partial<ProjectDeliverable>): ProjectDeliverable | undefined {
    const idx = this.deliverables.findIndex(d => d.id === id);
    if (idx === -1) return undefined;

    this.deliverables[idx] = {
      ...this.deliverables[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('project_deliverables').update({
        drive_status: updates.drive_status,
        album_status: updates.album_status,
        cinematic_status: updates.cinematic_status,
        shooting_status: updates.shooting_status,
        shooting_operator: updates.shooting_operator,
        deadline: updates.deadline,
        notes: updates.notes,
        updated_at: new Date().toISOString()
      }).eq('id', id).then();
    }

    return this.deliverables[idx];
  }

  // --- Clients & Team CRUD ---
  public addClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Client {
    const id = `client-${Date.now()}`;
    const now = new Date().toISOString();
    const newClient: Client = {
      ...client,
      id,
      created_at: now,
      updated_at: now
    };
    this.clients.unshift(newClient);
    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('clients').upsert([{
        id: newClient.id,
        name: newClient.name,
        phone: newClient.phone || null,
        email: newClient.email || null,
        instagram: newClient.instagram || null,
        address: newClient.address || null,
        notes: newClient.notes || null,
        created_at: newClient.created_at,
        updated_at: newClient.updated_at
      }], { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Supabase addClient upsert error:', error);
      });
    }

    return newClient;
  }

  public addTeamMember(member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>): TeamMember {
    const id = `tm-${Date.now()}`;
    const now = new Date().toISOString();
    const newMember: TeamMember = {
      ...member,
      id,
      created_at: now,
      updated_at: now
    };
    this.teamMembers.unshift(newMember);
    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('team_members').upsert([{
        id: newMember.id,
        name: newMember.name,
        primary_role: newMember.primary_role,
        phone: newMember.phone || null,
        email: newMember.email || null,
        instagram: newMember.instagram || null,
        bank_account: newMember.bank_account || null,
        notes: newMember.notes || null,
        is_active: newMember.is_active ?? true,
        created_at: newMember.created_at,
        updated_at: newMember.updated_at
      }], { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Supabase addTeamMember upsert error:', error);
      });
    }

    return newMember;
  }

  // --- Booking Invoices Management ---
  public getInvoices(): BookingInvoice[] {
    return [...this.invoices].sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime() || b.invoice_number.localeCompare(a.invoice_number));
  }

  public getInvoiceById(id: string): BookingInvoice | undefined {
    return this.invoices.find(i => i.id === id);
  }

  public getInvoiceByProjectId(projectId: string): BookingInvoice | undefined {
    return this.invoices.find(i => i.project_id === projectId);
  }

  /**
   * Generates sequential, non-duplicating invoice number
   * Format: STOA/INV/{YEAR}/{0001}
   * e.g., STOA/INV/2026/0001
   */
  public generateNextInvoiceNumber(issueDate?: string): string {
    let year = 2026;
    if (issueDate) {
      const parsedYear = new Date(issueDate).getFullYear();
      if (!isNaN(parsedYear) && parsedYear >= 2020) {
        year = parsedYear;
      }
    } else {
      year = new Date().getFullYear();
    }

    const prefix = `STOA/INV/${year}/`;
    let highestSequence = 0;

    for (const inv of this.invoices) {
      if (inv.invoice_number && inv.invoice_number.startsWith(prefix)) {
        const parts = inv.invoice_number.split('/');
        if (parts.length === 4) {
          const num = parseInt(parts[3], 10);
          if (!isNaN(num) && num > highestSequence) {
            highestSequence = num;
          }
        }
      }
    }

    const nextSeq = (highestSequence + 1).toString().padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  /**
   * Issue / Create a new Booking Invoice
   */
  public createInvoice(
    invoiceData: Omit<BookingInvoice, 'id' | 'created_at' | 'updated_at'>
  ): BookingInvoice {
    const id = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const newInvoice: BookingInvoice = {
      ...invoiceData,
      id,
      created_at: now,
      updated_at: now
    };

    this.invoices.unshift(newInvoice);
    this.notify();

    // Push to Supabase
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('booking_invoices').upsert([{
        id: newInvoice.id,
        invoice_number: newInvoice.invoice_number,
        project_id: newInvoice.project_id,
        client_id: newInvoice.client_id || null,
        issue_date: newInvoice.issue_date,
        due_date: newInvoice.due_date || null,
        total_amount: newInvoice.total_amount,
        paid_amount: newInvoice.paid_amount,
        remaining_amount: newInvoice.remaining_amount,
        status: newInvoice.status,
        client_name: newInvoice.client_name,
        client_phone: newInvoice.client_phone || null,
        event_date: newInvoice.event_date,
        event_location: newInvoice.event_location,
        package_name: newInvoice.package_name,
        bank_info: newInvoice.bank_info || null,
        notes: newInvoice.notes || null,
        terms: newInvoice.terms || null,
        snapshot_data: newInvoice.snapshot_data || null,
        pdf_url: newInvoice.pdf_url || null,
        created_at: newInvoice.created_at,
        updated_at: newInvoice.updated_at
      }], { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn('Supabase createInvoice error:', error);
      });
    }

    return newInvoice;
  }

  /**
   * Update an existing Booking Invoice
   */
  public updateInvoice(id: string, updates: Partial<BookingInvoice>): BookingInvoice | undefined {
    const idx = this.invoices.findIndex(i => i.id === id);
    if (idx === -1) return undefined;

    this.invoices[idx] = {
      ...this.invoices[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('booking_invoices').update({
        due_date: updates.due_date,
        paid_amount: updates.paid_amount,
        remaining_amount: updates.remaining_amount,
        status: updates.status,
        bank_info: updates.bank_info,
        notes: updates.notes,
        terms: updates.terms,
        pdf_url: updates.pdf_url,
        updated_at: this.invoices[idx].updated_at
      }).eq('id', id).then();
    }

    return this.invoices[idx];
  }

  /**
   * Delete an invoice
   */
  public deleteInvoice(id: string): boolean {
    const initialLen = this.invoices.length;
    this.invoices = this.invoices.filter(i => i.id !== id);
    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('booking_invoices').delete().eq('id', id).then();
    }

    return this.invoices.length < initialLen;
  }

  /**
   * Synchronizes invoice payment totals and status with confirmed payments from the project
   */
  public syncInvoiceWithProjectPayments(projectId: string) {
    const invIdx = this.invoices.findIndex(i => i.project_id === projectId);
    if (invIdx === -1) return;

    const invoice = this.invoices[invIdx];
    if (invoice.status === 'DIBATALKAN') return; // Preserved if explicitly cancelled

    const confirmedPayments = this.payments.filter(
      p => p.project_id === projectId && p.status === 'confirmed'
    );
    const totalPaid = confirmedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const remaining = Math.max(0, invoice.total_amount - totalPaid);

    let nextStatus: InvoiceStatus = invoice.status;
    if (remaining <= 0 && totalPaid > 0) {
      nextStatus = 'LUNAS';
    } else if (totalPaid > 0) {
      const initialDp = invoice.snapshot_data?.initial_dp || 0;
      if (totalPaid <= initialDp || confirmedPayments.length === 1) {
        nextStatus = 'DP DITERIMA';
      } else {
        nextStatus = 'CICILAN';
      }
    } else {
      nextStatus = invoice.status === 'DRAFT' ? 'DRAFT' : 'TERBIT';
    }

    this.invoices[invIdx] = {
      ...invoice,
      paid_amount: totalPaid,
      remaining_amount: remaining,
      status: nextStatus,
      updated_at: new Date().toISOString()
    };

    const supabase = getSupabase();
    if (supabase) {
      supabase.from('booking_invoices').update({
        paid_amount: totalPaid,
        remaining_amount: remaining,
        status: nextStatus,
        updated_at: this.invoices[invIdx].updated_at
      }).eq('id', invoice.id).then();
    }
  }

  // --- Excel Migration Import Handler ---
  public importMigrationBatch(payload: {
    projects: Project[];
    deliverables: ProjectDeliverable[];
    recaps: HistoricalFinancialRecap[];
    samuraFees: HistoricalSamuraFee[];
    log: Omit<ImportLog, 'id' | 'imported_at'>;
  }): ImportLog {
    const logId = `log-${Date.now()}`;
    const now = new Date().toISOString();

    // Prevent duplicate projects based on source_sheet + source_row_id or project_code
    const existingCodes = new Set(this.projects.map(p => p.project_code));
    const newProjects = payload.projects.filter(p => !existingCodes.has(p.project_code));

    this.projects = [...newProjects, ...this.projects];
    this.deliverables = [...payload.deliverables, ...this.deliverables];
    this.historicalRecap = [...payload.recaps, ...this.historicalRecap];
    this.historicalSamuraFees = [...payload.samuraFees, ...this.historicalSamuraFees];

    const completedLog: ImportLog = {
      ...payload.log,
      id: logId,
      projects_imported: newProjects.length,
      deliverables_imported: payload.deliverables.length,
      recaps_imported: payload.recaps.length,
      imported_at: now
    };

    this.importLogs.unshift(completedLog);
    this.notify();

    return completedLog;
  }

  public deleteTeamMember(id: string): boolean {
    const initialLen = this.teamMembers.length;
    this.teamMembers = this.teamMembers.filter(t => t.id !== id);
    this.notify();
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('team_members').delete().eq('id', id).then();
    }
    return this.teamMembers.length < initialLen;
  }

  public clearTeamDatabase() {
    this.teamMembers = [];
    this.notify();
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('team_members').delete().neq('id', '').then();
    }
  }

  public clearProjectsDatabase() {
    this.projects = [];
    this.payments = [];
    this.expenses = [];
    this.deliverables = [];
    this.invoices = [];
    this.notify();
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('projects').delete().neq('id', '').then();
      supabase.from('payments').delete().neq('id', '').then();
      supabase.from('project_expenses').delete().neq('id', '').then();
      supabase.from('project_deliverables').delete().neq('id', '').then();
      supabase.from('booking_invoices').delete().neq('id', '').then();
    }
  }

  public clearClientsDatabase() {
    this.clients = [];
    this.notify();
    const supabase = getSupabase();
    if (supabase) {
      supabase.from('clients').delete().neq('id', '').then();
    }
  }

  // --- Reset & Clear Database ---
  public resetToDefault() {
    this.projects = [];
    this.clients = [];
    this.payments = [];
    this.expenses = [];
    this.deliverables = [];
    this.teamMembers = [];
    this.invoices = [];
    this.historicalRecap = [];
    this.historicalSamuraFees = [];
    this.importLogs = [];
    this.samuraFeePercentage = 0;
    this.notify();

    const supabase = getSupabase();
    if (supabase) {
      Promise.allSettled([
        supabase.from('projects').delete().neq('id', ''),
        supabase.from('clients').delete().neq('id', ''),
        supabase.from('team_members').delete().neq('id', ''),
        supabase.from('payments').delete().neq('id', ''),
        supabase.from('project_expenses').delete().neq('id', ''),
        supabase.from('project_deliverables').delete().neq('id', ''),
        supabase.from('booking_invoices').delete().neq('id', '')
      ]).then();
    }
  }

  public clearAllDatabases() {
    this.resetToDefault();
  }

  public clearAllClientsAndProjects() {
    this.projects = [];
    this.clients = [];
    this.payments = [];
    this.expenses = [];
    this.deliverables = [];
    this.invoices = [];
    this.historicalRecap = [];
    this.notify();
  }
}

export const dataService = new DataService();
