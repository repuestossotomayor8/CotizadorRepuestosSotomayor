'use client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  FilePlus2,
  ShoppingCart,
  Settings,
  Cog,
  Wrench,
  History,
  Droplets,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Inventario', id: 'inventory' },
  { icon: FolderOpen, label: 'Clasificaciones', id: 'categories' },
  { icon: FileText, label: 'Cotizaciones', id: 'quotes' },
  { icon: FilePlus2, label: 'Cotiz. Manual', id: 'manual_quote' },
  { icon: ShoppingCart, label: 'Ventas', id: 'sales' },
  { icon: Cog, label: 'Motor', id: 'motor_kits' },
  { icon: Wrench, label: 'T. Delantero', id: 'tren_delantero_kits' },
  { icon: Droplets, label: 'Misceláneos', id: 'miscellaneous' },
  { icon: History, label: 'Historial', id: 'history' },
];

interface SidebarProps {
  activeItem?: string;
  onNavigate?: (id: string) => void;
}

export function Sidebar({ activeItem: controlledActive, onNavigate }: SidebarProps) {
  const [internalActive, setInternalActive] = useState('inventory');
  const activeItem = controlledActive ?? internalActive;

  const handleClick = (id: string) => {
    setInternalActive(id);
    onNavigate?.(id);
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-40 h-screen w-[96px] flex-col items-center bg-[#0f172a] py-4">
      {/* Logo */}
      <div className="flex flex-col items-center justify-center mb-6">
        <div className="w-9 h-9 rounded bg-white flex items-center justify-center text-[#0f172a] font-bold text-[14px] shadow-sm mb-1">
          S
        </div>
        <span className="text-[9px] font-bold text-white tracking-wide">
          Sotomayor
        </span>
        <span className="text-[7px] text-slate-400 mt-0.5">
          Admin Panel
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col items-center gap-2 flex-1 w-full px-2">
        {navItems.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className={cn(
                'group flex flex-col items-center justify-center w-full h-[54px] rounded-lg transition-all duration-200 relative',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-emerald-400 rounded-r-full" />
              )}
              <item.icon className={cn('w-[18px] h-[18px] mb-1')} />
              <span className="text-[8px] font-medium tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="w-full px-2 mb-2">
        <button
          onClick={() => handleClick('settings')}
          className={cn(
            'flex flex-col items-center justify-center w-full h-[54px] rounded-lg transition-all duration-200',
            activeItem === 'settings'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
        >
          <Settings className="w-[18px] h-[18px] mb-1" />
          <span className="text-[8px] font-medium tracking-wide">
            Configuración
          </span>
        </button>
      </div>
    </aside>
  );
}
