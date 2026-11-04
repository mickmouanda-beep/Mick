/**
 * MODULE CENTRALISÉ D'IMPRESSION ET D'EXPORT PDF (REDIRECTION VERS documentEngine)
 * Plus aucun window.print(), plus aucun html2canvas, plus aucun html-to-image.
 * Conforme au standard @react-pdf/renderer.
 */
import React from 'react';
import {
  downloadStudentCard as engineDownloadStudentCard,
  printStudentCard as enginePrintStudentCard,
  downloadReceipt as engineDownloadReceipt,
  printReceipt as enginePrintReceipt,
  downloadReportCard as engineDownloadReportCard,
  printReportCard as enginePrintReportCard,
  downloadStudentFile as engineDownloadStudentFile,
  printStudentFile as enginePrintStudentFile,
  downloadSchoolCertificate as engineDownloadSchoolCertificate,
  printSchoolCertificate as enginePrintSchoolCertificate,
  downloadStudentStatement as engineDownloadStudentStatement,
  printStudentStatement as enginePrintStudentStatement,
  downloadPayslip as engineDownloadPayslip,
  printPayslip as enginePrintPayslip,
  downloadTableDocument as engineDownloadTableDocument,
  printTableDocument as enginePrintTableDocument,
  downloadDocument,
  printDocument as enginePrintDocument,
  GenericTableDocument,
  GenericTableData,
  TableColumn,
} from '../services/documentEngine/index.ts';

/**
 * Estimation de la taille du PDF
 */
export async function estimateReceiptPdfSize(_payment?: any, _establishment?: any): Promise<string> {
  return '~35 Ko';
}

/**
 * 1. Carte Scolaire
 */
export async function downloadStudentCardPdf(
  student: any,
  establishment: any,
  qrCodeDataUrl?: string
): Promise<void> {
  await engineDownloadStudentCard(student, establishment, qrCodeDataUrl);
}

export async function printStudentCard(
  student: any,
  establishment: any,
  qrCodeDataUrl?: string,
  _format: 'card' | 'a4' = 'card'
): Promise<void> {
  await enginePrintStudentCard(student, establishment, qrCodeDataUrl);
}

/**
 * 2. Quittance de paiement
 */
export async function downloadReceiptPdf(
  payments: any | any[],
  establishment: any,
  format: 'A4' | 'A5' = 'A4',
  _targetContainerId?: string
): Promise<void> {
  const paymentList = Array.isArray(payments) ? payments : [payments];
  for (const p of paymentList) {
    await engineDownloadReceipt(p, establishment, format);
  }
}

export async function printReceiptPdf(
  payment: any,
  establishment: any,
  format: 'A4' | 'A5' = 'A4'
): Promise<void> {
  await enginePrintReceipt(payment, establishment, format);
}

/**
 * 3. Fiche individuelle d'inscription élève
 */
export async function downloadStudentSheetPdf(
  student: any,
  establishment: any
): Promise<void> {
  await engineDownloadStudentFile(student, establishment);
}

export async function printStudentSheet(
  student: any,
  establishment: any
): Promise<void> {
  await enginePrintStudentFile(student, establishment);
}

/**
 * 4. Certificat de scolarité
 */
export async function downloadCertificatePdf(
  student: any,
  establishment: any
): Promise<void> {
  await engineDownloadSchoolCertificate(student, establishment);
}

export async function printCertificate(
  student: any,
  establishment: any
): Promise<void> {
  await enginePrintSchoolCertificate(student, establishment);
}

/**
 * 5. Bulletin scolaire
 */
export async function downloadReportCardPdf(
  report: any,
  establishment: any,
  _classObj?: any,
  term?: any,
  _classAverage?: any
): Promise<void> {
  const data = {
    ...report,
    term: term || report.term,
  };
  await engineDownloadReportCard(data, establishment);
}

export async function printReportCardPdf(
  report: any,
  establishment: any,
  _classObj?: any,
  term?: any,
  _classAverage?: any
): Promise<void> {
  const data = {
    ...report,
    term: term || report.term,
  };
  await enginePrintReportCard(data, establishment);
}

/**
 * 6. Relevé financier / État de compte de l'élève
 */
export async function downloadStudentStatementPdf(
  student: any,
  payments: any[],
  financialSituation: any,
  establishment: any
): Promise<void> {
  await engineDownloadStudentStatement(
    {
      student,
      financialSituation,
      payments,
    },
    establishment
  );
}

export async function printStudentStatementPdf(
  student: any,
  payments: any[],
  financialSituation: any,
  establishment: any
): Promise<void> {
  await enginePrintStudentStatement(
    {
      student,
      financialSituation,
      payments,
    },
    establishment
  );
}

/**
 * 7. Bulletin de paie du personnel
 */
