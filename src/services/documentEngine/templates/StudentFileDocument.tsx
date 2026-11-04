import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
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
    backgroundColor: '#1e3a8a',
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
  headerWithPhoto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  identityCol: {
    flex: 1,
    marginRight: 12,
  },
  photoFrame: {
    width: 65,
    height: 80,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  photoPlaceholder: {
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
  },
  sectionCard: {
    borderWidth: 0.8,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#1e3a8a',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
  },
  sectionContent: {
    padding: 8,
  },
  row2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemHalf: {
    width: '48%',
    flexDirection: 'row',
  },
  label: {
    width: 90,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    fontSize: 8,
  },
  val: {
    flex: 1,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    fontSize: 8,
  },
  boldVal: {
    flex: 1,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    fontSize: 8.5,
  },
});

export interface StudentFileData {
  id?: string;
  first_name?: string;
  last_name?: string;
  matricule?: string;
  class_name?: string;
  birth_date?: string;
  birth_place?: string;
  gender?: string;
  nationality?: string;
  address?: string;
  city?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  parent_profession?: string;
  emergency_contact?: string;
  medical_notes?: string;
  photo_data?: string;
  created_at?: string;
}

interface StudentFileDocumentProps {
  student: StudentFileData;
  establishment?: DocumentEstablishment;
}

export const StudentFileDocument: React.FC<StudentFileDocumentProps> = ({
  student,
  establishment,
}) => {
  return (
    <Document title={`Fiche_${student.matricule || 'Eleve'}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader establishment={establishment} />

        <View style={styles.titleCard}>
          <Text style={styles.titleText}>FICHE INDIVIDUELLE D'INSCRIPTION & DOSSIER SCOLAIRE</Text>
        </View>

        <View style={styles.headerWithPhoto}>
          <View style={styles.identityCol}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>1. IDENTITÉ SCOLAIRE DE L'ÉLÈVE</Text>
              <View style={styles.sectionContent}>
                <View style={styles.row2}>
                  <View style={styles.itemHalf}>
                    <Text style={styles.label}>Nom & Prénom(s) :</Text>
                    <Text style={styles.boldVal}>
                      {student.last_name} {student.first_name}
                    </Text>
                  </View>
                  <View style={styles.itemHalf}>
                    <Text style={styles.label}>Matricule :</Text>
                    <Text style={styles.boldVal}>{student.matricule || '—'}</Text>
                  </View>
                </View>

                <View style={styles.row2}>
                  <View style={styles.itemHalf}>
                    <Text style={styles.label}>Classe inscrite :</Text>
                    <Text style={styles.val}>{student.class_name || '—'}</Text>
                  </View>
                  <View style={styles.itemHalf}>
                    <Text style={styles.label}>Sexe / Genre :</Text>
                    <Text style={styles.val}>{student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : '—'}</Text>
                  </View>
                </View>

                <View style={styles.row2}>
                  <View style={styles.itemHalf}>
                    <Text style={styles.label}>Né(e) le :</Text>
                    <Text style={styles.val}>{student.birth_date || '—'}</Text>
                  </View>
                  <View style={styles.itemHalf}>
                    <Text style={styles.label}>À (Lieu) :</Text>
                    <Text style={styles.val}>{student.birth_place || '—'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.photoFrame}>
            {student.photo_data ? (
              <Image src={student.photo_data} style={styles.photo} />
            ) : (
              <Text style={styles.photoPlaceholder}>Emplacement Photo d'identité</Text>
            )}
          </View>
        </View>

        {/* 2. Responsables légaux */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. PARENTS ET RESPONSABLES LÉGAUX</Text>
          <View style={styles.sectionContent}>
            <View style={styles.row2}>
              <View style={styles.itemHalf}>
                <Text style={styles.label}>Tuteur / Parent :</Text>
                <Text style={styles.boldVal}>{student.parent_name || '—'}</Text>
              </View>
              <View style={styles.itemHalf}>
                <Text style={styles.label}>Téléphone parent :</Text>
                <Text style={styles.boldVal}>{student.parent_phone || '—'}</Text>
              </View>
            </View>

            <View style={styles.row2}>
              <View style={styles.itemHalf}>
                <Text style={styles.label}>Profession :</Text>
                <Text style={styles.val}>{student.parent_profession || '—'}</Text>
              </View>
              <View style={styles.itemHalf}>
                <Text style={styles.label}>Contact d'urgence :</Text>
                <Text style={styles.val}>{student.emergency_contact || student.parent_phone || '—'}</Text>
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ width: '100%', flexDirection: 'row' }}>
                <Text style={styles.label}>Adresse du domicile :</Text>
                <Text style={styles.val}>
                  {[student.address, student.city].filter(Boolean).join(', ') || '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Engagements & Renseignements */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. ENGAGEMENT DE L'ÉTABLISSEMENT ET DU RESPONSABLE</Text>
          <View style={styles.sectionContent}>
            <Text style={{ fontSize: 7.5, color: '#334155', lineHeight: 1.4, marginBottom: 4 }}>
              Je soussigné(e), responsable légal de l'élève susmentionné(e), certifie l'exactitude des informations fournies lors de l'inscription et déclare accepter sans réserve le règlement intérieur de l'établissement {establishment?.name || ''}.
            </Text>
            <Text style={{ fontSize: 7, color: '#64748b' }}>
              Fait à {establishment?.city || 'Brazzaville'}, le {new Date().toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        <SignatureBox
          leftTitle="Le Responsable Légal / Parent"
          leftName={student.parent_name}
          rightTitle="Le Chef d'Établissement"
          rightName={establishment?.director_name}
        />

        <DocumentFooter />
      </Page>
    </Document>
  );
};
