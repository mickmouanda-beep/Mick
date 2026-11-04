import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DocumentEstablishment } from '../types.ts';
import { DocumentHeader } from '../components/DocumentHeader.tsx';
import { DocumentFooter } from '../components/DocumentFooter.tsx';
import { SignatureBox } from '../components/SignatureBox.tsx';

const styles = StyleSheet.create({
  page: {
    padding: 20,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#0f172a',
  },
  titleCard: {
    backgroundColor: '#0f172a',
    borderRadius: 4,
    padding: 6,
    marginVertical: 6,
    alignItems: 'center',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  subTitleText: {
    color: '#93c5fd',
    fontSize: 8,
    marginTop: 2,
  },
  studentInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  infoCol: {
    width: '48%',
  },
  infoLine: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    width: 65,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },
  val: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  table: {
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    padding: 5,
  },
  thColSubject: { width: '30%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  thColNum: { width: '10%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'center' },
  thColApprec: { width: '30%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  tableRow: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tdSubject: { width: '30%', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  tdNum: { width: '10%', textAlign: 'center', fontSize: 7.5 },
  tdNumBold: { width: '10%', textAlign: 'center', fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
  tdApprec: { width: '30%', fontSize: 7, color: '#334155' },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 6,
    marginVertical: 6,
  },
  summaryCol: {
    width: '32%',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 7,
    color: '#475569',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 10,
    color: '#1e3a8a',
    fontFamily: 'Helvetica-Bold',
  },
  decisionBox: {
    padding: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 0.5,
    borderColor: '#bfdbfe',
    borderRadius: 4,
    marginVertical: 4,
  },
  decisionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1e40af',
    marginBottom: 1,
  },
  decisionText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
  },
});

export interface GradeSubjectRow {
  subject_name: string;
  coefficient: number;
  class_work_score?: number;
  exam_score?: number;
  average_score?: number;
  rank?: string | number;
  appreciation?: string;
  teacher_name?: string;
}

export interface ReportCardData {
  student_id?: string;
  student_name?: string;
  first_name?: string;
  last_name?: string;
  student_matricule?: string;
  matricule?: string;
  class_name?: string;
  term?: string;
  academic_year?: string;
  subjects?: GradeSubjectRow[];
  general_average?: number;
  class_average?: number;
  rank?: string | number;
  total_students?: number;
  decision?: string;
  principal_appreciation?: string;
}

interface ReportCardDocumentProps {
  report: ReportCardData;
  establishment?: DocumentEstablishment;
}

export const ReportCardDocument: React.FC<ReportCardDocumentProps> = ({
  report,
  establishment,
}) => {
  const fullName = report.student_name || `${report.last_name || ''} ${report.first_name || ''}`.trim();
  const matricule = report.student_matricule || report.matricule || '—';
  const termName = report.term || '1er Trimestre';
  const subjects = report.subjects || [];

  return (
    <Document title={`Bulletin_${matricule}_${termName}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader establishment={establishment} />

        <View style={styles.titleCard}>
          <Text style={styles.titleText}>BULLETIN SCOLAIRE OFFICIEL</Text>
          <Text style={styles.subTitleText}>
            Période : {termName} • Année : {report.academic_year || establishment?.academic_year || '2026-2027'}
          </Text>
        </View>

        <View style={styles.studentInfoBox}>
          <View style={styles.infoCol}>
            <View style={styles.infoLine}>
              <Text style={styles.label}>Élève :</Text>
              <Text style={styles.val}>{fullName}</Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.label}>Matricule :</Text>
              <Text style={styles.val}>{matricule}</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoLine}>
              <Text style={styles.label}>Classe :</Text>
              <Text style={styles.val}>{report.class_name || '—'}</Text>
            </View>
            <View style={styles.infoLine}>
              <Text style={styles.label}>Effectif :</Text>
              <Text style={styles.val}>{report.total_students || '—'} élèves</Text>
            </View>
          </View>
        </View>

        {/* Tableau des notes */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.thColSubject}>MATIÈRE</Text>
            <Text style={styles.thColNum}>COEF</Text>
            <Text style={styles.thColNum}>CLASSE</Text>
            <Text style={styles.thColNum}>EXAM</Text>
            <Text style={styles.thColNum}>MOY /20</Text>
            <Text style={styles.thColApprec}>APPRÉCIATION DU PROFESSEUR</Text>
          </View>

          {subjects.map((sub, idx) => (
            <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.tdSubject}>{sub.subject_name}</Text>
              <Text style={styles.tdNum}>{sub.coefficient || 1}</Text>
              <Text style={styles.tdNum}>{sub.class_work_score ?? '—'}</Text>
              <Text style={styles.tdNum}>{sub.exam_score ?? '—'}</Text>
              <Text style={styles.tdNumBold}>
                {sub.average_score !== undefined ? sub.average_score.toFixed(2) : '—'}
              </Text>
              <Text style={styles.tdApprec}>{sub.appreciation || '—'}</Text>
            </View>
          ))}
        </View>

        {/* Synthèse générale */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>MOYENNE ÉLÈVE</Text>
            <Text style={styles.summaryValue}>
              {report.general_average !== undefined ? `${report.general_average.toFixed(2)} / 20` : '—'}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>MOYENNE DE CLASSE</Text>
            <Text style={styles.summaryValue}>
              {report.class_average !== undefined ? `${report.class_average.toFixed(2)} / 20` : '—'}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>RANG</Text>
            <Text style={styles.summaryValue}>
              {report.rank ? `${report.rank}${typeof report.rank === 'number' && report.rank === 1 ? 'er' : 'ème'}` : '—'}
            </Text>
          </View>
        </View>

        {/* Décision du conseil */}
        <View style={styles.decisionBox}>
          <Text style={styles.decisionLabel}>DÉCISION DU CONSEIL DE CLASSE & APPRÉCIATION :</Text>
          <Text style={styles.decisionText}>
            {report.decision || report.principal_appreciation || 'Félicitations pour le travail accompli.'}
          </Text>
        </View>

        <SignatureBox
          leftTitle="Le Professeur Principal"
          rightTitle="Le Chef d'Établissement"
          rightName={establishment?.director_name}
        />

        <DocumentFooter />
      </Page>
    </Document>
  );
};
