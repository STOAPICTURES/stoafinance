/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * STOA FINANCE – Accounting & Project Management System
 * Official Web Application for STOA PICTURES
 */

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { Dashboard } from './components/modules/Dashboard';
import { ProjectManagement } from './components/modules/ProjectManagement';
import { Bookkeeping } from './components/modules/Bookkeeping';
import { ClientPayments } from './components/modules/ClientPayments';
import { Expenses } from './components/modules/Expenses';
import { MonitoringPending } from './components/modules/MonitoringPending';
import { ClientDatabase } from './components/modules/ClientDatabase';
import { TeamManagement } from './components/modules/TeamManagement';
import { FinancialRecap } from './components/modules/FinancialRecap';
import { Reporting } from './components/modules/Reporting';
import { ExcelImport } from './components/modules/ExcelImport';
import { Settings } from './components/modules/Settings';
import { CalendarBooking } from './components/modules/CalendarBooking';
import { InvoiceManagement } from './components/modules/InvoiceManagement';
import { dataService } from './services/dataService';
import { authService, AuthUser } from './services/authService';
import { LoginScreen } from './components/auth/LoginScreen';
import { Project } from './types/database';
import { getLatestActiveYearAndMonth } from './lib/formatters';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<NavItemKey>('dashboard');
  
  // Selalu tampilkan data di tahun dan bulan terbaru
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(() => {
    return getLatestActiveYearAndMonth(dataService.getProjects()).year;
  });
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(() => {
    return getLatestActiveYearAndMonth(dataService.getProjects()).month;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeDetailProject, setActiveDetailProject] = useState<Project | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [isMobileQuickAddOpen, setIsMobileQuickAddOpen] = useState(false);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubAuth = authService.subscribe(() => {
      setCurrentUser(authService.getCurrentUser());
    });
    return unsubAuth;
  }, []);

  // Subscribe to reactive dataService
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = dataService.subscribe(() => {
      setTick(t => t + 1);
    });
    return unsubscribe;
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // If user is not authenticated, show official login screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  // Read data models
  const projects = dataService.getProjects();
  const clients = dataService.getClients();
  const payments = dataService.getPayments();
  const expenses = dataService.getExpenses();
  const deliverables = dataService.getDeliverables();
  const teamMembers = dataService.getTeamMembers();
  const historicalRecap = dataService.getHistoricalRecap();
  const historicalSamuraFees = dataService.getHistoricalSamuraFees();
  const importLogs = dataService.getImportLogs();
  const samuraFeePercentage = dataService.getSamuraFeePercentage();

  // Counts for sidebar badges
  const pendingDeliverablesCount = deliverables.filter(
    d => d.drive_status !== 'DONE' || d.album_status !== 'DONE' || d.cinematic_status !== 'DONE'
  ).length;

  const activeProjectsCount = projects.filter(
    p => p.status === 'Scheduled' || p.status === 'In Progress' || p.status === 'Booking'
  ).length;

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    try {
      const result = await dataService.syncWithSupabase();
      alert(result.message);
    } catch (err: any) {
      alert(`Gagal sinkronisasi: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenProjectDetail = (proj: Project) => {
    setActiveDetailProject(proj);
    setActiveTab('projects');
  };

  return (
    <div className="min-h-screen bg-[#F3F4ED] dark:bg-[#1A1C1A] text-[#424642] dark:text-[#F3F4ED] flex antialiased">
      {/* 1. Responsive Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'projects') setActiveDetailProject(null);
          // Selalu tampilkan data di tahun dan bulan terbaru di setiap menu
          const latest = getLatestActiveYearAndMonth(projects);
          setSelectedYear(latest.year);
          setSelectedMonth(latest.month);
        }}
        isOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        pendingDeliverablesCount={pendingDeliverablesCount}
        activeProjectsCount={activeProjectsCount}
        onLogout={handleLogout}
        projects={projects}
        onSelectProject={handleOpenProjectDetail}
        onQuickAddProjectDate={(dateStr) => {
          setActiveTab('projects');
        }}
      />

      {/* 2. Main Application Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar
          activeTab={activeTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          selectedYear={selectedYear}
          onChangeYear={setSelectedYear}
          selectedMonth={selectedMonth}
          onChangeMonth={setSelectedMonth}
          onQuickAddProject={() => {
            setActiveTab('projects');
          }}
          onSyncSupabase={handleSyncSupabase}
          isSyncing={isSyncing}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard
                projects={projects}
                payments={payments}
                expenses={expenses}
                deliverables={deliverables}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  const latest = getLatestActiveYearAndMonth(projects);
                  setSelectedYear(latest.year);
                  setSelectedMonth(latest.month);
                }}
                onOpenProjectDetail={handleOpenProjectDetail}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectManagement
                projects={projects}
                payments={payments}
                expenses={expenses}
                onAddProject={(p, initialExpenses) => dataService.addProject(p, initialExpenses)}
                onUpdateProject={(id, u) => dataService.updateProject(id, u)}
                onDeleteProject={(id) => dataService.deleteProject(id)}
                onClearAllProjects={() => dataService.clearProjectsDatabase()}
                onSyncProjectExpenses={(projId, exps, date) => dataService.syncProjectExpenses(projId, exps, date)}
                selectedYear={selectedYear}
                onChangeYear={setSelectedYear}
                selectedMonth={selectedMonth}
                onChangeMonth={setSelectedMonth}
                activeDetailProject={activeDetailProject}
                onCloseDetail={() => setActiveDetailProject(null)}
                initialCreateDate={quickAddDate}
                onClearInitialCreateDate={() => setQuickAddDate(null)}
                isMobileQuickAddOpen={isMobileQuickAddOpen}
                onCloseMobileQuickAdd={() => setIsMobileQuickAddOpen(false)}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoiceManagement />
            )}

            {activeTab === 'bookkeeping' && (
              <Bookkeeping
                payments={payments}
                expenses={expenses}
                projects={projects}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
              />
            )}

            {activeTab === 'payments' && (
              <ClientPayments
                payments={payments}
                projects={projects}
                onAddPayment={(p) => dataService.addPayment(p)}
                onDeletePayment={(id) => dataService.deletePayment(id)}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
              />
            )}

            {activeTab === 'expenses' && (
              <Expenses
                expenses={expenses}
                projects={projects}
                teamMembers={teamMembers}
                onAddExpense={(e) => dataService.addExpense(e)}
                onDeleteExpense={(id) => dataService.deleteExpense(id)}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
              />
            )}

            {activeTab === 'pending' && (
              <MonitoringPending
                deliverables={deliverables}
                onUpdateDeliverable={(id, u) => dataService.updateDeliverable(id, u)}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
              />
            )}

            {activeTab === 'clients' && (
              <ClientDatabase
                clients={clients}
                projects={projects}
                payments={payments}
                onAddClient={(c) => dataService.addClient(c)}
                onOpenProjectDetail={handleOpenProjectDetail}
                onClearAllClients={() => dataService.clearClientsDatabase()}
              />
            )}

            {activeTab === 'team' && (
              <TeamManagement
                teamMembers={teamMembers}
                expenses={expenses}
                projects={projects}
                onAddTeamMember={(m) => dataService.addTeamMember(m)}
                onDeleteTeamMember={(id) => dataService.deleteTeamMember(id)}
                onClearAllTeamMembers={() => dataService.clearTeamDatabase()}
              />
            )}

            {activeTab === 'recap' && (
              <FinancialRecap
                historicalRecap={historicalRecap}
                projects={projects}
                payments={payments}
                expenses={expenses}
              />
            )}

            {activeTab === 'reports' && (
              <Reporting
                projects={projects}
                payments={payments}
                expenses={expenses}
                deliverables={deliverables}
                teamMembers={teamMembers}
              />
            )}

            {activeTab === 'import' && (
              <ExcelImport
                importLogs={importLogs}
                onCommitImport={(payload) => dataService.importMigrationBatch(payload)}
                onResetToDefault={() => dataService.resetToDefault()}
              />
            )}

            {activeTab === 'settings' && (
              <Settings
                onSyncSupabase={handleSyncSupabase}
                isSyncing={isSyncing}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarBooking
                projects={projects}
                onOpenProjectDetail={handleOpenProjectDetail}
                onAddProjectWithDate={(dateStr) => {
                  setQuickAddDate(dateStr);
                  setActiveTab('projects');
                }}
                onNavigateProjects={() => setActiveTab('projects')}
              />
            )}
          </div>
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation Bar (Phone & Tablet) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'projects') setActiveDetailProject(null);
          const latest = getLatestActiveYearAndMonth(projects);
          setSelectedYear(latest.year);
          setSelectedMonth(latest.month);
        }}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
        onQuickAdd={() => {
          setActiveTab('projects');
          setIsMobileQuickAddOpen(true);
        }}
        activeProjectsCount={activeProjectsCount}
        pendingDeliverablesCount={pendingDeliverablesCount}
      />

      {/* 4. Network Disconnection & Auto-Sync Notification Banner */}
      <OfflineIndicator />
    </div>
  );
}
