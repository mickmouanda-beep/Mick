import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DocumentEstablishment, DocumentOrientation } from '../types.ts';
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
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  subTitleText: {
    color: '#93c5fd',
    fontSize: 7.5,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 5,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
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
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  thCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tdCell: {
    fontSize: 7,
    color: '#1e293b',
  },
});

export interface TableColumn {
  header: string;
  width?: string | number; // e.g. '20%'
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface GenericTableData {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  columns: TableColumn[];
  rows: (string | number)[][];
  orientation?: DocumentOrientation;
  showSignature?: boolean;
  signatureTitles?: { left?: string; right?: string };
}

interface GenericTableDocumentProps {
  data: GenericTableData;
  establishment?: DocumentEstablishment;
}

export const GenericTableDocument: React.FC<GenericTableDocumentProps> = ({
  data,
  establishment,
}) => {
  const orientation = data.orientation || 'portrait';
  const columns = data.columns || [];
  const rows = data.rows || [];
  const defaultColWidth = `${(100 / Math.max(1, columns.length)).toFixed(2)}%`;

  return (
    <Document title={data.title.replace(/\s+/g, '_')}>
      <Page size="A4" orientation={orientation} style={styles.page}>
        <DocumentHeader establishment={establishment} />

        <View style={styles.titleCard}>
          <Text style={styles.titleText}>{data.title}</Text>
          {data.subtitle ? <Text style={styles.subTitleText}>{data.subtitle}</Text> : null}
        </View>

        {data.meta && data.meta.length > 0 ? (
          <View style={styles.metaRow}>
            {data.meta.map((m, idx) => (
              <Text key={idx} style={styles.metaText}>
                {m.label} : <Text style={{ color: '#0f172a' }}>{m.value}</Text>
              </Text>
            ))}
          </View>
        ) : null}

        {/* Tableau de données */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {columns.map((col, idx) => (
              <Text
                key={idx}
                style={[
                  styles.thCell,
                  {
                    width: col.width || defaultColWidth,
                    textAlign: col.align || 'left',
                  },
                ]}
              >
                {col.header}
              </Text>
            ))}
          </View>

          {rows.length === 0 ? (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 7.5, color: '#94a3b8' }}>
                Aucune donnée à afficher pour ce document.
              </Text>
            </View>
          ) : (
            rows.map((row, rIdx) => (
              <View key={rIdx} style={rIdx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                {row.map((val, cIdx) => {
                  const col = columns[cIdx];
                  return (
                    <Text
                      key={cIdx}
                      style={[
                        styles.tdCell,
                        {
                          width: col?.width || defaultColWidth,
                          textAlign: col?.align || 'left',
                          fontFamily: col?.bold ? 'Helvetica-Bold' : 'Helvetica',
                        },
                      ]}
                    >
                      {val ?? '—'}
                    </Text>
                  );
                })}
              </View>
            ))
          )}
        </View>

        {data.showSignature ? (
          <SignatureBox
            leftTitle={data.signatureTitles?.left || 'Le Responsable'}
            rightTitle={data.signatureTitles?.right || 'Le Chef d’Établissement'}
            rightName={establishment?.director_name}
          />
        ) : null}

        <DocumentFooter />
      </Page>
    </Document>
  );
};
