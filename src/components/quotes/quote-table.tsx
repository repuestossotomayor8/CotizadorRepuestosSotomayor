import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { Quote } from '@/types';
import { useQuotes, useDeleteQuote } from '@/hooks/use-supabase';
import { Badge } from '@/components/ui/badge';
import { formatUSD } from '@/lib/utils';
import { Search, ArrowUpDown, Eye, Trash2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { QuoteDetailsDialog } from './quote-details-dialog';

const columnHelper = createColumnHelper<Quote>();

export function QuoteTable() {
  const { data: quotes = [], isLoading } = useQuotes();
  const deleteQuote = useDeleteQuote();

  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'created_at', desc: true }]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        q.client_name?.toLowerCase().includes(search) ||
        q.client_phone?.toLowerCase().includes(search)
      );
    });
  }, [quotes, searchQuery]);

  const handleDelete = async (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de que quieres eliminar la cotización de "${quote.client_name}"?`)) {
      try {
        await deleteQuote.mutateAsync(quote.id);
        toast.success('Cotización eliminada exitosamente');
      } catch (error: any) {
        toast.error('Error al eliminar', { description: error.message });
      }
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('created_at', {
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-slate-900 transition-colors" onClick={() => column.toggleSorting()}>
            FECHA
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        size: 150,
        cell: (info) => {
          const date = new Date(info.getValue() || '');
          return (
            <div className="flex items-center gap-2 text-[13px] text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              {date.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          );
        },
      }),
      columnHelper.accessor('client_name', {
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-slate-900 transition-colors" onClick={() => column.toggleSorting()}>
            CLIENTE
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        size: 250,
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-[13px] text-slate-900 leading-tight">
              {row.original.client_name || 'Sin nombre'}
            </p>
            {row.original.client_phone && (
              <p className="text-[11px] text-slate-500 mt-0.5">{row.original.client_phone}</p>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('total_usd', {
        header: ({ column }) => (
          <button className="flex items-center gap-1 hover:text-slate-900 transition-colors" onClick={() => column.toggleSorting()}>
            TOTAL (USD)
            <ArrowUpDown className="w-3 h-3" />
          </button>
        ),
        size: 150,
        cell: (info) => <span className="text-[13px] font-bold text-slate-900">{formatUSD(info.getValue())}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'ESTADO',
        size: 150,
        cell: (info) => {
          const status = info.getValue()?.toLowerCase() || 'cotizada';
          return (
            <Badge 
              variant="secondary" 
              className={`
                text-[10px] font-bold uppercase tracking-widest border-none px-2 py-1 rounded
                ${status === 'cotizada' ? 'bg-blue-100 text-blue-700' : ''}
                ${status === 'enviada por whatsapp' ? 'bg-[#25D366]/10 text-[#128C7E]' : ''}
                ${status === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : ''}
                ${status === 'rechazada' ? 'bg-red-100 text-red-700' : ''}
                ${status === 'anulada' ? 'bg-slate-200 text-slate-700' : ''}
              `}
            >
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'ACCIONES',
        size: 100,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedQuote(row.original);
              }}
              title="Ver detalles"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => handleDelete(e, row.original)}
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredQuotes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando cotizaciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm min-w-0 overflow-hidden">
      {/* Title Bar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <h2 className="text-[18px] font-bold text-slate-900">Historial de Cotizaciones</h2>
          <Badge variant="secondary" className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-widest border-none px-3 py-1 rounded-md">
            {filteredQuotes.length} REGISTROS
          </Badge>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center p-4 border-b border-slate-200 bg-white">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Buscar por cliente o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-[36px] rounded bg-white border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-w-0">
        <table className="w-full text-sm min-w-[700px]">
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
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedQuote(row.original)}
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

        {filteredQuotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white">
            <Search className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm text-slate-600">No se encontraron cotizaciones</p>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <QuoteDetailsDialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)} quote={selectedQuote} />
    </div>
  );
}
