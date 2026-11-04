import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkText: {
    fontSize: 54,
    fontFamily: 'Helvetica-Bold',
    color: '#e2e8f0',
    opacity: 0.35,
    textTransform: 'uppercase',
    letterSpacing: 6,
    transform: 'rotate(-30deg)',
  },
});

interface WatermarkProps {
  text: string;
}

export const Watermark: React.FC<WatermarkProps> = ({ text }) => {
  return (
    <View style={styles.container} fixed>
      <Text style={styles.watermarkText}>{text}</Text>
    </View>
  );
};
