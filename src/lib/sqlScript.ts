/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Complete PostgreSQL DDL Script for Supabase (STOA FINANCE)
 * Compatible with both string IDs (e.g. proj-*, client-*) and UUIDs.
 * Includes complete Row Level Security (RLS) policies for anon & authenticated roles.
 */

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- STOA FINANCE: ACCOUNTING & PROJECT MANAGEMENT SYSTEM
-- PostgreSQL Database Schema & Row Level Security (RLS) for Supabase
-- Target Project: STOA FINANCE (xdxhylnmbzqqsjccujyo)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    instagram TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (name);

-- 3. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_code TEXT NOT NULL,
    client_id TEXT,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    event_date DATE NOT NULL,
    month_category TEXT,
    event_location TEXT NOT NULL DEFAULT 'Pematangsiantar',
    package_name TEXT NOT NULL,
    original_price NUMERIC(15,2),
    transport_fee NUMERIC(15,2) DEFAULT 0.00,
    additional_album_fee NUMERIC(15,2) DEFAULT 0.00,
    discount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    discount_reason TEXT,
    contract_value NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    initial_dp NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Confirmed',
    notes TEXT,
    source_year INT,
    source_sheet TEXT,
    source_row_id TEXT,
    legacy_sisa NUMERIC(15,2),
    raw_date_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_event_date ON public.projects (event_date);
CREATE INDEX IF NOT EXISTS idx_projects_month_category ON public.projects (month_category);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects (client_id);
CREATE INDEX IF NOT EXISTS idx_projects_source_year ON public.projects (source_year);

-- 4. PAYMENTS TABLE (Income)
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT NOT NULL,
    client_id TEXT,
    payment_type TEXT NOT NULL DEFAULT 'dp',
    payment_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'Transfer Bank',
    description TEXT NOT NULL,
    reference_number TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_project_id ON public.payments (project_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments (payment_date);

-- 5. EXPENSE CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0
);

-- Insert Default Production Categories
INSERT INTO public.expense_categories (name, display_order)
VALUES 
    ('Shooting', 1),
    ('FG 2', 2),
    ('Editor', 3),
    ('Cetak', 4),
    ('Cinema', 5),
    ('Transport / Akomodasi', 6),
    ('Other Expenses', 7)
ON CONFLICT (name) DO NOTHING;

-- 6. PROJECT EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.project_expenses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT NOT NULL,
    category TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    description TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_id TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.project_expenses (project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.project_expenses (transaction_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.project_expenses (category);

-- 7. TEAM MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.team_members (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    primary_role TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    instagram TEXT,
    bank_account TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_team_members_name ON public.team_members (name);

-- 8. PROJECT TEAM ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.project_team (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT NOT NULL,
    team_member_id TEXT NOT NULL,
    role TEXT NOT NULL,
    fee_assigned NUMERIC(15,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_team_project ON public.project_team (project_id);

-- 9. PROJECT DELIVERABLES
CREATE TABLE IF NOT EXISTS public.project_deliverables (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT NOT NULL,
    deadline DATE NOT NULL,
    album_type TEXT,
    printing_price NUMERIC(15,2) DEFAULT 0.00,
    drive_status TEXT NOT NULL DEFAULT 'PENDING',
    album_status TEXT NOT NULL DEFAULT 'PENDING',
    cinematic_status TEXT NOT NULL DEFAULT 'PENDING',
    shooting_status TEXT NOT NULL DEFAULT 'PENDING',
    shooting_operator TEXT NOT NULL DEFAULT 'STOA Lead',
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON public.project_deliverables (project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_deadline ON public.project_deliverables (deadline);

-- 10. HISTORICAL FINANCIAL RECAP
CREATE TABLE IF NOT EXISTS public.historical_financial_recap (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    year INT NOT NULL,
    month INT NOT NULL,
    total_revenue NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_production_expenses NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gross_profit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    samura_fee NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    net_profit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    project_count INT NOT NULL DEFAULT 0,
    source_sheet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value, description)
VALUES ('samura_default_fee_percentage', '0', 'Persentase Samura Fee')
ON CONFLICT (key) DO NOTHING;

-- 12. BOOKING INVOICES TABLE (Faktur / Invoice Booking STOA PICTURES)
CREATE TABLE IF NOT EXISTS public.booking_invoices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    invoice_number TEXT NOT NULL UNIQUE,
    project_id TEXT NOT NULL,
    client_id TEXT,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    remaining_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'TERBIT',
    client_name TEXT NOT NULL,
    client_phone TEXT,
    event_date DATE,
    event_location TEXT,
    package_name TEXT NOT NULL,
    bank_info TEXT,
    notes TEXT,
    terms TEXT,
    snapshot_data JSONB,
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_number ON public.booking_invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_project_id ON public.booking_invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_status ON public.booking_invoices (status);
CREATE INDEX IF NOT EXISTS idx_booking_invoices_issue_date ON public.booking_invoices (issue_date);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Full Access for App Client)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_financial_recap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_invoices ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'profiles', 'clients', 'projects', 'payments', 
        'expense_categories', 'project_expenses', 'team_members', 
        'project_team', 'project_deliverables', 'historical_financial_recap', 
        'app_settings', 'booking_invoices'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow anon all on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow anon all on %I" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Allow auth all on %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow auth all on %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;
`;
