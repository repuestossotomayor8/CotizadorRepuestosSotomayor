'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cart-store';
import { ShoppingCart, X } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ProductTable } from '@/components/inventory/product-table';
import { ClasificacionesContainer } from '@/components/categories/clasificaciones-container';
import { QuoteTable } from '@/components/quotes/quote-table';
import { SalesDashboard } from '@/components/sales/sales-dashboard';
import { QuoteCart } from '@/components/quotes/quote-cart';
import { SettingsDialog } from '@/components/layout/settings-dialog';
import { KitTable } from '@/components/kits/kit-table';
import { KitBuilder } from '@/components/kits/kit-builder';
import { ManualQuoteBuilder } from '@/components/quotes/manual-quote-builder';
import { ChangeHistoryPage } from '@/components/inventory/change-history-page';
import { AiQueueBanner } from '@/components/inventory/ai-queue-banner';
import { Kit } from '@/types';

export default function HomePage() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);
  const [showRecentImports, setShowRecentImports] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [cartWidth, setCartWidth] = useState(320);
  const cartItemsCount = useCartStore((s) => s.items.length);

  // Listen for navigate-tab events from notification panel
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail?.tab;
      if (tab) {
        setActiveTab(tab);
        setSelectedKit(null);
      }
    };
    window.addEventListener('navigate-tab', handler);
    return () => window.removeEventListener('navigate-tab', handler);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <Sidebar 
        activeItem={activeTab}
        onNavigate={(id) => {
          if (id === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(id);
            setSelectedKit(null); // Reset when navigating
          }
        }} 
      />

      {/* Main Area */}
      <div className="flex flex-1 md:ml-[96px] min-w-0 overflow-hidden">
        {/* Content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-3 md:p-5 bg-slate-50 min-w-0">
            {activeTab === 'inventory' && <ProductTable key={showRecentImports ? 'recents' : 'normal'} showRecentsOnMount={showRecentImports} />}
            {activeTab === 'miscellaneous' && <ProductTable key="miscellaneous" isMiscellaneous={true} />}
            {activeTab === 'categories' && <ClasificacionesContainer />}
            {activeTab === 'quotes' && <QuoteTable />}
            {activeTab === 'manual_quote' && <ManualQuoteBuilder />}
            {activeTab === 'sales' && <SalesDashboard />}
            {activeTab === 'motor_kits' && (
              selectedKit ? (
                <KitBuilder kit={selectedKit} onBack={() => setSelectedKit(null)} />
              ) : (
                <KitTable category="Motor" onSelectKit={setSelectedKit} />
              )
            )}
            {activeTab === 'tren_delantero_kits' && (
              selectedKit ? (
                <KitBuilder kit={selectedKit} onBack={() => setSelectedKit(null)} />
              ) : (
                <KitTable category="Tren Delantero" onSelectKit={setSelectedKit} />
              )
            )}
            {activeTab === 'history' && <ChangeHistoryPage />}
          </main>
        </div>

        {/* Quote Cart - Fixed Right Panel (Desktop only) */}
        <div 
          className="hidden lg:block shrink-0 border-l border-slate-200 bg-white z-10 overflow-hidden relative"
          style={{ width: `${cartWidth}px`, minWidth: '320px', maxWidth: '800px' }}
        >
          {/* Drag Handle */}
          <div 
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors z-20 group"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.pageX;
              const startWidth = cartWidth;
              
              const onMouseMove = (moveEvent: MouseEvent) => {
                const diff = startX - moveEvent.pageX;
                // Min 320px, Max 800px or half screen width
                const newWidth = Math.min(Math.max(startWidth + diff, 320), 800);
                setCartWidth(newWidth);
              };

              const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = 'default';
              };

              document.body.style.cursor = 'col-resize';
              document.addEventListener('mousemove', onMouseMove);
              document.addEventListener('mouseup', onMouseUp);
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-slate-300 rounded-full group-hover:bg-emerald-600 transition-colors" />
          </div>
          <QuoteCart />
        </div>
      </div>
      
      {/* Mobile / Tablet Floating Cart Button */}
      <div className="lg:hidden fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsMobileCartOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-[#0f172a] text-white rounded-full shadow-lg hover:bg-[#1e293b] transition-all active:scale-95 border border-slate-700"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                {cartItemsCount}
              </span>
            )}
          </div>
          <span className="text-[13px] font-bold">Cotización</span>
        </button>
      </div>

      {/* Mobile / Tablet Cart Slide-over */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end bg-black/50 animate-in fade-in">
          <div className="w-full max-w-[340px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right relative">
            <button
              onClick={() => setIsMobileCartOpen(false)}
              className="absolute top-3 right-3 z-50 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 overflow-hidden">
              <QuoteCart />
            </div>
          </div>
        </div>
      )}

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} onImportComplete={() => {
        setActiveTab('inventory');
        setShowRecentImports(true);
        setTimeout(() => setShowRecentImports(false), 500);
      }} />
      <AiQueueBanner />
    </div>
  );
}
