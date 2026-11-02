import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  ArrowRightLeft,
  Archive,
  Printer,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  School,
  FileText,
  Camera,
  Image as ImageIcon,
  Check,
  Download,
  Key,
  Copy,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Student, SchoolClass, Payment } from '../types.ts';
import { StudentPhotoCapture } from '../components/StudentPhotoCapture.tsx';
import { sortStudents } from '../lib/sortingUtils.ts';
import { PaymentReceiptModal } from '../components/PaymentReceiptModal.tsx';
import { StudentStatementModal } from '../components/StudentStatementModal.tsx';
import { CloseButton } from '../components/CloseButton.tsx';
import { PrintHeader } from '../components/PrintHeader.tsx';
import { printDocument, downloadPdf } from '../utils/printPdfUtils.ts';
import { CustomizableSchoolCertificate } from '../components/documents/CustomizableSchoolCertificate.tsx';

export const StudentsView: React.FC = () => {
  const { establishment, hasRole, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTab, setDetailTab] = useState<'fiche' | 'payments' | 'certificat'>('fiche');
  const [receiptsToPrint, setReceiptsToPrint] = useState<Payment[] | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedStudentPaymentIds, setSelectedStudentPaymentIds] = useState<string[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [destinationSchool, setDestinationSchool] = useState('');

  // Réparation des liaisons parents-élèves
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairReport, setRepairReport] = useState<any | null>(null);

  const handleRunRepair = async (dryRun: boolean) => {
    setRepairing(true);
    setError(null);
    try {
      const res = await api.repairParentStudentLinks({ dryRun });
      setRepairReport(res);
      if (!dryRun) {
        setSuccess(res.message);
        await loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réparation des liaisons.');
    } finally {
      setRepairing(false);
    }
  };

  // Modification photo pour un élève existant
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editPhotoData, setEditPhotoData] = useState<string | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Formulaire d'inscription (champs séparés pour nom et prénom)
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [postName, setPostName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('2012-05-15');
  const [birthPlace, setBirthPlace] = useState('Brazzaville');
  const [address, setAddress] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianRelation, setGuardianRelation] = useState('Père');
  const [assignedClassId, setAssignedClassId] = useState('');
  const [studentNotes, setStudentNotes] = useState('');
  const [photoData, setPhotoData] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPromoteur = user?.role === 'PROMOTEUR';
  const canEnroll = hasRole(['DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE', 'SURVEILLANT']) && !isPromoteur;
  const canEdit = hasRole(['DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE']) && !isPromoteur;

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuData, clsData] = await Promise.all([
        api.getStudents({
          classId: selectedClassFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        api.getClasses(),
      ]);
      setStudents(sortStudents(stuData));
      setClasses(clsData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des élèves.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedClassFilter, statusFilter]);

  // Écoute de la touche Échap et du bouton Retour pour fermer les modales ouvertes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPhotoModal) setShowPhotoModal(false);
        else if (showTransferModal) setShowTransferModal(false);
        else if (showStatementModal) setShowStatementModal(false);
        else if (receiptsToPrint) setReceiptsToPrint(null);
        else if (showDetailModal) setShowDetailModal(false);
        else if (showAddModal) setShowAddModal(false);
      }
    };

    const handlePopState = () => {
      if (showPhotoModal) setShowPhotoModal(false);
      else if (showTransferModal) setShowTransferModal(false);
      else if (showStatementModal) setShowStatementModal(false);
      else if (receiptsToPrint) setReceiptsToPrint(null);
      else if (showDetailModal) setShowDetailModal(false);
      else if (showAddModal) setShowAddModal(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showPhotoModal, showTransferModal, showStatementModal, receiptsToPrint, showDetailModal, showAddModal]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  // Modal des comptes d'accès Élève / Parent
  const [createdAccountsModal, setCreatedAccountsModal] = useState<any | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const handleFetchAccountCredentials = async () => {
    if (!selectedStudent) return;
    setLoadingAccounts(true);
    try {
      const res = await api.provisionStudentAccounts(selectedStudent.student.id);
      setCreatedAccountsModal({
        studentName: `${selectedStudent.student.last_name} ${selectedStudent.student.first_name}`,
        matricule: selectedStudent.student.matricule,
        accounts: res.accounts,
      });
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la récupération des comptes d\'accès.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lastName.trim()) {
      setError("Le nom de famille de l'élève est obligatoire.");
      return;
    }
    if (!firstName.trim()) {
      setError("Le prénom de l'élève est obligatoire.");
      return;
    }
    if (!guardianName.trim() || !guardianPhone.trim()) {
      setError("Les coordonnées du responsable légal (nom et téléphone) sont obligatoires.");
      return;
    }

    try {
      const res = await api.createStudent({
        lastName: lastName.trim().toUpperCase(),
        firstName: firstName.trim(),
        postName: postName.trim() || null,
        gender,
        birthDate,
        birthPlace: birthPlace || null,
        address: address || null,
        guardianName: guardianName.trim(),
        guardianPhone: guardianPhone.trim(),
        guardianEmail: guardianEmail.trim() || null,
        guardianRelation,
        classId: assignedClassId || null,
        notes: studentNotes.trim() || null,
        photoData: photoData || null,
      });

      setSuccess(`Élève ${lastName.toUpperCase()} ${firstName} inscrit(e) avec succès (Matricule officiel : ${res.matricule}).`);
      setShowAddModal(false);

      if (res.accounts) {
        setCreatedAccountsModal({
          studentName: `${lastName.toUpperCase()} ${firstName}`,
          matricule: res.matricule,
          accounts: res.accounts,
        });
      }

      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setLastName('');
    setFirstName('');
    setPostName('');
    setAddress('');
    setGuardianName('');
    setGuardianPhone('');
    setGuardianEmail('');
    setStudentNotes('');
    setPhotoData(null);
  };

  const handleViewDetail = async (studentId: string) => {
    try {
      const details = await api.getStudentById(studentId);
      setSelectedStudent(details);
      setShowDetailModal(true);
    } catch (err: any) {
      setError('Impossible de charger le dossier complet de cet élève.');
    }
  };

  const handleOpenPhotoModal = () => {
    if (!selectedStudent) return;
    setEditPhotoData(selectedStudent.student.photo_data || null);
    setShowPhotoModal(true);
  };

  const handleSaveStudentPhoto = async () => {
    if (!selectedStudent) return;
    setSavingPhoto(true);
    try {
      await api.updateStudent(selectedStudent.student.id, {
        firstName: selectedStudent.student.first_name,
        lastName: selectedStudent.student.last_name,
        postName: selectedStudent.student.post_name,
        gender: selectedStudent.student.gender,
        birthDate: selectedStudent.student.birth_date,
        birthPlace: selectedStudent.student.birth_place,
        address: selectedStudent.student.address,
        guardianName: selectedStudent.student.guardian_name,
        guardianPhone: selectedStudent.student.guardian_phone,
        guardianEmail: selectedStudent.student.guardian_email,
        guardianRelation: selectedStudent.student.guardian_relation,
        classId: selectedStudent.student.class_id,
        status: selectedStudent.student.status,
        notes: selectedStudent.student.notes,
        photoData: editPhotoData,
      });

      // Mettre à jour l'état local
      setSelectedStudent({
        ...selectedStudent,
        student: {
          ...selectedStudent.student,
          photo_data: editPhotoData,
        },
      });

      setSuccess("Photo de l'élève mise à jour avec succès.");
      setShowPhotoModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de la photo.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedStudent) return;
    try {
      await api.transferStudent(selectedStudent.student.id, {
        reason: transferReason,
        destinationSchool,
      });
      setSuccess("Transfert de l'élève enregistré avec succès.");
      setShowTransferModal(false);
      setShowDetailModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!window.confirm(`Confirmez-vous l'archivage sécurisé du dossier de ${name} ?`)) return;
    try {
      await api.deleteStudent(id);
      setSuccess(`Dossier de ${name} archivé avec traçabilité.`);
      setShowDetailModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Gestion des Dossiers & Inscriptions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Matricule unique • Nom & Prénoms séparés • Scan photo d'identité • Fiche d'inscription officielle
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES', 'GESTIONNAIRE', 'ADMIN_GENERAL']) && (
            <button
              onClick={() => {
                setShowRepairModal(true);
                handleRunRepair(true); // dryRun par défaut
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Réparer les liaisons parents-élèves</span>
            </button>
          )}

          {isPromoteur ? (
            <div className="flex items-center space-x-2 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Supervision Promoteur</span>
            </div>
          ) : canEnroll ? (
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Inscrire un Nouvel Élève</span>
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl flex items-center justify-between text-rose-200 text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center justify-between text-emerald-200 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barre de Recherche et Filtres */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher nom, prénom, matricule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="">Statut : Tous</option>
            <option value="INSCRIT">Inscrits</option>
            <option value="REINSCRIT">Réinscrits</option>
            <option value="TRANSFERE">Transférés</option>
            <option value="ARCHIVE">Archivés</option>
          </select>

          <button
            onClick={loadData}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
          >
            Filtrer
          </button>
        </div>
      </div>

      {/* Tableau des Élèves */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">Aucun élève trouvé</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Utilisez le bouton "Inscrire un Nouvel Élève" pour enregistrer les premiers élèves avec leur photo d'identité officielle.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Photo</th>
                  <th className="p-3.5">Matricule</th>
                  <th className="p-3.5">Nom de famille</th>
                  <th className="p-3.5">Prénom(s)</th>
                  <th className="p-3.5">Sexe</th>
                  <th className="p-3.5">Classe</th>
                  <th className="p-3.5">Responsable Légal</th>
                  <th className="p-3.5">Téléphone</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((stu, idx) => (
                  <tr key={stu.id ? `${stu.id}-${idx}` : `stu-${idx}`} className="hover:bg-slate-800/40 transition">
                    {/* Miniature Photo de l'élève */}
                    <td className="p-3.5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
                        {stu.photo_data ? (
                          <img
                            src={stu.photo_data}
                            alt={`${stu.last_name} ${stu.first_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] font-bold text-indigo-400">
                            {stu.last_name?.[0] || '?'}{stu.first_name?.[0] || ''}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {stu.matricule}
                    </td>

                    {/* Nom en majuscules bien séparé */}
                    <td className="p-3.5 font-bold text-white tracking-wide">
                      {stu.last_name}
                    </td>

                    {/* Prénoms bien séparés */}
                    <td className="p-3.5 text-slate-200">
                      {stu.first_name} {stu.post_name ? <span className="text-slate-400 text-[11px]">({stu.post_name})</span> : ''}
                    </td>

                    <td className="p-3.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${stu.gender === 'F' ? 'bg-pink-500/15 text-pink-300 border border-pink-500/20' : 'bg-blue-500/15 text-blue-300 border border-blue-500/20'}`}>
                        {stu.gender}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {stu.class_name ? (
                        <span className="font-semibold text-indigo-300">{stu.class_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Non affecté</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-300">
                      {stu.guardian_name} <span className="text-slate-500 text-[11px]">({stu.guardian_relation})</span>
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono whitespace-nowrap">{stu.guardian_phone}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        stu.status === 'INSCRIT' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' :
                        stu.status === 'REINSCRIT' ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20' :
                        stu.status === 'TRANSFERE' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {stu.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetail(stu.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold inline-flex items-center space-x-1.5 transition border border-slate-700"
                        title="Consulter le dossier complet et la fiche d'inscription"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Fiche</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL NOUVELLE INSCRIPTION */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Formulaire d'Inscription Scolaire Officiel</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-5 pt-4 text-xs">
              
              {/* Scan / Prise de Photo d'Identité */}
              <StudentPhotoCapture
                photoData={photoData}
                onPhotoChange={(newPhoto) => setPhotoData(newPhoto)}
              />

              {/* Identité de l'Élève : Nom et Prénoms distincts */}
              <div className="space-y-3">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px] block">
                  1. État Civil de l'Élève (Champs Séparés)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Champ NOM DE FAMILLE */}
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold flex items-center justify-between">
                      <span>Nom de famille (Patronyme)</span>
                      <span className="text-rose-400 text-[10px]">* Obligatoire</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: MAVOUNGOU"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold uppercase tracking-wide focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">En majuscules (ex: MAVOUNGOU)</p>
                  </div>

                  {/* Champ PRÉNOM(S) */}
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold flex items-center justify-between">
                      <span>Prénom(s)</span>
                      <span className="text-rose-400 text-[10px]">* Obligatoire</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Kevin Junior"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Prénoms usuels déclarés à l'état civil</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Post-nom optionnel */}
                  <div>
                    <label className="block text-slate-300 mb-1">Post-nom / 2e Nom</label>
                    <input
                      type="text"
                      placeholder="Ex: Samba"
                      value={postName}
                      onChange={(e) => setPostName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Sexe *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="M">Masculin (M)</option>
                      <option value="F">Féminin (F)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Date de Naissance *</label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Lieu de Naissance</label>
                  <input
                    type="text"
                    placeholder="Ex: Brazzaville, Pointe-Noire, Dolisie..."
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Responsable Légal */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px] block">
                  2. Responsable Légal & Contacts
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 mb-1 font-semibold">Nom complet du Parent / Tuteur *</label>
                    <input
                      type="text"
                      required
                      placeholder="M. ou Mme..."
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Lien de parenté *</label>
                    <select
                      value={guardianRelation}
                      onChange={(e) => setGuardianRelation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="Père">Père</option>
                      <option value="Parent / Tuteur">Parent / Tuteur</option>
                      <option value="Tuteur Légal">Tuteur Légal</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Numéro de téléphone *</label>
                    <input
                      type="text"
                      required
                      placeholder="+242 06 ... ou 05 ..."
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Email du responsable</label>
                    <input
                      type="email"
                      placeholder="parent@gmail.com"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Adresse de résidence / Quartier</label>
                  <input
                    type="text"
                    placeholder="Arrondissement, Rue, Numéro, Référence..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Affectation Pédagogique */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px] block">
                  3. Affectation Pédagogique
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Classe d'inscription</label>
                    <select
                      value={assignedClassId}
                      onChange={(e) => setAssignedClassId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">Sélectionner une classe...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.level_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Observations / Santé</label>
                    <input
                      type="text"
                      placeholder="Allergies, antécédents, etc."
                      value={studentNotes}
                      onChange={(e) => setStudentNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider l'Inscription</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FICHE COMPLÈTE & OFFICIELLE ÉLÈVE (AVEC PHOTO ET IMPRESSION) */}
      {showDetailModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 no-print">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-14 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center shadow shrink-0">
                  {selectedStudent.student.photo_data ? (
                    <img
                      src={selectedStudent.student.photo_data}
                      alt={`${selectedStudent.student.last_name} ${selectedStudent.student.first_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-indigo-400">
                      {selectedStudent.student.last_name?.[0]}{selectedStudent.student.first_name?.[0]}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <span className="uppercase">{selectedStudent.student.last_name}</span>
                    <span>{selectedStudent.student.first_name}</span>
                    {selectedStudent.student.post_name && (
                      <span className="text-slate-400 text-xs font-normal">({selectedStudent.student.post_name})</span>
                    )}
                  </h2>
                  <p className="text-xs text-amber-400 font-mono">
                    Matricule : {selectedStudent.student.matricule}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleFetchAccountCredentials}
                  disabled={loadingAccounts}
                  className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/30 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                  title="Afficher ou générer les comptes d'accès Élève et Tuteur"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{loadingAccounts ? 'Chargement...' : 'Comptes d\'accès'}</span>
                </button>
                {canEdit && (
                  <button
                    onClick={handleOpenPhotoModal}
                    className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-600/30 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                    title="Scanner ou modifier la photo d'identité"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{selectedStudent.student.photo_data ? 'Changer Photo' : 'Ajouter Photo'}</span>
                  </button>
                )}
                <CloseButton onClose={() => setShowDetailModal(false)} className="sticky top-2 z-10" />
              </div>
            </div>

            {/* ONGLET NAVIGATION DU DOSSIER ÉLÈVE */}
            <div className="flex border-b border-slate-800 text-xs font-semibold mt-3 mb-3 no-print">
              <button
                type="button"
                onClick={() => setDetailTab('fiche')}
                className={`px-4 py-2 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  detailTab === 'fiche'
                    ? 'border-indigo-500 text-indigo-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Fiche d'Inscription Officielle</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('payments')}
                className={`px-4 py-2 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  detailTab === 'payments'
                    ? 'border-indigo-500 text-indigo-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Paiements & Quittances ({selectedStudent.payments?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('certificat')}
                className={`px-4 py-2 border-b-2 transition flex items-center space-x-1.5 cursor-pointer ${
                  detailTab === 'certificat'
                    ? 'border-indigo-500 text-indigo-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Certificat de Scolarité</span>
              </button>
            </div>

            {/* VUE 1 : FICHE INDIVIDUELLE D'INSCRIPTION SCOLAIRE */}
            {detailTab === 'fiche' && (
              <>
                <div id="printable-student-registration-form" className="printable-document bg-white text-slate-900 rounded-xl p-6 sm:p-8 mt-2 border border-slate-200 shadow-md">
                  
                  {/* En-tête officiel PrintHeader */}
                  <PrintHeader
                    establishment={establishment}
                    title="FICHE INDIVIDUELLE D'INSCRIPTION SCOLAIRE"
                    subtitle={`Année Scolaire ${selectedStudent.student.academic_year || establishment?.academic_year || '2026-2027'}`}
                    docNumber={selectedStudent.student.matricule}
                    rightSlot={
                      <div className="flex flex-col items-center justify-center">
                        <div
                          className="border border-slate-400 rounded bg-slate-50 overflow-hidden flex flex-col items-center justify-center p-0.5 shadow-xs student-photo-frame"
                          style={{
                            width: '25mm',
                            height: '32mm',
                            maxWidth: '25mm',
                            maxHeight: '32mm',
                            border: '1px solid #94a3b8',
                            borderRadius: '4px',
                            backgroundColor: '#f8fafc',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {selectedStudent.student.photo_data ? (
                            <img
                              src={selectedStudent.student.photo_data}
                              alt="Photo d'identité officielle"
                              className="w-full h-full object-cover student-photo"
                              style={{
                                width: '25mm',
                                height: '32mm',
                                objectFit: 'cover',
                                display: 'block',
                              }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-center p-1 text-slate-400">
                              <span className="text-[8px] uppercase font-bold text-slate-500 block leading-tight">
                                PHOTO 3.5×4.5
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  />

                  {/* Tableau d'identification de l'élève */}
                  <div className="space-y-3 text-xs" style={{ fontSize: '10.5px', lineHeight: '1.35' }}>
                    
                    {/* 1. État Civil */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-1.5" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', marginBottom: '6px' }}>
                        1. Identité Civile de l'Élève
                      </h4>
                      <table className="w-full border-collapse" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', width: '35%', border: '1px solid #cbd5e1' }}>Nom de famille (Patronyme) :</td>
                            <td style={{ padding: '3px 6px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', border: '1px solid #cbd5e1' }}>
                              {selectedStudent.student.last_name}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>Prénom(s) déclarés :</td>
                            <td style={{ padding: '3px 6px', fontWeight: '600', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                              {selectedStudent.student.first_name}
                            </td>
                          </tr>
                          {selectedStudent.student.post_name && (
                            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                              <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>Post-nom / Deuxième nom :</td>
                              <td style={{ padding: '3px 6px', color: '#0f172a', border: '1px solid #cbd5e1' }}>{selectedStudent.student.post_name}</td>
                            </tr>
                          )}
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>Sexe :</td>
                            <td style={{ padding: '3px 6px', color: '#0f172a', fontWeight: '600', border: '1px solid #cbd5e1' }}>
                              {selectedStudent.student.gender === 'M' ? 'Masculin (M)' : 'Féminin (F)'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>Date et lieu de naissance :</td>
                            <td style={{ padding: '3px 6px', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                              {selectedStudent.student.birth_date} à {selectedStudent.student.birth_place || 'Brazzaville'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>Adresse de résidence :</td>
                            <td style={{ padding: '3px 6px', color: '#0f172a', border: '1px solid #cbd5e1' }}>{selectedStudent.student.address || 'Non spécifiée'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 2. Scolarité */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-1.5" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', marginBottom: '6px' }}>
                        2. Affectation Scolaire & Classe
                      </h4>
                      <table className="w-full border-collapse" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', width: '35%', border: '1px solid #cbd5e1' }}>Classe affectée :</td>
                            <td style={{ padding: '3px 6px', fontWeight: '900', color: '#1e1b4b', border: '1px solid #cbd5e1' }}>
                              {selectedStudent.student.class_name || 'En attente d’affectation'}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>Niveau / Cycle :</td>
                            <td style={{ padding: '3px 6px', fontWeight: '600', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                              {selectedStudent.student.level_code || '—'} ({selectedStudent.student.cycle_code || 'Général'})
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* 3. Responsable Légal */}
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-1.5" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '1px solid #cbd5e1', paddingBottom: '3px', marginBottom: '6px' }}>
                        3. Responsable Légal & Contact d'Urgence
                      </h4>
                      <table className="w-full border-collapse" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', width: '35%', border: '1px solid #cbd5e1' }}>Nom du Parent / Tuteur :</td>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                              {selectedStudent.student.guardian_name} ({selectedStudent.student.guardian_relation})
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>Téléphone de contact :</td>
                            <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#0f172a', border: '1px solid #cbd5e1' }}>
                              {selectedStudent.student.guardian_phone}
                            </td>
                          </tr>
                          {selectedStudent.student.guardian_email && (
                            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                              <td style={{ padding: '3px 6px', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>Adresse Email :</td>
                              <td style={{ padding: '3px 6px', color: '#0f172a', border: '1px solid #cbd5e1' }}>{selectedStudent.student.guardian_email}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Bloc Signatures et Cachet (Côte à côte) */}
                    <div
                      className="signatures-row"
                      style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginTop: '12px',
                        paddingTop: '8px',
                        borderTop: '1px solid #cbd5e1',
                        width: '100%',
                      }}
                    >
                      <div
                        className="signature-col"
                        style={{
                          width: '48%',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '6px',
                          textAlign: 'center',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <p style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#334155', margin: '0 0 2px 0' }}>
                          Le Responsable Légal
                        </p>
                        <p style={{ fontSize: '8px', fontStyle: 'italic', color: '#64748b', margin: 0 }}>
                          (Signature précédée de "Lu et approuvé")
                        </p>
                        <div style={{ height: '32px' }} />
                      </div>

                      <div
                        className="signature-col"
                        style={{
                          width: '48%',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '6px',
                          textAlign: 'center',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <p style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#334155', margin: '0 0 2px 0' }}>
                          La Direction de l'Établissement
                        </p>
                        <p style={{ fontSize: '8px', fontStyle: 'italic', color: '#64748b', margin: 0 }}>
                          (Cachet officiel & Signature)
                        </p>
                        <div style={{ height: '32px' }} />
                      </div>
                    </div>

                  </div>

                </div>

                {/* Actions du dossier Fiche */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-800 no-print">
                  <div className="flex items-center space-x-2">
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setShowTransferModal(true)}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/30 rounded-lg text-xs font-semibold flex items-center space-x-1"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Transférer</span>
                        </button>
                        <button
                          onClick={() => handleArchive(selectedStudent.student.id, `${selectedStudent.student.last_name} ${selectedStudent.student.first_name}`)}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-600/30 rounded-lg text-xs font-semibold flex items-center space-x-1"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archiver Dossier</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowDetailModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadPdf(
                          'printable-student-registration-form',
                          `Fiche_Inscription_${selectedStudent.student.matricule || 'eleve'}.pdf`
                        )
                      }
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                      title="Télécharger la fiche en PDF"
                    >
                      <Download className="w-4 h-4 text-slate-300" />
                      <span>Télécharger PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        printDocument(
                          'printable-student-registration-form',
                          `Fiche_Inscription_${selectedStudent.student.matricule || 'eleve'}`
                        )
                      }
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Imprimer la Fiche d'Inscription</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* VUE 2 : PAIEMENTS & QUITTANCES DE L'ÉLÈVE */}
            {detailTab === 'payments' && (
              <div className="space-y-4 no-print">
                {/* Carte de situation financière */}
                {selectedStudent.financialSituation && (
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Dû (Exigible)</span>
                      <p className="text-base font-black font-mono text-white mt-1">
                        {(selectedStudent.financialSituation.totalDue || 0).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Total Déjà Payé</span>
                      <p className="text-base font-black font-mono text-emerald-400 mt-1">
                        {(selectedStudent.financialSituation.totalPaid || 0).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                    <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-rose-400 uppercase font-semibold block">Reste à Payer (Solde)</span>
                      <p className="text-base font-black font-mono text-rose-400 mt-1">
                        {(selectedStudent.financialSituation.balance || 0).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                )}

                {/* Barre d'outils quittances élève */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-300 font-medium">
                      Historique des quittances : <strong className="text-white">{selectedStudent.payments?.length || 0}</strong>
                    </span>
                    {selectedStudentPaymentIds.length > 0 && (
                      <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-[11px] font-bold">
                        {selectedStudentPaymentIds.length} sélectionnée(s)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedStudentPaymentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const toPrint = (selectedStudent.payments || []).filter((p: Payment) =>
                            selectedStudentPaymentIds.includes(p.id)
                          );
                          if (toPrint.length > 0) setReceiptsToPrint(toPrint);
                        }}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimer la sélection</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowStatementModal(true)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Relevé de Paiements de l'Élève</span>
                    </button>
                  </div>
                </div>

                {/* Table des quittances de cet élève */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                  {(!selectedStudent.payments || selectedStudent.payments.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Aucun versement n'a été enregistré pour cet élève.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/80 text-[10px] uppercase text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-3 w-8 text-center">
                            <input
                              type="checkbox"
                              checked={
                                selectedStudent.payments.length > 0 &&
                                selectedStudentPaymentIds.length === selectedStudent.payments.length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedStudentPaymentIds(selectedStudent.payments.map((p: any) => p.id));
                                } else {
                                  setSelectedStudentPaymentIds([]);
                                }
                              }}
                              className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                          </th>
                          <th className="p-3">N° Quittance</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Motif</th>
                          <th className="p-3">Mode</th>
                          <th className="p-3 text-right">Montant Versé</th>
                          <th className="p-3">Statut</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {selectedStudent.payments.map((p: Payment, idx: number) => (
                          <tr key={p.id ? `${p.id}-${idx}` : `pay-${idx}`} className="hover:bg-slate-800/40">
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedStudentPaymentIds.includes(p.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedStudentPaymentIds((prev) => [...prev, p.id]);
                                  } else {
                                    setSelectedStudentPaymentIds((prev) => prev.filter((id) => id !== p.id));
                                  }
                                }}
                                className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-amber-400">
                              {p.receipt_number}
                              {p.reprint_count ? (
                                <span className="ml-1 text-[9px] text-amber-300">({p.reprint_count}x)</span>
                              ) : null}
                            </td>
                            <td className="p-3 text-slate-400 font-mono text-[11px]">
                              {new Date(p.created_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-3 text-slate-200">
                              {p.notes || p.payment_type || 'Frais de scolarité'}
                            </td>
                            <td className="p-3 text-slate-300 font-medium">{p.payment_method}</td>
                            <td className="p-3 text-right font-black font-mono text-white">
                              {p.amount.toLocaleString('fr-FR')} FCFA
                            </td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                p.status === 'VALIDE'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setReceiptsToPrint([p])}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-teal-600 text-teal-300 hover:text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                                title="Imprimer ou réimprimer la quittance"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Quittance</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* VUE 3 : CERTIFICAT DE SCOLARITÉ (MODÈLE PERSONNALISÉ DE L'ÉCOLE) */}
            {detailTab === 'certificat' && selectedStudent && (
              <div className="space-y-4">
                <div className="flex justify-end space-x-2 no-print pb-2 border-b border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      downloadPdf(
                        'printable-school-certificate',
                        `Certificat_Scolarite_${selectedStudent.student.matricule || 'eleve'}.pdf`
                      )
                    }
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      printDocument(
                        'printable-school-certificate',
                        `Certificat_Scolarite_${selectedStudent.student.matricule || 'eleve'}`
                      )
                    }
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimer le Certificat</span>
                  </button>
                </div>

                <div id="printable-school-certificate" className="printable-document bg-white rounded-xl overflow-y-auto max-h-[70vh] border border-slate-200 shadow-md">
                  <CustomizableSchoolCertificate
                    student={{
                      id: selectedStudent.student.id,
                      first_name: selectedStudent.student.first_name,
                      last_name: selectedStudent.student.last_name,
                      matricule: selectedStudent.student.matricule,
                      gender: selectedStudent.student.gender,
                      birth_date: selectedStudent.student.birth_date,
                      birth_place: selectedStudent.student.birth_place,
                      class_name: selectedStudent.student.class_name,
                      academic_year: selectedStudent.student.academic_year || establishment?.academic_year,
                      parent_name: selectedStudent.student.guardian_name,
                    }}
                    academicYear={selectedStudent.student.academic_year || establishment?.academic_year}
                    establishment={establishment}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL SCANNER / CHANGER LA PHOTO D'UN ÉLÈVE EXISTANT */}
      {showPhotoModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                <span>Scanner ou Mettre à jour la Photo de l'Élève</span>
              </h3>
              <CloseButton onClose={() => setShowPhotoModal(false)} />
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Élève : <strong className="text-white">{selectedStudent.student.last_name} {selectedStudent.student.first_name}</strong> (Matricule : {selectedStudent.student.matricule})
              </p>

              <StudentPhotoCapture
                photoData={editPhotoData}
                onPhotoChange={(newPhoto) => setEditPhotoData(newPhoto)}
              />

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={savingPhoto}
                  onClick={handleSaveStudentPhoto}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
                >
                  {savingPhoto ? (
                    <span>Enregistrement...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Enregistrer la Photo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERT ÉLÈVE */}
      {showTransferModal && selectedStudent && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-2 flex items-center space-x-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-400" />
              <span>Transfert Officiel d'Élève</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Enregistre le départ officiel de l'élève vers un autre établissement scolaire (certificat de radiation).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Établissement d'accueil *</label>
                <input
                  type="text"
                  placeholder="Ex: Lycée Savorgnan de Brazza"
                  value={destinationSchool}
                  onChange={(e) => setDestinationSchool(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Motif du transfert</label>
                <input
                  type="text"
                  placeholder="Déménagement des parents, orientation..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleTransfer}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold"
                >
                  Confirmer le Transfert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {receiptsToPrint && receiptsToPrint.length > 0 && (
        <PaymentReceiptModal
          payments={receiptsToPrint}
          establishment={establishment!}
          onClose={() => setReceiptsToPrint(null)}
          onPaymentUpdated={(updated) => {
            if (selectedStudent && selectedStudent.payments) {
              setSelectedStudent({
                ...selectedStudent,
                payments: selectedStudent.payments.map((p: any) =>
                  p.id === updated.id ? updated : p
                ),
              });
            }
          }}
        />
      )}

      {/* MODAL RELEVÉ INDIVIDUEL DE PAIEMENTS */}
      {showStatementModal && selectedStudent && (
        <StudentStatementModal
          student={selectedStudent.student}
          payments={selectedStudent.payments || []}
          financialSituation={selectedStudent.financialSituation}
          establishment={establishment!}
          onClose={() => setShowStatementModal(false)}
          onPrintReceipt={(p) => setReceiptsToPrint([p])}
        />
      )}

      {/* MODAL FICHE DES COMPTES D'ACCÈS ÉLÈVE & TUTEUR */}
      {createdAccountsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Comptes d'Accès Générés & Répertoriés</h3>
                  <p className="text-xs text-slate-400">{createdAccountsModal.studentName} ({createdAccountsModal.matricule})</p>
                </div>
              </div>
              <button
                onClick={() => setCreatedAccountsModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-access-credentials" className="space-y-4">
              {/* Compte Élève */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Compte Élève</span>
                  <span className="px-2 py-0.5 text-[10px] bg-indigo-500/20 text-indigo-300 rounded-full font-mono">Rôle: ELEVE</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Identifiant / Matricule</span>
                    <span className="text-white font-mono font-bold">{createdAccountsModal.accounts.studentAccount.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mot de passe provisoire</span>
                    <span className="text-amber-300 font-mono font-bold">{createdAccountsModal.accounts.studentAccount.temporaryPassword}</span>
                  </div>
                </div>
              </div>

              {/* Compte Tuteur */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Compte Tuteur / Parent</span>
                  <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded-full font-mono">Rôle: PARENT</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nom du Tuteur</span>
                    <span className="text-white font-semibold">{createdAccountsModal.accounts.parentAccount.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Identifiant de connexion</span>
                    <span className="text-white font-mono font-bold">{createdAccountsModal.accounts.parentAccount.username}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mot de passe provisoire</span>
                    <span className="text-amber-300 font-mono font-bold">{createdAccountsModal.accounts.parentAccount.temporaryPassword}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">État de liaison</span>
                    <span className="text-emerald-300 font-semibold text-[11px]">
                      {createdAccountsModal.accounts.parentAccount.isNew
                        ? 'Nouveau compte tuteur créé'
                        : `Rattaché au compte existant (${createdAccountsModal.accounts.parentAccount.linkedStudentsCount} enfant(s))`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const text = `[${establishment?.name || 'ECO.GES'}] COMPTES D'ACCÈS SCOLAIRES\n\nÉLÈVE : ${createdAccountsModal.studentName}\n• Identifiant : ${createdAccountsModal.accounts.studentAccount.username}\n• Mot de passe : ${createdAccountsModal.accounts.studentAccount.temporaryPassword}\n\nTUTEUR : ${createdAccountsModal.accounts.parentAccount.fullName}\n• Identifiant : ${createdAccountsModal.accounts.parentAccount.username}\n• Mot de passe : ${createdAccountsModal.accounts.parentAccount.temporaryPassword}`;
                  navigator.clipboard.writeText(text);
                  setSuccess("Identifiants copiés dans le presse-papiers.");
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Copier les identifiants</span>
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => printDocument('printable-access-credentials', `Comptes_Acces_${createdAccountsModal.matricule}`)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer la Fiche</span>
                </button>
                <button
                  onClick={() => setCreatedAccountsModal(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RÉPARATEUR DE LIAISONS PARENTS-ÉLÈVES */}
      {showRepairModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Réparation des Liaisons Parents - Élèves</h3>
              </div>
              <button onClick={() => setShowRepairModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Cet outil analyse l'ensemble des fiches d'élèves, des tuteurs et des comptes utilisateurs de l'établissement dans Firestore et synchronise automatiquement leurs identifiants de liaison (`guardianIds`, `studentIds`, `parent_user_id`).
            </p>

            {repairing ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Analyse et réparation en cours dans Firestore...</p>
              </div>
            ) : repairReport ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Total Élèves</span>
                    <span className="font-mono text-sm font-bold text-white">{repairReport.totalStudents}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-amber-400 block text-[10px]">Liaisons Réparées</span>
                    <span className="font-mono text-sm font-bold text-amber-400">{repairReport.repairedCount}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Statut Mode</span>
                    <span className="font-bold text-slate-200">{repairReport.dryRun ? 'Analyse seule (Dry-Run)' : 'Appliqué dans Firestore'}</span>
                  </div>
                </div>

                {repairReport.report && repairReport.report.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    <div className="font-bold text-slate-300">Rapport détaillé des ajustements :</div>
                    {repairReport.report.map((item: any, idx: number) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl space-y-1">
                        <div className="flex items-center justify-between font-semibold text-white">
                          <span>{item.studentName} ({item.matricule})</span>
                          <span className="text-slate-400 text-[11px]">Tuteur : {item.guardianName}</span>
                        </div>
                        <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                          {item.changes.map((c: string, ci: number) => (
                            <li key={ci}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-center">
                    Toutes les liaisons parents-élèves sont déjà parfaitement synchronisées dans cet établissement.
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => handleRunRepair(true)}
                disabled={repairing}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition cursor-pointer"
              >
                Re-tester (Dry-Run sans écriture)
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRunRepair(false)}
                  disabled={repairing}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow cursor-pointer transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Appliquer la Réparation</span>
                </button>
                <button
                  onClick={() => setShowRepairModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
