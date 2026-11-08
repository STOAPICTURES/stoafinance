/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { dataService } from '../../services/dataService';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // When connection comes back online, trigger auto sync from Supabase
  useEffect(() => {
    if (isOnline && wasOffline) {
      handleAutoSync();
    }
  }, [isOnline, wasOffline]);

  const handleAutoSync = async () => {
    setIsSyncing(true);
    try {
      const res = await dataService.syncFromSupabase();
      if (res.success) {
        setSyncNotice('Sinkronisasi Supabase Berhasil!');
      } else {
        setSyncNotice('Koneksi pulih, namun sinkronisasi gagal.');
      }
    } catch {
      setSyncNotice('Gagal sinkronisasi data.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 3500);
    }
  };

  if (isOnline && !wasOffline && !syncNotice) {
    return null;
  }

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
      {!isOnline ? (
        <div className="bg-[#1E201E] border border-amber-600/50 rounded-xl p-3.5 shadow-xl text-white flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
            <WifiOff className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400">Mode Offline Aktif</span>
              <span className="text-[10px] bg-amber-900/60 text-amber-200 px-1.5 py-0.5 rounded">
                Lokal Cache
              </span>
            </div>
            <p className="text-[#9BA39B] mt-1 text-[11px] leading-relaxed">
              Anda tidak terhubung ke jaringan internet. Database Supabase adalah sumber data utama; transaksi baru akan disimpan dalam antrean sinkronisasi hingga online kembali.
            </p>
          </div>
        </div>
      ) : syncNotice ? (
        <div className="bg-emerald-950 border border-emerald-500/50 rounded-xl p-3.5 shadow-xl text-white flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-emerald-300">{syncNotice}</p>
            <p className="text-[11px] text-emerald-200/80">Data telah diselaraskan dengan database Supabase.</p>
          </div>
        </div>
      ) : wasOffline ? (
        <div className="bg-[#1E201E] border border-emerald-600/50 rounded-xl p-3.5 shadow-xl text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">
              Koneksi internet kembali normal
            </span>
          </div>
          <button
            onClick={handleAutoSync}
            disabled={isSyncing}
            className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sinkronkan'}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
