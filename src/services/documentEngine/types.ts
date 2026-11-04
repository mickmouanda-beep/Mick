import React from 'react';

export type DocumentPageFormat = 'A4' | 'A5' | 'CARD_ID1';
export type DocumentOrientation = 'portrait' | 'landscape';

export interface DocumentEstablishment {
  id?: string;
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  motto?: string;
  logo_url?: string;
  academic_year?: string;
  director_name?: string;
  header_text?: string;
}

export type DocumentType =
  | 'STUDENT_CARD'
  | 'PAYMENT_RECEIPT'
  | 'REPORT_CARD'
  | 'STUDENT_FILE'
  | 'SCHOOL_CERTIFICATE'
  | 'STUDENT_STATEMENT'
  | 'PAYSLIP'
  | 'FINANCE_JOURNAL'
  | 'CLASS_LIST'
  | 'ATTENDANCE_REGISTER'
  | 'TIMETABLE'
  | 'EXAM_DOSSIER'
  | 'LESSON_LOG';

export interface GenerateDocumentOptions {
  filename?: string;
  format?: DocumentPageFormat;
  orientation?: DocumentOrientation;
  establishment?: DocumentEstablishment;
}
