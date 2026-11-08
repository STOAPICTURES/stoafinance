/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * STOA FINANCE – Normalized Database Types
 * Corresponding directly to PostgreSQL tables in Supabase.
 */

export type ProjectStatus = 
  | 'Booking'
  | 'Confirmed'
  | 'Scheduled'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type DeliverableStatus = 
  | 'PENDING'
  | 'IN PROGRESS'
  | 'DONE'
  | 'NOT APPLICABLE';

export type PaymentType = 
  | 'dp' 
  | 'installment' 
  | 'final' 
  | 'additional';

export type PaymentMethod = 
  | 'Transfer Bank'
  | 'Cash'
  | 'QRIS'
  | 'BCA'
  | 'Mandiri'
  | 'BNI'
  | 'BRI'
  | 'Lainnya';

export type ExpenseCategoryName = 
  | 'FG 1'
  | 'FG 2'
  | 'Shooting'
  | 'Editor'
  | 'Cetak'
  | 'Cinema'
  | 'Transport / Akomodasi'
  | 'Other Expenses';

export type TeamRole = 
  | 'Lead Photographer'
  | 'First Photographer (FG 1)'
  | 'Second Photographer (FG 2)'
  | 'Cinematographer / Videographer'
  | 'Drone Pilot'
  | 'Video Editor'
  | 'Photo Editor'
  | 'Album Designer'
  | 'Crew / Assistant'
  | 'Vendor';

// 1. Profiles
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'finance' | 'manager';
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

// 2. Clients
export interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Dynamic aggregations
  total_projects?: number;
  total_contract_value?: number;
  total_paid?: number;
  outstanding_balance?: number;
}

// 3. Projects
export interface Project {
  id: string;
  project_code: string; // e.g. "STOA-2024-001"
  client_id: string;
  client_name: string;
  client_phone?: string | null; // No. WhatsApp Klien / Pengantin
  event_date: string; // YYYY-MM-DD
  event_location: string;
  package_name: string;
  contract_value: number; // Nilai kontrak bersih yang disepakati (setelah diskon)
  original_price?: number | null; // Harga katalog paket sebelum diskon
  transport_fee?: number | null; // Isian Biaya Transportasi
  additional_album_fee?: number | null; // Isian Biaya Tambahan Cetak Album
  discount?: number | null; // Nominal diskon / potongan harga (IDR)
  discount_reason?: string | null; // Keterangan diskon (misal: "Promo Bundling Hemat Rp 500.000")
  initial_dp: number;
  status?: ProjectStatus; // Internal status (default 'Confirmed')
  notes?: string | null;
  month_category?: string | null; // e.g. "Januari", "Februari", etc. (Kategori Bulan pelaksanaan proyek)
  
  // Historical Excel preservation
  source_year?: number | null;
  source_sheet?: string | null;
  source_row_id?: string | null;
  legacy_sisa?: number | null; // Excel SISA column preserved separately
  raw_date_text?: string | null; // For date normalization fallback
  
  created_at: string;
  updated_at: string;
  
  // Dynamic computed fields (never stored redundantly in DB)
  total_payments_received?: number;
  outstanding_balance?: number; // Contract Value - Total Payments
  total_expenses?: number;
  gross_profit?: number; // Contract Value - Total Expenses
  samura_fee?: number; // Gross Profit * Fee %
  net_profit_after_fee?: number; // Gross Profit - Samura Fee
}

// 4. Payments
export interface Payment {
  id: string;
  project_id: string;
  client_id?: string | null;
  payment_type: PaymentType;
  payment_date: string; // YYYY-MM-DD
  amount: number;
  payment_method: PaymentMethod;
  description: string;
  reference_number?: string | null; // e.g. bank ref, receipt #
  status: 'confirmed' | 'pending' | 'cancelled';
  created_at: string;
  updated_at: string;
  // Joined for display
  client_name?: string;
  project_code?: string;
}

// 5. Expense Categories
export interface ExpenseCategory {
  id: string;
  name: ExpenseCategoryName;
  description?: string | null;
  is_active: boolean;
  display_order: number;
}

// 6. Project Expenses
export interface ProjectExpense {
  id: string;
  project_id: string;
  category: ExpenseCategoryName;
  transaction_date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  recipient_name: string; // Team or vendor recipient
  recipient_id?: string | null; // Foreign key to team_members if applicable
  receipt_url?: string | null;
  created_at: string;
  updated_at: string;
  // Joined for display
  project_code?: string;
  client_name?: string;
}

// 7. Team Members
export interface TeamMember {
  id: string;
  name: string;
  primary_role: TeamRole;
  phone?: string | null;
  email?: string | null;
  instagram?: string | null;
  bank_account?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed aggregations
  project_count?: number;
  total_earned?: number;
}

