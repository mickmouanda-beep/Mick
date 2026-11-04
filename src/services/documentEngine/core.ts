import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { GenerateDocumentOptions } from './types.ts';

/**
 * Moteur central de génération, téléchargement et impression de documents.
 * 100% vectoriel, conforme au standard PDF, sans html2canvas ni window.print().
 */
export async function renderDocumentToBlob(
  docElement: React.ReactElement<any>
): Promise<Blob> {
  const instance = pdf(docElement as any);
  return await instance.toBlob();
}

/**
 * Télécharge un document PDF généré à partir de ses données et de son modèle.
 */
export async function downloadDocument(
  docElement: React.ReactElement,
  filename: string
): Promise<void> {
  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  const blob = await renderDocumentToBlob(docElement);
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Imprime un document en ouvrant le PDF généré dans un nouvel onglet ou dans une vue isolée.
 * Respecte l'instruction utilisateur : "ouverture du même PDF dans un nouvel onglet".
 */
export async function printDocument(
  docElement: React.ReactElement
): Promise<void> {
  const blob = await renderDocumentToBlob(docElement);
  const url = URL.createObjectURL(blob);

  // Tentative d'ouverture directe dans un nouvel onglet
  const printWindow = window.open(url, '_blank');

  // Si le popup est bloqué par le navigateur, fallback automatique sur iframe invisible
  if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Impression iframe:', e);
      }
      setTimeout(() => {
        if (iframe.parentNode) document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 60000);
    };
  } else {
    // Libération de la mémoire après fermeture ou délai
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 120000);
  }
}
