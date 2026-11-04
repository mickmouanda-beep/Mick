import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { DocumentEstablishment } from '../types.ts';

// Format standard ID-1 ISO/IEC 7810 : 85.6mm x 54mm (242.64pt x 153.07pt)
const CARD_WIDTH = 242.64;
const CARD_HEIGHT = 153.07;

const styles = StyleSheet.create({
  page: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    padding: 8,
    backgroundColor: '#0f172a', // Navy 900
    color: '#ffffff',
    fontFamily: 'Helvetica',
  },
  cardBorder: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 8,
    padding: 6,
    justifyContent: 'space-between',
  },
  // RECTO STYLES
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.8,
    borderBottomColor: '#2563eb',
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 4,
  },
  schoolLogo: {
    width: 22,
    height: 22,
    borderRadius: 4,
    objectFit: 'cover',
    borderWidth: 0.5,
    borderColor: '#ffffff',
    marginRight: 5,
  },
  schoolLogoPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  schoolLogoText: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  schoolName: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#93c5fd',
  },
  sideBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  sideBadgeText: {
    fontSize: 5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    flex: 1,
  },
  photoBox: {
    width: 44,
    height: 56,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 7,
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholderText: {
    fontSize: 6,
    color: '#64748b',
    textAlign: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  matriculeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#fbbf24', // Gold
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 6,
    color: '#cbd5e1',
    marginBottom: 1,
  },
  detailValue: {
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 0.6,
    borderTopColor: 'rgba(59, 130, 246, 0.4)',
    paddingTop: 3,
  },
  signatureCol: {
    justifyContent: 'flex-end',
  },
  signatureLabel: {
    fontSize: 4.5,
    color: '#94a3b8',
    marginBottom: 1,
  },
  signatureName: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#93c5fd',
  },
  qrCodeBox: {
    backgroundColor: '#ffffff',
    padding: 1.5,
    borderRadius: 3,
  },
  qrCodeImage: {
    width: 28,
    height: 28,
  },
  // VERSO STYLES
  versoBody: {
    flex: 1,
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  ruleText: {
    fontSize: 5.5,
    color: '#e2e8f0',
    lineHeight: 1.35,
  },
  contactBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderRadius: 4,
    padding: 3,
    marginTop: 2,
  },
  contactText: {
    fontSize: 5.5,
    fontFamily: 'Helvetica-Bold',
    color: '#60a5fa',
    textAlign: 'center',
  },
  versoFooterText: {
    fontSize: 4.5,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(59, 130, 246, 0.3)',
    paddingTop: 2,
    letterSpacing: 0.5,
  },
});

export interface StudentCardData {
  id?: string;
  first_name?: string;
  last_name?: string;
  matricule?: string;
  class_name?: string;
  birth_date?: string;
  photo_data?: string;
  academic_year?: string;
}

interface StudentCardDocumentProps {
  student: StudentCardData;
  establishment?: DocumentEstablishment;
  qrCodeDataUrl?: string;
}

export const StudentCardDocument: React.FC<StudentCardDocumentProps> = ({
  student,
  establishment,
  qrCodeDataUrl,
}) => {
  const schoolName = establishment?.name || 'ÉTABLISSEMENT SCOLAIRE';
  const year = student.academic_year || establishment?.academic_year || '2026-2027';

  return (
    <Document title={`Carte_Scolaire_${student.last_name || 'Eleve'}`}>
      {/* PAGE 1 : RECTO (85.6mm x 54mm) */}
      <Page size={[CARD_WIDTH, CARD_HEIGHT]} style={styles.page}>
        <View style={styles.cardBorder}>
          {/* En-tête */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {establishment?.logo_url ? (
                <Image src={establishment.logo_url} style={styles.schoolLogo} />
              ) : (
                <View style={styles.schoolLogoPlaceholder}>
                  <Text style={styles.schoolLogoText}>{schoolName.charAt(0)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.schoolName}>
                  {schoolName}
                </Text>
                <Text style={styles.cardTitle}>Carte Scolaire • {year}</Text>
              </View>
            </View>
            <View style={styles.sideBadge}>
              <Text style={styles.sideBadgeText}>RECTO</Text>
            </View>
          </View>

          {/* Corps : Photo + Données */}
          <View style={styles.bodyRow}>
            <View style={styles.photoBox}>
              {student.photo_data ? (
                <Image src={student.photo_data} style={styles.photo} />
              ) : (
                <Text style={styles.photoPlaceholderText}>Photo</Text>
              )}
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.studentName}>
                {student.last_name} {student.first_name}
              </Text>
              <Text style={styles.matriculeText}>N° {student.matricule || 'N/A'}</Text>
              <Text style={styles.detailText}>
                Classe : <Text style={styles.detailValue}>{student.class_name || 'Inscrit'}</Text>
              </Text>
              <Text style={styles.detailText}>
                Né(e) le : <Text style={styles.detailValue}>{student.birth_date || '—'}</Text>
              </Text>
            </View>
          </View>

          {/* Pied : Signature & QR Code */}
          <View style={styles.footerRow}>
            <View style={styles.signatureCol}>
              <Text style={styles.signatureLabel}>Signature de la Direction :</Text>
              <Text style={styles.signatureName}>Direction Générale</Text>
            </View>
            {qrCodeDataUrl ? (
              <View style={styles.qrCodeBox}>
                <Image src={qrCodeDataUrl} style={styles.qrCodeImage} />
              </View>
            ) : null}
          </View>
        </View>
      </Page>

      {/* PAGE 2 : VERSO (85.6mm x 54mm) */}
      <Page size={[CARD_WIDTH, CARD_HEIGHT]} style={styles.page}>
        <View style={styles.cardBorder}>
          <View style={styles.headerRow}>
            <Text style={styles.schoolName}>RÈGLEMENT INTÉRIEUR</Text>
            <View style={styles.sideBadge}>
              <Text style={styles.sideBadgeText}>VERSO</Text>
            </View>
          </View>

          <View style={styles.versoBody}>
            <Text style={styles.ruleText}>1. Cette carte est strictement personnelle et incessible.</Text>
            <Text style={styles.ruleText}>
              2. Elle doit être présentée à toute réquisition au sein de l'établissement.
            </Text>
            <Text style={styles.ruleText}>
              3. En cas de perte, aviser immédiatement la direction pour remplacement.
            </Text>

            <View style={styles.contactBox}>
              <Text style={styles.contactText}>
                CODE : {establishment?.code || '—'}
                {establishment?.phone ? `  •  TÉL : ${establishment.phone}` : ''}
              </Text>
            </View>
          </View>

          <Text style={styles.versoFooterText}>
            Plateforme Eco GES • Tous droits réservés
          </Text>
        </View>
      </Page>
    </Document>
  );
};
