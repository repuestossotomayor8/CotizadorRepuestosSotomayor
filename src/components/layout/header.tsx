'use client';

import { Search, RefreshCw, User } from 'lucide-react';
import { NotificationPanel } from './notification-panel';
import { DailyBcvDialog } from './daily-bcv-dialog';
import { useBcvRate, useUpdateBcvRate } from '@/hooks/use-supabase';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function Header() {
  const { data: bcvRate, isLoading } = useBcvRate();
  const updateBcv = useUpdateBcvRate();
  const [rateInput, setRateInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (bcvRate) {
      setRateInput(bcvRate.toFixed(2));
    }
  }, [bcvRate]);

  const handleRateSubmit = () => {
    const newRate = parseFloat(rateInput);
    if (isNaN(newRate) || newRate <= 0) {
      toast.error('Tasa inválida');
      return;
    }
    updateBcv.mutate(newRate, {
      onSuccess: () => {
        toast.success(`Tasa BCV actualizada a ${newRate.toFixed(2)}`);
        setIsEditing(false);
      },
      onError: () => toast.error('Error al actualizar la tasa'),
    });
  };

  return (
    <header className="h-[52px] border-b border-slate-200 bg-white flex items-center justify-between px-3 md:px-5 sticky top-0 z-30 min-w-0">
      {/* Left: Title + Search */}
      <div className="flex items-center gap-2 md:gap-5 min-w-0">
        <div className="flex items-center shrink-0">
          <img 
            src="/LogoRepuestosSotomayor.png" 
            alt="Repuestos Sotomayor" 
            className="h-6 md:h-7 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
          <h1 className="hidden sm:block text-[12px] md:text-[13px] font-bold tracking-wider uppercase text-slate-900 whitespace-nowrap ml-2">
            Repuestos Sotomayor
          </h1>
        </div>
        <div className="relative hidden md:block shrink-0">
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.elements.namedItem('globalSearch') as HTMLInputElement;
            const val = input.value.trim();
            if (val) {
              window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'inventory' } }));
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('global-search', { detail: { query: val } }));
              }, 50);
              input.value = '';
              input.blur();
            }
          }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              name="globalSearch"
              placeholder="Búsqueda global..."
              className="pl-9 pr-3 w-[180px] lg:w-[240px] h-[32px] rounded-md bg-slate-100 border-none text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
          </form>
        </div>
      </div>

      {/* Right: BCV Rate + Actions */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* BCV Rate */}
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium">BCV:</span>
            <input
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRateSubmit()}
              onBlur={handleRateSubmit}
              className="w-[72px] h-[28px] px-2 text-[13px] text-emerald-600 font-mono font-bold bg-emerald-50 border border-emerald-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <span className="text-[11px] text-emerald-600 font-medium">BCV:</span>
            <span className="text-[14px] font-mono font-bold text-emerald-600">
              {isLoading ? '...' : bcvRate?.toFixed(2)}
            </span>
          </button>
        )}

        <div className="w-px h-5 bg-slate-200 hidden md:block" />

        <button className="w-8 h-8 rounded-full hidden md:flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <RefreshCw className="w-[15px] h-[15px]" />
        </button>
        <NotificationPanel />
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
      <DailyBcvDialog />
    </header>
  );
}
