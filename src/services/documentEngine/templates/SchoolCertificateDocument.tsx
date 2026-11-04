import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DocumentEstablishment } from '../types.ts';
import { DocumentHeader } from '../components/DocumentHeader.tsx';
import { DocumentFooter } from '../components/DocumentFooter.tsx';
import { SignatureBox } from '../components/SignatureBox.tsx';

const styles = StyleSheet.create({
  page: {
    padding: 32,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#0f172a',
    lineHeight: 1.6,
  },
  certificateBanner: {
    marginVertical: 18,
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
  },
  certTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  certSubtitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#64748b',
    marginTop: 3,
  },
  bodyParagraph: {
    fontSize: 10,
    color: '#1e293b',
    lineHeight: 1.8,
    marginVertical: 10,
    textAlign: 'justify',
  },
  highlight: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  matriculeBox: {
    marginVertical: 12,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
    borderRadius: 4,
  },
  matriculeLabel: {
    fontSize: 8,
    color: '#64748b',
    fontFamily: 'Helvetica-Bold',
  },
  matriculeVal: {
    fontSize: 12,
    color: '#1e3a8a',
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
    letterSpacing: 1,
  },
  legalPurposeText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    color: '#475569',
    marginTop: 15,
    marginBottom: 20,
  },
  datePlaceText: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 10,
    color: '#334155',
  },
});

export interface SchoolCertificateData {
  id?: string;
  first_name?: string;
  last_name?: string;
  matricule?: string;
  class_name?: string;
  birth_date?: string;
  birth_place?: string;
  academic_year?: string;
}

interface SchoolCertificateDocumentProps {
  student: SchoolCertificateData;
  establishment?: DocumentEstablishment;
}

export const SchoolCertificateDocument: React.FC<SchoolCertificateDocumentProps> = ({
  student,
  establishment,
}) => {
  const schoolName = establishment?.name || 'ÉTABLISSEMENT SCOLAIRE';
  const directorName = establishment?.director_name || 'Le Chef d’Établissement';
  const academicYear = student.academic_year || establishment?.academic_year || '2026-2027';
  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Document title={`Certificat_Scolarite_${student.last_name || 'Eleve'}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader establishment={establishment} />

        <View style={styles.certificateBanner}>
          <Text style={styles.certTitle}>CERTIFICAT DE SCOLARITÉ</Text>
          <Text style={styles.certSubtitle}>Document officiel d'attestation d'inscription</Text>
        </View>

        <Text style={styles.bodyParagraph}>
          Je soussigné(e), <Text style={styles.highlight}>{directorName}</Text>, Chef d'établissement de{' '}
          <Text style={styles.highlight}>{schoolName}</Text>, certifie par la présente que :
        </Text>

        <Text style={styles.bodyParagraph}>
          L'élève <Text style={styles.highlight}>{student.last_name} {student.first_name}</Text>, né(e) le{' '}
          <Text style={styles.highlight}>{student.birth_date || '—'}</Text>
          {student.birth_place ? ` à ${student.birth_place}` : ''}, est régulièrement inscrit(e) et poursuit ses études
          au sein de notre établissement en classe de <Text style={styles.highlight}>{student.class_name || 'Inscrit'}</Text>{' '}
          au titre de l'année scolaire <Text style={styles.highlight}>{academicYear}</Text>.
        </Text>

        <View style={styles.matriculeBox}>
          <Text style={styles.matriculeLabel}>IDENTIFIANT UNIQUE MATRICULE :</Text>
          <Text style={styles.matriculeVal}>{student.matricule || 'N/A'}</Text>
        </View>

        <Text style={styles.legalPurposeText}>
          En foi de quoi, ce certificat lui est délivré pour servir et valoir ce que de droit auprès des autorités et organismes compétents.
        </Text>

        <Text style={styles.datePlaceText}>
          Fait à {establishment?.city || 'Brazzaville'}, le {todayFormatted}
        </Text>

        <SignatureBox
          leftTitle="Le Secrétariat Général"
          rightTitle="Le Chef d'Établissement"
          rightName={directorName}
        />

        <DocumentFooter />
      </Page>
    </Document>
  );
};
