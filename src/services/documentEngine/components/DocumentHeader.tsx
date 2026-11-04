import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { DocumentEstablishment } from '../types.ts';

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1e3a8a',
    paddingBottom: 8,
  },
  topRepublicBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
  },
  republicText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yearText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: 'contain',
    borderRadius: 4,
    marginRight: 10,
  },
  logoPlaceholder: {
    width: 44,
    height: 44,
    backgroundColor: '#1e3a8a',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoPlaceholderText: {
    color: '#ffffff',
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
  },
  centerInfo: {
    flex: 1,
    textAlign: 'center',
  },
  schoolName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  motto: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#64748b',
    marginBottom: 2,
  },
  contact: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#475569',
  },
  rightStampBox: {
    width: 60,
    alignItems: 'flex-end',
  },
  codeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  codeText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
  },
});

interface DocumentHeaderProps {
  establishment?: DocumentEstablishment;
  title?: string;
  subtitle?: string;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  establishment,
  title,
  subtitle,
}) => {
  const schoolName = establishment?.name || 'ÉTABLISSEMENT SCOLAIRE';
  const year = establishment?.academic_year || '2026-2027';
  const contactParts = [
    establishment?.address,
    establishment?.city,
    establishment?.phone ? `Tél: ${establishment.phone}` : '',
    establishment?.email,
  ].filter(Boolean).join(' • ');

  return (
    <View style={styles.container}>
      <View style={styles.topRepublicBar}>
        <Text style={styles.republicText}>
          {establishment?.header_text || 'RÉPUBLIQUE DU CONGO • MINISTÈRE DE L’ENSEIGNEMENT'}
        </Text>
        <Text style={styles.yearText}>Année scolaire : {year}</Text>
      </View>

      <View style={styles.mainRow}>
        {establishment?.logo_url ? (
          <Image src={establishment.logo_url} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>{schoolName.charAt(0)}</Text>
          </View>
        )}

        <View style={styles.centerInfo}>
          <Text style={styles.schoolName}>{schoolName}</Text>
          {establishment?.motto ? (
            <Text style={styles.motto}>« {establishment.motto} »</Text>
          ) : null}
          <Text style={styles.contact}>
            {contactParts || 'Gestion Scolaire Numérique Sécurisée'}
          </Text>
        </View>

        <View style={styles.rightStampBox}>
          {establishment?.code ? (
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>CODE: {establishment.code}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};
