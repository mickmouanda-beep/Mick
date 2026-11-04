import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 8,
  },
  sigBlock: {
    width: '45%',
    alignItems: 'center',
    padding: 6,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
    minHeight: 55,
  },
  title: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 7,
    fontFamily: 'Helvetica',
    color: '#64748b',
    marginBottom: 16,
  },
  stampNotice: {
    fontSize: 6,
    fontFamily: 'Helvetica-Oblique',
    color: '#94a3b8',
  },
});

interface SignatureBoxProps {
  leftTitle?: string;
  leftName?: string;
  rightTitle?: string;
  rightName?: string;
}

export const SignatureBox: React.FC<SignatureBoxProps> = ({
  leftTitle = 'L’Agent Comptable / Le Caissier',
  leftName,
  rightTitle = 'La Direction / Le Chef d’Établissement',
  rightName,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.sigBlock}>
        <Text style={styles.title}>{leftTitle}</Text>
        {leftName ? <Text style={styles.name}>{leftName}</Text> : null}
        <Text style={styles.stampNotice}>Visa & Signature</Text>
      </View>

      <View style={styles.sigBlock}>
        <Text style={styles.title}>{rightTitle}</Text>
        {rightName ? <Text style={styles.name}>{rightName}</Text> : null}
        <Text style={styles.stampNotice}>Cachet officiel & Signature</Text>
      </View>
    </View>
  );
};
