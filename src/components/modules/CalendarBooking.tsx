/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * STOA FINANCE – Full Calendar Booking Module
 * Comprehensive monthly & schedule management view for STOA PICTURES wedding bookings.
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  MapPin,
  Phone,
  Plus,
  Eye,
  CheckCircle2,
  CalendarDays,
  Filter,
  Layers,
  ArrowRight,
  Search,
  Tag
} from 'lucide-react';
import { Project } from '../../types/database';
import { formatDateID, formatIDR, ID_MONTHS, getMonthCategoryFromDate, getLatestActiveYearAndMonth } from '../../lib/formatters';

interface CalendarBookingProps {
  projects: Project[];
  onOpenProjectDetail: (project: Project) => void;
  onAddProjectWithDate?: (dateStr: string) => void;
  onNavigateProjects?: () => void;
}

export const CalendarBooking: React.FC<CalendarBookingProps> = ({
  projects,
  onOpenProjectDetail,
  onAddProjectWithDate,
  onNavigateProjects
}) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const latest = getLatestActiveYearAndMonth(projects);
    return new Date(latest.year, latest.month - 1, 1);
  });

  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Group projects by YYYY-MM-DD
  const projectsByDate = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach(p => {
      if (p.event_date) {
        const dStr = p.event_date.slice(0, 10);
        if (!map[dStr]) map[dStr] = [];
        map[dStr].push(p);
      }
    });
    return map;
  }, [projects]);

  // Projects in this current view month
  const monthProjects = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return projects.filter(p => p.event_date && p.event_date.startsWith(prefix));
  }, [projects, year, month]);

  // Total omzet in this month
  const monthOmzet = useMemo(() => {
    return monthProjects.reduce((sum, p) => sum + (Number(p.contract_value) || 0), 0);
  }, [monthProjects]);

  // Calculate calendar grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const daysGrid = useMemo(() => {
    const grid: Array<{
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      bookedProjects: Project[];
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    // Padding before month
    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push({
        dayNumber: 0,
        dateKey: '',
        isCurrentMonth: false,
        bookedProjects: [],
        isToday: false
      });
    }

    // Days in month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const booked = projectsByDate[dateKey] || [];
      const isToday = dateKey === todayStr;

      grid.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        bookedProjects: booked,
        isToday
      });
    }

    return grid;
  }, [year, month, daysInMonth, firstDayOfWeek, projectsByDate]);

  // Upcoming projects chronologically
  const upcomingProjects = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return [...projects]
      .filter(p => p.event_date && p.event_date >= todayStr)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 8);
  }, [projects]);

  return (
    <div className="space-y-6 pb-12">
      {/* Editorial Header Banner */}
      <div className="bg-white dark:bg-[#1E201E] rounded-2xl border border-[#E5E7DC] dark:border-[#353935] p-5 lg:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#C06014]/10 text-[#C06014] border border-[#C06014]/20 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C06014]">
                STOA PICTURES · JADWAL ACARA
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C06014] text-white">
                {monthProjects.length} Acara Terjadwal
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#424642] dark:text-[#F3F4ED] tracking-tight">
              Kalender Booking & Liputan Pernikahan
            </h1>
            <p className="text-xs text-[#536162] dark:text-[#9BA39B] mt-0.5">
              Monitoring jadwal acara hari H, ketersediaan tanggal studio, dan pengingat liputan pengantin.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {onAddProjectWithDate && (
            <button
              onClick={() => onAddProjectWithDate(new Date().toISOString().slice(0, 10))}
              className="px-3.5 py-2 rounded-xl bg-[#C06014] hover:bg-[#a65210] text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap active:scale-98"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Project Booking</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards for the Active Month */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
          <span className="text-[10px] font-bold uppercase text-[#536162] dark:text-[#9BA39B] block">
            Bulan Aktif
          </span>
          <span className="text-base font-bold text-[#424642] dark:text-[#F3F4ED] block mt-0.5">
            {ID_MONTHS[month]} {year}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
          <span className="text-[10px] font-bold uppercase text-emerald-600 block">
            Total Booking Bulan Ini
          </span>
          <span className="text-base font-bold text-emerald-600 tabular-nums block mt-0.5">
            {monthProjects.length} Acara
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
          <span className="text-[10px] font-bold uppercase text-[#C06014] block">
            Nilai Kontrak Terjadwal
          </span>
          <span className="text-base font-bold text-[#C06014] tabular-nums block mt-0.5">
            {formatIDR(monthOmzet)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935]">
          <span className="text-[10px] font-bold uppercase text-blue-600 block">
            Total Seluruh Proyek
          </span>
          <span className="text-base font-bold text-blue-600 tabular-nums block mt-0.5">
            {projects.length} Proyek
          </span>
        </div>
      </div>

      {/* Main Calendar Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Monthly Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1E201E] rounded-2xl border border-[#E5E7DC] dark:border-[#353935] p-4 sm:p-5 shadow-xs space-y-4">
          {/* Calendar Header with Chevrons and Today button */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7DC] dark:border-[#353935]">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#424642] dark:text-[#F3F4ED]">
                {ID_MONTHS[month]} {year}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F3F4ED] dark:bg-[#252825] text-[#536162] dark:text-[#9BA39B] font-semibold">
                {monthProjects.length} Acara
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-[#536162] dark:text-[#9BA39B] hover:text-[#424642] dark:hover:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] rounded-lg transition-colors border border-[#E5E7DC] dark:border-[#353935]"
              >
                Hari Ini
              </button>
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-[#536162] dark:text-[#9BA39B] hover:text-[#424642] dark:hover:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] rounded-lg transition-colors border border-[#E5E7DC] dark:border-[#353935]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-[#536162] dark:text-[#9BA39B] hover:text-[#424642] dark:hover:text-[#F3F4ED] hover:bg-[#F3F4ED] dark:hover:bg-[#252825] rounded-lg transition-colors border border-[#E5E7DC] dark:border-[#353935]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Titles */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((wDay, idx) => (
              <div
                key={wDay}
                className={`py-1.5 text-xs font-bold ${
                  idx === 0 || idx === 6
                    ? 'text-[#C06014]'
                    : 'text-[#536162] dark:text-[#9BA39B]'
                }`}
              >
                <span className="hidden sm:inline">{wDay}</span>
                <span className="sm:hidden">{wDay.slice(0, 3)}</span>
              </div>
            ))}
          </div>

          {/* Monthly Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {daysGrid.map((dayItem, idx) => {
              if (!dayItem.isCurrentMonth) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="min-h-[70px] sm:min-h-[90px] rounded-xl bg-[#FDFBF7]/40 dark:bg-[#252825]/30 border border-transparent"
                  />
                );
              }

              const { dayNumber, dateKey, bookedProjects, isToday } = dayItem;
              const hasBookings = bookedProjects.length > 0;

              return (
                <div
                  key={dateKey}
                  className={`
                    min-h-[70px] sm:min-h-[90px] p-1.5 sm:p-2 rounded-xl border transition-all flex flex-col justify-between
                    ${hasBookings
                      ? 'border-[#C06014] bg-amber-500/5 dark:bg-amber-950/20 shadow-xs'
                      : isToday
                        ? 'border-[#C06014]/60 bg-[#FDFBF7] dark:bg-[#252825]'
                        : 'border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7]/60 dark:bg-[#252825]/50 hover:border-[#C06014]/40'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`
                        text-xs font-bold w-5 h-5 rounded-md flex items-center justify-center
                        ${hasBookings
                          ? 'bg-[#C06014] text-white'
                          : isToday
                            ? 'bg-[#424642] text-white dark:bg-[#F3F4ED] dark:text-[#1E201E]'
                            : 'text-[#424642] dark:text-[#F3F4ED]'
                        }
                      `}
                    >
                      {dayNumber}
                    </span>
                    {hasBookings && (
                      <span className="text-[9px] font-black text-[#C06014] uppercase">
                        {bookedProjects.length} Acara
                      </span>
                    )}
                  </div>

                  {/* Booked Events Snippet */}
                  <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                    {bookedProjects.slice(0, 2).map((proj) => (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => onOpenProjectDetail(proj)}
                        className="w-full text-left p-1 rounded-md bg-[#C06014]/10 dark:bg-[#C06014]/20 hover:bg-[#C06014]/25 text-[#C06014] transition-colors block truncate"
                        title={`${proj.client_name} - ${proj.package_name}`}
                      >
                        <p className="text-[10px] font-bold truncate leading-tight">
                          {proj.client_name}
                        </p>
                        <p className="text-[9px] text-[#536162] dark:text-[#D1D5DB] truncate leading-tight">
                          {proj.package_name}
                        </p>
                      </button>
                    ))}
                    {bookedProjects.length > 2 && (
                      <span className="text-[9px] text-[#536162] font-semibold block text-center">
                        +{bookedProjects.length - 2} acara lagi
                      </span>
                    )}
                  </div>

                  {/* Quick Add CTA on empty day */}
                  {!hasBookings && onAddProjectWithDate && (
                    <button
                      type="button"
                      onClick={() => onAddProjectWithDate(dateKey)}
                      className="opacity-0 hover:opacity-100 focus:opacity-100 text-[10px] text-[#C06014] hover:underline flex items-center gap-0.5 justify-center py-0.5 transition-opacity"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>Booking</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Upcoming Agenda & Bookings List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[#1E201E] rounded-2xl border border-[#E5E7DC] dark:border-[#353935] p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7DC] dark:border-[#353935]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#C06014]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#424642] dark:text-[#F3F4ED]">
                  Agenda Acara Mendatang
                </h3>
              </div>
              <span className="text-xs font-bold text-[#C06014]">
                {upcomingProjects.length} Acara
              </span>
            </div>

            {upcomingProjects.length > 0 ? (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {upcomingProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] hover:border-[#C06014]/50 transition-colors space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#C06014] block">
                          {proj.project_code}
                        </span>
                        <h4 className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED]">
                          {proj.client_name}
                        </h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#C06014]/10 text-[#C06014] border border-[#C06014]/30">
                        {proj.package_name}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#536162] dark:text-[#9BA39B] space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3 h-3 text-[#C06014] shrink-0" />
                        <span className="font-medium text-[#424642] dark:text-[#F3F4ED]">
                          {formatDateID(proj.event_date)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#536162] shrink-0" />
                        <span className="truncate">{proj.event_location || 'Pematangsiantar'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-[#E5E7DC]/60 dark:border-[#353935]/60">
                      <span className="text-[10px] text-[#536162] dark:text-[#9BA39B]">
                        Nilai Kontrak: <strong>{formatIDR(proj.contract_value)}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenProjectDetail(proj)}
                        className="text-[11px] font-bold text-[#C06014] hover:underline flex items-center gap-1"
                      >
                        <span>Detail</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-dashed border-[#E5E7DC] dark:border-[#353935] text-center space-y-2">
                <CalendarDays className="w-8 h-8 text-[#536162] mx-auto opacity-50" />
                <p className="text-xs text-[#536162] dark:text-[#9BA39B]">
                  Belum ada jadwal acara mendatang.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
