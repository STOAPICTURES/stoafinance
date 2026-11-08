/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * STOA FINANCE – Interactive Sidebar Booking Calendar
 * Embedded right below menu Pengaturan in sidebar navigation.
 * Highlights dates with wedding bookings, displays client info, and provides quick booking CTA.
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
  ExternalLink,
  Tag
} from 'lucide-react';
import { Project } from '../../types/database';
import { formatDateID, formatIDR, ID_MONTHS, getLatestActiveYearAndMonth } from '../../lib/formatters';

interface SidebarBookingCalendarProps {
  projects: Project[];
  onSelectProject?: (project: Project) => void;
  onOpenFullCalendar?: () => void;
  onQuickAddProjectDate?: (dateStr: string) => void;
}

export const SidebarBookingCalendar: React.FC<SidebarBookingCalendarProps> = ({
  projects,
  onSelectProject,
  onOpenFullCalendar,
  onQuickAddProjectDate
}) => {
  // Determine initial month & year (use latest project year & month or current)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const latest = getLatestActiveYearAndMonth(projects);
    return new Date(latest.year, latest.month - 1, 1);
  });

  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Map of YYYY-MM-DD to Project[]
  const bookedDatesMap = useMemo(() => {
    const map: Record<string, Project[]> = {};
    projects.forEach(p => {
      if (p.event_date) {
        // Normalize date to YYYY-MM-DD
        const dateKey = p.event_date.slice(0, 10);
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(p);
      }
    });
    return map;
  }, [projects]);

  // Calendar calculations for currentMonth
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0 - 11

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...

  // Days array for rendering grid
  const daysArray = useMemo(() => {
    const days: Array<{
      dayNumber: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isBooked: boolean;
      bookedProjects: Project[];
      isToday: boolean;
    }> = [];

    const todayStr = new Date().toISOString().slice(0, 10);

    // Empty padding slots before first day of month (Sunday-first or Monday-first)
    // We use Sunday as index 0 (Min, Sen, Sel, Rab, Kam, Jum, Sab)
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({
        dayNumber: 0,
        dateKey: '',
        isCurrentMonth: false,
        isBooked: false,
        bookedProjects: [],
        isToday: false
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const bookedProjects = bookedDatesMap[dateKey] || [];
      const isToday = dateKey === todayStr;

      days.push({
        dayNumber: d,
        dateKey,
        isCurrentMonth: true,
        isBooked: bookedProjects.length > 0,
        bookedProjects,
        isToday
      });
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfWeek, bookedDatesMap]);

  // Total booked projects in this month
  const monthBookedCount = useMemo(() => {
    let count = 0;
    daysArray.forEach(d => {
      if (d.isCurrentMonth && d.isBooked) {
        count += d.bookedProjects.length;
      }
    });
    return count;
  }, [daysArray]);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleResetToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleDayClick = (dateKey: string) => {
    if (!dateKey) return;
    setSelectedDateStr(dateKey);
    setIsModalOpen(true);
  };

  const selectedProjects = selectedDateStr ? (bookedDatesMap[selectedDateStr] || []) : [];

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#252825] rounded-xl border border-[#E5E7DC] dark:border-[#353935] p-2.5 space-y-2 shadow-2xs">
      {/* Header Widget */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E7DC]/70 dark:border-[#353935]/70">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-[#C06014]" />
          <span className="text-[11px] font-bold text-[#424642] dark:text-[#F3F4ED] tracking-tight">
            Kalender Booking
          </span>
        </div>
        {monthBookedCount > 0 ? (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#C06014]/15 text-[#C06014] border border-[#C06014]/30">
            {monthBookedCount} Booking
          </span>
        ) : (
          <span className="text-[9px] text-[#536162] dark:text-[#9BA39B]">
            Kosong
          </span>
        )}
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevMonth}
          title="Bulan Sebelumnya"
          className="p-1 rounded-md text-[#536162] hover:bg-[#E5E7DC] dark:hover:bg-[#353935] hover:text-[#424642] dark:text-[#9BA39B] dark:hover:text-[#F3F4ED] transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleResetToday}
          title="Klik untuk kembali ke Bulan Berjalan"
          className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED] hover:text-[#C06014] dark:hover:text-[#C06014] transition-colors flex items-center gap-1"
        >
          <span>{ID_MONTHS[month]}</span>
          <span className="font-mono text-[11px] text-[#536162] dark:text-[#9BA39B]">{year}</span>
        </button>

        <button
          type="button"
          onClick={handleNextMonth}
          title="Bulan Berikutnya"
          className="p-1 rounded-md text-[#536162] hover:bg-[#E5E7DC] dark:hover:bg-[#353935] hover:text-[#424642] dark:text-[#9BA39B] dark:hover:text-[#F3F4ED] transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday Labels (Min Sen Sel Rab Kam Jum Sab) */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((day, idx) => (
          <span
            key={idx}
            className={`text-[9px] font-bold ${
              idx === 0 || idx === 6
                ? 'text-[#C06014]'
                : 'text-[#536162] dark:text-[#9BA39B]'
            }`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysArray.map((dayItem, idx) => {
          if (!dayItem.isCurrentMonth) {
            return <div key={`empty-${idx}`} className="h-6 w-full" />;
          }

          const { dayNumber, dateKey, isBooked, bookedProjects, isToday } = dayItem;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => handleDayClick(dateKey)}
              title={
                isBooked
                  ? `📅 ${formatDateID(dateKey)}: ${bookedProjects.map(p => p.client_name).join(', ')}`
                  : `📅 ${formatDateID(dateKey)}: Tersedia (Belum ada booking)`
              }
              className={`
                h-6 w-full rounded-md text-[10px] font-semibold flex items-center justify-center relative transition-all
                ${isBooked
                  ? 'bg-[#C06014] text-white shadow-xs font-bold hover:scale-105 active:scale-95'
                  : isToday
                    ? 'border border-[#C06014] text-[#C06014] font-bold hover:bg-[#E5E7DC]/50 dark:hover:bg-[#353935]'
                    : 'text-[#424642] dark:text-[#D1D5DB] hover:bg-[#E5E7DC]/60 dark:hover:bg-[#353935]'
                }
              `}
            >
              <span>{dayNumber}</span>
              {/* Badge for multiple bookings on the same day */}
              {isBooked && bookedProjects.length > 1 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 text-stone-900 rounded-full text-[8px] font-black flex items-center justify-center leading-none">
                  {bookedProjects.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend Indicator */}
      <div className="flex items-center justify-between pt-1.5 border-t border-[#E5E7DC]/70 dark:border-[#353935]/70 text-[9px] text-[#536162] dark:text-[#9BA39B]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#C06014] shrink-0" />
          <span>Terisi Booking</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-[#C06014] shrink-0" />
          <span>Hari Ini</span>
        </div>
      </div>

      {/* Quick Action Button: Buka Kalender Lengkap */}
      {onOpenFullCalendar && (
        <button
          type="button"
          onClick={onOpenFullCalendar}
          className="w-full mt-1 py-1.5 px-2 rounded-lg bg-white dark:bg-[#1E201E] border border-[#E5E7DC] dark:border-[#353935] hover:border-[#C06014] text-[#424642] dark:text-[#F3F4ED] hover:text-[#C06014] text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 shadow-2xs"
        >
          <CalendarDays className="w-3 h-3 text-[#C06014]" />
          <span>Buka Kalender Penuh</span>
        </button>
      )}

      {/* Modal / Dialog showing details for clicked date */}
      {isModalOpen && selectedDateStr && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#1E201E] rounded-2xl border border-[#E5E7DC] dark:border-[#353935] shadow-2xl p-4 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Dialog */}
            <div className="flex items-start justify-between border-b border-[#E5E7DC] dark:border-[#353935] pb-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#C06014]">
                  <CalendarDays className="w-4 h-4" />
                  <span>Jadwal Booking Acara</span>
                </div>
                <h3 className="text-sm font-bold text-[#424642] dark:text-[#F3F4ED] mt-0.5">
                  {formatDateID(selectedDateStr)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#536162] hover:text-[#424642] dark:text-[#9BA39B] dark:hover:text-[#F3F4ED] p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Content: List of Bookings on this Date OR Available Notice */}
            {selectedProjects.length > 0 ? (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-2 rounded-xl">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Terisi {selectedProjects.length} Jadwal Pernikahan</span>
                  </span>
                  <span className="font-bold text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded-md">
                    BOOKED
                  </span>
                </div>

                {selectedProjects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-3 rounded-xl border border-[#E5E7DC] dark:border-[#353935] bg-[#FDFBF7] dark:bg-[#252825] space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#C06014] block">
                          {proj.project_code}
                        </span>
                        <h4 className="font-bold text-[#424642] dark:text-[#F3F4ED]">
                          {proj.client_name}
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C06014]/10 text-[#C06014] border border-[#C06014]/30">
                        {proj.package_name}
                      </span>
                    </div>

                    <div className="space-y-0.5 text-[11px] text-[#536162] dark:text-[#9BA39B]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-[#C06014] shrink-0" />
                        <span className="truncate">{proj.event_location || 'Pematangsiantar'}</span>
                      </div>
                      {proj.client_phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="font-mono">{proj.client_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-[#E5E7DC]/60 dark:border-[#353935]/60 mt-1">
                        <span>Nilai Kontrak:</span>
                        <span className="font-bold text-[#424642] dark:text-[#F3F4ED]">
                          {formatIDR(proj.contract_value)}
                        </span>
                      </div>
                    </div>

                    {onSelectProject && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          onSelectProject(proj);
                        }}
                        className="w-full mt-1.5 py-1.5 rounded-lg bg-[#C06014] hover:bg-[#a65210] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Detail Proyek Ini</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-[#E5E7DC] dark:border-[#353935] text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#424642] dark:text-[#F3F4ED]">
                    Tanggal Kosong (Tersedia)
                  </h4>
                  <p className="text-[11px] text-[#536162] dark:text-[#9BA39B] mt-0.5">
                    Belum ada jadwal liputan pernikahan yang terisi di tanggal ini.
                  </p>
                </div>
                {onQuickAddProjectDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      onQuickAddProjectDate(selectedDateStr);
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#C06014] hover:bg-[#a65210] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Booking Tanggal Ini</span>
                  </button>
                )}
              </div>
            )}

            {/* Footer Dialog */}
            <div className="pt-2 border-t border-[#E5E7DC] dark:border-[#353935] flex items-center justify-between">
              {onOpenFullCalendar && (
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    onOpenFullCalendar();
                  }}
                  className="text-xs font-semibold text-[#C06014] hover:underline flex items-center gap-1"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Buka Kalender Penuh</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-[#E5E7DC] dark:border-[#353935] text-xs font-semibold text-[#536162] hover:bg-[#F3F4ED] dark:hover:bg-[#353935] ml-auto transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
