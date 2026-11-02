import React, { useState, useEffect, useRef } from 'react';
import {
  BookMarked,
  Upload,
  Plus,
  Search,
  Filter,
  Eye,
  Download,
  Trash2,
  Edit,
  FileText,
  File,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Layers,
  GraduationCap,
  Calendar,
  HardDrive,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api, uploadCurriculumProgram } from '../lib/api.ts';
import { CurriculumProgram, Establishment } from '../types.ts';
import { CloseButton } from '../components/CloseButton.tsx';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 Mo

export const CurriculumProgramsView: React.FC = () => {
  const { user } = useAuth();

  // Rôles et autorisations
  const isDirectorOfStudies =
    user?.role === 'DIRECTEUR_ETUDES' ||
    user?.role === 'DIRECTEUR_GENERAL' ||
    user?.role === 'PROMOTEUR' ||
    user?.role === 'ADMIN_GENERAL';
  const isTeacher = user?.role === 'ENSEIGNANT';

  // Données
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtres
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal d'import / modification
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<CurriculumProgram | null>(null);

  // Formulaire
  const [formTitle, setFormTitle] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formSubjectName, setFormSubjectName] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formClassName, setFormClassName] = useState('');
  const [formAcademicYear, setFormAcademicYear] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Suivi de progression de l'upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadBytes, setUploadBytes] = useState<{ loaded: number; total: number }>({ loaded: 0, total: 0 });

  // Modal de visualisation (Voir)
  const [viewingProgram, setViewingProgram] = useState<CurriculumProgram | null>(null);

  // Modal de confirmation de suppression
  const [deletingProgram, setDeletingProgram] = useState<CurriculumProgram | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chargement initial
  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [progsData, clsData, subData, estData] = await Promise.all([
        api.getCurriculumPrograms().catch(() => []),
        api.getClasses().catch(() => []),
        api.getSubjects().catch(() => []),
        api.getSettings().catch(() => null),
      ]);
      setPrograms(progsData || []);
      setClasses(clsData || []);
      setSubjects(subData || []);
      setEstablishment(estData);
    } catch (err: any) {
      console.error('Erreur chargement programmes:', err);
      setErrorMsg(err.message || 'Impossible de charger les programmes scolaires.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Déterminer l'icône et la couleur selon le type de fichier
  const getFileBadge = (fileType: string, fileName: string) => {
    const lowerName = fileName.toLowerCase();
    if (fileType.includes('pdf') || lowerName.endsWith('.pdf')) {
      return {
        label: 'PDF',
        color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: FileText,
      };
    }
    if (
      fileType.includes('word') ||
      lowerName.endsWith('.docx') ||
      lowerName.endsWith('.doc') ||
      fileType.includes('officedocument')
    ) {
      return {
        label: 'Word',
        color: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        icon: File,
      };
    }
    if (
      fileType.includes('image') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp')
    ) {
      return {
        label: 'Image',
        color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: ImageIcon,
      };
    }
    return {
      label: 'Document',
      color: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      icon: File,
    };
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Ko';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    }
    return `${Math.round(bytes / 1024)} Ko`;
  };

  // Ouverture du modal pour importer
  const handleOpenImport = () => {
    setEditingProgram(null);
    setFormTitle('');
    setFormSubjectId('');
    setFormSubjectName('');
    setFormClassId('');
    setFormClassName('');
    setFormAcademicYear(establishment?.academic_year || '2025-2026');
    setSelectedFile(null);
    setFileError(null);
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  // Ouverture du modal pour modifier
  const handleOpenEdit = (prog: CurriculumProgram) => {
    setEditingProgram(prog);
    setFormTitle(prog.title);
    setFormSubjectId(prog.subject_id || '');
    setFormSubjectName(prog.subject_name);
    setFormClassId(prog.class_id || '');
    setFormClassName(prog.class_name);
    setFormAcademicYear(prog.academic_year);
    setSelectedFile(null);
    setFileError(null);
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  // Sélection d'un fichier avec validation de taille (max 20 Mo)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `Le fichier sélectionné fait ${formatFileSize(file.size)}, ce qui dépasse la limite maximale autorisée de 20 Mo.`
      );
      setSelectedFile(null);
      e.target.value = '';
      return;
    }

    setFileError(null);
    setSelectedFile(file);

    // Si le titre est encore vide, suggérer le nom du fichier sans extension
    if (!formTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setFormTitle(cleanName);
    }
  };

  // Enregistrement / Importation du programme avec barre de progression
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setErrorMsg('Veuillez renseigner le titre du programme ou manuel.');
      return;
    }
    if (!formSubjectName.trim()) {
      setErrorMsg('Veuillez sélectionner ou indiquer la matière.');
      return;
    }
    if (!formClassName.trim()) {
      setErrorMsg('Veuillez sélectionner ou indiquer la classe.');
      return;
    }
    if (!editingProgram && !selectedFile) {
      setFileError('Veuillez sélectionner un fichier (PDF, Word ou Image).');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setErrorMsg(null);

    try {
      let fileBase64 = '';
      let fileName = editingProgram?.file_name || '';
      let fileType = editingProgram?.file_type || '';
      let fileSize = editingProgram?.file_size || 0;

      if (selectedFile) {
        fileName = selectedFile.name;
        fileType = selectedFile.type || 'application/octet-stream';
        fileSize = selectedFile.size;

        // Lecture du fichier en DataURL
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(selectedFile);
        });
      }

      const payload: any = {
        title: formTitle.trim(),
        subject_id: formSubjectId || null,
        subject_name: formSubjectName.trim(),
        class_id: formClassId || null,
        class_name: formClassName.trim(),
        academic_year: formAcademicYear || establishment?.academic_year || '2025-2026',
      };

      if (selectedFile && fileBase64) {
        payload.file_name = fileName;
        payload.file_type = fileType;
        payload.file_size = fileSize;
        payload.file_base64 = fileBase64;
      }

      // Appel avec rapport d'upload
      await uploadCurriculumProgram(payload, editingProgram?.id, (percent, loaded, total) => {
        setUploadProgress(percent);
        setUploadBytes({ loaded, total });
      });

      setSuccessMsg(
        editingProgram
          ? `Le programme "${formTitle}" a été mis à jour avec succès.`
          : `Le programme "${formTitle}" a été importé et enregistré dans le stockage.`
      );
      setTimeout(() => setSuccessMsg(null), 4000);

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error("Erreur lors de l'enregistrement:", err);
      setErrorMsg(err.message || "Erreur lors de l'enregistrement du programme.");
    } finally {
      setIsUploading(false);
    }
  };

  // Suppression
  const handleDeleteConfirm = async () => {
    if (!deletingProgram) return;
    setIsDeleting(true);
    try {
      await api.deleteCurriculumProgram(deletingProgram.id);
      setSuccessMsg(`Le programme "${deletingProgram.title}" a été supprimé.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setDeletingProgram(null);
      await loadData();
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      setErrorMsg(err.message || 'Erreur lors de la suppression.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrage des programmes
  const filteredPrograms = programs.filter((p) => {
    if (selectedSubject !== 'ALL') {
      if (p.subject_id !== selectedSubject && p.subject_name !== selectedSubject) return false;
    }
    if (selectedClass !== 'ALL') {
      if (p.class_id !== selectedClass && p.class_name !== selectedClass) return false;
    }
    if (selectedYear !== 'ALL') {
      if (p.academic_year !== selectedYear) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchSub = p.subject_name?.toLowerCase().includes(q);
      const matchClass = p.class_name?.toLowerCase().includes(q);
      const matchFile = p.file_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchSub && !matchClass && !matchFile) return false;
    }
    return true;
  });

  // Métriques récapitulatives
  const totalPrograms = programs.length;
  const uniqueSubjectsCount = new Set(programs.map((p) => p.subject_name)).size;
  const uniqueClassesCount = new Set(programs.map((p) => p.class_name)).size;
  const totalStorageBytes = programs.reduce((acc, p) => acc + (p.file_size || 0), 0);

  // Années académiques disponibles
  const availableYears = Array.from(new Set(programs.map((p) => p.academic_year).filter(Boolean)));
  if (establishment?.academic_year && !availableYears.includes(establishment.academic_year)) {
    availableYears.push(establishment.academic_year);
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* BANNIÈRE HAUTE : TITRE ET ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Référentiel des Programmes Scolaires</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {establishment?.name || 'Établissement'}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {isTeacher
                  ? 'Consultation et téléchargement des manuels et programmes officiels de vos matières et classes'
                  : 'Bibliothèque officielle des programmes d’études, manuels agréés et guides pédagogiques'}
              </p>
            </div>
          </div>
        </div>

        {/* Bouton d'action D.E uniquement */}
        <div className="flex items-center space-x-2">
          {isDirectorOfStudies && (
            <button
              type="button"
              onClick={handleOpenImport}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-lg shadow-teal-600/20 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Importer un programme</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            title="Rafraîchir"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* MESSAGES D'ALERTE */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs sm:text-sm flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-start justify-between gap-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STATISTIQUES RÉCAPITULATIVES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Manuels & Programmes</span>
            <BookMarked className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{totalPrograms}</p>
          <span className="text-[11px] text-slate-500">Documents enregistrés</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Matières Couvertes</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{uniqueSubjectsCount}</p>
          <span className="text-[11px] text-slate-500">Disciplines scolaires</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Classes Associées</span>
            <GraduationCap className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{uniqueClassesCount}</p>
          <span className="text-[11px] text-slate-500">Divisions & niveaux</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Volume de Stockage</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-white">{formatFileSize(totalStorageBytes)}</p>
          <span className="text-[11px] text-slate-500">Stockage application (max 20 Mo/fichier)</span>
        </div>
      </div>

      {/* BARRE DE RECHERCHE ET FILTRES (Matière & Classe exigés par le prompt) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Recherche texte */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, matière, classe, nom de fichier..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtre par Matière */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="ALL">Toutes les matières</option>
              {subjects.map((sub) => (
                <option key={sub.id || sub.code} value={sub.name || sub.code}>
                  {sub.name || sub.code}
                </option>
              ))}
            </select>
          </div>

          {/* Filtre par Classe */}
          <div className="flex items-center space-x-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="ALL">Toutes les classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name} ({c.level_code})
                </option>
              ))}
            </select>
          </div>

          {/* Filtre Année */}
          {availableYears.length > 1 && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500 transition"
            >
              <option value="ALL">Toutes les années</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          )}

          {/* Bascule Vue Carte / Tableau */}
          <div className="hidden sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Grille
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tableau
            </button>
          </div>
        </div>

        {/* Indicateur de filtre actif */}
        {(selectedSubject !== 'ALL' || selectedClass !== 'ALL' || selectedYear !== 'ALL' || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
            <span>Filtres appliqués :</span>
            {selectedSubject !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                Matière: {selectedSubject}
                <button type="button" onClick={() => setSelectedSubject('ALL')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedClass !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                Classe: {selectedClass}
                <button type="button" onClick={() => setSelectedClass('ALL')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedYear !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                Année: {selectedYear}
                <button type="button" onClick={() => setSelectedYear('ALL')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                Recherche: "{searchQuery}"
                <button type="button" onClick={() => setSearchQuery('')}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedSubject('ALL');
                setSelectedClass('ALL');
                setSelectedYear('ALL');
                setSearchQuery('');
              }}
              className="text-teal-400 hover:underline text-xs ml-1"
            >
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* VUE CONTENU */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Chargement du référentiel des programmes...</p>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">Aucun programme scolaire trouvé</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {programs.length === 0
              ? isDirectorOfStudies
                ? 'Aucun manuel ou programme n’a encore été importé. Utilisez le bouton "Importer un programme" pour ajouter des fichiers PDF, Word ou images.'
                : 'Aucun programme n’a encore été publié par le Directeur des Études.'
              : 'Aucun document ne correspond à vos critères de recherche ou filtres.'}
          </p>
          {isDirectorOfStudies && programs.length === 0 && (
            <button
              type="button"
              onClick={handleOpenImport}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl inline-flex items-center space-x-1.5 shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>Importer le premier programme</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* VUE EN GRILLE (CARTE) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map((prog) => {
            const badge = getFileBadge(prog.file_type, prog.file_name);
            const BadgeIcon = badge.icon;
            const viewUrl = api.getCurriculumProgramFileUrl(prog.id);
            const downloadUrl = api.getCurriculumProgramDownloadUrl(prog.id);

            return (
              <div
                key={prog.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between space-y-4 shadow-lg hover:shadow-xl transition group"
              >
                {/* En-tête de carte */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    {/* Badge type de fichier */}
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border flex items-center space-x-1 ${badge.color}`}>
                        <BadgeIcon className="w-3 h-3" />
                        <span>{badge.label}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatFileSize(prog.file_size)}
                      </span>
                    </div>

                    {/* Année académique */}
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {prog.academic_year}
                    </span>
                  </div>

                  {/* Titre du programme */}
                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 group-hover:text-teal-300 transition" title={prog.title}>
                    {prog.title}
                  </h3>

                  {/* Badges Matière & Classe */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                      {prog.subject_name}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-medium">
                      Classe: {prog.class_name}
                    </span>
                  </div>

                  {/* Nom du fichier source */}
                  <p className="text-[11px] text-slate-400 truncate flex items-center space-x-1" title={prog.file_name}>
                    <File className="w-3 h-3 shrink-0 text-slate-500" />
                    <span className="truncate">{prog.file_name}</span>
                  </p>
                </div>

                {/* Bas de carte : Boutons Voir & Télécharger (et Modifier/Supprimer pour D.E) */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    {/* Bouton "Voir" */}
                    <button
                      type="button"
                      onClick={() => setViewingProgram(prog)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                      title="Visualiser le document"
                    >
                      <Eye className="w-3.5 h-3.5 text-teal-400" />
                      <span>Voir</span>
                    </button>

                    {/* Bouton "Télécharger" */}
                    <a
                      href={downloadUrl}
                      download={prog.file_name}
                      className="px-2.5 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-600/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                      title="Télécharger sur votre appareil"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Télécharger</span>
                    </a>
                  </div>

                  {/* Actions D.E : Modifier et Supprimer */}
                  {isDirectorOfStudies && (
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(prog)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Modifier le programme"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingProgram(prog)}
                        className="p-1.5 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 rounded-lg transition"
                        title="Supprimer ce livre"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VUE EN TABLEAU */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Titre du Programme / Manuel</th>
                  <th className="py-3 px-4">Matière</th>
                  <th className="py-3 px-4">Classe</th>
                  <th className="py-3 px-4">Année</th>
                  <th className="py-3 px-4">Fichier & Taille</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredPrograms.map((prog) => {
                  const badge = getFileBadge(prog.file_type, prog.file_name);
                  const BadgeIcon = badge.icon;
                  const downloadUrl = api.getCurriculumProgramDownloadUrl(prog.id);

                  return (
                    <tr key={prog.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-semibold text-white">
                        <div className="flex items-center space-x-2">
                          <span className={`p-1 rounded-md ${badge.color}`}>
                            <BadgeIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="line-clamp-1" title={prog.title}>
                            {prog.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-xs">
                          {prog.subject_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs">
                          {prog.class_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 text-xs">
                        {prog.academic_year}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        <span className="truncate block max-w-[180px]" title={prog.file_name}>
                          {prog.file_name}
                        </span>
                        <span className="text-[11px] text-slate-500">{formatFileSize(prog.file_size)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingProgram(prog)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1"
                            title="Voir"
                          >
                            <Eye className="w-3 h-3 text-teal-400" />
                            <span>Voir</span>
                          </button>
                          <a
                            href={downloadUrl}
                            download={prog.file_name}
                            className="px-2 py-1 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 rounded-lg text-xs font-semibold flex items-center space-x-1"
                            title="Télécharger"
                          >
                            <Download className="w-3 h-3" />
                            <span>Télécharger</span>
                          </a>
                          {isDirectorOfStudies && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(prog)}
                                className="p-1 text-slate-400 hover:text-white"
                                title="Modifier"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingProgram(prog)}
                                className="p-1 text-rose-400 hover:text-rose-200"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL D'IMPORTATION / MODIFICATION (Compte D.E uniquement)       */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl my-6 flex flex-col space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Entête */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  {editingProgram ? <Edit className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {editingProgram ? 'Modifier le programme' : 'Importer un programme scolaire'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Fichiers acceptés : PDF, Word (.doc, .docx) ou images. Limite maximale de 20 Mo.
                  </p>
                </div>
              </div>
              <CloseButton onClose={() => !isUploading && setIsModalOpen(false)} />
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Titre */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Titre du programme / Livre scolaire <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex : Manuel de Mathématiques CIAM 3ème"
                  disabled={isUploading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Matière */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Matière <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formSubjectId}
                    onChange={(e) => {
                      const sId = e.target.value;
                      setFormSubjectId(sId);
                      const found = subjects.find((s) => s.id === sId || s.code === sId);
                      if (found) {
                        setFormSubjectName(found.name || found.code);
                      }
                    }}
                    disabled={isUploading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Sélectionner une matière...</option>
                    {subjects.map((sub) => (
                      <option key={sub.id || sub.code} value={sub.id || sub.code}>
                        {sub.name || sub.code}
                      </option>
                    ))}
                    <option value="CUSTOM">Autre matière (saisie libre)...</option>
                  </select>
                </div>

                {/* Saisie libre matière si personnalisée ou pas dans la liste */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Intitulé de la matière <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formSubjectName}
                    onChange={(e) => setFormSubjectName(e.target.value)}
                    placeholder="Ex : Français, Mathématiques..."
                    disabled={isUploading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Classe & Année */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Classe associée <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formClassId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      setFormClassId(cId);
                      if (cId === 'ALL') {
                        setFormClassName('Toutes les classes');
                      } else {
                        const found = classes.find((c) => c.id === cId);
                        if (found) setFormClassName(found.name);
                      }
                    }}
                    disabled={isUploading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">Sélectionner la classe...</option>
                    <option value="ALL">Toutes les classes</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.level_code})
                      </option>
                    ))}
                    <option value="CUSTOM">Autre classe (saisie libre)...</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nom de la classe <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formClassName}
                    onChange={(e) => setFormClassName(e.target.value)}
                    placeholder="Ex : 3ème A, Terminale C, Toutes les classes"
                    disabled={isUploading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Année scolaire */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Année scolaire <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formAcademicYear}
                  onChange={(e) => setFormAcademicYear(e.target.value)}
                  placeholder="2025-2026"
                  disabled={isUploading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Sélecteur de fichier (Galerie / Explorateur de fichiers) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>
                    Fichier du programme / Livre {!editingProgram && <span className="text-rose-400">*</span>}
                  </span>
                  <span className="text-[11px] text-teal-400 font-normal">Taille maximale : 20 Mo</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />

                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition ${
                    fileError
                      ? 'border-rose-500/50 bg-rose-500/5'
                      : selectedFile
                      ? 'border-teal-500/50 bg-teal-500/5'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-teal-400 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-white">
                        {selectedFile
                          ? selectedFile.name
                          : editingProgram
                          ? 'Cliquer pour remplacer le fichier existant'
                          : 'Cliquez pour ouvrir les fichiers ou la galerie'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {selectedFile
                          ? `${formatFileSize(selectedFile.size)} • Prêt pour l'import`
                          : 'Compatible PDF, Microsoft Word (.doc, .docx) et Images (.jpg, .png, .webp)'}
                      </p>
                    </div>
                  </div>
                </div>

                {fileError && (
                  <p className="text-xs text-rose-400 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fileError}</span>
                  </p>
                )}

                {editingProgram && !selectedFile && (
                  <p className="text-[11px] text-slate-400">
                    Fichier actuel conservé : <span className="font-mono text-slate-300">{editingProgram.file_name}</span> ({formatFileSize(editingProgram.file_size)})
                  </p>
                )}
              </div>

              {/* BARRE DE PROGRESSION (Exigée par le prompt) */}
              {isUploading && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-teal-300 flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                      <span>Transfert vers le stockage de l'application...</span>
                    </span>
                    <span className="font-mono font-bold text-white">{uploadProgress}%</span>
                  </div>

                  {/* Barre visuelle */}
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-300 h-2.5 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  {uploadBytes.total > 0 && (
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>{formatFileSize(uploadBytes.loaded)} transférés</span>
                      <span>Total : {formatFileSize(uploadBytes.total)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Boutons d'action */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUploading || Boolean(fileError)}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Enregistrement ({uploadProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingProgram ? 'Enregistrer les modifications' : 'Importer le programme'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE VISUALISATION (Bouton "Voir")                         */}
      {/* ============================================================== */}
      {viewingProgram && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Barre d'outils du visualiseur */}
            <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/80 shrink-0">
              <div className="flex items-center space-x-3 truncate">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="text-sm sm:text-base font-bold text-white truncate">
                    {viewingProgram.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-400 truncate">
                    <span>{viewingProgram.subject_name}</span>
                    <span>•</span>
                    <span>{viewingProgram.class_name}</span>
                    <span>•</span>
                    <span className="font-mono">{formatFileSize(viewingProgram.file_size)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {/* Ouvrir dans un nouvel onglet */}
                <a
                  href={api.getCurriculumProgramFileUrl(viewingProgram.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                  title="Ouvrir en plein écran"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Plein écran</span>
                </a>

                {/* Télécharger */}
                <a
                  href={api.getCurriculumProgramDownloadUrl(viewingProgram.id)}
                  download={viewingProgram.file_name}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-teal-600/20 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </a>

                <CloseButton onClose={() => setViewingProgram(null)} />
              </div>
            </div>

            {/* Corps du visualiseur */}
            <div className="flex-1 bg-slate-950 overflow-auto p-2 sm:p-4 flex items-center justify-center">
              {viewingProgram.file_type.includes('pdf') || viewingProgram.file_name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={api.getCurriculumProgramFileUrl(viewingProgram.id)}
                  title={viewingProgram.title}
                  className="w-full h-full rounded-xl border border-slate-800 bg-white"
                />
              ) : viewingProgram.file_type.includes('image') ||
                /\.(png|jpe?g|webp|gif)$/i.test(viewingProgram.file_name) ? (
                <div className="max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={api.getCurriculumProgramFileUrl(viewingProgram.id)}
                    alt={viewingProgram.title}
                    className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
                  />
                </div>
              ) : (
                /* Fichier Word ou autre document bureautique */
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-lg text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white mb-1">{viewingProgram.file_name}</h4>
                    <p className="text-xs text-slate-400">
                      Document Microsoft Word ({formatFileSize(viewingProgram.file_size)}). Pour une lecture et une
                      mise en page fidèles, téléchargez le fichier ou ouvrez-le avec votre traitement de texte.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    <a
                      href={api.getCurriculumProgramDownloadUrl(viewingProgram.id)}
                      download={viewingProgram.file_name}
                      className="w-full sm:w-auto px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Télécharger le document</span>
                    </a>
                    <a
                      href={api.getCurriculumProgramFileUrl(viewingProgram.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold inline-flex items-center justify-center space-x-1.5 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ouvrir dans le navigateur</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE CONFIRMATION DE SUPPRESSION (Compte D.E uniquement)   */}
      {/* ============================================================== */}
      {deletingProgram && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Supprimer ce programme ?</h3>
                <p className="text-xs text-slate-400">Cette action supprimera également le fichier du stockage.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
              <p className="font-bold text-slate-200">{deletingProgram.title}</p>
              <p className="text-slate-400">
                Matière: {deletingProgram.subject_name} • Classe: {deletingProgram.class_name}
              </p>
              <p className="text-slate-500 font-mono">Fichier: {deletingProgram.file_name}</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingProgram(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmer la suppression</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
