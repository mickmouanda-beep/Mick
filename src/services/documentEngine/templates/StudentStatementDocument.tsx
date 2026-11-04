import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DocumentEstablishment } from '../types.ts';
import { DocumentHeader } from '../components/DocumentHeader.tsx';
import { DocumentFooter } from '../components/DocumentFooter.tsx';
import { SignatureBox } from '../components/SignatureBox.tsx';

const styles = StyleSheet.create({
  page: {
    padding: 24,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 8.5,
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
  studentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  studentCol: {
    width: '48%',
  },
  rowLine: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  label: {
    width: 70,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },
  val: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  kpiCard: {
    width: '31%',
    padding: 6,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 0.8,
  },
  kpiDue: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  kpiPaid: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  kpiBalance: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  kpiLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    marginBottom: 2,
  },
  kpiVal: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  table: {
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    padding: 5,
  },
  th1: { width: '25%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  th2: { width: '25%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  th3: { width: '25%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  th4: { width: '25%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  td1: { width: '25%', fontSize: 8, color: '#334155' },
  td2: { width: '25%', fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  td3: { width: '25%', fontSize: 8, color: '#475569' },
  td4: { width: '25%', fontSize: 8.5, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: '#0f172a' },
});

export interface StatementPaymentItem {
  id?: string;
  receipt_number?: string;
  amount: number;
  payment_method?: string;
  created_at?: string;
  notes?: string;
}

export interface StudentStatementData {
  student: {
    first_name?: string;
    last_name?: string;
    matricule?: string;
    class_name?: string;
  };
  financialSituation: {
    total_due?: number;
    total_paid?: number;
    balance?: number;
  };
  payments: StatementPaymentItem[];
}

interface StudentStatementDocumentProps {
  data: StudentStatementData;
  establishment?: DocumentEstablishment;
}

export const StudentStatementDocument: React.FC<StudentStatementDocumentProps> = ({
  data,
  establishment,
}) => {
  const { student, financialSituation, payments = [] } = data;
  const fullName = `${student.last_name || ''} ${student.first_name || ''}`.trim();
  const totalDue = financialSituation?.total_due || 0;
  const totalPaid = financialSituation?.total_paid || 0;
  const balance = financialSituation?.balance ?? (totalDue - totalPaid);

  return (
    <Document title={`Releve_Compte_${student.matricule || 'Eleve'}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader establishment={establishment} />

        <View style={styles.titleCard}>
          <Text style={styles.titleText}>RELEVÉ DE COMPTE & SITUATION FINANCIÈRE</Text>
          <Text style={styles.subTitleText}>Historique certifié des règlements scolaires</Text>
        </View>

        <View style={styles.studentBox}>
          <View style={styles.studentCol}>
            <View style={styles.rowLine}>
              <Text style={styles.label}>Élève :</Text>
              <Text style={styles.val}>{fullName}</Text>
            </View>
            <View style={styles.rowLine}>
              <Text style={styles.label}>Matricule :</Text>
              <Text style={styles.val}>{student.matricule || '—'}</Text>
            </View>
          </View>
          <View style={styles.studentCol}>
            <View style={styles.rowLine}>
              <Text style={styles.label}>Classe :</Text>
              <Text style={styles.val}>{student.class_name || '—'}</Text>
            </View>
            <View style={styles.rowLine}>
              <Text style={styles.label}>Date relevé :</Text>
              <Text style={styles.val}>{new Date().toLocaleDateString('fr-FR')}</Text>
            </View>
          </View>
        </View>

        {/* 3 KPI financiers */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, styles.kpiDue]}>
            <Text style={styles.kpiLabel}>TOTAL EXIGIBLE</Text>
            <Text style={styles.kpiVal}>{totalDue.toLocaleString('fr-FR')} FCFA</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiPaid]}>
            <Text style={styles.kpiLabel}>TOTAL VERSÉ</Text>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>
              {totalPaid.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiBalance]}>
            <Text style={styles.kpiLabel}>RESTE À RECOUVRER</Text>
            <Text style={[styles.kpiVal, { color: balance > 0 ? '#d97706' : '#059669' }]}>
              {balance.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>

        {/* Tableau chronologique des versements */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.th1}>DATE</Text>
            <Text style={styles.th2}>N° QUITTANCE</Text>
            <Text style={styles.th3}>MODE DE RÈGLEMENT</Text>
            <Text style={styles.th4}>MONTANT VERSÉ</Text>
          </View>

          {payments.length === 0 ? (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: '#94a3b8' }}>
                Aucun versement enregistré à ce jour.
              </Text>
            </View>
          ) : (
            payments.map((p, idx) => (
              <View key={p.id || idx} style={styles.tableRow}>
                <Text style={styles.td1}>
                  {p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '—'}
                </Text>
                <Text style={styles.td2}>{p.receipt_number || 'QT-0000'}</Text>
                <Text style={styles.td3}>{p.payment_method || 'Espèces'}</Text>
                <Text style={styles.td4}>{(p.amount || 0).toLocaleString('fr-FR')} FCFA</Text>
              </View>
            ))
          )}
        </View>

        <SignatureBox
          leftTitle="L'Agent Comptable"
          rightTitle="Le Chef d'Établissement"
          rightName={establishment?.director_name}
        />

        <DocumentFooter />
      </Page>
    </Document>
  );
};
