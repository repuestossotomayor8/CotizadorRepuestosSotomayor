'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import Fuse from 'fuse.js';
import { Product } from '@/types';
import { useProducts, useBcvRate, useCategories, useBcvMultiplier, useUpdateProduct, useBrands, useBulkDeleteProducts } from '@/hooks/use-supabase';
import { useCartStore } from '@/store/cart-store';
import { Badge } from '@/components/ui/badge';
import { formatUSD } from '@/lib/utils';
import { Search, SlidersHorizontal, Plus, Image as ImageIcon, ArrowUpDown, Pencil, History, Clock, Save, X, Trash2, CheckSquare, Eye, EyeOff } from 'lucide-react';
import { ProductFormDialog } from './product-form-dialog';
import { ProductHistoryDialog } from './product-history-dialog';
import { ImageGalleryDialog } from './image-gallery-dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const columnHelper = createColumnHelper<Product>();

interface ProductTableProps {
  showRecentsOnMount?: boolean;
  isMiscellaneous?: boolean;
}

export function ProductTable({ showRecentsOnMount, isMiscellaneous }: ProductTableProps) {
  const { data: products = [], isLoading } = useProducts();
  const { data: bcvRate = 36.5 } = useBcvRate();
  const { data: bcvMultiplier = 1.4 } = useBcvMultiplier();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const addItem = useCartStore((s) => s.addItem);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [displayLimit, setDisplayLimit] = useState(100);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [webStatusFilter, setWebStatusFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [imageFilter, setImageFilter] = useState<string>('all');
  const [recentsOnly, setRecentsOnly] = useState(!!showRecentsOnMount);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(!!showRecentsOnMount);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [productForHistory, setProductForHistory] = useState<Product | null>(null);
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateProduct = useUpdateProduct();
  const bulkDelete = useBulkDeleteProducts();
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editCost, setEditCost] = useState('');
  const [editPrice, setEditPrice] = useState('');

  // Identify categories for Misceláneos (Aceites y Lubricantes)
  const miscCategoryIds = useMemo(() => {
    return categories
      .filter((c) =>
        (c.name.toLowerCase().includes('aceite') && !c.name.toLowerCase().includes('bomba')) ||
        c.name.toLowerCase().includes('lubricante') ||
        c.name.toLowerCase().includes('miscel') ||
        c.section === 'Misceláneos' ||
        c.section === 'Miscelaneos' ||
        c.id === 'd5ee462b-e3a2-4f6c-94f1-529ac9686fa6'
      )
      .map((c) => c.id);
  }, [categories]);

  // Base products filtered by section if isMiscellaneous is active
  const targetProducts = useMemo(() => {
    if (!isMiscellaneous) return products;
    return products.filter((p) => {
      if (p.category_id && miscCategoryIds.includes(p.category_id)) return true;
      const catName = p.categories?.name?.toLowerCase() || '';
      if (catName.includes('aceite') && !catName.includes('bomba')) return true;
      if (catName.includes('lubricante') || catName.includes('miscel')) return true;
      return false;
    });
  }, [products, isMiscellaneous, miscCategoryIds]);

  // Listen for open-product events from notification panel
  useEffect(() => {
    const handler = (e: Event) => {
      const productId = (e as CustomEvent).detail?.productId;
      if (productId) {
        const found = products.find((p) => p.id === productId);
        if (found) {
          setSelectedProduct(found);
          setIsDialogOpen(true);
        }
      }
    };
    window.addEventListener('open-product', handler);
    return () => window.removeEventListener('open-product', handler);
  }, [products]);

  // Listen for global-search events from header
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent).detail?.query;
      if (typeof query === 'string') {
        setSearchInput(query);
        setSearchQuery(query);
        // Ensure filters are shown if there's a search query
        if (query) {
          setShowFilters(true);
        }
      }
    };
    window.addEventListener('global-search', handler);
    return () => window.removeEventListener('global-search', handler);
  }, []);

  // Fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(targetProducts, {
        keys: ['code', 'name', 'description'],
        threshold: 0.3,
        includeScore: true,
      }),
    [targetProducts]
  );

  const isFiltering = searchQuery || categoryFilter !== 'all' || brandFilter !== 'all' || stockFilter !== 'all' || webStatusFilter !== 'all' || priceFilter !== 'all' || imageFilter !== 'all' || recentsOnly;

  const filteredProducts = useMemo(() => {
    let result = searchQuery
      ? fuse.search(searchQuery).map((r) => r.item)
      : targetProducts;

    if (categoryFilter !== 'all') {
      result = result.filter((p) => p.category_id === categoryFilter);
    }

    if (brandFilter !== 'all') {
      result = result.filter((p) => p.brand_id === brandFilter);
    }

    if (stockFilter === 'zero_stock') {
      result = result.filter((p) => (p.stock ?? 0) <= 0);
    } else if (stockFilter === 'in_stock') {
      result = result.filter((p) => (p.stock ?? 0) > 0);
    }

    if (webStatusFilter === 'visible') {
      result = result.filter((p) => p.is_active !== false);
    } else if (webStatusFilter === 'hidden') {
      result = result.filter((p) => p.is_active === false);
    }

    if (priceFilter === 'zero_price') {
      result = result.filter((p) => (p.price_usd ?? 0) <= 0);
    } else if (priceFilter === 'with_price') {
      result = result.filter((p) => (p.price_usd ?? 0) > 0);
    }

    if (imageFilter === 'with_image') {
      result = result.filter((p) => !!p.image_url || (p.image_urls && p.image_urls.length > 0));
    } else if (imageFilter === 'without_image') {
      result = result.filter((p) => !p.image_url && (!p.image_urls || p.image_urls.length === 0));
    }

    if (recentsOnly) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      result = result.filter((p) => p.created_at && p.created_at >= oneDayAgo);
      result.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }

    return result;
  }, [products, searchQuery, categoryFilter, brandFilter, stockFilter, webStatusFilter, priceFilter, imageFilter, recentsOnly, fuse]);

  // Limit displayed products: show all when filtering/searching, otherwise show latest 100
  const displayProducts = useMemo(() => {
    if (isFiltering) return filteredProducts;
    // Sort by most recently updated/created first for the default view
    const sorted = [...filteredProducts].sort((a, b) => {
      const dateA = a.updated_at || a.created_at || '';
      const dateB = b.updated_at || b.created_at || '';
      return dateB.localeCompare(dateA);
    });
    return sorted.slice(0, displayLimit);
  }, [filteredProducts, displayLimit, isFiltering]);

  const hasMore = !isFiltering && displayLimit < filteredProducts.length;
  const remainingCount = filteredProducts.length - displayLimit;

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} producto${selectedIds.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.`);
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await bulkDelete.mutateAsync(Array.from(selectedIds));
      toast.success(`${selectedIds.size} producto${selectedIds.size > 1 ? 's' : ''} eliminado${selectedIds.size > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setLastSelectedId(null);
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, bulkDelete]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => {
          const currentRows = table.getRowModel().rows;
          const currentIds = currentRows.map(r => r.original.id);
          const allSelected = currentIds.length > 0 && currentIds.every(id => selectedIds.has(id));
          return (
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => {
                setSelectedIds(prev => {
                  const next = new Set(prev);
                  if (allSelected) {
                    currentIds.forEach(id => next.delete(id));
                    setLastSelectedId(null);
                  } else {
                    currentIds.forEach(id => next.add(id));
                    setLastSelectedId(currentIds.length > 0 ? currentIds[0] : null);
                  }
                  return next;
                });
              }}
              className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
            />
          );
        },
        size: 36,
        cell: ({ row, table }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => {}}
            onClick={(e) => {
              e.stopPropagation();
              const isMulti = e.ctrlKey || e.shiftKey || e.metaKey;
              const currentRows = table.getRowModel().rows;
              const currentIds = currentRows.map(r => r.original.id);
              
              setSelectedIds(prev => {
                const next = new Set(prev);
                if (isMulti && lastSelectedId) {
                  const lastIndex = currentIds.indexOf(lastSelectedId);
                  const currentIndex = currentRows.findIndex(r => r.original.id === row.original.id);
                  if (lastIndex !== -1 && currentIndex !== -1 && lastIndex !== currentIndex) {
                    const start = Math.min(lastIndex, currentIndex);
                    const end = Math.max(lastIndex, currentIndex);
                    for (let idx = start; idx <= end; idx++) {
                      next.add(currentIds[idx]);
                    }
                    setLastSelectedId(row.original.id);
                    return next;
                  }
                }

                if (next.has(row.original.id)) {
                  next.delete(row.original.id);
                } else {
                  next.add(row.original.id);
                }
                setLastSelectedId(row.original.id);
                return next;
              });
            }}
            className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
          />
        ),
      }),
      columnHelper.display({
        id: 'image',
        header: 'IMG',
        size: 70,
        cell: ({ row }) => {
          const hasImage = row.original.image_url || (row.original.image_urls && row.original.image_urls.length > 0);
          return (
            <div 
              className={`w-full aspect-square rounded bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 transition-colors ${hasImage ? 'cursor-pointer hover:border-emerald-500' : ''}`}
              onClick={(e) => {
                if (hasImage) {
                  e.stopPropagation();
                  setGalleryProduct(row.original);
                }
              }}
            >
              {row.original.image_url ? (
                <img src={row.original.image_url} alt={row.original.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-4 h-4 text-slate-400" />
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('code', {
        header: 'SKU',
        size: 80,
        cell: (info) => (
          <span 
            className="font-mono text-[11px] text-slate-500 leading-tight block cursor-copy hover:text-blue-600 hover:font-bold transition-all"
            title="Clic para copiar SKU"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(info.getValue());
              toast.success(`SKU copiado: ${info.getValue()}`);
            }}
          >
            {info.getValue().split('-').map((part, i) => (
              <span key={i}>
                {part}
                {i < info.getValue().split('-').length - 1 && <>{'-'}<br /></>}
              </span>
            ))}
          </span>
        ),
      }),
      columnHelper.accessor('name', {
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-slate-900 transition-colors" onClick={() => column.toggleSorting()}>
            DESCRIPCIÓN / APLICACIÓN
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        size: 280,
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-[13px] text-slate-900 leading-tight">{row.original.name}</p>
            {row.original.is_active === false ? (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                <EyeOff className="w-3 h-3" /> WEB: OCULTO
              </span>
            ) : null}
          </div>
        ),
      }),
      columnHelper.display({
        id: 'brand',
        header: 'MARCA',
        size: 80,
        cell: ({ row }) => {
          const brand = row.original.brands;
          if (!brand?.name) return <span className="text-slate-300">—</span>;
          return brand.logo_url ? (
            <img 
              src={brand.logo_url} 
              alt={brand.name} 
              className="h-5 object-contain max-w-[70px]" 
              title={brand.name}
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = 'none';
                el.parentElement!.innerHTML = `<span class="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">${brand.name}</span>`;
              }}
            />
          ) : (
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
              {brand.name}
            </span>
          );
        },
      }),
      columnHelper.accessor('stock', {
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-slate-900 transition-colors" onClick={() => column.toggleSorting()}>
            CANT
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        size: 65,
        cell: (info) => {
          const val = info.getValue() ?? 0;
          return (
            <span className={`text-[13px] font-bold ${val > 0 ? 'text-slate-900' : 'text-red-500 font-medium'}`}>
              {val}
            </span>
          );
        },
      }),
      columnHelper.accessor('cost', {
        header: 'COSTO',
        size: 75,
        cell: (info) => <span className="text-[13px] text-slate-500 font-medium">{formatUSD(info.getValue())}</span>,
      }),
      columnHelper.accessor('price_usd', {
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-slate-900 transition-colors" onClick={() => column.toggleSorting()}>
            PRECIO USD
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        size: 85,
        cell: (info) => <span className="text-[13px] font-bold text-slate-900">{formatUSD(info.getValue())}</span>,
      }),
      columnHelper.display({
        id: 'price_usd_bcv',
        header: () => (
          <span className="text-center block">
            PRECIO USD<br />(BCV)
          </span>
        ),
        size: 90,
        cell: ({ row }) => {
          const priceUsdBcv = row.original.price_usd * bcvMultiplier;
          return (
            <span className="text-[13px] text-slate-900 font-bold text-center block">
              {formatUSD(priceUsdBcv)}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'price_bs',
        header: () => (
          <span className="text-right block">
            PRECIO<br />BS
          </span>
        ),
        size: 100,
        cell: ({ row }) => {
          const priceBs = row.original.price_usd * bcvMultiplier * bcvRate;
          return (
            <div className="text-right">
              <span className="text-[10px] text-slate-900 font-bold">Bs</span><br/>
              <span className="text-[13px] font-bold text-slate-900">
                {priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'ACCIÓN',
        size: 80,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                row.original.is_active === false
                  ? 'text-amber-600 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                  : 'text-slate-400 bg-slate-100 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title={row.original.is_active === false ? 'Pausado de la página web. Clic para activar y mostrar en la web' : 'Visible en la página web. Clic para ocultar/desactivar en la web'}
              onClick={async (e) => {
                e.stopPropagation();
                const p = row.original;
                const newStatus = !(p.is_active !== false);
                try {
                  await updateProduct.mutateAsync({ id: p.id, is_active: newStatus });
                  toast.success(newStatus ? 'Repuesto activado y visible en la página web' : 'Repuesto oculto de la página web');
                } catch (err: any) {
                  toast.error('Error al cambiar estado web', { description: err.message });
                }
              }}
            >
              {row.original.is_active === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
              title="Ver Historial de Precios"
              onClick={(e) => {
                e.stopPropagation();
                setProductForHistory(row.original);
                setIsHistoryOpen(true);
              }}
            >
              <History className="w-4 h-4" />
            </button>
            <button
              className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700 transition-all active:scale-95"
              title="Añadir al Carrito"
              onClick={(e) => {
                e.stopPropagation();
                const p = row.original;
                addItem({
                  product_id: p.id,
                  product_name: p.name,
                  product_code: p.code,
                  quantity: 1,
                  unit_price_usd: p.price_usd,
                  image_url: p.image_url,
                  brand_name: p.brands?.name,
                  brand_logo_url: p.brands?.logo_url,
                  stock: p.stock,
                });
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ),
      }),
    ],
    [bcvRate, bcvMultiplier, addItem, selectedIds, lastSelectedId]
  );

  const table = useReactTable({
    data: displayProducts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Group categories by section
  const categoryGroups = useMemo(() => {
    const relevantCategories = isMiscellaneous
      ? categories.filter((c) => miscCategoryIds.includes(c.id))
      : categories;
    const groups: Record<string, typeof categories> = {};
    relevantCategories.forEach((c) => {
      const section = c.section || 'General';
      if (!groups[section]) groups[section] = [];
      groups[section].push(c);
    });
    return groups;
  }, [categories, isMiscellaneous, miscCategoryIds]);

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsDialogOpen(true);
  };

  const handleStartInlineEdit = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    setEditingPriceId(product.id);
    setEditCost(product.cost.toString());
    setEditPrice(product.price_usd.toString());
  };

  const handleSaveInlineEdit = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    const newCost = parseFloat(editCost);
    const newPrice = parseFloat(editPrice);
    
    if (isNaN(newCost) || isNaN(newPrice) || newCost < 0 || newPrice < 0) {
      toast.error('Por favor ingresa valores válidos.');
      return;
    }

    try {
      await updateProduct.mutateAsync({
        id: productId,
        cost: newCost,
        price_usd: newPrice
      });
      toast.success('Precios actualizados');
      setEditingPriceId(null);
    } catch (error: any) {
      toast.error('Error al actualizar precios', { description: error.message });
    }
  };

  const handleCancelInlineEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPriceId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando inventario...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm min-w-0 overflow-hidden">
      {/* Title Bar */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-[15px] md:text-[18px] font-bold text-slate-900">
            {isMiscellaneous
              ? (categoryFilter !== 'all'
                  ? categories.find((c) => c.id === categoryFilter)?.name || 'Misceláneos'
                  : 'Catálogo de Misceláneos (Aceites y Lubricantes)')
              : (categoryFilter !== 'all'
                  ? categories.find((c) => c.id === categoryFilter)?.name || 'Lista de Repuestos'
                  : 'Catálogo de Repuestos')}
          </h2>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px] font-bold uppercase tracking-widest border-none px-3 py-1 rounded-md hidden sm:block">
            {filteredProducts.length} ÍTEMS
          </Badge>
        </div>
        <Button onClick={handleAddProduct} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 h-[36px] text-[13px] px-3 md:px-4 rounded-md hidden md:flex">
          <Plus className="w-4 h-4" />
          Añadir Producto
        </Button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-red-50 border-b border-red-200 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-red-500" />
            <span className="text-[13px] font-bold text-red-700">
              {selectedIds.size} producto{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => {
                setSelectedIds(new Set());
                setLastSelectedId(null);
              }}
              className="text-[11px] text-red-500 hover:text-red-700 underline ml-1"
            >
              Deseleccionar
            </button>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="gap-1.5 h-8 text-[12px] bg-red-500 hover:bg-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Eliminando...' : `Eliminar ${selectedIds.size}`}
          </Button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 md:p-4 border-b border-slate-200 bg-white min-w-0">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0 md:max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
            <input
                placeholder="Buscar por SKU, Nombre... (Enter para buscar)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(searchInput);
                  }
                }}
                className="w-full pl-9 pr-3 h-[36px] rounded bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
            />
            </div>
            <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 h-[36px] px-3 rounded border text-[13px] font-medium transition-all shrink-0 ${
                showFilters
                ? 'bg-slate-100 border-slate-300 text-slate-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            </button>
            <button
              onClick={() => setRecentsOnly(!recentsOnly)}
              className={`hidden sm:flex items-center gap-1.5 h-[36px] px-3 rounded border text-[13px] font-medium transition-all shrink-0 ${
                recentsOnly
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Últimos Subidos
            </button>
        </div>
        <span className="text-[12px] md:text-[13px] text-slate-500 font-medium">
          {filteredProducts.length.toLocaleString()} resultados
        </span>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-slate-600 font-medium">Categoría:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-md bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            >
              <option value="all">Todas</option>
              {Object.entries(categoryGroups).map(([section, cats]) => (
                <optgroup key={section} label={section}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-slate-600 font-medium">Marca:</span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-md bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            >
              <option value="all">Todas</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-slate-600 font-medium">Existencia:</span>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-md bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            >
              <option value="all">Todas</option>
              <option value="in_stock">Con Stock (&gt; 0)</option>
              <option value="zero_stock">Existencia 0 (Sin Stock)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-slate-600 font-medium">Estado Web:</span>
            <select
              value={webStatusFilter}
              onChange={(e) => setWebStatusFilter(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-md bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            >
              <option value="all">Todos</option>
              <option value="visible">Visibles en Web</option>
              <option value="hidden">Ocultos en Web</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-slate-600 font-medium">Precio:</span>
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-md bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            >
              <option value="all">Todos</option>
              <option value="with_price">Con Precio ($ &gt; 0)</option>
              <option value="zero_price">Sin Precio ($0.00)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-slate-600 font-medium">Foto:</span>
            <select
              value={imageFilter}
              onChange={(e) => setImageFilter(e.target.value)}
              className="h-8 px-2 text-[12px] rounded-md bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            >
              <option value="all">Todas</option>
              <option value="with_image">Con Imagen</option>
              <option value="without_image">Sin Imagen</option>
            </select>
          </div>

          <button
            onClick={() => {
              setCategoryFilter('all');
              setBrandFilter('all');
              setStockFilter('all');
              setWebStatusFilter('all');
              setPriceFilter('all');
              setImageFilter('all');
              setSearchQuery('');
              setSearchInput('');
              setRecentsOnly(false);
            }}
            className="text-[12px] text-slate-500 hover:text-slate-900 transition-colors ml-auto font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* Table for Desktop */}
      <div className="flex-1 overflow-auto min-w-0">
        <table className="w-full text-sm hidden md:table min-w-[880px]">
          <thead className="bg-slate-50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 align-bottom"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white">
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => handleEditProduct(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col gap-2.5 p-3 bg-slate-50/50">
          {displayProducts.map((p) => {
            const hasImage = p.image_url || (p.image_urls && p.image_urls.length > 0);
            const isEditing = editingPriceId === p.id;
            const priceBs = p.price_usd * bcvMultiplier * bcvRate;

            return (
              <div 
                key={p.id} 
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Top: Image + Name + Brand */}
                <div 
                  className="flex gap-3 p-3 pb-2"
                  onClick={() => !isEditing && handleEditProduct(p)}
                >
                  <div 
                    className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0"
                    onClick={(e) => {
                      if (hasImage && !isEditing) {
                        e.stopPropagation();
                        setGalleryProduct(p);
                      }
                    }}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="font-semibold text-[13px] text-slate-900 leading-tight line-clamp-2">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 overflow-hidden">
                      <span 
                        className="font-mono text-[10px] text-slate-500 truncate"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(p.code);
                          toast.success('SKU copiado');
                        }}
                      >
                        {p.code}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        (p.stock ?? 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        Stock: {p.stock ?? 0}
                      </span>
                      {p.brands?.logo_url ? (
                        <img src={p.brands.logo_url} alt={p.brands.name} className="h-3.5 max-w-[40px] object-contain shrink-0" />
                      ) : p.brands?.name ? (
                        <span className="text-[8px] font-bold text-slate-400 uppercase shrink-0 truncate max-w-[60px]">
                          {p.brands.name}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Prices Section */}
                <div className="mx-3 mb-3 bg-slate-50 rounded-lg p-2.5">
                  {isEditing ? (
                    <div className="flex flex-col gap-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Costo ($)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={editCost} 
                            onChange={(e) => setEditCost(e.target.value)}
                            className="w-full h-9 mt-1 px-2.5 rounded-md border border-slate-300 text-[14px] font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Precio USD</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={editPrice} 
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-full h-9 mt-1 px-2.5 rounded-md border border-emerald-300 bg-emerald-50 text-[14px] font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-emerald-900"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleCancelInlineEdit}
                          className="h-8 px-3 text-[12px]"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={(e) => handleSaveInlineEdit(e, p.id)}
                          className="h-8 px-3 text-[12px] bg-emerald-600 hover:bg-emerald-700 text-white"
                          disabled={updateProduct.isPending}
                        >
                          <Save className="w-3.5 h-3.5 mr-1" /> 
                          {updateProduct.isPending ? 'Guardando...' : 'Guardar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0">
                      <div className="flex-1 flex items-center gap-0">
                        <div className="flex-1 text-center">
                          <p className="text-[9px] font-medium text-slate-400 uppercase">Costo</p>
                          <p className="text-[13px] text-slate-600 font-semibold">{formatUSD(p.cost)}</p>
                        </div>
                        <div className="w-px h-7 bg-slate-200"></div>
                        <div className="flex-1 text-center">
                          <p className="text-[9px] font-bold text-emerald-600 uppercase">Precio</p>
                          <p className="text-[15px] font-black text-slate-900">{formatUSD(p.price_usd)}</p>
                        </div>
                        <div className="w-px h-7 bg-slate-200"></div>
                        <div className="flex-1 text-center">
                          <p className="text-[9px] font-medium text-slate-400 uppercase">Bs</p>
                          <p className="text-[12px] font-bold text-slate-700">{priceBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 pl-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductForHistory(p);
                            setIsHistoryOpen(true);
                          }}
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                          title="Historial de precios"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleStartInlineEdit(e, p)}
                          className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Editar precio"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load more button */}
        {hasMore && (
          <div className="flex items-center justify-center py-4 bg-white border-t border-slate-100">
            <button
              onClick={() => setDisplayLimit((prev) => prev + 100)}
              className="px-5 py-2 text-[13px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              Cargar {Math.min(remainingCount, 100)} más de {remainingCount} restantes
            </button>
          </div>
        )}

        {displayProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white">
            <Search className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm text-slate-600">No se encontraron productos</p>
            <p className="text-[12px]">Intenta con otro término de búsqueda</p>
          </div>
        )}
      </div>

      {/* Product Edit Dialog */}
      <ProductFormDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        product={selectedProduct}
        defaultCategoryId={isMiscellaneous ? (miscCategoryIds[0] || 'd5ee462b-e3a2-4f6c-94f1-529ac9686fa6') : undefined}
      />

      <ProductHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        product={productForHistory}
      />

      <ImageGalleryDialog
        open={!!galleryProduct}
        onOpenChange={(open) => !open && setGalleryProduct(null)}
        product={galleryProduct}
      />
    </div>
  );
}
