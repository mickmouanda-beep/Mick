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
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Student, SchoolClass } from '../types.ts';
import { StudentPhotoCapture } from '../components/StudentPhotoCapture.tsx';
import { sortStudents } from '../lib/sortingUtils.ts';

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
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [destinationSchool, setDestinationSchool] = useState('');

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
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

        {isPromoteur ? (
          <div className="flex items-center space-x-2 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Supervision Promoteur • Inscriptions directes réservées au Secrétariat / Surveillance</span>
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
                {students.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-800/40 transition">
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
                      <option value="Mère">Mère</option>
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
                {canEdit && (
                  <button
                    onClick={handleOpenPhotoModal}
                    className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-600/30 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    title="Scanner ou modifier la photo d'identité"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{selectedStudent.student.photo_data ? 'Changer Photo' : 'Ajouter Photo'}</span>
                  </button>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* DOCUMENT OFFICIEL IMPRIMABLE - FICHE D'INSCRIPTION SCOLAIRE */}
            <div className="printable-document bg-white text-slate-900 rounded-xl p-6 sm:p-8 mt-4 border border-slate-200 shadow-md">
              
              {/* En-tête officiel République du Congo */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
                <div className="space-y-1 text-left max-w-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                    RÉPUBLIQUE DU CONGO
                  </p>
                  <p className="text-[9px] uppercase text-slate-500 font-semibold tracking-wider">
                    Unité • Travail • Progrès
                  </p>
                  <p className="text-[9px] text-slate-600 uppercase font-semibold pt-1">
                    MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET DE L'ALPHABÉTISATION
                  </p>
                  <h3 className="text-sm font-extrabold uppercase text-indigo-900 pt-1">
                    {establishment?.name || 'ÉTABLISSEMENT SCOLAIRE'}
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    {establishment?.address ? `${establishment.address}, ` : ''}{establishment?.city || 'Brazzaville'} • Tél : {establishment?.phone || '+242 06 000 0000'}
                  </p>
                </div>

                {/* Cadre Photo d'identité officielle */}
                <div className="flex flex-col items-center">
                  <div className="w-28 h-36 border-2 border-slate-800 rounded bg-slate-50 overflow-hidden flex flex-col items-center justify-center p-0.5 shadow-sm">
                    {selectedStudent.student.photo_data ? (
                      <img
                        src={selectedStudent.student.photo_data}
                        alt="Photo d'identité officielle"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Camera className="w-8 h-8 mx-auto mb-1 opacity-40" />
                        <span className="text-[8px] uppercase font-bold text-slate-500 block leading-tight">
                          PHOTO D'IDENTITÉ OFFICIELLE 3.5×4.5
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1 font-semibold">
                    {selectedStudent.student.matricule}
                  </span>
                </div>
              </div>

              {/* Titre du document */}
              <div className="text-center my-4 py-2 bg-indigo-50 border-y border-indigo-200">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-indigo-950">
                  FICHE INDIVIDUELLE D'INSCRIPTION SCOLAIRE
                </h2>
                <p className="text-xs font-semibold text-indigo-800">
                  Année Scolaire {selectedStudent.student.academic_year || establishment?.academic_year || '2026-2027'}
                </p>
              </div>

              {/* Tableau d'identification de l'élève */}
              <div className="space-y-4 text-xs">
                
                {/* 1. État Civil */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    1. Identité Civile de l'Élève
                  </h4>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-bold text-slate-700 w-1/3">Nom de famille (Patronyme) :</td>
                        <td className="py-1.5 font-black text-slate-900 text-sm uppercase">
                          {selectedStudent.student.last_name}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-bold text-slate-700">Prénom(s) déclarés :</td>
                        <td className="py-1.5 font-semibold text-slate-900">
                          {selectedStudent.student.first_name}
                        </td>
                      </tr>
                      {selectedStudent.student.post_name && (
                        <tr className="border-b border-slate-200">
                          <td className="py-1.5 font-bold text-slate-700">Post-nom / Deuxième nom :</td>
                          <td className="py-1.5 text-slate-900">{selectedStudent.student.post_name}</td>
                        </tr>
                      )}
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-bold text-slate-700">Sexe :</td>
                        <td className="py-1.5 text-slate-900 font-semibold">
                          {selectedStudent.student.gender === 'M' ? 'Masculin (M)' : 'Féminin (F)'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-bold text-slate-700">Date et lieu de naissance :</td>
                        <td className="py-1.5 text-slate-900">
                          {selectedStudent.student.birth_date} à {selectedStudent.student.birth_place || 'Brazzaville'}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-bold text-slate-700">Adresse de résidence :</td>
                        <td className="py-1.5 text-slate-900">{selectedStudent.student.address || 'Non spécifiée'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. Scolarité */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    2. Affectation Scolaire & Classe
                  </h4>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Classe affectée</span>
                      <p className="font-extrabold text-indigo-900 text-sm mt-0.5">
                        {selectedStudent.student.class_name || 'En attente d’affectation'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Niveau / Cycle</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {selectedStudent.student.level_code || '—'} ({selectedStudent.student.cycle_code || 'Général'})
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3. Responsable Légal */}
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 mb-2">
                    3. Responsable Légal & Contact d'Urgence
                  </h4>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-bold text-slate-700 w-1/3">Nom du Parent / Tuteur :</td>
                        <td className="py-1.5 font-bold text-slate-900">
                          {selectedStudent.student.guardian_name} ({selectedStudent.student.guardian_relation})
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="py-1.5 font-bold text-slate-700">Téléphone de contact :</td>
                        <td className="py-1.5 font-mono font-bold text-slate-900">
                          {selectedStudent.student.guardian_phone}
                        </td>
                      </tr>
                      {selectedStudent.student.guardian_email && (
                        <tr className="border-b border-slate-200">
                          <td className="py-1.5 font-bold text-slate-700">Adresse Email :</td>
                          <td className="py-1.5 text-slate-900">{selectedStudent.student.guardian_email}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bloc Signatures et Cachet */}
                <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center">
                  <div className="space-y-12">
                    <p className="text-[11px] font-bold text-slate-700 uppercase">
                      Le Responsable Légal<br />(Signature précédée de la mention "Lu et approuvé")
                    </p>
                    <div className="h-10 border-b border-dashed border-slate-400 mx-6" />
                  </div>
                  <div className="space-y-12">
                    <p className="text-[11px] font-bold text-slate-700 uppercase">
                      La Direction de l'Établissement<br />(Cachet officiel & Signature)
                    </p>
                    <div className="h-10 border-b border-dashed border-slate-400 mx-6" />
                  </div>
                </div>

              </div>

            </div>

            {/* Actions du dossier */}
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

              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-lg transition"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer la Fiche d'Inscription Officielle</span>
              </button>
            </div>
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
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
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

    </div>
  );
};
