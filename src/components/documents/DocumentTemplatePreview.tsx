import React from 'react';
import { DocumentTemplateConfig, DocumentType } from '../../types/documentTemplates.ts';
import { CustomizableReportCard } from './CustomizableReportCard.tsx';
import { CustomizableReceipt } from './CustomizableReceipt.tsx';
import { CustomizablePayslip } from './CustomizablePayslip.tsx';
import { CustomizableStatement } from './CustomizableStatement.tsx';
import { CustomizableSchoolCertificate } from './CustomizableSchoolCertificate.tsx';
import { CustomizableAttendanceSheet } from './CustomizableAttendanceSheet.tsx';
import { CustomizableStudentFile } from './CustomizableStudentFile.tsx';
import { Payment } from '../../types.ts';

interface DocumentTemplatePreviewProps {
  docType: DocumentType;
  config: DocumentTemplateConfig;
  establishment: any;
}

export const DocumentTemplatePreview: React.FC<DocumentTemplatePreviewProps> = ({
  docType,
  config,
  establishment,
}) => {
  // 1. Bulletin Scolaire
  const sampleReportCard = {
    student: {
      id: 'STU-SAMPLE-01',
      matricule: 'MAT-2026-0038',
      first_name: 'Prince Albert',
      last_name: 'MASSALA',
      post_name: '',
      gender: 'M',
      birth_date: '14/05/2009',
    },
    subjectGrades: [
      {
        subjectId: 'SUB-MATH',
        subjectCode: 'MATH',
        subjectName: 'Mathématiques',
        coefficient: 4,
        average: 15.5,
        weightedScore: 62.0,
        teacherName: 'M. MASSALA Albert',
      },
      {
        subjectId: 'SUB-PC',
        subjectCode: 'PC',
        subjectName: 'Sciences Physiques',
        coefficient: 3,
        average: 14.0,
        weightedScore: 42.0,
        teacherName: 'M. NZILA Paul',
      },
      {
        subjectId: 'SUB-FR',
        subjectCode: 'FR',
        subjectName: 'Français & Expression',
        coefficient: 4,
        average: 13.5,
        weightedScore: 54.0,
        teacherName: 'Mme MAKOSSO Céline',
      },
      {
        subjectId: 'SUB-HG',
        subjectCode: 'HG',
        subjectName: 'Histoire & Géographie',
        coefficient: 2,
        average: 12.0,
        weightedScore: 24.0,
        teacherName: 'M. LOUMOUAMOU Guy',
      },
      {
        subjectId: 'SUB-ANG',
        subjectCode: 'ANG',
        subjectName: 'Anglais LV1',
        coefficient: 2,
        average: 16.0,
        weightedScore: 32.0,
        teacherName: 'M. BIKINDOU Eric',
      },
      {
        subjectId: 'SUB-EPS',
        subjectCode: 'EPS',
        subjectName: 'Éducation Physique (EPS)',
        coefficient: 1,
        average: 17.0,
        weightedScore: 17.0,
        teacherName: 'M. BALONDA Eric',
      },
    ],
    totalCoefficients: 16,
    totalWeightedScore: 231.0,
    generalAverage: 14.44,
    appreciation: 'Très bon trimestre dans l’ensemble. Travail régulier et participation active.',
    rank: 2,
  };

  const sampleSchoolClass = {
    id: 'CLS-SAMPLE-01',
    name: '3ème A',
    cycle_code: 'COLLEGE',
    level_code: '3ème',
    serie_code: null,
    main_teacher_name: 'M. MINGUI Jostelin',
  };

  // 2. Quittance de Paiement
  const samplePayment: Payment = {
    id: 'PAY-SAMPLE-01',
    establishment_id: establishment?.id || 'EST-DEMO',
    receipt_number: 'QT-2026-000142',
    student_id: 'STU-SAMPLE-01',
    first_name: 'Prince Albert',
    last_name: 'MASSALA',
    matricule: 'MAT-2026-0038',
    class_name: '3ème A',
    level_code: '3ème',
    cycle_code: 'COLLEGE',
    payment_type: 'SCOLARITE_T1',
    amount: 45000,
    payment_method: 'AIRTEL_MONEY',
    transaction_reference: 'AM-8492048',
    notes: 'Versement 1er trimestre scolarité',
    payer_name: 'M. MASSALA Albert (Père)',
    cashier_id: 'USR-CASH-01',
    cashier_name: 'M. BALONDA Eric',
    status: 'VALIDE',
    reprint_count: 0,
    total_due: 135000,
    total_paid_to_date: 45000,
    balance_after: 90000,
    created_at: new Date().toISOString(),
  };

  // 3. Fiche de Paie
  const samplePayslip: any = {
    id: 'PAYSLIP-SAMPLE-01',
    establishment_id: establishment?.id || 'EST-DEMO',
    employee_code: 'ENS-2021-042',
    full_name: 'MASSALA Albert',
    job_title: 'Enseignant de Mathématiques',
    department: 'Secondaire (Collège & Lycée)',
    contract_type: 'CDI',
    period: '2026-11',
    base_salary: 220000,
    college_hours: 32,
    lycee_hours: 16,
    college_hourly_rate: 3500,
    lycee_hourly_rate: 3500,
    total_taught_hours: 48,
    bonuses: 25000,
    overtime_hours: 0,
    overtime_amount: 0,
    advances: 0,
    deductions: 12000,
    gross_amount: 393000,
    net_amount: 381000,
    status: 'VALIDE',
    payment_date: '2026-11-30',
    payment_method: 'VIREMENT',
    notes: 'Paie régulière de novembre 2026 (Collège & Lycée)',
  };

  // 4. Situation financière
  const sampleStudentForStatement = {
    id: 'STU-SAMPLE-01',
    matricule: 'MAT-2026-0038',
    first_name: 'Prince Albert',
    last_name: 'MASSALA',
    class_name: '3ème A',
    guardian_name: 'Albert MASSALA',
    guardian_phone: '+242 06 654 32 10',
    guardian_relation: 'Père',
  };

  const sampleStatementPayments: Payment[] = [
    samplePayment,
    {
      ...samplePayment,
      id: 'PAY-SAMPLE-02',
      receipt_number: 'QT-2026-000021',
      payment_type: 'INSCRIPTION',
      amount: 25000,
      payment_method: 'ESPECES',
      notes: 'Frais inscription & tenue scolaire',
      created_at: '2026-09-15T10:30:00Z',
    },
  ];

  const sampleFinancialSituation = {
    totalDue: 160000,
    totalPaid: 70000,
    balance: 90000,
  };

  // 5. Certificat de scolarité
  const sampleCertificateStudent = {
    id: 'STU-SAMPLE-01',
    matricule: 'MAT-2026-0038',
    first_name: 'Prince Albert',
    last_name: 'MASSALA',
    gender: 'M',
    birth_date: '2009-05-14',
    birth_place: 'Brazzaville (Poto-Poto)',
    class_name: '3ème A',
    parent_name: 'Albert MASSALA',
    regime: 'Externe',
  };

  // 6. Liste de présence
  const sampleAttendanceRows = [
    { student_id: '1', matricule: 'MAT-2026-0038', name: 'MASSALA Prince Albert', status: 'PRESENT', arrival_time: '07h25', departure_time: '12h30', motif: '' },
    { student_id: '2', matricule: 'MAT-2026-0041', name: 'MAKOSSO Grâce Épiphanie', status: 'PRESENT', arrival_time: '07h28', departure_time: '12h30', motif: '' },
    { student_id: '3', matricule: 'MAT-2026-0055', name: 'NGOMA Steve Christ', status: 'LATE', arrival_time: '07h52', departure_time: '12h30', motif: 'Retard transport en commun' },
    { student_id: '4', matricule: 'MAT-2026-0062', name: 'BIKINDOU Aimée Prudence', status: 'ABSENT', arrival_time: '—', departure_time: '—', motif: 'Raison de santé (justifiée)' },
    { student_id: '5', matricule: 'MAT-2026-0070', name: 'NZILA Jean-Paul', status: 'PRESENT', arrival_time: '07h20', departure_time: '12h30', motif: '' },
  ];

  // 7. Fiche individuelle élève
  const sampleStudentDetail = {
    id: 'STU-SAMPLE-01',
    matricule: 'MAT-2026-0038',
    first_name: 'Prince Albert',
    last_name: 'MASSALA',
    post_name: '',
    gender: 'M' as const,
    birth_date: '2009-05-14',
    birth_place: 'Brazzaville (Poto-Poto)',
    address: 'Arrondissement 3 Poto-Poto, Rue Mbochi, N° 142',
    photo_data: null,
    guardian_name: 'M. Albert MASSALA',
    guardian_phone: '+242 06 654 32 10',
    guardian_email: 'albert.massala@gmail.com',
    guardian_relation: 'Père',
    class_name: '3ème A',
    level_code: '3ème',
    cycle_code: 'COLLEGE',
    status: 'INSCRIT',
    student_notes: 'Élève assidu, aucune allergie connue.',
    academic_year: '2026-2027',
  };

  switch (docType) {
    case 'quittance':
      return (
        <CustomizableReceipt
          payment={samplePayment}
          establishment={establishment}
          format="A4"
          isDuplicate={false}
          config={config}
        />
      );

    case 'fiche_paie':
      return (
        <CustomizablePayslip
          record={samplePayslip}
          establishment={establishment}
          config={config}
        />
      );

    case 'situation_financiere':
      return (
        <CustomizableStatement
          student={sampleStudentForStatement as any}
          payments={sampleStatementPayments}
          financialSituation={sampleFinancialSituation}
          establishment={establishment}
          customConfig={config}
        />
      );

    case 'certificat_scolarite':
      return (
        <CustomizableSchoolCertificate
          student={sampleCertificateStudent}
          academicYear="2026-2027"
          establishment={establishment}
          customConfig={config}
        />
      );

    case 'liste_presence':
      return (
        <CustomizableAttendanceSheet
          classNameTitle="3ème A"
          sessionTitle="Appel Général - Surveillance"
          teacherName="M. MASSALA Albert"
          rows={sampleAttendanceRows}
          establishment={establishment}
          customConfig={config}
        />
      );

    case 'fiche_individuelle':
      return (
        <CustomizableStudentFile
          student={sampleStudentDetail}
          academicYear="2026-2027"
          establishment={establishment}
          customConfig={config}
        />
      );

    case 'bulletin':
    default:
      return (
        <CustomizableReportCard
          report={sampleReportCard}
          establishment={establishment}
          schoolClass={sampleSchoolClass}
          term="TRIMESTRE_1"
          classAverage={11.85}
          config={config}
        />
      );
  }
};
