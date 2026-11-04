import React from 'react';
import QRCode from 'qrcode';
import { downloadDocument, printDocument, renderDocumentToBlob } from './core.ts';
import { DocumentEstablishment } from './types.ts';
import { StudentCardDocument, StudentCardData } from './templates/StudentCardDocument.tsx';
import { ReceiptDocument, ReceiptPaymentData } from './templates/ReceiptDocument.tsx';
import { ReportCardDocument, ReportCardData } from './templates/ReportCardDocument.tsx';
import { StudentFileDocument, StudentFileData } from './templates/StudentFileDocument.tsx';
import { SchoolCertificateDocument, SchoolCertificateData } from './templates/SchoolCertificateDocument.tsx';
import { StudentStatementDocument, StudentStatementData } from './templates/StudentStatementDocument.tsx';
import { PayslipDocument, PayslipItem } from './templates/PayslipDocument.tsx';
import { GenericTableDocument, GenericTableData } from './templates/GenericTableDocument.tsx';

export * from './types.ts';
export * from './core.ts';
export type { GenericTableData, TableColumn } from './templates/GenericTableDocument.tsx';
export {
  StudentCardDocument,
  ReceiptDocument,
  ReportCardDocument,
  StudentFileDocument,
  SchoolCertificateDocument,
  StudentStatementDocument,
  PayslipDocument,
  GenericTableDocument,
};

// Helper interne de génération de QR code vectoriel en Data URL
async function ensureQrCode(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, { width: 140, margin: 1 });
  } catch (e) {
    console.warn('[documentEngine] Erreur QR code:', e);
    return '';
  }
}

/**
 * 1. CARTE SCOLAIRE OFFICIELLE (Recto-Verso ID-1 85.6mm x 54mm)
 */
export async function downloadStudentCard(
  student: StudentCardData,
  establishment?: DocumentEstablishment,
  customQr?: string
): Promise<void> {
  const qrCode = customQr || (student.matricule ? await ensureQrCode(`MAT:${student.matricule}|ECOLE:${establishment?.code || 'ECO'}`) : '');
  const doc = React.createElement(StudentCardDocument, {
    student,
    establishment,
    qrCodeDataUrl: qrCode,
  });
  const filename = `Carte_${student.last_name || 'Eleve'}_${student.first_name || ''}_${student.matricule || ''}`;
  await downloadDocument(doc, filename);
}

export async function printStudentCard(
  student: StudentCardData,
  establishment?: DocumentEstablishment,
  customQr?: string
): Promise<void> {
  const qrCode = customQr || (student.matricule ? await ensureQrCode(`MAT:${student.matricule}|ECOLE:${establishment?.code || 'ECO'}`) : '');
  const doc = React.createElement(StudentCardDocument, {
    student,
    establishment,
    qrCodeDataUrl: qrCode,
  });
  await printDocument(doc);
}

/**
 * 2. QUITTANCE DE PAIEMENT OFFICIELLE (A4 ou A5)
 */
export async function downloadReceipt(
  payment: ReceiptPaymentData,
  establishment?: DocumentEstablishment,
  format: 'A4' | 'A5' = 'A4',
  customQr?: string
): Promise<void> {
  const qrCode = customQr || (payment.receipt_number ? await ensureQrCode(`QUITTANCE:${payment.receipt_number}|MONTANT:${payment.amount}|ECOLE:${establishment?.code || ''}`) : '');
  const doc = React.createElement(ReceiptDocument, {
    payment,
    establishment,
    format,
    qrCodeDataUrl: qrCode,
  });
  const filename = `Quittance_${payment.receipt_number || 'paiement'}`;
  await downloadDocument(doc, filename);
}

export async function printReceipt(
  payment: ReceiptPaymentData,
  establishment?: DocumentEstablishment,
  format: 'A4' | 'A5' = 'A4',
  customQr?: string
): Promise<void> {
  const qrCode = customQr || (payment.receipt_number ? await ensureQrCode(`QUITTANCE:${payment.receipt_number}|MONTANT:${payment.amount}|ECOLE:${establishment?.code || ''}`) : '');
  const doc = React.createElement(ReceiptDocument, {
    payment,
    establishment,
    format,
    qrCodeDataUrl: qrCode,
  });
  await printDocument(doc);
}

/**
 * 3. BULLETIN SCOLAIRE
 */
export async function downloadReportCard(
  report: ReportCardData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(ReportCardDocument, {
    report,
    establishment,
  });
  const filename = `Bulletin_${report.student_matricule || report.matricule || 'Eleve'}_${report.term || 'Trimestre'}`;
  await downloadDocument(doc, filename);
}

export async function printReportCard(
  report: ReportCardData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(ReportCardDocument, {
    report,
    establishment,
  });
  await printDocument(doc);
}

/**
 * 4. FICHE INDIVIDUELLE D'INSCRIPTION ÉLÈVE
 */
export async function downloadStudentFile(
  student: StudentFileData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(StudentFileDocument, {
    student,
    establishment,
  });
  const filename = `Fiche_Inscription_${student.last_name || 'Eleve'}_${student.matricule || ''}`;
  await downloadDocument(doc, filename);
}

export async function printStudentFile(
  student: StudentFileData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(StudentFileDocument, {
    student,
    establishment,
  });
  await printDocument(doc);
}

/**
 * 5. CERTIFICAT DE SCOLARITÉ
 */
export async function downloadSchoolCertificate(
  student: SchoolCertificateData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(SchoolCertificateDocument, {
    student,
    establishment,
  });
  const filename = `Certificat_Scolarite_${student.last_name || 'Eleve'}_${student.matricule || ''}`;
  await downloadDocument(doc, filename);
}

export async function printSchoolCertificate(
  student: SchoolCertificateData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(SchoolCertificateDocument, {
    student,
    establishment,
  });
  await printDocument(doc);
}

/**
 * 6. RELEVÉ FINANCIER / ÉTAT DE COMPTE ÉLÈVE
 */
export async function downloadStudentStatement(
  data: StudentStatementData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(StudentStatementDocument, {
    data,
    establishment,
  });
  const filename = `Releve_Compte_${data.student.matricule || 'Eleve'}`;
  await downloadDocument(doc, filename);
}

export async function printStudentStatement(
  data: StudentStatementData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(StudentStatementDocument, {
    data,
    establishment,
  });
  await printDocument(doc);
}

/**
 * 7. BULLETIN DE PAIE
 */
export async function downloadPayslip(
  payslip: PayslipItem,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(PayslipDocument, {
    payslip,
    establishment,
  });
  const filename = `Bulletin_Paie_${payslip.full_name || 'Personnel'}_${payslip.period || ''}`;
  await downloadDocument(doc, filename);
}

export async function printPayslip(
  payslip: PayslipItem,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(PayslipDocument, {
    payslip,
    establishment,
  });
  await printDocument(doc);
}

/**
 * 8. TABLEAUX GÉNÉRIQUES (Journaux de caisse, listes d'élèves, registres de présence, emplois du temps, examens)
 */
export async function downloadTableDocument(
  data: GenericTableData,
  establishment?: DocumentEstablishment,
  customFilename?: string
): Promise<void> {
  const doc = React.createElement(GenericTableDocument, {
    data,
    establishment,
  });
  const filename = customFilename || data.title.replace(/\s+/g, '_');
  await downloadDocument(doc, filename);
}

export async function printTableDocument(
  data: GenericTableData,
  establishment?: DocumentEstablishment
): Promise<void> {
  const doc = React.createElement(GenericTableDocument, {
    data,
    establishment,
  });
  await printDocument(doc);
}
