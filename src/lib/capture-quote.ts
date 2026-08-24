import html2canvas from 'html2canvas';

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

export async function copyQuoteToClipboard(quoteData: any, bcvMultiplier: number, bcvRateParam?: number, randomPhrase?: string, currency: 'usd' | 'bcv' | 'both' = 'both') {
  const chosenPhrase = randomPhrase || WHATSAPP_PHRASES[Math.floor(Math.random() * WHATSAPP_PHRASES.length)];
  const bcvRate = bcvRateParam || quoteData.bcv_rate || 1;

  // Create a container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.backgroundColor = 'white';
  
  const dateStr = new Date().toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' });
  const quoteId = quoteData.id ? quoteData.id.substring(0,8).toUpperCase() : 'TEMP';
  
  // Formatters
  const formatUSD = (val: number) => `$${val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const formatBs = (val: number) => `Bs ${val.toLocaleString('es-VE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  container.innerHTML = `
    <div style="padding: 40px; font-family: ui-sans-serif, system-ui, sans-serif; color: #1e293b;">
      
      <!-- Top Accent Bar -->
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: #0f172a;"></div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; margin-top: 10px;">
        <img src="/LogoRepuestosSotomayor.png" style="height: 60px; object-fit: contain;" crossorigin="anonymous" />
        <div style="text-align: right;">
          <div style="display: flex; gap: 0; justify-content: flex-end; margin-bottom: 8px;">
            <div style="background: #0f172a; padding: 8px 16px; border-radius: 6px 0 0 6px; font-weight: 700; font-size: 11px; color: white; letter-spacing: 0.5px;">
              COTIZACIÓN
            </div>
            <div style="background: #e2e8f0; padding: 8px 16px; border-radius: 0 6px 6px 0; font-weight: 800; font-size: 11px; color: #0f172a; letter-spacing: 0.5px;">
              ${currency === 'usd' ? 'DIVISAS (USD)' : currency === 'bcv' ? 'BOLÍVARES (BS)' : 'DIVISAS Y BOLÍVARES'}
            </div>
          </div>
          <div style="color: #64748b; font-size: 13px;">N° ${quoteId}</div>
          <div style="color: #64748b; font-size: 13px;">${dateStr}</div>
        </div>
      </div>
      
      <div style="border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;"></div>
      
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px;">
          <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.5px;">CLIENTE</div>
          <div style="font-size: 18px; font-weight: 800; color: #0f172a;">${quoteData.client_name || 'Sin nombre'}</div>
          ${quoteData.client_phone ? `<div style="color: #64748b; font-size: 14px; margin-top: 4px;">Tel: ${quoteData.client_phone}</div>` : ''}
        </div>
        
        ${(currency === 'bcv' || currency === 'both') ? `
        <div style="width: 200px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px;">
          <div style="font-size: 11px; color: #2563eb; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.5px;">TASA BCV</div>
          <div style="font-size: 18px; font-weight: 800; color: #1d4ed8;">${formatBs(bcvRate)}</div>
        </div>
        ` : ''}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; table-layout: fixed;">
        <thead>
          <tr style="background: #0f172a; color: white; text-align: left;">
            <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; width: 35%;">DESCRIPCIÓN</th>
            <th style="padding: 12px 16px; font-size: 11px; text-align: center; font-weight: 700; letter-spacing: 0.5px; width: 14%;">MARCA</th>
            <th style="padding: 12px 16px; font-size: 11px; text-align: center; font-weight: 700; letter-spacing: 0.5px; width: 8%;">CANT.</th>
            ${currency === 'both' ? `<th style="padding: 12px 16px; font-size: 11px; text-align: center; font-weight: 700; letter-spacing: 0.5px; color: #34d399; width: 10%;">P.<br/>DIVISAS</th>` : ''}
            ${(currency === 'both' || currency === 'bcv') ? `<th style="padding: 12px 16px; font-size: 11px; text-align: center; font-weight: 700; letter-spacing: 0.5px; color: #34d399; width: 11%;">${currency === 'bcv' ? 'USD BCV' : 'P.<br/>DÓLARES BCV'}</th>` : ''}
            ${currency === 'usd' ? `<th style="padding: 12px 16px; font-size: 11px; text-align: center; font-weight: 700; letter-spacing: 0.5px; color: #34d399;">P. UNIT.</th>` : ''}
            ${(currency === 'both' || currency === 'bcv') ? `<th style="padding: 12px 16px; font-size: 11px; text-align: center; font-weight: 700; letter-spacing: 0.5px; color: #60a5fa; width: 11%;">P. UNIT.<br/>(Bs)</th>` : ''}
            ${currency === 'usd' ? `<th style="padding: 12px 16px; font-size: 11px; text-align: center; font-weight: 700; letter-spacing: 0.5px; color: #34d399;">TOTAL</th>` : ''}
            ${(currency === 'both' || currency === 'bcv') ? `<th style="padding: 12px 16px; font-size: 11px; text-align: center; font-weight: 700; letter-spacing: 0.5px; color: #60a5fa; width: 11%;">TOTAL<br/>(Bs)</th>` : ''}
          </tr>
        </thead>
        <tbody>
          ${(quoteData.quote_items || quoteData.items || []).map((item: any, i: number) => {
            const rowBg = i % 2 === 0 ? 'white' : '#f8fafc';
            
            const unitUsd = item.unit_price_usd || 0;
            const totalUsd = unitUsd * item.quantity;
            
            const unitUsdBcv = unitUsd * bcvMultiplier;
            const totalUsdBcv = unitUsdBcv * item.quantity;
            
            const unitBs = unitUsdBcv * bcvRate;
            const totalBs = totalUsdBcv * bcvRate;
            
            const brandContent = item.brand_logo_url 
              ? `<img src="${item.brand_logo_url}" crossorigin="anonymous" style="height: 26px; object-fit: contain; max-width: 90px;" />` 
              : (item.brand_name ? `<span style="font-size: 11px; color: #2563eb; font-weight: 700;">${item.brand_name}</span>` : '');

            return `
            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 14px 16px; font-size: 13px; font-weight: 500;">${item.product_name}</td>
              <td style="padding: 14px 16px; text-align: center;">${brandContent}</td>
              <td style="padding: 14px 16px; text-align: center; font-size: 13px; font-weight: 600;">${item.quantity}</td>
              ${currency === 'both' ? `<td style="padding: 14px 16px; text-align: center; font-size: 13px; color: #10b981;">${formatUSD(unitUsd)}</td>` : ''}
              ${(currency === 'both' || currency === 'bcv') ? `<td style="padding: 14px 16px; text-align: center; font-size: 13px; font-weight: 800; color: #10b981;">${formatUSD(unitUsdBcv)}</td>` : ''}
              ${currency === 'usd' ? `<td style="padding: 14px 16px; text-align: center; font-size: 13px; color: #10b981;">${formatUSD(unitUsd)}</td>` : ''}
              ${(currency === 'both' || currency === 'bcv') ? `<td style="padding: 14px 16px; text-align: center; font-size: 13px; color: #2563eb;">${formatBs(unitBs)}</td>` : ''}
              ${currency === 'usd' ? `<td style="padding: 14px 16px; text-align: center; font-size: 13px; font-weight: 800; color: #10b981;">${formatUSD(totalUsd)}</td>` : ''}
              ${(currency === 'both' || currency === 'bcv') ? `<td style="padding: 14px 16px; text-align: center; font-size: 13px; font-weight: 800; color: #2563eb;">${formatBs(totalBs)}</td>` : ''}
            </tr>
          `}).join('')}
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: flex-end;">
        <div style="width: 400px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          ${currency === 'both' ? `
          <div style="padding: 12px 16px; background: white; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 13px;">Subtotal Divisas ($):</span>
            <span style="font-weight: 700; color: #10b981; font-size: 13px;">${formatUSD(quoteData.total_usd)}</span>
          </div>
          ` : ''}
          
          ${(currency === 'bcv' || currency === 'both') ? `
          <div style="padding: 12px 16px; background: white; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 13px;">Subtotal Dólares BCV ($):</span>
            <span style="font-weight: 700; color: #10b981; font-size: 13px;">${formatUSD(quoteData.total_usd * bcvMultiplier)}</span>
          </div>
          ` : ''}
          
          ${(currency === 'usd') ? `
          <div style="padding: 12px 16px; background: white; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 13px;">Subtotal ($):</span>
            <span style="font-weight: 700; color: #10b981; font-size: 13px;">${formatUSD(quoteData.total_usd)}</span>
          </div>
          <div style="background: #047857; padding: 12px 16px; display: flex; justify-content: space-between; color: white;">
            <span style="font-weight: 700; font-size: 14px;">TOTAL DIVISAS:</span>
            <span style="font-weight: 800; font-size: 15px;">${formatUSD(quoteData.total_usd)}</span>
          </div>
          ` : ''}

          ${(currency === 'both') ? `
          <div style="padding: 12px 16px; background: white; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 13px;">Subtotal Bs (Tasa: ${formatBs(bcvRate)}):</span>
            <span style="font-weight: 700; color: #2563eb; font-size: 13px;">${formatBs(quoteData.total_usd * bcvMultiplier * bcvRate)}</span>
          </div>
          <div style="background: #047857; padding: 12px 16px; display: flex; justify-content: space-between; color: white;">
            <span style="font-weight: 700; font-size: 14px;">TOTAL DIVISAS:</span>
            <span style="font-weight: 800; font-size: 15px;">${formatUSD(quoteData.total_usd)}</span>
          </div>
          <div style="background: #065f46; padding: 12px 16px; display: flex; justify-content: space-between; color: white;">
            <span style="font-weight: 700; font-size: 14px;">TOTAL BS:</span>
            <span style="font-weight: 800; font-size: 15px;">${formatBs(quoteData.total_usd * bcvMultiplier * bcvRate)}</span>
          </div>
          ` : ''}
          
          ${(currency === 'bcv') ? `
          <div style="padding: 12px 16px; background: white; display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 13px;">Subtotal Bs (Tasa: ${formatBs(bcvRate)}):</span>
            <span style="font-weight: 700; color: #2563eb; font-size: 13px;">${formatBs(quoteData.total_usd * bcvMultiplier * bcvRate)}</span>
          </div>
          <div style="background: #065f46; padding: 12px 16px; display: flex; justify-content: space-between; color: white;">
            <span style="font-weight: 700; font-size: 14px;">TOTAL BS:</span>
            <span style="font-weight: 800; font-size: 15px;">${formatBs(quoteData.total_usd * bcvMultiplier * bcvRate)}</span>
          </div>
          ` : ''}

        </div>
      </div>
      
      <div style="margin-top: 40px; font-size: 11px; color: #64748b; font-style: italic; text-align: center;">
        "${chosenPhrase}"
      </div>
    </div>
  `;

  document.body.appendChild(container);
  
  // Ensure the image loads before capturing
  const img = container.querySelector('img');
  if (img) {
    await new Promise((resolve) => {
      if (img.complete) resolve(true);
      else {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(true);
        // Timeout fallback
        setTimeout(() => resolve(true), 500);
      }
    });
  }

  try {
    const canvas = await html2canvas(container, {
      scale: 2, 
      useCORS: true,
      backgroundColor: '#ffffff'
    });
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            resolve(true);
          } catch (err) {
            console.error('Clipboard write failed:', err);
            reject(err);
          }
        } else {
          reject(new Error("No blob generated"));
        }
      }, 'image/png');
    });
  } finally {
    document.body.removeChild(container);
  }
}
