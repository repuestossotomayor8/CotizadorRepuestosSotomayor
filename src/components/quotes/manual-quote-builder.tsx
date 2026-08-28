'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Save, 
  Send, 
  RefreshCw, 
  DollarSign, 
  User, 
  Phone, 
  FileEdit, 
  FileSpreadsheet, 
  CheckCircle2, 
  Layers, 
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Building2,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBcvRate, useBcvMultiplier, useBrands, useCreateQuote } from '@/hooks/use-supabase';
import { generateQuotePDF } from '@/lib/generate-quote-pdf';
import { formatUSD } from '@/lib/utils';
import { toast } from 'sonner';
import { Quote } from '@/types';

interface ManualItem {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  price_usd: number;
}

export function ManualQuoteBuilder() {
  const { data: bcvRate = 36.5 } = useBcvRate();
  const { data: bcvMultiplier = 1.4 } = useBcvMultiplier();
  const { data: brands = [] } = useBrands();
  const createQuote = useCreateQuote();

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState<'both' | 'usd' | 'bcv'>('both');
  
  // Custom items list
  const [items, setItems] = useState<ManualItem[]>([
    { id: '1', name: '', brand: '', quantity: 1, price_usd: 0 },
    { id: '2', name: '', brand: '', quantity: 1, price_usd: 0 },
  ]);

  // Live PDF preview states
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const previousUrlRef = useRef<string | null>(null);

  // Computed Totals
  const subtotalUsd = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price_usd) || 0), 0);
  }, [items]);

  const totalUsdBcv = useMemo(() => {
    return subtotalUsd * (currency === 'usd' ? 1 : bcvMultiplier);
  }, [subtotalUsd, currency, bcvMultiplier]);

  const totalBs = useMemo(() => {
    return totalUsdBcv * bcvRate;
  }, [totalUsdBcv, bcvRate]);

  // Handle Items
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '',
        brand: '',
        quantity: 1,
        price_usd: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setItems([{ id: '1', name: '', brand: '', quantity: 1, price_usd: 0 }]);
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof ManualItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleClear = () => {
    setClientName('');
    setClientPhone('');
    setNotes('');
    setItems([
      { id: '1', name: '', brand: '', quantity: 1, price_usd: 0 },
      { id: '2', name: '', brand: '', quantity: 1, price_usd: 0 },
    ]);
    toast.info('Formulario reiniciado');
  };

  // Construct quote object for generator
  const currentQuoteObj: Quote = useMemo(() => {
    const validItems = items
      .filter((it) => it.name.trim() !== '' || it.price_usd > 0)
      .map((it, idx) => {
        const foundBrand = brands.find(
          (b) => b.name.toLowerCase() === it.brand.trim().toLowerCase()
        );
        return {
          id: it.id,
          product_id: null,
          product_name: it.name || `Repuesto #${idx + 1}`,
          product_code: `MAN-${idx + 1}`,
          quantity: Number(it.quantity) || 1,
          unit_price_usd: Number(it.price_usd) || 0,
          brand_name: it.brand || '',
          brand_logo_url: foundBrand?.logo_url || '',
        };
      });

    return {
      id: 'MAN-' + Date.now().toString(36).toUpperCase().slice(-6),
      client_name: clientName.trim() || 'Cliente General',
      client_phone: clientPhone.trim() || '',
      total_usd: subtotalUsd,
      bcv_rate: bcvRate,
      status: 'borrador',
      notes: notes.trim(),
      created_at: new Date().toISOString(),
      quote_items: validItems.length > 0 ? validItems : [
        {
          id: 'preview',
          product_name: 'Ejemplo: Repuesto Proveedor',
          product_code: 'MAN-01',
          quantity: 1,
          unit_price_usd: 0,
          brand_name: 'Original',
        }
      ],
    };
  }, [clientName, clientPhone, notes, items, subtotalUsd, bcvRate, brands]);

  // Generate live PDF with debounce
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setIsGeneratingPdf(true);
      try {
        const res = await generateQuotePDF({
          quote: currentQuoteObj,
          currency,
          bcvMultiplier,
          bcvRate,
          returnBlob: true,
        });

        if (!isCancelled && res.blob) {
          const newUrl = URL.createObjectURL(res.blob);
          if (previousUrlRef.current) {
            URL.revokeObjectURL(previousUrlRef.current);
          }
          previousUrlRef.current = newUrl;
          setPdfBlobUrl(newUrl);
        }
      } catch (err) {
        console.error('Error generating preview PDF:', err);
      } finally {
        if (!isCancelled) {
          setIsGeneratingPdf(false);
        }
      }
    }, 450);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [currentQuoteObj, currency, bcvMultiplier, bcvRate]);

  // Download PDF
  const handleDownloadPDF = async () => {
    const validItems = items.filter((it) => it.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Agrega al menos un repuesto con descripción antes de exportar el PDF');
      return;
    }

    try {
      toast.loading('Generando PDF...');
      await generateQuotePDF({
        quote: currentQuoteObj,
        currency,
        bcvMultiplier,
        bcvRate,
      });
      toast.dismiss();
      toast.success('PDF descargado correctamente');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Error al generar PDF', { description: err.message });
    }
  };

  // Save to Database
  const handleSaveToDatabase = async () => {
    const validItems = items.filter((it) => it.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Agrega al menos un repuesto para guardar la cotización');
      return;
    }

    setIsSaving(true);
    try {
      const quotePayload = {
        client_name: clientName.trim() || 'Cliente General',
        client_phone: clientPhone.trim() || '',
        total_usd: subtotalUsd,
        bcv_rate: bcvRate,
        status: 'enviada',
      };

      const quoteItemsPayload = validItems.map((it, idx) => {
        const foundBrand = brands.find(
          (b) => b.name.toLowerCase() === it.brand.trim().toLowerCase()
        );
        return {
          product_id: null,
          product_name: it.name,
          product_code: `MAN-${idx + 1}`,
          quantity: Number(it.quantity) || 1,
          unit_price_usd: Number(it.price_usd) || 0,
          brand_name: it.brand || '',
          brand_logo_url: foundBrand?.logo_url || '',
        };
      });

      await createQuote.mutateAsync({
        quote: quotePayload,
        items: quoteItemsPayload as any,
      });

      toast.success('¡Cotización manual guardada exitosamente en el sistema!');
    } catch (err: any) {
      toast.error('Error al guardar cotización', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Send WhatsApp message
  const handleSendWhatsApp = () => {
    const validItems = items.filter((it) => it.name.trim() !== '');
    if (validItems.length === 0) {
      toast.error('Agrega repuestos antes de enviar');
      return;
    }

    const cleanPhone = clientPhone.replace(/\D/g, '');
    let text = `*COTIZACIÓN DE REPUESTOS - SOTOMAYOR*\n`;
    if (clientName) text += `👤 *Cliente:* ${clientName}\n`;
    text += `📅 *Fecha:* ${new Date().toLocaleDateString('es-VE')}\n\n`;
    text += `*DETALLE DE REPUESTOS:*\n`;

    validItems.forEach((it, i) => {
      const itemTotalUsd = (it.quantity || 1) * (it.price_usd || 0);
      const itemTotalBs = itemTotalUsd * bcvMultiplier * bcvRate;
      text += `${i + 1}. *${it.name.toUpperCase()}* ${it.brand ? `(${it.brand.toUpperCase()})` : ''}\n`;
      text += `   Cant: ${it.quantity} x ${formatUSD(it.price_usd)} = *${formatUSD(itemTotalUsd)}* (~Bs ${itemTotalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`;
    });

    text += `\n💵 *TOTAL USD (Divisas):* ${formatUSD(subtotalUsd)}`;
    text += `\n💳 *TOTAL USD (Tasa BCV):* ${formatUSD(totalUsdBcv)}`;
    text += `\n🇻🇪 *TOTAL BOLÍVARES:* Bs ${totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    text += `\n\n📌 *Tasa BCV:* Bs ${bcvRate.toFixed(2)}`;

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 min-w-0">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white border-b border-slate-200 shadow-sm rounded-t-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                Cotización Manual
              </h1>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                PROVEEDORES / EXTERNO
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Crea cotizaciones personalizadas de repuestos fuera del catálogo con visor PDF en vivo
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="h-9 px-3 text-slate-600 hover:text-slate-900 border-slate-200"
          >
            <RotateCcw className="w-4 h-4 mr-1.5" />
            Limpiar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSendWhatsApp}
            className="h-9 px-3.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 font-medium"
          >
            <Send className="w-4 h-4 mr-1.5" />
            WhatsApp
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPDF}
            className="h-9 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Descargar PDF
          </Button>

          <Button
            size="sm"
            onClick={handleSaveToDatabase}
            disabled={isSaving}
            className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            <Save className="w-4 h-4 mr-1.5" />
            {isSaving ? 'Guardando...' : 'Guardar Cotización'}
          </Button>
        </div>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-5 p-4 md:p-5 overflow-auto min-w-0">
        
        {/* Left Column: Form & Repuestos Builder (7 cols on XL) */}
        <div className="xl:col-span-7 flex flex-col gap-4 min-w-0">
          
          {/* Client & Metadata Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Datos del Cliente y Configuración
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Cliente
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej. Juan Pérez / Taller Hermanos"
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Ej. 04141234567"
                    className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    Notas Internas / Observaciones del Vendedor
                  </label>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <EyeOff className="w-3 h-3 text-amber-600" />
                    Solo visible para ti (No sale en el PDF ni al cliente)
                  </span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Proveedor: El Trébol Caracas (0412-1234567) | Costo: $18 c/u | Margen estimado: 35% | Entrega en 48 horas..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium resize-none"
                />
              </div>
            </div>

            {/* Rates & Currency Selection */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Formato Moneda PDF:</span>
                <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCurrency('both')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      currency === 'both'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Combinado ($ y Bs)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('usd')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      currency === 'usd'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Solo USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('bcv')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                      currency === 'bcv'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Solo BCV (Bs)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Tasa BCV:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Bs {bcvRate.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Items Builder Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Repuestos a Cotizar
                </h2>
                <span className="text-xs text-slate-400">
                  {items.length} {items.length === 1 ? 'ítem ingresado' : 'ítems ingresados'}
                </span>
              </div>

              <Button
                onClick={handleAddItem}
                size="sm"
                className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 rounded-lg shadow-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Añadir Repuesto
              </Button>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3 w-16 text-center">Cant.</th>
                    <th className="py-2.5 px-3">Descripción del Repuesto</th>
                    <th className="py-2.5 px-3 w-36">Marca</th>
                    <th className="py-2.5 px-3 w-28 text-right">Precio ($)</th>
                    <th className="py-2.5 px-3 w-28 text-right">Total ($)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, index) => {
                    const rowTotal = (Number(item.quantity) || 0) * (Number(item.price_usd) || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                        {/* Index */}
                        <td className="py-2.5 px-3 text-center text-slate-400 font-bold text-[11px]">
                          {index + 1}
                        </td>

                        {/* Quantity */}
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full h-8 text-center text-xs font-bold border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50"
                          />
                        </td>

                        {/* Description */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                            placeholder="Ej. Correa de Tiempo / Amortiguador Delantero"
                            className="w-full h-8 px-2.5 text-xs font-medium text-slate-900 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 placeholder:text-slate-400"
                          />
                        </td>

                        {/* Brand */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            list="brands-list"
                            value={item.brand}
                            onChange={(e) => handleUpdateItem(item.id, 'brand', e.target.value)}
                            placeholder="Marca (opcional)"
                            className="w-full h-8 px-2.5 text-xs font-medium text-slate-800 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 placeholder:text-slate-400"
                          />
                        </td>

                        {/* Unit Price USD */}
                        <td className="py-2 px-2">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.price_usd === 0 ? '' : item.price_usd}
                              onChange={(e) => handleUpdateItem(item.id, 'price_usd', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full h-8 pl-6 pr-2 text-right text-xs font-bold text-slate-900 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50"
                            />
                          </div>
                        </td>

                        {/* Total USD */}
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 text-xs">
                          {formatUSD(rowTotal)}
                        </td>

                        {/* Remove button */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Datalist for Brand autocomplete */}
            <datalist id="brands-list">
              {brands.map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>

            {/* Add row bottom quick button */}
            <div className="mt-3">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 border-2 border-dashed border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 rounded-lg text-slate-500 hover:text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Añadir otra línea de repuesto
              </button>
            </div>

            {/* Totals Summary Banner */}
            <div className="mt-5 p-4 bg-slate-900 text-white rounded-xl shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="text-center sm:text-left border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 sm:pr-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Subtotal Divisas ($)
                  </span>
                  <span className="text-xl font-extrabold text-white">
                    {formatUSD(subtotalUsd)}
                  </span>
                </div>

                <div className="text-center sm:text-left border-b sm:border-b-0 sm:border-r border-slate-800 pb-2 sm:pb-0 sm:pr-3">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                    Total USD (BCV × {bcvMultiplier})
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {formatUSD(totalUsdBcv)}
                  </span>
                </div>

                <div className="text-center sm:text-left">
                  <span className="text-[10px] uppercase font-bold text-sky-400 block tracking-wider">
                    Total en Bolívares
                  </span>
                  <span className="text-xl font-extrabold text-sky-400">
                    Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Live PDF Preview (5 cols on XL) */}
        <div className="xl:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] min-w-0">
          
          {/* Preview Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold tracking-wide uppercase">
                Vista Previa del PDF en Vivo
              </span>
            </div>

            {isGeneratingPdf ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60 animate-pulse font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Actualizando...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Al día
              </span>
            )}
          </div>

          {/* PDF Frame Viewer */}
          <div className="flex-1 bg-slate-800 relative flex items-center justify-center p-2 min-h-[500px]">
            {pdfBlobUrl ? (
              <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                title="Vista previa de Cotización"
                className="w-full h-full min-h-[600px] rounded border border-slate-700 bg-white shadow-inner"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 opacity-60" />
                <p className="text-xs font-semibold text-slate-300">
                  Generando documento...
                </p>
                <p className="text-[11px] text-slate-500 max-w-[220px]">
                  Escribe los datos del cliente y los repuestos a la izquierda para visualizar el PDF
                </p>
              </div>
            )}
          </div>

          {/* Quick Footer within Preview */}
          <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span className="text-[11px]">
              Formato institucional oficial A4
            </span>
            <button
              onClick={handleDownloadPDF}
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar este PDF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
