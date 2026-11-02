import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * Normalise un nom de fichier pour s'assurer qu'il se termine par .pdf
 */
function ensurePdfExtension(filename: string): string {
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
}

/**
 * Attend que toutes les images (logos, cachets, avatars) contenues dans l'élément soient chargées.
 */
/**
 * Attend que toutes les images (logos, cachets, avatars) contenues dans l'élément soient chargées.
 * Délai maximal de 1.5 seconde (1500ms) pour ne jamais bloquer l'impression sur mobile / Chrome.
 */
export async function waitForImages(element: HTMLElement, timeoutMs = 1500): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  if (images.length === 0) return;

  const promises = images.map((img) => {
    if (img.complete) {
      if (img.naturalHeight === 0) {
        // Image cassée : masquer proprement
        img.style.display = 'none';
      }
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          if (img.naturalHeight === 0) {
            img.style.display = 'none';
          }
          resolve(true);
        }
      };

      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
      setTimeout(done, timeoutMs);
    });
  });

  // Garantie absolue que waitForImages se termine en max 1500ms
  const hardTimeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.all(promises), hardTimeout]);
}

/**
 * Trouve l'élément HTML selon son ID, sélecteur ou référence directe.
 * Recherche intelligente et fallback gracieux.
 */
export function resolveElement(target?: string | HTMLElement | null): HTMLElement | null {
  if (!target) {
    return (document.querySelector('.print-area') as HTMLElement) ||
           (document.querySelector('.printable-document') as HTMLElement) ||
           (document.querySelector('[id^="printable-"]') as HTMLElement) ||
           document.body;
  }

  if (typeof target !== 'string') return target;

  // 1. Recherche par ID direct
  let el = document.getElementById(target);
  if (el) return el;

  // 2. Nettoyage du préfixe #
  const cleanId = target.startsWith('#') ? target.slice(1) : target;
  el = document.getElementById(cleanId);
  if (el) return el;

  // 3. Sélecteur CSS
  try {
    el = document.querySelector(target.startsWith('#') ? target : `#${target}`);
    if (el) return el;
  } catch {
    // Ignorer les erreurs de syntaxe
  }

  // 4. Fallback intelligent vers le document imprimable disponible
  el = (document.querySelector('.print-area') as HTMLElement) ||
       (document.querySelector('.printable-document') as HTMLElement) ||
       (document.querySelector('[id^="printable-"]') as HTMLElement) ||
       (document.querySelector('.fixed.inset-0 .bg-white') as HTMLElement) ||
       (document.querySelector('main') as HTMLElement) ||
       document.body;

  return el;
}

/**
 * Télécharge une zone du document en fichier PDF généré côté navigateur avec html-to-image + jsPDF.
 */
export async function downloadPdf(
  target?: string | HTMLElement | null,
  filename: string = 'document.pdf'
): Promise<void> {
  const el = resolveElement(target);
  if (!el) {
    console.error(`[downloadPdf] Aucun élément imprimable trouvé dans le DOM.`);
    alert(`Aucun document imprimable n'a été trouvé pour la génération du PDF.`);
    return;
  }

  const cleanFilename = ensurePdfExtension(filename);

  try {
    // 1. Attente rapide du chargement des images
    await waitForImages(el, 1500);

    // 2. Génération du Canvas via html-to-image (Moteur SVG natif du navigateur)
    const canvas = await toCanvas(el, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      skipFonts: true,
      fontEmbedCSS: '',
      filter: (node) => {
        if (node instanceof HTMLElement) {
          if (node.classList.contains('no-print') || node.classList.contains('print:hidden')) {
            return false;
          }
        }
        return true;
      },
    });

    // 3. Configuration jsPDF
    const isLandscape = canvas.width > canvas.height;
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Ajustement proportionnel pour tenir sur une page A4 avec marge de 8mm
    const margin = 8;
    const maxRenderWidth = pageWidth - margin * 2;
    const maxRenderHeight = pageHeight - margin * 2;

    const ratio = Math.min(maxRenderWidth / imgWidth, maxRenderHeight / imgHeight);
    const renderWidth = imgWidth * ratio;
    const renderHeight = imgHeight * ratio;

    const posX = margin + (maxRenderWidth - renderWidth) / 2;
    const posY = margin + (maxRenderHeight - renderHeight) / 2;

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');

    // 4. Déclenchement du téléchargement via Blob et lien <a download>
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = cleanFilename;
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 3000);
  } catch (err: any) {
    console.error('[downloadPdf] Erreur lors de la création du PDF :', err);
    alert('Une erreur est survenue lors de la création du fichier PDF.');
  }
}

/**
 * Lance l'impression d'un document dans un <iframe> masqué hors-écran.
 * Compatible Chrome Android, Mobile & Desktop Firefox.
 */