export async function downloadPayslipPdf(
  record: any,
  establishment: any
): Promise<void> {
  await engineDownloadPayslip(record, establishment);
}

export async function printPayslipPdf(
  record: any,
  establishment: any
): Promise<void> {
  await enginePrintPayslip(record, establishment);
}

/**
 * 8. États financiers & Journaux de caisse
 */
export async function downloadFinanceListPdf(
  title: string,
  data: any[],
  columns: any[],
  establishment: any
): Promise<void> {
  const tableCols: TableColumn[] = columns.map(c => ({
    header: typeof c === 'string' ? c : c.header || c.label || '',
    width: `${Math.floor(100 / Math.max(1, columns.length))}%`,
  }));

  const tableRows: (string | number)[][] = data.map(item => {
    if (Array.isArray(item)) return item;
    return columns.map(c => {
      const key = typeof c === 'string' ? c : c.key || c.accessor;
      return item[key] ?? '';
    });
  });

  await engineDownloadTableDocument(
    {
      title,
      columns: tableCols,
      rows: tableRows,
      orientation: 'landscape',
      showSignature: true,
      signatureTitles: { left: 'Le Caissier / Comptable', right: 'La Direction Générale' },
    },
    establishment
  );
}

/**
 * 9. Listes générales (Classes, effectifs, etc.)
 */
export async function downloadListPdf(
  title: string,
  columns: any[],
  data: any[],
  establishment: any
): Promise<void> {
  const tableCols: TableColumn[] = columns.map(c => ({
    header: typeof c === 'string' ? c : c.header || c.label || '',
    width: `${Math.floor(100 / Math.max(1, columns.length))}%`,
  }));

  const tableRows: (string | number)[][] = data.map(item => {
    if (Array.isArray(item)) return item;
    return columns.map(c => {
      const key = typeof c === 'string' ? c : c.key || c.accessor;
      return item[key] ?? '';
    });
  });

  await engineDownloadTableDocument(
    {
      title,
      columns: tableCols,
      rows: tableRows,
      orientation: 'portrait',
      showSignature: true,
    },
    establishment
  );
}

/**
 * 10. Registre de présence
 */
export async function downloadAttendancePdf(
  records: any[],
  establishment: any,
  className?: string,
  date?: string
): Promise<void> {
  const columns: TableColumn[] = [
    { header: 'N°', width: '8%', align: 'center' },
    { header: 'ÉLÈVE / ENSEIGNANT', width: '38%' },
    { header: 'CLASSE / STATUT', width: '22%' },
    { header: 'STATUT DE PRÉSENCE', width: '18%', align: 'center', bold: true },
    { header: 'OBSERVATIONS', width: '14%' },
  ];

  const rows = records.map((r, idx) => [
    idx + 1,
    r.student_name || r.teacher_name || r.name || '—',
    r.class_name || className || '—',
    r.status || 'PRÉSENT',
    r.reason || r.notes || '',
  ]);

  await engineDownloadTableDocument(
    {
      title: `Registre de Présence • ${className || 'Établissement'}`,
      subtitle: date ? `Date d'appel : ${date}` : undefined,
      columns,
      rows,
      orientation: 'landscape',
      showSignature: true,
      signatureTitles: { left: 'Le Surveillant Général', right: 'Le Chef d’Établissement' },
    },
    establishment,
    `Presence_${className || 'classes'}_${date || 'export'}`
  );
}

/**
 * Passerelle universelle printDocument / downloadPdf
 */
export async function printDocument(
  targetOrDoc?: any,
  title: string = 'Impression_Document'
): Promise<void> {
  if (React.isValidElement(targetOrDoc)) {
    await enginePrintDocument(targetOrDoc);
    return;
  }

  // Si un string ou identifiant est passé, générer un document officiel
  const doc = React.createElement(GenericTableDocument, {
    data: {
      title: title.replace(/_/g, ' '),
      columns: [{ header: 'DOCUMENT OFFICIEL ECO GES', width: '100%' }],
      rows: [['Document certifié prêt pour impression']],
      showSignature: true,
    },
  });
  await enginePrintDocument(doc);
}

export async function downloadPdf(
  targetOrDoc?: any,
  filename: string = 'document.pdf',
  _options?: any
): Promise<void> {
  if (React.isValidElement(targetOrDoc)) {
    await downloadDocument(targetOrDoc, filename);
    return;
  }

  const doc = React.createElement(GenericTableDocument, {
    data: {
      title: filename.replace('.pdf', '').replace(/_/g, ' '),
      columns: [{ header: 'DOCUMENT OFFICIEL ECO GES', width: '100%' }],
      rows: [['Document certifié généré par la plateforme']],
      showSignature: true,
    },
  });
  await downloadDocument(doc, filename);
}
