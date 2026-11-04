import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { DocumentEstablishment } from '../types.ts';
import { DocumentHeader } from '../components/DocumentHeader.tsx';
import { DocumentFooter } from '../components/DocumentFooter.tsx';
import { Watermark } from '../components/Watermark.tsx';
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
  receiptTitleCard: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  receiptRef: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0284c7',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  infoCol: {
    width: '48%',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    width: '38%',
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
  },
  infoVal: {
    flex: 1,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#0f172a',
  },
  table: {
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    padding: 6,
    color: '#ffffff',
  },
  tableHeaderCol1: {
    width: '70%',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableHeaderCol2: {
    width: '30%',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  col1: {
    width: '70%',
    fontSize: 8.5,
    fontFamily: 'Helvetica',
  },
  col2: {
    width: '30%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#0f172a',
  },
  totalRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  totalLabel: {
    width: '70%',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
  },
  totalVal: {
    width: '30%',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#1e3a8a',
  },
  amountWordsBox: {
    padding: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginVertical: 6,
  },
  amountWordsLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  amountWordsText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-BoldOblique',
    color: '#0f172a',
  },
  balanceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 0.5,
    borderColor: '#fef3c7',
    borderRadius: 4,
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 7.5,
    color: '#92400e',
    fontFamily: 'Helvetica',
  },
  balanceVal: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#b45309',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  qrCodeBox: {
    width: 60,
    alignItems: 'center',
  },
  qrCodeImage: {
    width: 50,
    height: 50,
  },
});

export interface ReceiptPaymentData {
  id?: string;
  receipt_number?: string;
  amount: number;
  payment_method?: string;
  payer_name?: string;
  transaction_reference?: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  matricule?: string;
  class_name?: string;
  notes?: string;
  cashier_name?: string;
  total_due?: number;
  balance_after?: number;
  reprint_count?: number;
  status?: string;
}

interface ReceiptDocumentProps {
  payment: ReceiptPaymentData;
  establishment?: DocumentEstablishment;
  format?: 'A4' | 'A5';
  qrCodeDataUrl?: string;
}

export const ReceiptDocument: React.FC<ReceiptDocumentProps> = ({
  payment,
  establishment,
  format = 'A4',
  qrCodeDataUrl,
}) => {
  const isDuplicate = Boolean(payment.reprint_count && payment.reprint_count > 0) || payment.status === 'DUPLICATA';
  const isCancelled = payment.status === 'ANNULE';
  const dateFormatted = payment.created_at
    ? new Date(payment.created_at).toLocaleDateString('fr-FR')
    : new Date().toLocaleDateString('fr-FR');
  const amountWords = numberToFrenchWords(payment.amount || 0);

  return (
    <Document title={`Quittance_${payment.receipt_number || 'paiement'}`}>
      <Page size={format === 'A5' ? 'A5' : 'A4'} style={styles.page}>
        {isCancelled ? (
          <Watermark text="ANNULÉE" />
        ) : isDuplicate ? (
          <Watermark text="DUPLICATA" />
        ) : null}

        <DocumentHeader establishment={establishment} />

        <View style={styles.receiptTitleCard}>
          <Text style={styles.title}>
            {isCancelled
              ? 'QUITTANCE DE PAIEMENT (ANNULÉE)'
              : isDuplicate
              ? 'QUITTANCE DE PAIEMENT (DUPLICATA)'
              : 'QUITTANCE DE PAIEMENT OFFICIELLE'}
          </Text>
          <Text style={styles.receiptRef}>
            N° {payment.receipt_number || 'QT-0000'} • Date : {dateFormatted}
          </Text>
        </View>

        {/* Détails Élève et Règlement */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Élève :</Text>
              <Text style={styles.infoVal}>
                {payment.last_name || ''} {payment.first_name || ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Matricule :</Text>
              <Text style={styles.infoVal}>{payment.matricule || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Classe :</Text>
              <Text style={styles.infoVal}>{payment.class_name || 'Inscrit'}</Text>
            </View>
          </View>

          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payé par :</Text>
              <Text style={styles.infoVal}>{payment.payer_name || 'Responsable légal'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mode :</Text>
              <Text style={styles.infoVal}>{payment.payment_method || 'Espèces'}</Text>
            </View>
            {payment.transaction_reference ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Réf Trans :</Text>
                <Text style={styles.infoVal}>{payment.transaction_reference}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Tableau des montants */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCol1}>DÉSIGNATION / MOTIF DU PAIEMENT</Text>
            <Text style={styles.tableHeaderCol2}>MONTANT REÇU</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.col1}>
              {payment.notes || 'Règlement des frais de scolarité & annexes'}
            </Text>
            <Text style={styles.col2}>
              {(payment.amount || 0).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL NET ENCAISSÉ</Text>
            <Text style={styles.totalVal}>
              {(payment.amount || 0).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>

        {/* Montant en lettres */}
        <View style={styles.amountWordsBox}>
          <Text style={styles.amountWordsLabel}>Montant versé en toutes lettres :</Text>
          <Text style={styles.amountWordsText}>« {amountWords} »</Text>
        </View>

        {/* Solde restant si pertinent */}
        {payment.total_due ? (
          <View style={styles.balanceBox}>
            <Text style={styles.balanceText}>
              Total exigible : {(payment.total_due || 0).toLocaleString('fr-FR')} FCFA
            </Text>
            <Text style={styles.balanceVal}>
              Reste à devoir : {(payment.balance_after ?? 0).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        ) : null}

        {/* Bas de page avec Signatures et QR code */}
        <View style={styles.bottomRow}>
          {qrCodeDataUrl ? (
            <View style={styles.qrCodeBox}>
              <Image src={qrCodeDataUrl} style={styles.qrCodeImage} />
            </View>
          ) : null}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <SignatureBox
              leftTitle="L’Agent de Caisse"
              leftName={payment.cashier_name || 'Caisse Centrale'}
              rightTitle="La Direction / Cachet Officiel"
            />
          </View>
        </View>

        <DocumentFooter />
      </Page>
    </Document>
  );
};
