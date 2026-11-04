import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legalText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica',
    color: '#94a3b8',
  },
  pageNumber: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
  },
});

interface DocumentFooterProps {
  customNotice?: string;
}

export const DocumentFooter: React.FC<DocumentFooterProps> = ({ customNotice }) => {
  return (
    <View style={styles.container} fixed>
      <Text style={styles.legalText}>
        {customNotice || 'Document officiel certifié généré par la plateforme Eco GES • Tous droits réservés'}
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
};