// 8. Project Team Assignments
export interface ProjectTeamAssignment {
  id: string;
  project_id: string;
  team_member_id: string;
  role: TeamRole;
  fee_assigned?: number | null;
  notes?: string | null;
  created_at: string;
  // Joined
  team_member_name?: string;
}

// 9. Project Deliverables (Excel PENDING Sheet)
export interface ProjectDeliverable {
  id: string;
  project_id: string;
  deadline: string; // YYYY-MM-DD
  album_type?: string | null; // e.g. "20x30 Box Kayu Leather", "Magazine 20 Halaman"
  printing_price?: number | null; // Biaya Cetak
  drive_status: DeliverableStatus; // Status Link Google Drive
  album_status: DeliverableStatus; // Status Cetak Album
  cinematic_status: DeliverableStatus; // Status Video Teaser / Cinema
  shooting_status: DeliverableStatus; // Status Liputan Hari H
  shooting_operator: string; // Nama Operator / Lead FG
  notes?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined for monitoring
  project_code?: string;
  client_name?: string;
  event_date?: string;
  package_name?: string;
  completion_percentage?: number;
}

// 10. Monthly Fees & Config
export interface MonthlyFee {
  id: string;
  year: number;
  month: number; // 1-12
  fee_percentage: number; // e.g. 20 (for 20%)
  calculated_fee_amount: number;
  total_gross_profit: number;
  is_locked: boolean;
  locked_at?: string | null;
  created_at: string;
  updated_at: string;
}

// 11. Historical Financial Recap (Excel REKAP Sheet)
export interface HistoricalFinancialRecap {
  id: string;
  year: number;
  month: number;
  month_name: string;
  total_revenue: number;
  total_payments_received: number;
  total_expenses: number;
  gross_profit: number;
  samura_fee: number;
  net_profit_after_fee: number;
  source_sheet: string;
  imported_at: string;
}

// 12. Historical Samura Fees
export interface HistoricalSamuraFee {
  id: string;
  year: number;
  month: number;
  fee_percentage: number;
  original_fee_amount: number;
  original_profit_base: number;
  notes?: string | null;
  source_sheet: string;
  imported_at: string;
}

// 13. Import Logs
export interface ImportLog {
  id: string;
  filename: string;
  imported_by?: string | null;
  sheets_processed: string[];
  total_records_read: number;
  projects_imported: number;
  deliverables_imported: number;
  recaps_imported: number;
  skipped_records: number;
  failed_records: number;
  error_details?: string[] | null;
  imported_at: string;
}

// 14. App Settings
export interface AppSetting {
  id: string;
  key: string;
  value: any;
  description?: string | null;
  updated_at: string;
}

// 15. Audit Logs
export interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MIGRATE' | 'OVERRIDE';
  table_name: string;
  record_id: string;
  changed_by?: string | null;
  previous_data?: any;
  new_data?: any;
  reason?: string | null;
  created_at: string;
}

// Filter parameters across modules
export interface FilterParams {
  year?: number | 'all';
  month?: number | 'all';
  searchQuery?: string;
  status?: string | 'all';
  packageFilter?: string | 'all';
  categoryFilter?: string | 'all';
  startDate?: string;
  endDate?: string;
}

// 16. Booking Invoices (Faktur / Tagihan Booking STOA PICTURES)
export type InvoiceStatus =
  | 'DRAFT'
  | 'TERBIT'
  | 'DP DITERIMA'
  | 'CICILAN'
  | 'LUNAS'
  | 'DIBATALKAN';

export interface BookingInvoiceSnapshot {
  package_name: string;
  package_specs?: {
    crew?: string;
    album?: string;
    printFrame?: string;
    videoDocumentation?: string;
    drone?: boolean;
    weddingCinema?: boolean;
    storage?: string;
    coverage?: string;
  };
  original_price?: number | null;
  transport_fee?: number | null;
  additional_album_fee?: number | null;
  discount?: number | null;
  discount_reason?: string | null;
  contract_value: number;
  initial_dp: number;
  event_location: string;
  event_date: string;
  client_phone?: string | null;
}

export interface BookingInvoice {
  id: string;
  invoice_number: string; // STOA/INV/2026/0001
  project_id: string;
  client_id?: string | null;
  issue_date: string; // YYYY-MM-DD
  due_date?: string | null; // YYYY-MM-DD
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: InvoiceStatus;
  client_name: string;
  client_phone?: string | null;
  event_date: string;
  event_location: string;
  package_name: string;
  bank_info?: string | null;
  notes?: string | null;
  terms?: string | null;
  snapshot_data?: BookingInvoiceSnapshot | null;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

