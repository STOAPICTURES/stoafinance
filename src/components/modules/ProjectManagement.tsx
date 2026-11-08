/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * STOA FINANCE – Project Management Module
 * Comprehensive wedding project management with official STOA Pricelist integration
 * and 7-category production expense breakdown (Shooting, FG 2, Editor, Cetak, Cinema, Transport, Other).
 */

import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Download,
  Calendar,
  MapPin,
  CreditCard,
  ReceiptText,
  Percent,
  CheckCircle2,
  FileSpreadsheet,
  Camera,
  UserCheck,
  Film,
  Printer,
  Video,
  Car,
  Receipt,
  Sparkles,
  Calculator,
  Info,
  Tag,
  Check,
  ChevronRight,
  ShieldCheck,
  Layers,
  CalendarDays,
  MessageCircle,
  Clock,
  FileText
} from 'lucide-react';
import { Project, Payment, ProjectExpense, ProjectStatus, ExpenseCategoryName, BookingInvoice } from '../../types/database';
import {
  formatIDR,
  formatDateID,
  ID_MONTHS,
  getMonthCategoryFromDate,
  formatWhatsAppLink,
  isHPlus3Elapsed,
  getProjectBookingStatus
} from '../../lib/formatters';
import { StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { ActionMenu, ActionMenuItem } from '../common/ActionMenu';
import { dataService } from '../../services/dataService';
import { exportProjectsToExcel, exportProjectsToPDF } from '../../lib/exportUtils';
import { CreateInvoiceModal } from '../invoice/CreateInvoiceModal';
import { InvoiceDetailModal } from '../invoice/InvoiceDetailModal';
import {
  STOA_PRICELIST_PACKAGES,
  STOA_PACKAGE_NAMES,
  getPackageByName,
  STOA_EXPENSE_CATEGORIES,
  StoaPackage
} from '../../data/stoaPricelist';

interface ExpenseItemState {
  amount: string;
  recipient: string;
  description: string;
}

const DEFAULT_EXPENSES_STATE: Record<ExpenseCategoryName, ExpenseItemState> = {
  'FG 1': { amount: '0', recipient: 'First FG STOA', description: '' },
  'FG 2': { amount: '0', recipient: 'Second FG STOA', description: '' },
  'Shooting': { amount: '0', recipient: 'Crew Shooting STOA', description: '' },
  'Editor': { amount: '0', recipient: 'Team Editor STOA', description: '' },
  'Cetak': { amount: '0', recipient: 'Lab Percetakan Album', description: '' },
  'Cinema': { amount: '0', recipient: 'Cinema & Drone Crew', description: '' },
  'Transport / Akomodasi': { amount: '0', recipient: 'Operasional Transport', description: '' },
  'Other Expenses': { amount: '0', recipient: 'Pengeluaran Lainnya', description: '' }
};

interface ProjectManagementProps {
  projects: Project[];
  payments: Payment[];
  expenses: ProjectExpense[];
  onAddProject: (
    project: Omit<Project, 'id' | 'created_at' | 'updated_at'>,
    initialExpenses?: Array<{
      category: ExpenseCategoryName;
      amount: number;
      recipient_name?: string;
      description?: string;
    }>
  ) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onClearAllProjects?: () => void;
  onSyncProjectExpenses?: (
    projectId: string,
    expensesList: Array<{
      category: ExpenseCategoryName;
      amount: number;
      recipient_name?: string;
      description?: string;
    }>,
    transactionDate?: string
  ) => void;
  selectedYear: number | 'all';
  onChangeYear?: (year: number | 'all') => void;
  selectedMonth: number | 'all';
  onChangeMonth?: (month: number | 'all') => void;
  activeDetailProject?: Project | null;
  onCloseDetail?: () => void;
  initialCreateDate?: string | null;
  onClearInitialCreateDate?: () => void;
  isMobileQuickAddOpen?: boolean;
  onCloseMobileQuickAdd?: () => void;
}

export const ProjectManagement: React.FC<ProjectManagementProps> = ({
  projects,
  payments,
  expenses,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onClearAllProjects,
  onSyncProjectExpenses,
  selectedYear,
  onChangeYear,
  selectedMonth,
  onChangeMonth,
  activeDetailProject: externalDetailProject,
  onCloseDetail,
  initialCreateDate,
  onClearInitialCreateDate,
  isMobileQuickAddOpen,
  onCloseMobileQuickAdd
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grouped_month'>('table');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(externalDetailProject || null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  // Invoice Booking Integration states
  const [invoiceTargetProject, setInvoiceTargetProject] = useState<Project | null>(null);
  const [isCreateInvoiceModalOpen, setIsCreateInvoiceModalOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<BookingInvoice | null>(null);
  const [isPreviewInvoiceModalOpen, setIsPreviewInvoiceModalOpen] = useState(false);

  const handleTriggerInvoice = (proj: Project) => {
    const existing = dataService.getInvoiceByProjectId(proj.id);
    if (existing) {
      setPreviewInvoice(existing);
      setIsPreviewInvoiceModalOpen(true);
    } else {
      setInvoiceTargetProject(proj);
      setIsCreateInvoiceModalOpen(true);
    }
  };

  // Sync external detail project if passed
  React.useEffect(() => {
    if (externalDetailProject) {
      setDetailProject(externalDetailProject);
    }
  }, [externalDetailProject]);

  // Form state
  const [formClientName, setFormClientName] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formEventDate, setFormEventDate] = useState('');
  const [formMonthCategory, setFormMonthCategory] = useState<string>('Oktober');
  const [formLocation, setFormLocation] = useState('Pematangsiantar');
  const [formPackage, setFormPackage] = useState('Gold Premium');
  const [isCustomPackage, setIsCustomPackage] = useState(false);
  const [customPackageName, setCustomPackageName] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState<string>('8500000');
  const [formTransportFee, setFormTransportFee] = useState<string>('0');
  const [formAdditionalAlbumFee, setFormAdditionalAlbumFee] = useState<string>('0');
  const [formDiscount, setFormDiscount] = useState<string>('0');
  const [formDiscountReason, setFormDiscountReason] = useState<string>('');
  const [formContractValue, setFormContractValue] = useState<string>('8500000');
  const [formInitialDp, setFormInitialDp] = useState<string>('3000000');
  const [formError, setFormError] = useState('');

  // 7 Production Expense Inputs State
  const [expenseInputs, setExpenseInputs] = useState<Record<ExpenseCategoryName, ExpenseItemState>>(DEFAULT_EXPENSES_STATE);

  // Currently selected package details from pricelist or custom package
  const currentPackageSpecs = useMemo(() => {
    const found = getPackageByName(formPackage);
    if (found) return found;
    if (isCustomPackage) {
      const orig = parseFloat(formOriginalPrice.replace(/[^0-9]/g, '')) || 0;
      return {
        id: 'custom-package',
        name: customPackageName.trim() || 'Paket Custom (Ketik Manual)',
        subtitle: 'Paket kustomisasi khusus sesuai rincian kesepakatan klien',
        category: 'Bundling & Custom' as const,
        price: orig,
        priceFormatted: orig > 0 ? formatIDR(orig) : 'Custom / Sesuai Kesepakatan',
        crew: 'Sesuai Request / Kesepakatan',
        album: 'Sesuai Request / Kesepakatan',
        printFrame: 'Sesuai Request / Kesepakatan',
        videoDocumentation: 'Sesuai Request / Kesepakatan',
        drone: false,
        weddingCinema: false,
        reelsHighlight: false,
        storage: 'Flashdisc / Google Drive',
        tierBadge: 'Paket Custom',
        defaultPrintingCost: 1000000
      };
    }
    return undefined;
  }, [formPackage, isCustomPackage, customPackageName, formOriginalPrice]);

  // Project counts per Indonesian Month Category
  const monthCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ID_MONTHS.forEach(m => { counts[m] = 0; });
    projects.forEach(p => {
      const m = p.month_category || getMonthCategoryFromDate(p.event_date);
      if (counts[m] !== undefined) {
        counts[m]++;
      }
    });
    return counts;
  }, [projects]);

  // Filtering projects (Status filter removed)
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Search by client name, phone, code, location
      const matchesSearch = !searchQuery || 
        p.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.client_phone && p.client_phone.includes(searchQuery)) ||
        p.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.event_location.toLowerCase().includes(searchQuery.toLowerCase());

      // Package
      const matchesPackage = packageFilter === 'all' || p.package_name === packageFilter;

      // Kategori Bulan filter
      const pMonthCategory = p.month_category || getMonthCategoryFromDate(p.event_date);
      const matchesMonthCategory = monthFilter === 'all' || pMonthCategory.toLowerCase() === monthFilter.toLowerCase();

      // Year & Month Top Filters
      const pYear = p.event_date ? new Date(p.event_date).getFullYear() : (p.source_year || 2024);
      const pMonth = p.event_date ? new Date(p.event_date).getMonth() + 1 : 1;
      const matchesYear = selectedYear === 'all' || pYear === selectedYear;
      const matchesMonth = selectedMonth === 'all' || pMonth === selectedMonth;

      return matchesSearch && matchesPackage && matchesMonthCategory && matchesYear && matchesMonth;
    });
  }, [projects, searchQuery, packageFilter, monthFilter, selectedYear, selectedMonth]);

  // Grouped projects by Month Category
  const projectsByMonth = useMemo(() => {
    const groups: Record<string, Project[]> = {};
    ID_MONTHS.forEach(m => { groups[m] = []; });
    const otherProjects: Project[] = [];

    filteredProjects.forEach(p => {
      const m = p.month_category || getMonthCategoryFromDate(p.event_date);
      if (groups[m]) {
        groups[m].push(p);
      } else {
        otherProjects.push(p);
      }
    });

    const result: Array<{
      month: string;
      projects: Project[];
      totalContract: number;
      totalPaid: number;
      totalPiutang: number;
      totalExpenses: number;
      totalGrossProfit: number;
    }> = [];

    ID_MONTHS.forEach(m => {
      if (groups[m].length > 0) {
        const totalContract = groups[m].reduce((sum, p) => sum + (p.contract_value || 0), 0);
        const totalPaid = groups[m].reduce((sum, p) => sum + (p.total_payments_received || 0), 0);
        const totalPiutang = groups[m].reduce((sum, p) => sum + (p.outstanding_balance || 0), 0);
        const totalExpenses = groups[m].reduce((sum, p) => sum + (p.total_expenses || 0), 0);
        const totalGrossProfit = groups[m].reduce((sum, p) => sum + (p.gross_profit || 0), 0);
        result.push({ month: m, projects: groups[m], totalContract, totalPaid, totalPiutang, totalExpenses, totalGrossProfit });
      }
    });

    if (otherProjects.length > 0) {
      const totalContract = otherProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
      const totalPaid = otherProjects.reduce((sum, p) => sum + (p.total_payments_received || 0), 0);
      const totalPiutang = otherProjects.reduce((sum, p) => sum + (p.outstanding_balance || 0), 0);
      const totalExpenses = otherProjects.reduce((sum, p) => sum + (p.total_expenses || 0), 0);
      const totalGrossProfit = otherProjects.reduce((sum, p) => sum + (p.gross_profit || 0), 0);
      result.push({ month: 'Lainnya', projects: otherProjects, totalContract, totalPaid, totalPiutang, totalExpenses, totalGrossProfit });
    }

    return result;
  }, [filteredProjects]);

  // Real-time calculation of total expenses in modal
  const totalEstimatedExpenses = useMemo(() => {
    return Object.values(expenseInputs).reduce((sum, item) => {
      const val = parseFloat(item.amount.replace(/[^0-9]/g, '')) || 0;
      return sum + val;
    }, 0);
  }, [expenseInputs]);

  const contractNumeric = useMemo(() => {
    return parseFloat(formContractValue.replace(/[^0-9]/g, '')) || 0;
  }, [formContractValue]);

  const dpNumeric = useMemo(() => {
    return parseFloat(formInitialDp.replace(/[^0-9]/g, '')) || 0;
  }, [formInitialDp]);

  const estimatedGrossProfit = contractNumeric - totalEstimatedExpenses;
  const estimatedMargin = contractNumeric > 0 ? (estimatedGrossProfit / contractNumeric) * 100 : 0;
  const estimatedPiutang = Math.max(0, contractNumeric - dpNumeric);

  const recalculateContract = (origStr: string, transStr: string, albumStr: string, discStr: string) => {
    const orig = parseFloat(origStr.replace(/[^0-9]/g, '')) || 0;
    const trans = parseFloat(transStr.replace(/[^0-9]/g, '')) || 0;
    const album = parseFloat(albumStr.replace(/[^0-9]/g, '')) || 0;
    const disc = parseFloat(discStr.replace(/[^0-9]/g, '')) || 0;
    const net = Math.max(0, (orig + trans + album) - disc);
    setFormContractValue(String(net));
  };

  const getStandardExpensesForPackage = (packageName: string) => {
    const pkg = getPackageByName(packageName);
    let fg1 = 1500000;
    let fg2 = 800000;
    let shooting = 0;
    let editor = 600000;
    let cetak = pkg?.defaultPrintingCost || 1200000;
    let cinema = pkg?.weddingCinema ? 1500000 : 0;
    let transport = 350000;
    let other = 200000;

    if (packageName.includes('Silver Standart')) {
      fg1 = 1200000;
      fg2 = 700000;
      shooting = 0;
      editor = 500000;
      cetak = 800000;
      cinema = 0;
      transport = 300000;
      other = 150000;
    } else if (packageName.includes('GOLD Prestige')) {
      fg1 = 1800000;
      fg2 = 1000000;
      shooting = 0;
      editor = 800000;
      cetak = 1800000;
      cinema = 1800000;
      transport = 500000;
      other = 250000;
    } else if (packageName.includes('Engagement')) {
      fg1 = 700000;
      fg2 = 0;
      shooting = 0;
      editor = 300000;
      cetak = 400000;
      cinema = 0;
      transport = 150000;
      other = 50000;
    } else if (packageName.includes('Prewedding')) {
      fg1 = 600000;
      fg2 = 0;
      shooting = 0;
      editor = 300000;
      cetak = 500000;
      cinema = 0;
      transport = 150000;
      other = 150000;
    }

    return {
      'FG 1': { amount: String(fg1), recipient: 'First FG STOA', description: 'Honor First Photographer (FG 1)' },
      'FG 2': { amount: String(fg2), recipient: fg2 > 0 ? 'Second FG STOA' : '-', description: fg2 > 0 ? 'Honor Second Photographer (FG 2)' : '-' },
      'Shooting': { amount: String(shooting), recipient: shooting > 0 ? 'Crew Shooting STOA' : '-', description: shooting > 0 ? 'Honor Liputan Acara Hari H' : '-' },
      'Editor': { amount: String(editor), recipient: 'Team Editor STOA', description: 'Editing Foto & Grading Video' },
      'Cetak': { amount: String(cetak), recipient: 'Lab Percetakan Album', description: pkg?.album || 'Cetak Album & Frame' },
      'Cinema': { amount: String(cinema), recipient: cinema > 0 ? 'Cinema & Drone Crew' : '-', description: cinema > 0 ? 'Dokumentasi Cinematic Video & Drone' : '-' },
      'Transport / Akomodasi': { amount: String(transport), recipient: 'Operasional Transport', description: 'BBM & Operasional Hari H' },
      'Other Expenses': { amount: String(other), recipient: 'Pengeluaran Lainnya', description: 'Konsumsi & Perlengkapan' }
    };
  };

  const resetForm = () => {
    setFormClientName('');
    setFormClientPhone('');
    setFormEventDate('');
    setFormMonthCategory('Oktober');
    setFormLocation('Pematangsiantar');
    setIsCustomPackage(false);
    setCustomPackageName('');
    setFormPackage('Gold Premium');
    setFormOriginalPrice('8500000');
    setFormTransportFee('0');
    setFormAdditionalAlbumFee('0');
    setFormDiscount('0');
    setFormDiscountReason('');
    setFormContractValue('8500000');
    setFormInitialDp('3000000');
    setFormError('');
    setExpenseInputs({
      'FG 1': { amount: '0', recipient: 'First FG STOA', description: 'Honor First Photographer (FG 1)' },
      'FG 2': { amount: '0', recipient: 'Second FG STOA', description: 'Honor Second Photographer (FG 2)' },
      'Shooting': { amount: '0', recipient: 'Crew Shooting STOA', description: 'Honor Liputan Acara Hari H' },
      'Editor': { amount: '0', recipient: 'Team Editor STOA', description: 'Editing Foto & Grading Video' },
      'Cetak': { amount: '0', recipient: 'Lab Percetakan Album', description: 'Cetak Album & Frame' },
      'Cinema': { amount: '0', recipient: 'Cinema & Drone Crew', description: 'Dokumentasi Cinematic Video & Drone' },
      'Transport / Akomodasi': { amount: '0', recipient: 'Operasional Transport', description: 'BBM & Operasional Hari H' },
      'Other Expenses': { amount: '0', recipient: 'Pengeluaran Lainnya', description: 'Konsumsi & Perlengkapan' }
    });
  };

  React.useEffect(() => {
    if (initialCreateDate) {
      resetForm();
      setFormEventDate(initialCreateDate);
      const d = new Date(initialCreateDate);
      if (!isNaN(d.getTime())) {
        const monthNames = [
          'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        setFormMonthCategory(monthNames[d.getMonth()]);
      }
      setIsAddModalOpen(true);
      onClearInitialCreateDate?.();
    }
  }, [initialCreateDate]);

  React.useEffect(() => {
    if (isMobileQuickAddOpen) {
      resetForm();
      setIsAddModalOpen(true);
      onCloseMobileQuickAdd?.();
    }
  }, [isMobileQuickAddOpen]);

  const handleOpenAdd = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setFormClientName(p.client_name);
    setFormClientPhone(p.client_phone || '');
    setFormEventDate(p.event_date);
    setFormMonthCategory(p.month_category || getMonthCategoryFromDate(p.event_date));
    setFormLocation(p.event_location);

    // Detect if package is a standard catalog package or a custom package
    const isStandardPreset = STOA_PACKAGE_NAMES.filter(n => n !== 'Custom Package / Layanan Khusus').includes(p.package_name);
    if (isStandardPreset) {
      setIsCustomPackage(false);
      setCustomPackageName('');
      setFormPackage(p.package_name);
    } else {
      setIsCustomPackage(true);
      setCustomPackageName(p.package_name);
      setFormPackage(p.package_name);
    }

    const origPrice = p.original_price ?? p.contract_value;
    setFormOriginalPrice(String(origPrice));
    setFormTransportFee(String(p.transport_fee ?? 0));
    setFormAdditionalAlbumFee(String(p.additional_album_fee ?? 0));
    setFormDiscount(String(p.discount ?? 0));
    setFormDiscountReason(p.discount_reason || '');
    setFormContractValue(String(p.contract_value));
    setFormInitialDp(String(p.initial_dp));
    setFormError('');

    // Pre-populate expenses for this project if available
    const existingProjectExpenses = expenses.filter(e => e.project_id === p.id);
    const populatedExpenses: Record<ExpenseCategoryName, ExpenseItemState> = {
      'FG 1': { amount: '', recipient: 'First FG STOA', description: '' },
      'FG 2': { amount: '', recipient: 'Second FG STOA', description: '' },
      'Shooting': { amount: '', recipient: 'Crew Shooting STOA', description: '' },
      'Editor': { amount: '', recipient: 'Team Editor STOA', description: '' },
      'Cetak': { amount: '', recipient: 'Lab Percetakan Album', description: '' },
      'Cinema': { amount: '', recipient: 'Cinema & Drone Crew', description: '' },
      'Transport / Akomodasi': { amount: '', recipient: 'Operasional Transport', description: '' },
      'Other Expenses': { amount: '', recipient: 'Pengeluaran Lainnya', description: '' }
    };

    existingProjectExpenses.forEach(e => {
      const cat = e.category as ExpenseCategoryName;
      if (populatedExpenses[cat]) {
        populatedExpenses[cat] = {
          amount: String(e.amount),
          recipient: e.recipient_name || populatedExpenses[cat].recipient,
          description: e.description || ''
        };
      }
    });

    setExpenseInputs(populatedExpenses);
  };

  // Change package handler with auto-fill contract value, bundling presets & custom support
  const handlePackageChange = (packageName: string) => {
    if (packageName === 'CUSTOM' || packageName === 'Custom Package / Layanan Khusus') {
      setIsCustomPackage(true);
      const customName = customPackageName.trim() || 'Paket Custom Khusus';
      setFormPackage(customName);
      return;
    }

    setIsCustomPackage(false);
    setCustomPackageName('');
    setFormPackage(packageName);
    const pkg = getPackageByName(packageName);
    if (pkg && pkg.price > 0) {
      setFormOriginalPrice(String(pkg.price));
      
      let disc = 0;
      let reason = '';
      if (packageName.toLowerCase().includes('bundling')) {
        disc = 500000;
        reason = 'Promo Bundling Hemat Rp 500.000';
      }
      setFormDiscount(String(disc));
      setFormDiscountReason(reason);

      const trans = parseFloat(formTransportFee.replace(/[^0-9]/g, '')) || 0;
      const album = parseFloat(formAdditionalAlbumFee.replace(/[^0-9]/g, '')) || 0;
      const netContract = Math.max(0, (pkg.price + trans + album) - disc);
      setFormContractValue(String(netContract));
      // Auto-suggest DP around 30%
      const suggestedDp = Math.round((netContract * 0.3) / 100000) * 100000;
      setFormInitialDp(String(suggestedDp));

      // Keep production expense inputs at 0 as requested
      setExpenseInputs({
        'FG 1': { amount: '0', recipient: 'First FG STOA', description: 'Honor First Photographer (FG 1)' },
        'FG 2': { amount: '0', recipient: 'Second FG STOA', description: 'Honor Second Photographer (FG 2)' },
        'Shooting': { amount: '0', recipient: 'Crew Shooting STOA', description: 'Honor Liputan Acara Hari H' },
        'Editor': { amount: '0', recipient: 'Team Editor STOA', description: 'Editing Foto & Grading Video' },
        'Cetak': { amount: '0', recipient: 'Lab Percetakan Album', description: pkg?.album || 'Cetak Album & Frame' },
        'Cinema': { amount: '0', recipient: 'Cinema & Drone Crew', description: 'Dokumentasi Cinematic Video & Drone' },
        'Transport / Akomodasi': { amount: '0', recipient: 'Operasional Transport', description: 'BBM & Operasional Hari H' },
        'Other Expenses': { amount: '0', recipient: 'Pengeluaran Lainnya', description: 'Konsumsi & Perlengkapan' }
      });
    }
  };

  const handleCustomPackageNameChange = (val: string) => {
    setCustomPackageName(val);
    setFormPackage(val.trim() || 'Paket Custom');
  };

  const handleOriginalPriceChange = (val: string) => {
    setFormOriginalPrice(val);
    recalculateContract(val, formTransportFee, formAdditionalAlbumFee, formDiscount);
  };

  const handleTransportFeeChange = (val: string) => {
    setFormTransportFee(val);
    recalculateContract(formOriginalPrice, val, formAdditionalAlbumFee, formDiscount);
  };

  const handleAdditionalAlbumFeeChange = (val: string) => {
    setFormAdditionalAlbumFee(val);
    recalculateContract(formOriginalPrice, formTransportFee, val, formDiscount);
  };

  const handleDiscountChange = (val: string) => {
    setFormDiscount(val);
    recalculateContract(formOriginalPrice, formTransportFee, formAdditionalAlbumFee, val);
  };

  const handleQuickDiscount = (amount: number, reason: string) => {
    setFormDiscount(String(amount));
    setFormDiscountReason(reason);
    recalculateContract(formOriginalPrice, formTransportFee, formAdditionalAlbumFee, String(amount));
  };

  // Auto-fill standard recommended production expenses based on selected package
  const handleApplyStandardExpenses = () => {
    setExpenseInputs(getStandardExpensesForPackage(formPackage));
  };

  const handleUpdateExpenseAmount = (cat: ExpenseCategoryName, value: string) => {
    setExpenseInputs(prev => ({
      ...prev,
      [cat]: {
        ...prev[cat],
        amount: value
      }
    }));
  };

  const handleUpdateExpenseRecipient = (cat: ExpenseCategoryName, value: string) => {
    setExpenseInputs(prev => ({
      ...prev,
      [cat]: {
        ...prev[cat],
        recipient: value
      }
    }));
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim() || !formEventDate) {
      setFormError('Nama Klien dan Tanggal Acara wajib diisi.');
      return;
    }

    const origNum = parseFloat(String(formOriginalPrice || '').replace(/[^0-9]/g, '')) || 0;
    const transportNum = parseFloat(String(formTransportFee || '').replace(/[^0-9]/g, '')) || 0;
    const albumNum = parseFloat(String(formAdditionalAlbumFee || '').replace(/[^0-9]/g, '')) || 0;
    const discNum = parseFloat(String(formDiscount || '').replace(/[^0-9]/g, '')) || 0;
    let contractNum = parseFloat(String(formContractValue || '').replace(/[^0-9]/g, '')) || 0;
    
    // Auto sync contract value if empty but original price provided
    if (contractNum <= 0 && origNum > 0) {
      contractNum = Math.max(0, (origNum + transportNum + albumNum) - discNum);
    }
    const finalOriginal = origNum > 0 ? origNum : (contractNum + discNum);
    const dpNum = parseFloat(String(formInitialDp || '').replace(/[^0-9]/g, '')) || 0;

    if (contractNum <= 0) {
      setFormError('Nilai kontrak bersih harus lebih besar dari 0.');
      return;
    }

    if (dpNum > contractNum) {
      setFormError('DP Awal tidak boleh melebihi total Nilai Kontrak Bersih.');
      return;
    }

    // Prepare initial expenses payload for the 7 categories
    const initialExpensesPayload = (Object.keys(expenseInputs) as ExpenseCategoryName[])
      .map(cat => ({
        category: cat,
        amount: parseFloat(String(expenseInputs[cat]?.amount || '').replace(/[^0-9]/g, '')) || 0,
        recipient_name: (expenseInputs[cat]?.recipient || '').trim() || `Tim / Vendor ${cat}`,
        description: (expenseInputs[cat]?.description || '').trim() || `Biaya ${cat} - ${formClientName.trim()}`
      }))
      .filter(item => item.amount > 0);

    const finalMonthCategory = formMonthCategory || getMonthCategoryFromDate(formEventDate);

    // Validate and determine package name
    if (isCustomPackage && !customPackageName.trim()) {
      setFormError('Silakan ketik nama paket custom terlebih dahulu.');
      return;
    }

    const finalPackageName = isCustomPackage
      ? (customPackageName.trim() || formPackage.trim() || 'Paket Custom Khusus')
      : formPackage;

    const eventYear = new Date(formEventDate).getFullYear() || 2026;

    if (editingProject) {
      onUpdateProject(editingProject.id, {
        client_name: formClientName.trim(),
        client_phone: formClientPhone.trim() || null,
        event_date: formEventDate,
        month_category: finalMonthCategory,
        event_location: formLocation.trim() || 'Pematangsiantar',
        package_name: finalPackageName,
        contract_value: contractNum,
        original_price: finalOriginal,
        transport_fee: transportNum,
        additional_album_fee: albumNum,
        discount: discNum,
        discount_reason: formDiscountReason.trim() || null,
        initial_dp: dpNum
      });

      // Synchronize expenses if callback exists
      if (onSyncProjectExpenses) {
        onSyncProjectExpenses(editingProject.id, initialExpensesPayload, formEventDate);
      }

      onChangeYear?.(eventYear);
      setEditingProject(null);
    } else {
      const countForYear = projects.filter(p => p.event_date.startsWith(String(eventYear))).length + 1;
      const projectCode = `STOA-${eventYear}-${String(countForYear).padStart(3, '0')}`;

      onAddProject({
        project_code: projectCode,
        client_id: `client-${Date.now()}`,
        client_name: formClientName.trim(),
        client_phone: formClientPhone.trim() || null,
        event_date: formEventDate,
        month_category: finalMonthCategory,
        event_location: formLocation.trim() || 'Pematangsiantar',
        package_name: finalPackageName,
        contract_value: contractNum,
        original_price: finalOriginal,
        transport_fee: transportNum,
        additional_album_fee: albumNum,
        discount: discNum,
        discount_reason: formDiscountReason.trim() || null,
        initial_dp: dpNum,
        status: 'Confirmed',
        source_year: eventYear
      }, initialExpensesPayload);

      // Instantly switch filter to eventYear so newly created project is visible right away
      onChangeYear?.(eventYear);
      onChangeMonth?.('all');
      setMonthFilter('all');
      setPackageFilter('all');
      setSearchQuery('');

      setIsAddModalOpen(false);
    }

    resetForm();
  };

  // Detailed financial history for selected project
  const projectPayments = useMemo(() => {
    if (!detailProject) return [];
    return payments.filter(p => p.project_id === detailProject.id);
  }, [detailProject, payments]);

  const projectExpenses = useMemo(() => {
    if (!detailProject) return [];
    return expenses.filter(e => e.project_id === detailProject.id);
  }, [detailProject, expenses]);

  // Group project expenses by category for detail drawer
  const detailExpensesByCategory = useMemo(() => {
    const map: Record<string, { amount: number; recipient: string }> = {};
    projectExpenses.forEach(e => {
      if (!map[e.category]) {
        map[e.category] = { amount: 0, recipient: e.recipient_name || '-' };
      }
      map[e.category].amount += Number(e.amount);
    });
    return map;
  }, [projectExpenses]);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'FG 1': return <Camera className="w-4 h-4 text-sky-600" />;
      case 'FG 2': return <UserCheck className="w-4 h-4 text-indigo-600" />;
      case 'Shooting': return <Camera className="w-4 h-4 text-blue-600" />;
      case 'Editor': return <Film className="w-4 h-4 text-purple-600" />;
      case 'Cetak': return <Printer className="w-4 h-4 text-emerald-600" />;
      case 'Cinema': return <Video className="w-4 h-4 text-[#C06014]" />;
      case 'Transport / Akomodasi': return <Car className="w-4 h-4 text-amber-600" />;
      default: return <Receipt className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified Filter & Action Toolbar: Bar Kode, Tanggal, Paket Layanan & Controls */}
      <div className="bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935] rounded-2xl p-3.5 shadow-xs space-y-3">
        {/* Row 1: Search (Bar Kode / Klien / WA), Tanggal (Tahun & Bulan), and Paket Layanan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          {/* Bar Kode & Pencarian */}
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#536162]" />
            <input
              type="text"
              placeholder="Cari kode proyek, klien, WA, lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] placeholder-[#8C938C] focus:outline-hidden focus:ring-1 focus:ring-[#C06014]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#536162] hover:text-[#424642] dark:hover:text-[#F3F4ED] px-1.5 py-0.5 rounded-md bg-[#E5E7DC]/60 dark:bg-[#353935]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Tanggal: Filter Tahun */}
          <div className="relative sm:col-span-1 lg:col-span-2">
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C06014] pointer-events-none" />
              <select
                value={selectedYear}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                  if (onChangeYear) onChangeYear(val);
                }}
                className="w-full pl-8 pr-2.5 py-2 text-xs font-medium rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:outline-hidden focus:ring-1 focus:ring-[#C06014] cursor-pointer"
                title="Filter Berdasarkan Tahun Acara"
              >
                <option value="all">Semua Tahun</option>
                <option value={2026}>Tahun 2026</option>
                <option value={2025}>Tahun 2025</option>
                <option value={2024}>Tahun 2024</option>
                <option value={2023}>Tahun 2023</option>
                <option value={2022}>Tahun 2022</option>
              </select>
            </div>
          </div>

          {/* Tanggal: Filter Bulan */}
          <div className="relative sm:col-span-1 lg:col-span-3">
            <div className="relative">
              <CalendarDays className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C06014] pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
                  if (onChangeMonth) onChangeMonth(val);
                }}
                className="w-full pl-8 pr-2.5 py-2 text-xs font-medium rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:outline-hidden focus:ring-1 focus:ring-[#C06014] cursor-pointer"
                title="Filter Berdasarkan Bulan Acara"
              >
                <option value="all">Semua Bulan</option>
                {ID_MONTHS.map((mName, idx) => (
                  <option key={mName} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paket Layanan STOA */}
          <div className="relative sm:col-span-2 lg:col-span-3">
            <div className="relative">
              <Tag className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#C06014] pointer-events-none" />
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="w-full pl-8 pr-2.5 py-2 text-xs font-medium rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:outline-hidden focus:ring-1 focus:ring-[#C06014] cursor-pointer"
                title="Filter Berdasarkan Paket Layanan STOA"
              >
                <option value="all">Semua Paket STOA</option>
                {STOA_PRICELIST_PACKAGES.map(p => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Controls ("dan lainnya"): Tampilan, Export, Counter Badge, and New Project CTA */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#E5E7DC]/70 dark:border-[#353935]/70">
          {/* Left: View Mode Toggle & Status Count */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-[#FDFBF7] dark:bg-[#252825] p-1 rounded-xl border border-[#E5E7DC] dark:border-[#353935]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-[#424642] text-white dark:bg-[#F3F4ED] dark:text-[#1E201E] shadow-xs'
                    : 'text-[#536162] hover:text-[#424642] dark:text-[#9BA39B] dark:hover:text-[#F3F4ED]'
                }`}
                title="Tampilan Tabel Standar"
              >
                Tabel Proyek
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grouped_month')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  viewMode === 'grouped_month'
                    ? 'bg-[#C06014] text-white shadow-xs'
                    : 'text-[#536162] hover:text-[#424642] dark:text-[#9BA39B] dark:hover:text-[#F3F4ED]'
                }`}
                title="Kelompokkan Berdasarkan Kategori Bulan Acara"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Grup Bulan</span>
              </button>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F3F4ED] dark:bg-[#252825] text-[11px] font-medium text-[#536162] dark:text-[#9BA39B] border border-[#E5E7DC] dark:border-[#353935]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C06014]"></span>
              {filteredProjects.length} Proyek
            </span>

            {/* Quick reset filters button if active */}
            {(searchQuery || packageFilter !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPackageFilter('all');
                  if (onChangeYear) onChangeYear('all');
                  if (onChangeMonth) onChangeMonth('all');
                }}
                className="text-[11px] text-[#C06014] hover:underline px-1.5 py-0.5 font-medium"
              >
                Reset Filter
              </button>
            )}
          </div>

          {/* Right: Export Excel/PDF, Clear, + New Project Button */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportProjectsToExcel(filteredProjects)}
                className="px-2.5 py-1.5 rounded-xl border border-[#E5E7DC] dark:border-[#353935] text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Download Data Proyek ke Format Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Excel</span>
              </button>

              <button
                onClick={() => exportProjectsToPDF(filteredProjects)}
                className="px-2.5 py-1.5 rounded-xl border border-[#E5E7DC] dark:border-[#353935] text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Cetak Laporan Lengkap Proyek ke PDF"
              >
                <Download className="w-3.5 h-3.5 text-[#C06014]" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>

            {onClearAllProjects && projects.length > 0 && (
              <button
                onClick={() => setIsClearAllConfirmOpen(true)}
                className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-medium text-rose-600 transition-colors shadow-2xs"
                title="Kosongkan Semua Data Proyek"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 rounded-xl bg-[#C06014] hover:bg-[#a65210] text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </div>



      {/* Main View: Grouped by Month Category OR Standard Table */}
      {viewMode === 'grouped_month' ? (
        <div className="space-y-4">
          {projectsByMonth.length > 0 ? (
            projectsByMonth.map(group => (
              <div
                key={group.month}
                className="rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] overflow-hidden shadow-xs"
              >
                {/* Group Header Card */}
                <div className="p-4 bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935] flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#C06014]/10 border border-[#C06014]/30 flex items-center justify-center">
                      <CalendarDays className="w-4 h-4 text-[#C06014]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED] flex items-center gap-2">
                        <span>Kategori Bulan: {group.month}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#C06014] text-white font-bold">
                          {group.projects.length} Proyek
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                        Jadwal acara pernikahan yang terlaksana di bulan {group.month}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
                      <span className="text-[10px] uppercase font-bold text-[#536162] block">Total Omzet Bulan Ini</span>
                      <span className="font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums">
                        {formatIDR(group.totalContract)}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">Kas Diterima</span>
                      <span className="font-bold text-emerald-600 tabular-nums">
                        {formatIDR(group.totalPaid)}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
                      <span className="text-[10px] uppercase font-bold text-rose-600 block">Sisa Piutang</span>
                      <span className="font-bold text-rose-600 tabular-nums">
                        {formatIDR(group.totalPiutang)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group Table - Desktop & Tablet */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#E5E7DC] dark:border-[#353935] text-[#536162] dark:text-[#9BA39B] bg-white dark:bg-[#1E201E]">
                        <th className="py-2.5 px-4 font-semibold">Kode & Klien</th>
                        <th className="py-2.5 px-4 font-semibold">Tanggal & Lokasi</th>
                        <th className="py-2.5 px-4 font-semibold">Paket Layanan</th>
                        <th className="py-2.5 px-4 font-semibold">Status Booking</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Nilai Kontrak</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Terbayar</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Piutang</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                      {group.projects.map(proj => {
                        const bookingStatus = getProjectBookingStatus(proj);
                        return (
                          <tr key={proj.id} className="hover:bg-[#FDFBF7]/60 dark:hover:bg-[#252825]/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-[#424642] dark:text-[#F3F4ED]">{proj.client_name}</div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="text-[11px] text-[#536162] dark:text-[#9BA39B] font-mono">{proj.project_code}</span>
                                {proj.client_phone && (
                                  <a
                                    href={formatWhatsAppLink(proj.client_phone) || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                                    title="Chat WhatsApp Klien"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MessageCircle className="w-3 h-3 text-emerald-600" />
                                    <span>{proj.client_phone}</span>
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[#536162] dark:text-[#9BA39B]">
                              <div className="flex items-center gap-1 font-medium text-[#424642] dark:text-[#F3F4ED]">
                                <Calendar className="w-3.5 h-3.5 text-[#C06014]" />
                                <span>{formatDateID(proj.event_date)}</span>
                              </div>
                              <div className="text-[11px] truncate max-w-[150px] mt-0.5">{proj.event_location}</div>
                            </td>
                            <td className="py-3 px-4 font-bold text-[#424642] dark:text-[#F3F4ED]">
                              {proj.package_name}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${bookingStatus.badgeClass}`}>
                                  {bookingStatus.isHPlus3 ? <Clock className="w-3 h-3 text-emerald-600" /> : null}
                                  <span>{bookingStatus.label}</span>
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right tabular-nums">
                              <div className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{formatIDR(proj.contract_value)}</div>
                              <div className="text-[10px] space-y-0.5 mt-0.5">
                                {proj.transport_fee && proj.transport_fee > 0 ? (
                                  <span className="text-blue-600 dark:text-blue-400 block">+ Transport {formatIDR(proj.transport_fee)}</span>
                                ) : null}
                                {proj.additional_album_fee && proj.additional_album_fee > 0 ? (
                                  <span className="text-purple-600 dark:text-purple-400 block">+ Album {formatIDR(proj.additional_album_fee)}</span>
                                ) : null}
                                {proj.discount && proj.discount > 0 ? (
                                  <span className="text-amber-600 block">Diskon -{formatIDR(proj.discount)}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-emerald-600 tabular-nums">
                              {formatIDR(proj.total_payments_received)}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-rose-600 tabular-nums">
                              {formatIDR(proj.outstanding_balance)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setDetailProject(proj)}
                                  title="Rincian Biaya"
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F3F4ED] dark:bg-[#252825] hover:bg-[#E5E7DC] dark:hover:bg-[#353935] text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#C06014]" />
                                  <span>Detail</span>
                                </button>
                                <ActionMenu
                                  items={[
                                    {
                                      key: 'view',
                                      label: 'Lihat Rincian Biaya',
                                      icon: Eye,
                                      onClick: () => setDetailProject(proj)
                                    },
                                    {
                                      key: 'edit',
                                      label: 'Edit / Revisi Proyek',
                                      icon: Edit2,
                                      onClick: () => handleOpenEdit(proj)
                                    },
                                    ...(proj.client_phone ? [{
                                      key: 'wa',
                                      label: 'Chat WhatsApp Klien',
                                      icon: MessageCircle,
                                      variant: 'emerald' as const,
                                      onClick: () => {
                                        const link = formatWhatsAppLink(proj.client_phone);
                                        if (link) window.open(link, '_blank');
                                      }
                                    }] : []),
                                    ...(bookingStatus.isHPlus3 && proj.outstanding_balance && proj.outstanding_balance > 0 ? [{
                                      key: 'settle_h3',
                                      label: `Pelunasan H+3 (${formatIDR(proj.outstanding_balance)})`,
                                      icon: CheckCircle2,
                                      variant: 'emerald' as const,
                                      onClick: () => {
                                        dataService.settleHPlus3Project(proj.id);
                                      }
                                    }] : []),
                                    {
                                      key: 'delete',
                                      label: 'Hapus Proyek',
                                      icon: Trash2,
                                      variant: 'danger' as const,
                                      onClick: () => setDeletingProjectId(proj.id)
                                    }
                                  ]}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List (< md) */}
                <div className="block md:hidden divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                  {group.projects.map(proj => {
                    const bookingStatus = getProjectBookingStatus(proj);
                    return (
                      <div key={proj.id} className="p-4 space-y-3 bg-white dark:bg-[#1E201E]">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-[#424642] dark:text-[#F3F4ED] truncate">
                              {proj.client_name}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="text-[11px] font-mono text-[#536162] dark:text-[#9BA39B]">{proj.project_code}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C06014]/10 text-[#C06014] font-semibold">
                                {proj.package_name}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bookingStatus.badgeClass}`}>
                                {bookingStatus.isHPlus3 ? <Clock className="w-2.5 h-2.5 text-emerald-600" /> : null}
                                <span>{bookingStatus.shortLabel}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {proj.client_phone && (
                              <a
                                href={formatWhatsAppLink(proj.client_phone) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>WA</span>
                              </a>
                            )}
                            <ActionMenu
                              items={[
                                {
                                  key: 'invoice',
                                  label: dataService.getInvoiceByProjectId(proj.id) ? 'Buka Invoice Booking' : 'Terbitkan Invoice',
                                  icon: FileText,
                                  variant: 'accent' as const,
                                  onClick: () => handleTriggerInvoice(proj)
                                },
                                {
                                  key: 'view',
                                  label: 'Lihat Rincian Biaya',
                                  icon: Eye,
                                  onClick: () => setDetailProject(proj)
                                },
                                {
                                  key: 'edit',
                                  label: 'Edit Proyek',
                                  icon: Edit2,
                                  onClick: () => handleOpenEdit(proj)
                                },
                                ...(bookingStatus.isHPlus3 && proj.outstanding_balance && proj.outstanding_balance > 0 ? [{
                                  key: 'settle_h3',
                                  label: `Pelunasan H+3 (${formatIDR(proj.outstanding_balance)})`,
                                  icon: CheckCircle2,
                                  variant: 'emerald' as const,
                                  onClick: () => {
                                    dataService.settleHPlus3Project(proj.id);
                                  }
                                }] : []),
                                {
                                  key: 'delete',
                                  label: 'Hapus Proyek',
                                  icon: Trash2,
                                  variant: 'danger' as const,
                                  onClick: () => setDeletingProjectId(proj.id)
                                }
                              ]}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-[#FDFBF7] dark:bg-[#252825] p-2.5 rounded-xl border border-[#E5E7DC] dark:border-[#353935]">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#536162] block">Jadwal</span>
                            <span className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{formatDateID(proj.event_date)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#536162] block">Lokasi</span>
                            <span className="font-semibold text-[#424642] dark:text-[#F3F4ED] truncate block">{proj.event_location}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#536162] block">Kontrak</span>
                            <span className="font-bold text-[#424642] dark:text-[#F3F4ED]">{formatIDR(proj.contract_value)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-rose-600 block">Piutang</span>
                            <span className="font-bold text-rose-600">{formatIDR(proj.outstanding_balance)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-[11px]">
                            <span className="text-[#536162] dark:text-[#9BA39B]">Terbayar: </span>
                            <span className="font-semibold text-emerald-600">{formatIDR(proj.total_payments_received)}</span>
                          </div>
                          <button
                            onClick={() => setDetailProject(proj)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F3F4ED] dark:bg-[#252825] hover:bg-[#E5E7DC] dark:hover:bg-[#353935] text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C06014]" />
                            <span>Rincian Biaya</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-xs text-[#536162]">
              Belum ada data proyek pada kategori bulan yang dipilih.
            </div>
          )}
        </div>
      ) : (
        /* Standard Table View */
        <div className="rounded-2xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] overflow-hidden">
          {/* Desktop & Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-[#FDFBF7] dark:bg-[#252825] border-b border-[#E5E7DC] dark:border-[#353935] text-[#536162] dark:text-[#9BA39B]">
                  <th className="py-3 px-4 font-semibold">Kode & Klien</th>
                  <th className="py-3 px-4 font-semibold">Tanggal & Kategori Bulan</th>
                  <th className="py-3 px-4 font-semibold">Paket Layanan</th>
                  <th className="py-3 px-4 font-semibold">Status Booking</th>
                  <th className="py-3 px-4 font-semibold text-right">Nilai Kontrak</th>
                  <th className="py-3 px-4 font-semibold text-right">Terbayar</th>
                  <th className="py-3 px-4 font-semibold text-right">Piutang</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Beban</th>
                  <th className="py-3 px-4 font-semibold text-right">Laba Bersih</th>
                  <th className="py-3 px-4 font-semibold text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((proj) => {
                    const bookingStatus = getProjectBookingStatus(proj);
                    return (
                      <tr 
                        key={proj.id}
                        className="hover:bg-[#FDFBF7]/60 dark:hover:bg-[#252825]/60 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#424642] dark:text-[#F3F4ED]">
                            {proj.client_name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] text-[#536162] dark:text-[#9BA39B] font-mono">
                              {proj.project_code}
                            </span>
                            {proj.client_phone && (
                              <a
                                href={formatWhatsAppLink(proj.client_phone) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                                title="Chat WhatsApp Klien"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-600" />
                                <span>{proj.client_phone}</span>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#536162] dark:text-[#9BA39B]">
                          <div className="flex items-center gap-1 font-medium text-[#424642] dark:text-[#F3F4ED]">
                            <Calendar className="w-3.5 h-3.5 text-[#C06014]" />
                            <span>{formatDateID(proj.event_date)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#C06014]/10 text-[#C06014] border border-[#C06014]/20">
                              Bulan: {proj.month_category || getMonthCategoryFromDate(proj.event_date)}
                            </span>
                            <span className="text-[11px] text-[#536162] dark:text-[#9BA39B] truncate max-w-[120px]">
                              · {proj.event_location}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[#536162] dark:text-[#9BA39B]">
                          <span className="font-bold text-[#424642] dark:text-[#F3F4ED] block">
                            {proj.package_name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${bookingStatus.badgeClass}`}>
                              {bookingStatus.isHPlus3 ? <Clock className="w-3 h-3 text-emerald-600" /> : null}
                              <span>{bookingStatus.label}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums">
                          <div className="font-semibold text-[#424642] dark:text-[#F3F4ED]">
                            {formatIDR(proj.contract_value)}
                          </div>
                          <div className="text-[10px] space-y-0.5 mt-0.5">
                            {proj.transport_fee && proj.transport_fee > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400 block">+ Transport {formatIDR(proj.transport_fee)}</span>
                            ) : null}
                            {proj.additional_album_fee && proj.additional_album_fee > 0 ? (
                              <span className="text-purple-600 dark:text-purple-400 block">+ Album {formatIDR(proj.additional_album_fee)}</span>
                            ) : null}
                            {proj.discount && proj.discount > 0 ? (
                              <div className="flex flex-col items-end text-[10px] leading-tight mt-0.5">
                                {proj.original_price && proj.original_price > proj.contract_value && (
                                  <span className="text-[#536162] dark:text-[#9BA39B] line-through">
                                    {formatIDR(proj.original_price)}
                                  </span>
                                )}
                                <span className="text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                                  Diskon -{formatIDR(proj.discount)}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {formatIDR(proj.total_payments_received)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatIDR(proj.outstanding_balance)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatIDR(proj.total_expenses || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                          {formatIDR(proj.gross_profit || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleTriggerInvoice(proj)}
                              title={dataService.getInvoiceByProjectId(proj.id) ? 'Buka Invoice Resmi' : 'Terbitkan Invoice Booking'}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span className="hidden xl:inline">Invoice</span>
                            </button>
                            <button
                              onClick={() => setDetailProject(proj)}
                              title="Rincian Biaya & Transaksi"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#F3F4ED] dark:bg-[#252825] hover:bg-[#E5E7DC] dark:hover:bg-[#353935] text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#C06014]" />
                              <span>Detail</span>
                            </button>
                            <ActionMenu
                              items={[
                                {
                                  key: 'invoice',
                                  label: dataService.getInvoiceByProjectId(proj.id) ? 'Buka Invoice Booking Resmi' : 'Terbitkan Invoice Booking',
                                  icon: FileText,
                                  variant: 'accent' as const,
                                  onClick: () => handleTriggerInvoice(proj)
                                },
                                {
                                  key: 'view',
                                  label: 'Lihat Rincian Biaya & Deliverables',
                                  icon: Eye,
                                  onClick: () => setDetailProject(proj)
                                },
                                {
                                  key: 'edit',
                                  label: 'Edit / Revisi Proyek',
                                  icon: Edit2,
                                  onClick: () => handleOpenEdit(proj)
                                },
                                ...(proj.client_phone ? [{
                                  key: 'wa',
                                  label: 'Chat WhatsApp Klien',
                                  icon: MessageCircle,
                                  variant: 'emerald' as const,
                                  onClick: () => {
                                    const link = formatWhatsAppLink(proj.client_phone);
                                    if (link) window.open(link, '_blank');
                                  }
                                }] : []),
                                ...(bookingStatus.isHPlus3 && proj.outstanding_balance && proj.outstanding_balance > 0 ? [{
                                  key: 'settle_h3',
                                  label: `Pelunasan Otomatis H+3 (${formatIDR(proj.outstanding_balance)})`,
                                  icon: CheckCircle2,
                                  variant: 'emerald' as const,
                                  onClick: () => {
                                    dataService.settleHPlus3Project(proj.id);
                                  }
                                }] : []),
                                {
                                  key: 'delete',
                                  label: 'Hapus Proyek',
                                  icon: Trash2,
                                  variant: 'danger' as const,
                                  onClick: () => setDeletingProjectId(proj.id)
                                }
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-xs text-[#536162]">
                      Belum ada proyek terdaftar. Klik <strong>New Project</strong> untuk menambahkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List (< md) */}
          <div className="block md:hidden divide-y divide-[#E5E7DC] dark:divide-[#353935]">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((proj) => {
                const bookingStatus = getProjectBookingStatus(proj);
                return (
                  <div key={proj.id} className="p-4 space-y-3 bg-white dark:bg-[#1E201E]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-[#424642] dark:text-[#F3F4ED] truncate">
                          {proj.client_name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[11px] font-mono text-[#536162] dark:text-[#9BA39B]">{proj.project_code}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C06014]/10 text-[#C06014] font-semibold">
                            Bulan: {proj.month_category || getMonthCategoryFromDate(proj.event_date)}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${bookingStatus.badgeClass}`}>
                            {bookingStatus.isHPlus3 ? <Clock className="w-2.5 h-2.5 text-emerald-600" /> : null}
                            <span>{bookingStatus.shortLabel}</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {proj.client_phone && (
                          <a
                            href={formatWhatsAppLink(proj.client_phone) || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WA</span>
                          </a>
                        )}
                        <ActionMenu
                          items={[
                            {
                              key: 'invoice',
                              label: dataService.getInvoiceByProjectId(proj.id) ? 'Buka Invoice Booking' : 'Terbitkan Invoice',
                              icon: FileText,
                              variant: 'accent' as const,
                              onClick: () => handleTriggerInvoice(proj)
                            },
                            {
                              key: 'view',
                              label: 'Lihat Rincian Biaya',
                              icon: Eye,
                              onClick: () => setDetailProject(proj)
                            },
                            {
                              key: 'edit',
                              label: 'Edit Proyek',
                              icon: Edit2,
                              onClick: () => handleOpenEdit(proj)
                            },
                            ...(bookingStatus.isHPlus3 && proj.outstanding_balance && proj.outstanding_balance > 0 ? [{
                              key: 'settle_h3',
                              label: `Pelunasan H+3 (${formatIDR(proj.outstanding_balance)})`,
                              icon: CheckCircle2,
                              variant: 'emerald' as const,
                              onClick: () => {
                                dataService.settleHPlus3Project(proj.id);
                              }
                            }] : []),
                            {
                              key: 'delete',
                              label: 'Hapus Proyek',
                              icon: Trash2,
                              variant: 'danger' as const,
                              onClick: () => setDeletingProjectId(proj.id)
                            }
                          ]}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[#FDFBF7] dark:bg-[#252825] p-2.5 rounded-xl border border-[#E5E7DC] dark:border-[#353935]">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#536162] block">Paket</span>
                        <span className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{proj.package_name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#536162] block">Tanggal</span>
                        <span className="font-semibold text-[#424642] dark:text-[#F3F4ED]">{formatDateID(proj.event_date)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#536162] block">Nilai Kontrak</span>
                        <span className="font-bold text-[#424642] dark:text-[#F3F4ED]">{formatIDR(proj.contract_value)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-600 block">Sisa Piutang</span>
                        <span className="font-bold text-rose-600">{formatIDR(proj.outstanding_balance)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-[11px]">
                        <span className="text-[#536162] dark:text-[#9BA39B]">Laba Kotor: </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatIDR(proj.gross_profit || 0)}</span>
                      </div>
                      <button
                        onClick={() => setDetailProject(proj)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F3F4ED] dark:bg-[#252825] hover:bg-[#E5E7DC] dark:hover:bg-[#353935] text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C06014]" />
                        <span>Rincian Biaya</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-[#536162]">
                Belum ada proyek terdaftar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Project Modal with 7 Production Expenses */}
      <Modal
        isOpen={isAddModalOpen || editingProject !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProject(null);
        }}
        title={editingProject ? 'Edit Project' : 'New Project'}
        subtitle="STOA PICTURES – Accounting & Production Management (Pricelist 2026)"
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveProject} className="space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
              {formError}
            </div>
          )}

          {/* Mode Revisi Banner when editing existing project */}
          {editingProject && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-start gap-2.5 text-[#424642] dark:text-[#F3F4ED]">
              <Info className="w-4 h-4 text-[#C06014] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[#C06014]">
                    Mode Revisi Proyek: {editingProject.project_code} — {editingProject.client_name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C06014] text-white font-semibold">
                    Revisi Paket Tersedia
                  </span>
                </div>
                <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                  Data proyek yang sudah tersimpan dapat diedit kapan saja untuk mengakomodasi revisi paket layanan, perubahan potongan diskon/kesepakatan, jadwal acara, maupun penyesuaian alokasi biaya 7 pengeluaran produksi. Sistem otomatis menyinkronkan status deliverables pending.
                </p>
              </div>
            </div>
          )}

          {/* Section 1: Informasi Proyek & Paket Layanan */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E5E7DC] dark:border-[#353935]">
              <Calendar className="w-4 h-4 text-[#C06014]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                1. Data Proyek & Paket Layanan STOA Pictures
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Nama Klien / Pengantin *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Dimas & Nadia"
                  value={formClientName}
                  onChange={(e) => setFormClientName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  No. WhatsApp Klien *
                </label>
                <div className="relative">
                  <MessageCircle className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={formClientPhone}
                    onChange={(e) => setFormClientPhone(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
                  />
                </div>
                <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] mt-0.5 block">
                  Otomatis tersinkron ke Database Klien
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Lokasi / Venue Acara
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Pematangsiantar / Medan"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Tanggal Acara Pernikahan *
                </label>
                <input
                  type="date"
                  value={formEventDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setFormEventDate(newDate);
                    if (newDate) {
                      setFormMonthCategory(getMonthCategoryFromDate(newDate));
                    }
                  }}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                  Kategori Bulan Acara *
                </label>
                <select
                  value={formMonthCategory}
                  onChange={(e) => setFormMonthCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
                >
                  {ID_MONTHS.map((m) => (
                    <option key={m} value={m}>Bulan {m}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED]">
                    Pilih Paket Layanan (Katalog 2026) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (isCustomPackage) {
                        setIsCustomPackage(false);
                        setCustomPackageName('');
                        handlePackageChange('Gold Premium');
                      } else {
                        setIsCustomPackage(true);
                        setCustomPackageName(customPackageName || 'Paket Custom Khusus');
                        setFormPackage(customPackageName || 'Paket Custom Khusus');
                      }
                    }}
                    className="text-[11px] font-semibold text-[#C06014] hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-[#C06014]" />
                    <span>{isCustomPackage ? 'Katalog Resmi' : '+ Paket Custom'}</span>
                  </button>
                </div>
                <select
                  value={isCustomPackage ? 'CUSTOM' : formPackage}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] text-[#424642] dark:text-[#F3F4ED] focus:ring-1 focus:ring-[#C06014]"
                >
                  <optgroup label="Silver Collection">
                    <option value="Silver Standart">Silver Standart — Rp 5.000.000 (2 FG + 1 Video, Album Magnetic 10 Sheet)</option>
                    <option value="Silver Signature">Silver Signature — Rp 7.500.000 (2 FG + 2 Video, Wedding Cinema, Album Megazine)</option>
                  </optgroup>
                  <optgroup label="Gold Collection">
                    <option value="Gold Premium">Gold Premium [BEST SELLER] — Rp 8.500.000 (2 FG + 2 Video, Drone Aerial, Frame 24")</option>
                    <option value="GOLD Prestige">GOLD Prestige [Ultimate] — Rp 9.500.000 (5 Kru, Drone, Reels Highlight, Frame 24")</option>
                  </optgroup>
                  <optgroup label="Engagement & Prewedding">
                    <option value="Engagement">Engagement — Rp 1.600.000 (Dokumentasi Lamaran, Album Mini)</option>
                    <option value="Prewedding Studio">Prewedding Studio — Rp 1.800.000 (Max 2 Look + MUA & Hairdo, Frame 24")</option>
                  </optgroup>
                  <optgroup label="Bundling & Custom">
                    <option value="Bundling Engagement + Wedding">Bundling Engagement + Wedding (Potongan Diskon Rp 500.000)</option>
                    <option value="Bundling Prewedding Studio + Wedding">Bundling Prewedding Studio + Wedding (Potongan Diskon Rp 500.000)</option>
                    <option value="CUSTOM">Paket Custom (Ketik Manual)...</option>
                    <option value="Custom Package / Layanan Khusus">Custom Package / Layanan Khusus (Ketik Manual)</option>
                  </optgroup>
                </select>
              </div>

              {/* Kolom Isian untuk Pilihan Paket Custom yang Bisa Diketik Manual */}
              {isCustomPackage && (
                <div className="md:col-span-3 p-3.5 rounded-xl bg-[#C06014]/5 border-2 border-[#C06014]/40 space-y-1.5 transition-all">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#C06014] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#C06014]" />
                      <span>Nama Paket Custom (Ketik Manual) *</span>
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C06014] text-white font-semibold">
                      Mode Ketik Manual
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Contoh: Paket Resepsi + Adat Batak 2 Hari, Liputan Akad Outdoor, dll."
                    value={customPackageName}
                    onChange={(e) => handleCustomPackageNameChange(e.target.value)}
                    required={isCustomPackage}
                    autoFocus
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-lg border border-[#C06014] bg-white dark:bg-[#1E201E] text-[#424642] dark:text-[#F3F4ED] focus:ring-2 focus:ring-[#C06014] shadow-xs"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-[#536162] dark:text-[#9BA39B] pt-0.5">
                    <span>Nama paket custom ini akan tersimpan ke database proyek, faktur invoice, dan kwitansi klien.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomPackage(false);
                        setCustomPackageName('');
                        handlePackageChange('Gold Premium');
                      }}
                      className="text-xs text-[#C06014] hover:underline font-semibold"
                    >
                      Batal & Kembali ke Katalog Resmi
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Visual Package Specs Banner */}
            {currentPackageSpecs && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#C06014]">
                      {currentPackageSpecs.name}
                    </span>
                    {currentPackageSpecs.tierBadge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C06014] text-white">
                        {currentPackageSpecs.tierBadge}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-[#424642] dark:text-[#F3F4ED]">
                    {currentPackageSpecs.priceFormatted}
                  </span>
                </div>
                <p className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                  {currentPackageSpecs.subtitle}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#424642] dark:text-[#F3F4ED] pt-1">
                  <span><strong>Kru:</strong> {currentPackageSpecs.crew}</span>
                  <span><strong>Album:</strong> {currentPackageSpecs.album}</span>
                  <span><strong>Cetak:</strong> {currentPackageSpecs.printFrame}</span>
                  <span><strong>Cinema/Drone:</strong> {currentPackageSpecs.weddingCinema ? 'Ya' : 'Tidak'} {currentPackageSpecs.drone ? '(+ Drone)' : ''}</span>
                </div>
              </div>
            )}

            {/* Perhitungan Harga Katalog, Transport, Tambahan Cetak Album, Diskon & Nilai Kontrak Bersih */}
            <div className="p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#E5E7DC] dark:border-[#353935] pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#424642] dark:text-[#F3F4ED]">
                  <Tag className="w-3.5 h-3.5 text-[#C06014]" />
                  <span>Perhitungan Nilai Kontrak Bersih & Tambahan Biaya</span>
                </div>
                <span className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                  Rumus: (Harga Asli + Transport + Cetak Album) − Diskon = Nilai Kontrak Bersih
                </span>
              </div>

              {/* Baris 1: Harga Asli, Transport, Tambahan Cetak Album */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                    Harga Asli Katalog (IDR)
                  </label>
                  <input
                    type="number"
                    placeholder="8500000"
                    value={formOriginalPrice}
                    onChange={(e) => handleOriginalPriceChange(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-[#424642] dark:text-[#F3F4ED]"
                  />
                  <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] mt-0.5 block">
                    Harga resmi paket sebelum biaya tambahan / diskon
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                    Biaya Transport (IDR)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formTransportFee}
                    onChange={(e) => handleTransportFeeChange(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-blue-600 dark:text-blue-400"
                  />
                  <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] mt-0.5 block">
                    Biaya akomodasi/perjalanan lokasi luar kota
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                    Tambahan Cetak Album (IDR)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formAdditionalAlbumFee}
                    onChange={(e) => handleAdditionalAlbumFeeChange(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-purple-600 dark:text-purple-400"
                  />
                  <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] mt-0.5 block">
                    Biaya upgrade / ekstra cetak album foto
                  </span>
                </div>
              </div>

              {/* Baris 2: Diskon & Alasan Diskon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 border-t border-[#E5E7DC]/60 dark:border-[#353935]/60">
                <div>
                  <label className="block text-[11px] font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                    Potongan Diskon (IDR)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formDiscount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-amber-600 dark:text-amber-400"
                  />
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuickDiscount(0, '')}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${
                        formDiscount === '0' || !formDiscount
                          ? 'bg-[#424642] text-white'
                          : 'bg-[#E5E7DC] dark:bg-[#353935] text-[#536162] hover:bg-stone-300'
                      }`}
                    >
                      Rp 0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDiscount(500000, 'Promo Bundling Hemat Rp 500.000')}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${
                        formDiscount === '500000'
                          ? 'bg-[#C06014] text-white'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-[#C06014] hover:bg-amber-200'
                      }`}
                    >
                      Bundling -500rb
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDiscount(1000000, 'Promo Wedding Expo / Spesial Rp 1.000.000')}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${
                        formDiscount === '1000000'
                          ? 'bg-[#C06014] text-white'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-[#C06014] hover:bg-amber-200'
                      }`}
                    >
                      Expo -1jt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickDiscount(300000, 'Early Bird DP Kilat Rp 300.000')}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors ${
                        formDiscount === '300000'
                          ? 'bg-[#C06014] text-white'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-[#C06014] hover:bg-amber-200'
                      }`}
                    >
                      DP Kilat -300rb
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                    Keterangan / Alasan Diskon
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Promo Bundling, Diskon Expo, dll."
                    value={formDiscountReason}
                    onChange={(e) => setFormDiscountReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-[#424642] dark:text-[#F3F4ED]"
                  />
                  <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] mt-0.5 block">
                    Alasan atau kode promo yang diberikan
                  </span>
                </div>
              </div>

              {/* Baris 3: Nilai Kontrak Bersih & DP Awal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 border-t border-[#E5E7DC]/60 dark:border-[#353935]/60">
                <div>
                  <label className="block text-xs font-bold text-[#424642] dark:text-[#F3F4ED] mb-1">
                    Nilai Kontrak Bersih (IDR) *
                  </label>
                  <input
                    type="number"
                    placeholder="8500000"
                    value={formContractValue}
                    onChange={(e) => setFormContractValue(e.target.value)}
                    required
                    min="0"
                    className="w-full px-3 py-2 text-xs rounded-lg border-2 border-[#C06014] bg-white dark:bg-[#1E201E] text-[#424642] dark:text-[#F3F4ED] font-mono font-bold"
                  />
                  <span className="text-[10px] text-[#C06014] font-medium mt-0.5 block">
                    Total tagihan final klien (Harga Asli + Transport + Cetak Album − Diskon)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#424642] dark:text-[#F3F4ED] mb-1">
                    DP Awal Booking (IDR)
                  </label>
                  <input
                    type="number"
                    placeholder="3000000"
                    value={formInitialDp}
                    onChange={(e) => setFormInitialDp(e.target.value)}
                    min="0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-[#424642] dark:text-[#F3F4ED] font-mono"
                  />
                  <span className="text-[10px] text-[#536162] dark:text-[#9BA39B] mt-0.5 block">
                    Uang muka yang dibayar saat booking
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Alokasi Biaya Pengeluaran Produksi (FG 1, FG 2, Tim & Vendor) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E5E7DC] dark:border-[#353935]">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-[#C06014]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                  2. Alokasi Biaya Pengeluaran Produksi (FG 1, FG 2, Kru & Vendor)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleApplyStandardExpenses}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#C06014]/10 hover:bg-[#C06014]/20 text-[#C06014] border border-[#C06014]/30 transition-colors flex items-center gap-1 self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Isi Rekomendasi Standar Paket</span>
              </button>
            </div>

            <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
              Masukkan alokasi biaya untuk tim, percetakan album, dan transportasi. Nilai &gt; 0 akan otomatis dicatat sebagai pengeluaran proyek resmi:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {STOA_EXPENSE_CATEGORIES.map((cat) => {
                const current = expenseInputs[cat.id as ExpenseCategoryName];
                return (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] space-y-2 hover:border-[#C06014]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(cat.id)}
                        <span className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED]">
                          {cat.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#536162] dark:text-[#9BA39B] mb-0.5">
                          Biaya / Nominal (IDR)
                        </label>
                        <input
                          type="number"
                          placeholder={cat.placeholder}
                          value={current.amount}
                          onChange={(e) => handleUpdateExpenseAmount(cat.id as ExpenseCategoryName, e.target.value)}
                          min="0"
                          className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-[#424642] dark:text-[#F3F4ED]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-[#536162] dark:text-[#9BA39B] mb-0.5">
                          Penerima / Vendor / Tim
                        </label>
                        <input
                          type="text"
                          placeholder={cat.defaultRecipient}
                          value={current.recipient}
                          onChange={(e) => handleUpdateExpenseRecipient(cat.id as ExpenseCategoryName, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] text-[#424642] dark:text-[#F3F4ED]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Live Financial Summary Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#F3F4ED] to-[#E5E7DC]/40 dark:from-[#252825] dark:to-[#1E201E] border border-[#E5E7DC] dark:border-[#353935] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
              <Calculator className="w-4 h-4 text-[#C06014]" />
              <span>Ringkasan Kalkulasi Finansial Proyek (Otomatis)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
                <span className="text-[10px] font-bold uppercase text-[#536162] block">Total Kontrak</span>
                <span className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums">
                  {formatIDR(contractNumeric)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
                <span className="text-[10px] font-bold uppercase text-rose-600 block">Total Pengeluaran Produksi</span>
                <span className="text-sm font-bold text-rose-600 tabular-nums">
                  {formatIDR(totalEstimatedExpenses)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
                <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                  Estimasi Laba Bersih ({estimatedMargin.toFixed(0)}%)
                </span>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">
                  {formatIDR(estimatedGrossProfit)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
                <span className="text-[10px] font-bold uppercase text-[#536162] block">Sisa Piutang Klien</span>
                <span className="text-sm font-bold text-[#C06014] tabular-nums">
                  {formatIDR(estimatedPiutang)}
                </span>
              </div>
            </div>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="pt-4 border-t border-[#E5E7DC] dark:border-[#353935] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingProject(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-[#536162] hover:bg-[#F3F4ED] dark:hover:bg-[#353935] rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#C06014] hover:bg-[#a65210] rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Proyek & Pengeluaran</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Project Financial Detail Drawer / Modal */}
      {detailProject && (
        <Modal
          isOpen={detailProject !== null}
          onClose={() => {
            setDetailProject(null);
            if (onCloseDetail) onCloseDetail();
          }}
          title={`Detail Proyek: ${detailProject.client_name}`}
          subtitle={`${detailProject.project_code} · ${formatDateID(detailProject.event_date)} · ${detailProject.event_location}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Top Quick Revision Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#C06014] shrink-0" />
                <div>
                  <span className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED] block">
                    Revisi Paket Layanan atau Penyesuaian Data?
                  </span>
                  <span className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                    Proyek ini dapat direvisi kapan saja (perubahan paket, diskon, tanggal acara, atau beban pengeluaran).
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const projToEdit = detailProject;
                  setDetailProject(null);
                  if (onCloseDetail) onCloseDetail();
                  handleOpenEdit(projToEdit);
                }}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#C06014] hover:bg-[#a65210] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs whitespace-nowrap self-start sm:self-auto"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Revisi / Edit Proyek Ini</span>
              </button>
            </div>

            {/* Top Financial Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#FDFBF7] dark:bg-[#252825] border border-[#E5E7DC] dark:border-[#353935]">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#536162] dark:text-[#9BA39B]">Nilai Kontrak Bersih</p>
                <p className="text-base font-bold text-[#424642] dark:text-[#F3F4ED] tabular-nums mt-0.5">
                  {formatIDR(detailProject.contract_value)}
                </p>
                <div className="text-[10px] space-y-0.5 mt-1 leading-tight">
                  {detailProject.transport_fee && detailProject.transport_fee > 0 ? (
                    <span className="text-blue-600 dark:text-blue-400 block">+ Transport {formatIDR(detailProject.transport_fee)}</span>
                  ) : null}
                  {detailProject.additional_album_fee && detailProject.additional_album_fee > 0 ? (
                    <span className="text-purple-600 dark:text-purple-400 block">+ Album {formatIDR(detailProject.additional_album_fee)}</span>
                  ) : null}
                  {detailProject.discount && detailProject.discount > 0 ? (
                    <div className="text-amber-600 dark:text-amber-400 font-medium">
                      <span>Diskon -{formatIDR(detailProject.discount)}</span>
                      {detailProject.original_price && detailProject.original_price > detailProject.contract_value && (
                        <span className="text-[#536162] block">
                          (Katalog: {formatIDR(detailProject.original_price)})
                        </span>
                      )}
                      {detailProject.discount_reason && (
                        <span className="block text-[9px] text-[#536162] italic truncate max-w-[150px]">
                          {detailProject.discount_reason}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#536162] dark:text-[#9BA39B]">Kas Diterima</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
                  {formatIDR(detailProject.total_payments_received)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#536162] dark:text-[#9BA39B]">Sisa Piutang</p>
                <p className="text-base font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
                  {formatIDR(detailProject.outstanding_balance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-[#536162] dark:text-[#9BA39B]">Laba Bersih</p>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
                  {formatIDR(detailProject.gross_profit)}
                </p>
              </div>
            </div>

            {/* Package Specs & Client Contacts Overview */}
            <div className="p-4 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-white dark:bg-[#1E201E] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#C06014]">
                  Paket Layanan: {detailProject.package_name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTriggerInvoice(detailProject)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{dataService.getInvoiceByProjectId(detailProject.id) ? 'Buka Invoice Resmi' : 'Terbitkan Invoice Booking'}</span>
                  </button>
                  {detailProject.client_phone && (
                    <a
                      href={formatWhatsAppLink(detailProject.client_phone) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp ({detailProject.client_phone})</span>
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-[#536162] dark:text-[#9BA39B] pt-1 border-t border-[#F3F4ED] dark:border-[#353935]">
                <div>
                  <span className="block font-semibold text-[#424642] dark:text-[#F3F4ED]">Venue Acara:</span>
                  <span>{detailProject.event_location}</span>
                </div>
                <div>
                  <span className="block font-semibold text-[#424642] dark:text-[#F3F4ED]">Tanggal:</span>
                  <span>{formatDateID(detailProject.event_date)}</span>
                </div>
                <div>
                  <span className="block font-semibold text-[#424642] dark:text-[#F3F4ED]">Kategori Bulan:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#C06014]">
                    🗓️ {detailProject.month_category || getMonthCategoryFromDate(detailProject.event_date)}
                  </span>
                </div>
                <div>
                  <span className="block font-semibold text-[#424642] dark:text-[#F3F4ED]">No. WhatsApp:</span>
                  <span className="font-mono">{detailProject.client_phone || '-'}</span>
                </div>
              </div>
            </div>

            {/* 7 Expense Categories Allocation Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1.5">
                  <ReceiptText className="w-4 h-4 text-[#C06014]" />
                  <span>Rincian Beban Kategori Pengeluaran Produksi</span>
                </h4>
                <span className="text-xs font-bold text-rose-600 tabular-nums">
                  Total Pengeluaran: {formatIDR(detailProject.total_expenses)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {STOA_EXPENSE_CATEGORIES.map((cat) => {
                  const data = detailExpensesByCategory[cat.id];
                  return (
                    <div
                      key={cat.id}
                      className="p-3 rounded-lg border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825]"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {getCategoryIcon(cat.id)}
                        <span className="text-[11px] font-bold text-[#424642] dark:text-[#F3F4ED] truncate">
                          {cat.id}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-rose-600 tabular-nums">
                        {data ? formatIDR(data.amount) : 'Rp 0'}
                      </p>
                      <p className="text-[10px] text-[#536162] dark:text-[#9BA39B] truncate mt-0.5">
                        {data?.recipient || cat.defaultRecipient}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment History Tabular Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#C06014]" />
                  <span>Riwayat Pembayaran Klien ({projectPayments.length})</span>
                </h4>
              </div>

              {projectPayments.length > 0 ? (
                <div className="border border-[#E5E7DC] dark:border-[#353935] rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FDFBF7] dark:bg-[#252825] text-[#536162] dark:text-[#9BA39B]">
                      <tr>
                        <th className="py-2 px-3">Tanggal</th>
                        <th className="py-2 px-3">Tipe</th>
                        <th className="py-2 px-3">Metode</th>
                        <th className="py-2 px-3">Keterangan</th>
                        <th className="py-2 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                      {projectPayments.map(p => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 font-medium">{formatDateID(p.payment_date)}</td>
                          <td className="py-2 px-3 uppercase text-[10px] font-bold text-[#C06014]">{p.payment_type}</td>
                          <td className="py-2 px-3">{p.payment_method}</td>
                          <td className="py-2 px-3">{p.description}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600 tabular-nums">
                            {formatIDR(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[#536162] italic">Belum ada catatan pembayaran.</p>
              )}
            </div>

            {/* Production Expenses Breakdown List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1.5">
                  <ReceiptText className="w-4 h-4 text-[#C06014]" />
                  <span>Daftar Transaksi Pengeluaran ({projectExpenses.length})</span>
                </h4>
              </div>

              {projectExpenses.length > 0 ? (
                <div className="border border-[#E5E7DC] dark:border-[#353935] rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FDFBF7] dark:bg-[#252825] text-[#536162] dark:text-[#9BA39B]">
                      <tr>
                        <th className="py-2 px-3">Kategori</th>
                        <th className="py-2 px-3">Penerima / Vendor</th>
                        <th className="py-2 px-3">Deskripsi</th>
                        <th className="py-2 px-3 text-right">Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7DC] dark:divide-[#353935]">
                      {projectExpenses.map(e => (
                        <tr key={e.id}>
                          <td className="py-2 px-3 font-bold text-[#424642] dark:text-[#F3F4ED] flex items-center gap-1.5">
                            {getCategoryIcon(e.category)}
                            <span>{e.category}</span>
                          </td>
                          <td className="py-2 px-3">{e.recipient_name}</td>
                          <td className="py-2 px-3 text-[#536162] dark:text-[#9BA39B]">{e.description}</td>
                          <td className="py-2 px-3 text-right font-bold text-rose-600 tabular-nums">
                            {formatIDR(e.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-[#536162] italic">Belum ada rincian pengeluaran untuk proyek ini.</p>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-[#E5E7DC] dark:border-[#353935] flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-[#536162] dark:text-[#9BA39B]">
                Kode: <span className="font-mono font-bold text-[#424642] dark:text-[#F3F4ED]">{detailProject.project_code}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailProject(null);
                    if (onCloseDetail) onCloseDetail();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#536162] hover:bg-[#F3F4ED] dark:hover:bg-[#353935] rounded-lg transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const projToEdit = detailProject;
                    setDetailProject(null);
                    if (onCloseDetail) onCloseDetail();
                    handleOpenEdit(projToEdit);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#C06014] hover:bg-[#a65210] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Revisi / Edit Proyek Ini</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deletingProjectId !== null}
        onClose={() => setDeletingProjectId(null)}
        onConfirm={() => {
          if (deletingProjectId) {
            onDeleteProject(deletingProjectId);
            setDeletingProjectId(null);
          }
        }}
        title="Hapus Proyek"
        message="Apakah Anda yakin ingin menghapus data proyek ini? Semua riwayat pembayaran dan pengeluaran terkait proyek ini akan ikut terhapus dari sistem."
        confirmLabel="Hapus Permanen"
      />

      {/* Clear All Projects Confirmation */}
      {onClearAllProjects && (
        <ConfirmDialog
          isOpen={isClearAllConfirmOpen}
          onClose={() => setIsClearAllConfirmOpen(false)}
          onConfirm={() => {
            onClearAllProjects();
            setIsClearAllConfirmOpen(false);
          }}
          title="Kosongkan Semua Data Proyek"
          message="PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh data proyek? Seluruh data proyek, riwayat pembayaran klien, pengeluaran produksi, dan status monitoring deliverables akan dihapus secara permanen dari sistem."
          confirmLabel="Ya, Kosongkan Semua Data Proyek"
        />
      )}

      {/* Modal Terbitkan Invoice dari Booking */}
      <CreateInvoiceModal
        isOpen={isCreateInvoiceModalOpen}
        onClose={() => {
          setIsCreateInvoiceModalOpen(false);
          setInvoiceTargetProject(null);
        }}
        selectedProject={invoiceTargetProject}
        onInvoiceCreated={(newInv) => {
          setPreviewInvoice(newInv);
          setIsPreviewInvoiceModalOpen(true);
        }}
      />

      {/* Modal Detail / Preview Invoice */}
      <InvoiceDetailModal
        invoice={previewInvoice}
        isOpen={isPreviewInvoiceModalOpen}
        onClose={() => {
          setIsPreviewInvoiceModalOpen(false);
          setPreviewInvoice(null);
        }}
      />
    </div>
  );
};