export async function printDocument(
  target?: string | HTMLElement | null,
  title: string = 'Impression Document'
): Promise<void> {
  const el = resolveElement(target);

  if (!el) {
    console.warn('[printDocument] Aucun élément trouvé, bascule sur window.print() direct.');
    window.print();
    return;
  }

  // 1. Attente rapide des images (max 1.5s)
  await waitForImages(el, 1500);

  // 2. Nettoyage du clone
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.no-print, .print\\:hidden, button, [role="button"], input[type="button"]').forEach((n) => n.remove());

  // Traiter les images cassées dans le clone
  clone.querySelectorAll('img').forEach((img) => {
    if (img.naturalHeight === 0 || !img.src) {
      img.style.display = 'none';
    } else {
      img.onerror = () => { img.style.display = 'none'; };
    }
  });

  const htmlContent = clone.outerHTML;

  // 3. Récupération des styles CSS
  const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((s) => s.outerHTML)
    .join('\n');

  // 4. Création de l'iframe masquée hors écran (Chrome Android requiert une taille non-nulle)
  const iframe = document.createElement('iframe');
  iframe.id = `print-iframe-${Date.now()}`;
  iframe.style.position = 'absolute';
  iframe.style.top = '0';
  iframe.style.left = '-9999px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.opacity = '0.01';
  iframe.style.pointerEvents = 'none';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      window.print();
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
              position: static !important;
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
              font-size: 10.5px !important;
              line-height: 1.35 !important;
            }
            body * {
              visibility: visible !important;
            }
            .printable-clone-wrapper, .printable-document, .print-area {
              width: 100% !important;
              max-width: 190mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background-color: #ffffff !important;
              color: #000000 !important;
              position: static !important;
              overflow: visible !important;
              box-sizing: border-box !important;
              font-size: 10.5px !important;
            }
            .no-print, nav, header, aside, button, .print\\:hidden, .close-btn {
              display: none !important;
            }

            /* Standalone Header Grid (3 columns: Left Logo, Center School Info, Right Photo) */
            .print-header-grid, .grid-cols-12 {
              display: flex !important;
              flex-direction: row !important;
              align-items: center !important;
              justify-content: space-between !important;
              width: 100% !important;
            }

            .col-span-3 {
              width: 25% !important;
              flex-shrink: 0 !important;
            }

            .col-span-6 {
              width: 50% !important;
              flex-grow: 1 !important;
            }

            .col-span-9 {
              width: 75% !important;
              flex-grow: 1 !important;
            }

            /* Student Photo strict dimensions: 25mm x 32mm */
            .student-photo, .student-photo-frame img, img[alt*="Photo"], img[alt*="photo"] {
              width: 25mm !important;
              height: 32mm !important;
              max-width: 25mm !important;
              max-height: 32mm !important;
              object-fit: cover !important;
              border: 1px solid #94a3b8 !important;
              border-radius: 4px !important;
              display: block !important;
              margin: 0 auto !important;
            }

            /* Logo "GS" / School Logo dimensions: 22mm x 22mm */
            .school-logo, img[alt*="logo"], img[alt*="Logo"] {
              width: 22mm !important;
              height: 22mm !important;
              max-width: 22mm !important;
              max-height: 22mm !important;
              object-fit: contain !important;
              display: block !important;
              margin: 0 auto !important;
            }

            /* Tables with fine borders */
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-bottom: 6px !important;
              font-size: 10px !important;
            }

            th, td {
              border: 1px solid #cbd5e1 !important;
              padding: 3px 6px !important;
              vertical-align: middle !important;
              text-align: left;
            }

            th {
              background-color: #f1f5f9 !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              font-size: 9.5px !important;
            }

            thead {
              display: table-header-group !important;
            }

            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }

            /* Headings */
            h1 {
              font-size: 13px !important;
              font-weight: 900 !important;
              text-transform: uppercase !important;
              margin: 4px 0 !important;
              color: #0f172a !important;
            }

            h2 {
              font-size: 11px !important;
              font-weight: 800 !important;
              text-transform: uppercase !important;
              margin: 3px 0 !important;
            }

            h3, h4 {
              font-size: 10px !important;
              font-weight: 700 !important;
              text-transform: uppercase !important;
              margin: 2px 0 !important;
            }

            /* Signatures side-by-side */
            .signatures-row, .grid-cols-2 {
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              width: 100% !important;
            }

            .signature-col {
              width: 48% !important;
              border: 1px solid #cbd5e1 !important;
              border-radius: 4px !important;
              padding: 6px !important;
              text-align: center !important;
            }
          </style>
        </head>
        <body>
          <div class="printable-clone-wrapper">
            ${htmlContent}
          </div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    // Masquer les images non chargées dans l'iframe
    try {
      iframeDoc.querySelectorAll('img').forEach((img) => {
        img.onerror = () => { img.style.display = 'none'; };
      });
    } catch {}

    // 5. Déclenchement rapide de l'impression (focus puis print)
    setTimeout(() => {
      try {
        const win = iframe.contentWindow;
        if (win) {
          win.focus();
          win.print();
        } else {
          window.print();
        }
      } catch (err) {
        console.warn('[printDocument] Erreur iframe print, fallback window.print() :', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 4000);
      }
    }, 100);
  } catch (err) {
    console.error('[printDocument] Erreur préparation iframe :', err);
    window.print();
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}
