'use client';

import { useCartStore } from '@/store/cart-store';
import { useBcvRate, useCreateQuote, useBcvMultiplier, useProducts } from '@/hooks/use-supabase';
import { formatUSD, formatBs } from '@/lib/utils';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  FileText,
  MessageCircle,
  CheckCircle,
  X,
  Save,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { QuoteSaveDialog } from './quote-save-dialog';
import { Input } from '@/components/ui/input';
import { User, Phone } from 'lucide-react';
import { generateQuotePDF } from '@/lib/generate-quote-pdf';
import { copyQuoteToClipboard } from '@/lib/capture-quote';
import { Quote } from '@/types';

export function QuoteCart() {
  const {
    items,
    clientName,
    clientPhone,
    paymentMethod,
    setClientName,
    setClientPhone,
    setPaymentMethod,
    updateQuantity,
    updatePrice,
    removeItem,
    clearCart,
    getSubtotal,
  } = useCartStore();
  const { data: bcvRate = 36.5 } = useBcvRate();
  const { data: bcvMultiplier = 1.4 } = useBcvMultiplier();
  
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const { data: products = [] } = useProducts();
  const createQuote = useCreateQuote();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const subtotal = getSubtotal(bcvMultiplier);
  const total = subtotal;
  const totalBs = paymentMethod === 'bs' ? total * bcvRate : 0;

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  const handleOpenSaveDialog = () => {
    if (items.length === 0) {
      toast.error('Agrega productos a la cotización');
      return;
    }
    setIsSaveDialogOpen(true);
  };

  // Build a temporary Quote object from cart state for PDF layout
  const buildTempQuote = (): Quote => ({
    id: `TEMP-${Date.now().toString(36).toUpperCase()}`,
    client_name: clientName || 'Cliente Mostrador',
    client_phone: clientPhone || '',
    total_usd: subtotal,
    bcv_rate: bcvRate,
    status: 'Cotizada',
    created_at: new Date().toISOString(),
    quote_items: items.map((item, i) => ({
      id: `item-${i}`,
      quote_id: '',
      product_id: item.product_id,
      product_name: item.product_name,
      product_code: item.product_code,
      quantity: item.quantity,
      unit_price_usd: item.unit_price_usd,
      brand_name: item.brand_name,
      brand_logo_url: item.brand_logo_url,
    })),
  });

  const handleExportPdf = async (customCurrency?: 'usd' | 'bcv' | 'both') => {
    if (items.length === 0) {
      toast.error('Agrega productos a la cotización');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const tempQuote = buildTempQuote();
      const currency = customCurrency || (paymentMethod === 'bs' ? 'bcv' : 'usd');
      
      const WHATSAPP_PHRASES = [
        "La pasión por servirte es el motor que nunca se apaga.",
        "Tu confianza es el combustible; nuestra vocación, el motor.",
        "Encendemos cada jornada con la meta de darte el mejor rendimiento.",
        "Más que piezas de recambio, entregamos la potencia de un servicio comprometido.",
        "Aceleramos soluciones para que tus proyectos nunca se detengan.",
        "Alineamos cada detalle de nuestra atención a la altura de tu camino.",
        "La tracción que necesitas para avanzar con total seguridad.",
        "Calidad en cada repuesto, dirección firme en cada asesoría.",
        "Sincronizamos nuestra dedicación para mantener tu marcha perfecta.",
        "Atención precisa y repuestos firmes: el engranaje de tu tranquilidad.",
        "Tu satisfacción es la fuerza que mueve cada uno de nuestros engranajes.",
        "Ajustamos cada solución con la precisión que tu trabajo merece."
      ];
      const randomPhrase = WHATSAPP_PHRASES[Math.floor(Math.random() * WHATSAPP_PHRASES.length)];

      try {
        await copyQuoteToClipboard(tempQuote, bcvMultiplier, bcvRate, randomPhrase, currency);
      } catch (err) {
        console.error('Failed to copy image to clipboard', err);
      }

      await generateQuotePDF({ quote: tempQuote, currency, bcvMultiplier, randomPhrase, bcvRate });
      toast.success(`📄 PDF y Captura en ${currency === 'both' ? 'ambos precios' : currency === 'bcv' ? 'Bolívares (Bs)' : 'Divisas (USD)'} generados exitosamente`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsApp = async () => {
    if (items.length === 0) {
      toast.error('Agrega productos a la cotización');
      return;
    }

    let phone = clientPhone?.replace(/[^0-9]/g, '') || '';
    if (phone.length === 11 && phone.startsWith('0')) {
      phone = '58' + phone.substring(1);
    }
    if (!phone) {
      toast.error('Ingresa el número de teléfono del cliente');
      return;
    }

    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente para poder registrar la cotización');
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const tempQuote = buildTempQuote();
      
      const WHATSAPP_PHRASES = [
        "La pasión por servirte es el motor que nunca se apaga.",
        "Tu confianza es el combustible; nuestra vocación, el motor.",
        "Encendemos cada jornada con la meta de darte el mejor rendimiento.",
        "Más que piezas de recambio, entregamos la potencia de un servicio comprometido.",
        "Aceleramos soluciones para que tus proyectos nunca se detengan.",
        "Alineamos cada detalle de nuestra atención a la altura de tu camino.",
        "La tracción que necesitas para avanzar con total seguridad.",
        "Calidad en cada repuesto, dirección firme en cada asesoría.",
        "Sincronizamos nuestra dedicación para mantener tu marcha perfecta.",
        "Atención precisa y repuestos firmes: el engranaje de tu tranquilidad.",
        "Tu satisfacción es la fuerza que mueve cada uno de nuestros engranajes.",
        "Ajustamos cada solución con la precisión que tu trabajo merece."
      ];
      const randomPhrase = WHATSAPP_PHRASES[Math.floor(Math.random() * WHATSAPP_PHRASES.length)];

      const { blob, fileName } = await generateQuotePDF({ quote: tempQuote, currency: 'both', bcvMultiplier, returnBlob: true, randomPhrase, bcvRate });

      // Copiar imagen al portapapeles PRIMERO (requiere foco)
      try {
        await copyQuoteToClipboard(tempQuote, bcvMultiplier, bcvRate, randomPhrase);
        toast.success('Imagen copiada. Presiona "Pegar" (Ctrl+V) en el chat de WhatsApp.', { duration: 5000 });
      } catch (err) {
        console.error('Failed to copy image to clipboard', err);
      }

      // Download the PDF DESPUÉS
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Build WhatsApp message
      let msg = `*REPUESTOS SOTOMAYOR*\n_Cotización en *DIVISAS Y BOLÍVARES*_\n\n`;
      if (clientName) msg += `*Cliente:* ${clientName}\n`;
      msg += `*Fecha:* ${new Date().toLocaleDateString('es-VE')}\n\n`;
      msg += `*Detalle:*\n`;
      items.forEach((item) => {
        const priceUSD = item.unit_price_usd;
        const priceBs = item.unit_price_usd * bcvMultiplier * bcvRate;
        const brandSuffix = item.brand_name ? ` (${item.brand_name})` : '';
        msg += `- ${item.quantity}x ${item.product_name}${brandSuffix}\n  USD: ${formatUSD(priceUSD)} | Bs: ${formatBs(priceBs)}\n`;
      });
      
      const calcTotalBs = total * bcvMultiplier * bcvRate;
      msg += `\n*Total USD:* ${formatUSD(total)}\n`;
      msg += `*Total Bs:* ${formatBs(calcTotalBs)}\n`;
      msg += `\n_${randomPhrase}_`;

      const encoded = encodeURIComponent(msg);
      // Open WhatsApp directly with the client's phone number
      window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
      // Save the quote to the database to register it in history
      await createQuote.mutateAsync({
        quote: {
          client_name: clientName,
          client_phone: clientPhone,
          total_usd: total,
          bcv_rate: bcvRate,
          status: 'Enviada por WhatsApp',
        },
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          quantity: item.quantity,
          unit_price_usd: item.unit_price_usd,
          brand_name: item.brand_name,
          brand_logo_url: item.brand_logo_url,
        })),
      });

      // No limpiamos el carrito para que el usuario pueda seguir interactuando
      toast.success('PDF descargado y cotización registrada. Adjunta el archivo en el chat de WhatsApp.');
    } catch (err: any) {
      console.error('Error in handleWhatsApp:', err);
      if (err?.name !== 'AbortError') {
        toast.error('Error al enviar por WhatsApp y registrar');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex flex-col px-5 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-800" />
            <h3 className="font-bold text-[14px] text-slate-900">Cotización Actual</h3>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
        
        {/* Payment Method Switch */}
        <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
          <button
            onClick={() => setPaymentMethod('divisas')}
            className={cn(
              "flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all truncate px-1",
              paymentMethod === 'divisas' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Pago en Divisas
          </button>
          <button
            onClick={() => setPaymentMethod('bs')}
            className={cn(
              "flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all truncate px-1",
              paymentMethod === 'bs' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Pago en Bs
          </button>
        </div>

        {/* Client Info Inputs */}
        <div className="mt-4 space-y-2">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Nombre del Cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="pl-8 h-8 text-[12px] bg-white border-slate-200 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Teléfono (Opcional)"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              className="pl-8 h-8 text-[12px] bg-white border-slate-200 focus-visible:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-[13px] text-slate-600">Sin productos</p>
            <p className="text-[11px]">Usa el botón + en la tabla</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {items.map((item) => {
              const dbProduct = products.find((p) => p.id === item.product_id);
              const activeStock = dbProduct ? (dbProduct.stock ?? 0) : (item.stock ?? 0);
              const itemPrice = paymentMethod === 'bs' ? item.unit_price_usd * bcvMultiplier : item.unit_price_usd;
              const itemBs = itemPrice * bcvRate;
              return (
                <div key={item.product_id} className="p-3 bg-white border border-slate-200 shadow-sm">
                  {/* Top row: name + price */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-[12px] font-bold text-slate-900 leading-tight">
                        {item.product_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.product_code) {
                              navigator.clipboard.writeText(item.product_code);
                              toast.success(`Código copiado: ${item.product_code}`);
                            }
                          }}
                          className="text-[10px] font-mono text-slate-500 uppercase tracking-wide hover:text-emerald-600 cursor-pointer transition-colors"
                          title="Clic para copiar código"
                        >
                          {item.product_code || '—'}
                        </button>
                        {item.brand_logo_url ? (
                          <img 
                            src={item.brand_logo_url} 
                            alt={item.brand_name || 'Marca'} 
                            className="h-4 max-w-[60px] object-contain opacity-90"
                            title={item.brand_name}
                          />
                        ) : item.brand_name ? (
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 rounded uppercase tracking-wider">
                            {item.brand_name}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          activeStock === 0 
                            ? "bg-red-50 text-red-600" 
                            : item.quantity > activeStock
                            ? "bg-amber-50 text-amber-700 font-bold"
                            : "bg-slate-100 text-slate-600"
                        )}>
                          Disp: {activeStock}
                        </span>
                        {item.quantity > activeStock && activeStock > 0 && (
                          <span className="text-[9px] text-amber-600 font-medium ml-1.5">Excede stock</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {editingPriceId === item.product_id ? (
                        <input
                          type="number"
                          autoFocus
                          value={editPriceValue}
                          onChange={(e) => setEditPriceValue(e.target.value)}
                          onBlur={() => {
                            const val = parseFloat(editPriceValue);
                            if (!isNaN(val) && val >= 0) {
                              const basePrice = paymentMethod === 'bs' ? val / bcvMultiplier : val;
                              updatePrice(item.product_id, basePrice);
                            }
                            setEditingPriceId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                            if (e.key === 'Escape') {
                              setEditingPriceId(null);
                            }
                          }}
                          className="w-16 h-6 text-[12px] font-bold text-right border border-emerald-500 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      ) : (
                        <p 
                          className="text-[13px] font-bold text-slate-900 cursor-pointer hover:text-emerald-600 transition-colors"
                          title="Clic para editar precio"
                          onClick={() => {
                            setEditPriceValue(itemPrice.toFixed(2));
                            setEditingPriceId(item.product_id);
                          }}
                        >
                          {formatUSD(itemPrice)}
                        </p>
                      )}
                      {paymentMethod === 'bs' && (
                        <p className="text-[10px] text-slate-500">
                          Bs {(itemBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom row: quantity + total */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="w-7 h-7 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-[12px] font-bold text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="w-7 h-7 rounded border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-[12px] font-bold text-slate-900">
                      Total: {formatUSD(itemPrice * item.quantity)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div className="border-t border-slate-200 p-5 bg-[#f8fafc]">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-[12px] font-medium">
              <span className="text-slate-600">Subtotal</span>
              <span className="text-slate-900">{formatUSD(subtotal)}</span>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 mb-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[15px] font-bold text-slate-900">Total USD</span>
              <span className="text-[20px] font-bold text-slate-900">{formatUSD(total)}</span>
            </div>
            {paymentMethod === 'bs' && (
              <div className="flex justify-between mt-1">
                <span className="text-[11px] text-slate-500 font-medium">Total Bs (Tasa: {bcvRate.toFixed(2)})</span>
                <span className="text-[12px] font-bold text-slate-600">Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleOpenSaveDialog}
              className="flex-1 min-w-0 h-[40px] px-2 rounded border border-slate-900 bg-[#0f172a] hover:bg-[#1e293b] text-white font-semibold text-[12px] flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] disabled:opacity-50 truncate"
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">Guardar</span>
            </button>
            <button
              onClick={handleWhatsApp}
              title="Enviar por WhatsApp"
              className="w-[40px] h-[40px] shrink-0 rounded border border-slate-200 bg-[#25D366] hover:bg-[#20b858] text-white flex items-center justify-center transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>

          {/* PDF Export Buttons */}
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={() => handleExportPdf('usd')}
              disabled={isGeneratingPdf}
              title="Descargar PDF en Divisas (USD)"
              className="flex-1 min-w-0 h-[36px] px-2 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm truncate disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">PDF USD</span>
            </button>
            <button
              onClick={() => handleExportPdf('bcv')}
              disabled={isGeneratingPdf}
              title="Descargar PDF en Bolívares (BCV)"
              className="flex-1 min-w-0 h-[36px] px-2 rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm truncate disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span className="truncate">PDF Bs</span>
            </button>
            <button
              onClick={() => handleExportPdf('both')}
              disabled={isGeneratingPdf}
              title="Descargar ambos formatos (USD y Bolívares)"
              className="flex-1 min-w-0 h-[36px] px-2 rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors shadow-sm truncate disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 shrink-0 text-slate-600" />
              <span className="truncate">Ambos</span>
            </button>
          </div>
        </div>
      )}

      <QuoteSaveDialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen} />
    </div>
  );
}
