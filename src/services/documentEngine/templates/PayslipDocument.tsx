import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DocumentEstablishment } from '../types.ts';
import { DocumentHeader } from '../components/DocumentHeader.tsx';
import { DocumentFooter } from '../components/DocumentFooter.tsx';
import { SignatureBox } from '../components/SignatureBox.tsx';
import { numberToFrenchWords } from '../../../utils/numberToFrenchWords.ts';

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
  employeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  empCol: {
    width: '48%',
  },
  rowLine: {
    flexDirection: 'row',
    marginBottom: 2.5,
  },
  label: {
    width: 80,
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
    marginVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    padding: 5,
  },
  thColDesc: { width: '50%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5 },
  thColGain: { width: '25%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'right' },
  thColRetenue: { width: '25%', color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 7.5, textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tdDesc: { width: '50%', fontSize: 8, color: '#1e293b' },
  tdGain: { width: '25%', fontSize: 8, textAlign: 'right', color: '#059669', fontFamily: 'Helvetica-Bold' },
  tdRetenue: { width: '25%', fontSize: 8, textAlign: 'right', color: '#dc2626' },
  totalRow: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  netCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 4,
    padding: 8,
    marginVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
  },
  netVal: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
  },
  amountWordsBox: {
    padding: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginBottom: 6,
  },
  amountWordsLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  amountWordsVal: {
    fontSize: 8,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#0f172a',
    marginTop: 2,
  },
});

export interface PayslipItem {
  id?: string;
  full_name?: string;
  user_id?: string;
  role?: string;
  period?: string;
  base_salary: number;
  bonus?: number;
  deductions?: number;
  net_salary: number;
  payment_method?: string;
  payment_date?: string;
}

interface PayslipDocumentProps {
  payslip: PayslipItem;
  establishment?: DocumentEstablishment;
}

export const PayslipDocument: React.FC<PayslipDocumentProps> = ({
  payslip,
  establishment,
}) => {
  const netSalary = payslip.net_salary || 0;
  const inWords = numberToFrenchWords(netSalary);

  return (
    <Document title={`Bulletin_Paie_${payslip.full_name || 'Personnel'}_${payslip.period || ''}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader establishment={establishment} />

        <View style={styles.titleCard}>
          <Text style={styles.titleText}>BULLETIN DE PAIE DU PERSONNEL</Text>
          <Text style={styles.subTitleText}>Période : {payslip.period || 'Mois en cours'}</Text>
        </View>

        <View style={styles.employeeCard}>
          <View style={styles.empCol}>
            <View style={styles.rowLine}>
              <Text style={styles.label}>Salarié(e) :</Text>
              <Text style={styles.val}>{payslip.full_name || 'Salarié'}</Text>
            </View>
            <View style={styles.rowLine}>
              <Text style={styles.label}>Fonction / Rôle :</Text>
              <Text style={styles.val}>{payslip.role || 'Enseignant / Personnel'}</Text>
            </View>
          </View>
          <View style={styles.empCol}>
            <View style={styles.rowLine}>
              <Text style={styles.label}>Mode paiement :</Text>
              <Text style={styles.val}>{payslip.payment_method || 'Virement / Espèces'}</Text>
            </View>
            <View style={styles.rowLine}>
              <Text style={styles.label}>Date versement :</Text>
              <Text style={styles.val}>
                {payslip.payment_date ? new Date(payslip.payment_date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}
              </Text>
            </View>
          </View>
        </View>

        {/* Tableau Rubriques de Paie */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.thColDesc}>RUBRIQUES ET DÉSIGNATION</Text>
            <Text style={styles.thColGain}>GAINS / AVANTAGES</Text>
            <Text style={styles.thColRetenue}>RETENUES / DÉDUCTIONS</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.tdDesc}>Salaire de base contractuel</Text>
            <Text style={styles.tdGain}>{(payslip.base_salary || 0).toLocaleString('fr-FR')} FCFA</Text>
            <Text style={styles.tdRetenue}>—</Text>
          </View>

          {payslip.bonus ? (
            <View style={styles.tableRow}>
              <Text style={styles.tdDesc}>Primes, indemnités & heures supplémentaires</Text>
              <Text style={styles.tdGain}>{payslip.bonus.toLocaleString('fr-FR')} FCFA</Text>
              <Text style={styles.tdRetenue}>—</Text>
            </View>
          ) : null}

          {payslip.deductions ? (
            <View style={styles.tableRow}>
              <Text style={styles.tdDesc}>Retenues, cotisations & acomptes perçus</Text>
              <Text style={styles.tdGain}>—</Text>
              <Text style={styles.tdRetenue}>{payslip.deductions.toLocaleString('fr-FR')} FCFA</Text>
            </View>
          ) : null}
        </View>

        {/* Net à payer */}
        <View style={styles.netCard}>
          <Text style={styles.netLabel}>NET À PAYER AU SALARIÉ :</Text>
          <Text style={styles.netVal}>{netSalary.toLocaleString('fr-FR')} FCFA</Text>
        </View>

        <View style={styles.amountWordsBox}>
          <Text style={styles.amountWordsLabel}>Montant net en toutes lettres :</Text>
          <Text style={styles.amountWordsVal}>« {inWords} »</Text>
        </View>

        <SignatureBox
          leftTitle="L'Employé(e) (Pour acquit)"
          leftName={payslip.full_name}
          rightTitle="La Direction / Comptabilité"
          rightName={establishment?.director_name}
        />

        <DocumentFooter />
      </Page>
    </Document>
  );
};
