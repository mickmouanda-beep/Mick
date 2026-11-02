import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Search,
  Filter,
  Send,
  Printer,
  Download,
  Settings,
  History,
  Users,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  MessageSquare,
  Phone,
  Check,
  ExternalLink,
  ShieldAlert,
  Info,
  Sparkles,
  Award,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ExamType,
  ExamRequiredDocument,
  ExamConfiguration,
  ExamCandidate,
  ExamDocumentStatus,
  ExamDossierLog,
  ExamNotificationLog,
} from '../types.ts';
import { printDocument, downloadPdf } from '../utils/printPdfUtils.ts';

const isDocReceived = (status?: ExamDocumentStatus): boolean => Boolean(status?.received || status?.is_checked);
const getDocDate = (status?: ExamDocumentStatus): string | undefined => status?.received_at || status?.checked_at;
const getDocUser = (status?: ExamDocumentStatus): string | undefined => status?.received_by_name || status?.checked_by_name;

export const ExamDossiersView: React.FC = () => {
  const { user, establishment } = useAuth();

  // Active Exam Tab: BEPC or BAC
  const [activeExam, setActiveExam] = useState<ExamType>('BEPC');

  // Series selection for BAC
  const [selectedSerie, setSelectedSerie] = useState<string>('TOUTES');

  // Filters
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLET' | 'INCOMPLET'>('ALL');
  const [filterMissingDoc, setFilterMissingDoc] = useState<string>('ALL');
  const [filterRetainedOnly, setFilterRetainedOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Data states
  const [config, setConfig] = useState<ExamConfiguration | null>(null);
  const [candidates, setCandidates] = useState<ExamCandidate[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configDocs, setConfigDocs] = useState<ExamRequiredDocument[]>([]);
  const [configDeadline, setConfigDeadline] = useState<string>('');

  // Single candidate notification modal
  const [selectedCandidateForNotify, setSelectedCandidateForNotify] = useState<ExamCandidate | null>(null);
  const [notifyChannel, setNotifyChannel] = useState<'WHATSAPP' | 'SMS' | 'IN_APP'>('WHATSAPP');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [notifyRecipientName, setNotifyRecipientName] = useState<string>('');
  const [notifyRecipientPhone, setNotifyRecipientPhone] = useState<string>('');

  // Bulk notification modal
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState<boolean>(false);
  const [bulkChannel, setBulkChannel] = useState<'WHATSAPP' | 'SMS' | 'IN_APP'>('IN_APP');
  const [bulkMessageTemplate, setBulkMessageTemplate] = useState<string>('');

  // Candidate Audit & Logs modal
  const [selectedCandidateForLogs, setSelectedCandidateForLogs] = useState<ExamCandidate | null>(null);
  const [candidateLogs, setCandidateLogs] = useState<ExamDossierLog[]>([]);
  const [candidateNotifs, setCandidateNotifs] = useState<ExamNotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Print view target state
  const [printCandidate, setPrintCandidate] = useState<ExamCandidate | null>(null);
  const [isPrintListMode, setIsPrintListMode] = useState<boolean>(false);

  // Reference for printable sections
  const printSingleRef = useRef<HTMLDivElement>(null);
  const printListRef = useRef<HTMLDivElement>(null);

  // Auto clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load configuration, candidates, and stats
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [cfgRes, candRes, statsRes] = await Promise.all([
        api.getExamConfig(activeExam),
        api.getExamCandidates({
          examType: activeExam,
          serieCode: activeExam === 'BAC' && selectedSerie !== 'TOUTES' ? selectedSerie : undefined,
        }),
        api.getExamStats(),
      ]);

      const candResAny = candRes as any;
      setConfig(cfgRes || (candResAny && typeof candResAny === 'object' && 'config' in candResAny ? candResAny.config : null));
      const candList = Array.isArray(candResAny) ? candResAny : (candResAny?.candidates || []);
      setCandidates(Array.isArray(candList) ? candList : []);
      setStats(statsRes);
    } catch (err: any) {
      console.error('Erreur chargement suivi des dossiers:', err);
      setError(err.message || 'Impossible de charger les dossiers d’examen.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeExam, selectedSerie]);

  // Safe candidates array helper
  const safeCandidates = useMemo(() => (Array.isArray(candidates) ? candidates : []), [candidates]);

  // Available series from BAC candidates
  const availableSeries = useMemo(() => {
    if (activeExam !== 'BAC') return [];
    const set = new Set<string>();
    safeCandidates.forEach((c) => {
      if (c.serie_code) set.add(c.serie_code);
    });
    // Add default series if none found in candidates
    if (set.size === 0) {
      ['A', 'C', 'D', 'TI', 'G1', 'G2', 'G3', 'BG'].forEach((s) => set.add(s));
    }
    return Array.from(set).sort();
  }, [activeExam, safeCandidates]);

  // Filtered candidates list
  const filteredCandidates = useMemo(() => {
    return safeCandidates.filter((c) => {
      // Retained filter
      if (filterRetainedOnly && !c.is_retained) return false;

      // Series filter for BAC
      if (activeExam === 'BAC' && selectedSerie !== 'TOUTES') {
        if ((c.serie_code || '').toUpperCase() !== selectedSerie.toUpperCase()) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== 'ALL') {
        if (c.status !== filterStatus) return false;
      }

      // Filter by specific missing document
      if (filterMissingDoc !== 'ALL') {
        const docStatus = c.checklist?.[filterMissingDoc];
        if (isDocReceived(docStatus)) return false;
      }

      // Search term (name, matricule, class)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
        const matricule = (c.matricule || '').toLowerCase();
        const className = (c.class_name || '').toLowerCase();
        if (!fullName.includes(query) && !matricule.includes(query) && !className.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [safeCandidates, activeExam, selectedSerie, filterStatus, filterMissingDoc, filterRetainedOnly, searchTerm]);

  // Candidates with incomplete status (for bulk notification)
  const incompleteCandidates = useMemo(() => {
    return filteredCandidates.filter((c) => c.status === 'INCOMPLET' && (c.is_retained || !filterRetainedOnly));
  }, [filteredCandidates, filterRetainedOnly]);

  // Deadline alert check
  const deadlineAlert = useMemo(() => {
    if (!config?.deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(config.deadline);
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const incompleteCount = safeCandidates.filter((c) => c.status === 'INCOMPLET' && c.is_retained).length;

    if (diffDays < 0) {
      return {
        isOverdue: true,
        days: Math.abs(diffDays),
        message: `La date limite de dépôt est dépassée de ${Math.abs(diffDays)} jour(s). ${incompleteCount} dossier(s) retenu(s) demeurent encore incomplets.`,
        incompleteCount,
      };
    } else if (diffDays <= 15) {
      return {
        isUrgent: true,
        days: diffDays,
        message: `Échéance proche : il reste ${diffDays} jour(s) avant la date limite (${new Date(config.deadline).toLocaleDateString('fr-FR')}). ${incompleteCount} dossier(s) retenu(s) incomplets.`,
        incompleteCount,
      };
    }
    return null;
  }, [config, safeCandidates]);

  // Handle document toggle (check / uncheck)
  const handleToggleDoc = async (candidateId: string, docId: string, currentChecked: boolean) => {
    try {
      const nextChecked = !currentChecked;

      // Optimistic update
      setCandidates((prev) =>
        prev.map((c) => {
          if (c.id !== candidateId) return c;
          const nextChecklist = { ...c.checklist };
          nextChecklist[docId] = {
            doc_id: docId,
            received: nextChecked,
            is_checked: nextChecked,
            received_at: nextChecked ? new Date().toISOString() : undefined,
            checked_at: nextChecked ? new Date().toISOString() : undefined,
            received_by_name: nextChecked ? (user?.full_name || 'D.E') : undefined,
            checked_by_name: nextChecked ? (user?.full_name || 'D.E') : undefined,
            received_by_id: nextChecked ? user?.id : undefined,
            checked_by_id: nextChecked ? user?.id : undefined,
          };
          const totalDocs = config?.required_documents.length || 1;
          const receivedCount = Object.values(nextChecklist).filter((d) => isDocReceived(d)).length;
          const isComplete = receivedCount >= totalDocs;

          return {
            ...c,
            checklist: nextChecklist,
            documents_received_count: receivedCount,
            documents_total_count: totalDocs,
            status: isComplete ? 'COMPLET' : 'INCOMPLET',
          };
        })
      );

      // Call API
      const res = await api.checkCandidateDoc(candidateId, {
        docId,
        isChecked: nextChecked,
      });

      if (res && res.candidate) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, ...res.candidate } : c))
        );
      }
    } catch (err: any) {
      console.error('Erreur pointage document:', err);
      setError(err.message || 'Erreur lors du pointage de la pièce.');
      // Revert with fetch
      fetchData();
    }
  };

  // Handle toggle retained
  const handleToggleRetained = async (candidateId: string, currentRetained: boolean | number) => {
    try {
      const nextVal = !currentRetained;
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? { ...c, is_retained: nextVal } : c))
      );

      await api.toggleCandidateRetained(candidateId, nextVal);
      setSuccessMessage(nextVal ? 'Élève retenu sur la liste officielle.' : 'Élève retiré de la liste des retenus.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors du basculement.');
      fetchData();
    }
  };

  // Toggle all retained in current view (BEPC or series)
  const handleToggleAllRetained = async (isRetained: boolean) => {
    try {
      setIsSaving(true);
      await api.toggleAllCandidatesRetained({
        examType: activeExam,
        serieCode: activeExam === 'BAC' && selectedSerie !== 'TOUTES' ? selectedSerie : undefined,
        isRetained,
      });
      setSuccessMessage(isRetained ? 'Tous les candidats de la sélection ont été retenus.' : 'Candidats retirés des retenus.');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour globale.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open config modal
  const openConfigModal = () => {
    if (config) {
      setConfigDocs([...config.required_documents]);
      setConfigDeadline(config.deadline ? config.deadline.substring(0, 10) : '');
    }
    setIsConfigModalOpen(true);
  };

  // Save config
  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      if (configDocs.length === 0) {
        setError('Veuillez définir au moins un document obligatoire pour cet examen.');
        return;
      }
      const updated = await api.updateExamConfig({
        exam_type: activeExam,
        required_documents: configDocs,
        deadline: configDeadline || null,
      });
      setConfig(updated.config);
      setIsConfigModalOpen(false);
      setSuccessMessage('Configuration des documents et date limite enregistrée avec succès.');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde de la configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Document config helpers
  const handleAddConfigDoc = () => {
    const newDoc: ExamRequiredDocument = {
      id: `doc_${Date.now()}`,
      name: 'Nouveau document exigé',
      type: 'photocopie',
      is_mandatory: true,
      order: configDocs.length + 1,
    };
    setConfigDocs([...configDocs, newDoc]);
  };

  const handleUpdateConfigDoc = (index: number, updates: Partial<ExamRequiredDocument>) => {
    const next = [...configDocs];
    next[index] = { ...next[index], ...updates };
    setConfigDocs(next);
  };

  const handleDeleteConfigDoc = (index: number) => {
    const next = configDocs.filter((_, i) => i !== index);
    setConfigDocs(next);
  };

  const handleMoveDoc = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === configDocs.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const next = [...configDocs];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setConfigDocs(next);
  };

  // Open individual notification modal
  const handleOpenNotifyModal = (cand: ExamCandidate) => {
    setSelectedCandidateForNotify(cand);

    // Calculate missing documents
    const missingDocs = (config?.required_documents || [])
      .filter((doc) => !isDocReceived(cand.checklist?.[doc.id]))
      .map((doc) => `• ${doc.name} (${doc.type === 'original' ? 'Original requis' : 'Photocopie légalisée'})`);

    const deadlineText = config?.deadline
      ? `au plus tard le ${new Date(config.deadline).toLocaleDateString('fr-FR')}`
      : 'dans les plus brefs délais';

    const defaultMsg =
      `Bonjour,\n\n` +
      `Nous vous informons que le dossier d'inscription à l'examen du ${cand.exam_type} de l'élève ${cand.first_name} ${cand.last_name} (${cand.class_name || (cand.serie_code ? 'Tle ' + cand.serie_code : '')}) est actuellement INCOMPLET.\n\n` +
      `Pièces manquantes exigées :\n${missingDocs.join('\n')}\n\n` +
      `Merci de faire parvenir ces pièces au bureau du Directeur des Études (D.E) ${deadlineText}.\n\n` +
      `Cordialement,\nLa Direction des Études — ${establishment?.name || 'Direction de l’établissement'}`;

    setCustomMessage(defaultMsg);
    setNotifyRecipientName(cand.guardian_name || `${cand.first_name} ${cand.last_name}`);
    setNotifyRecipientPhone(cand.guardian_phone || '');
    setNotifyChannel('WHATSAPP');
  };

  // Send single notification
  const handleSendSingleNotification = async () => {
    if (!selectedCandidateForNotify) return;
    try {
      setIsSaving(true);

      // If WhatsApp, prepare direct link
      if (notifyChannel === 'WHATSAPP') {
        const cleanPhone = (notifyRecipientPhone || '').replace(/\D/g, '');
        const encodedText = encodeURIComponent(customMessage);
        const waUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodedText}`
          : `https://wa.me/?text=${encodedText}`;

        // Open WhatsApp window
        window.open(waUrl, '_blank');
      }

      // Record in backend audit
      await api.sendExamNotification({
        candidateId: selectedCandidateForNotify.id,
        channel: notifyChannel,
        recipientName: notifyRecipientName,
        recipientPhone: notifyRecipientPhone,
        message: customMessage,
      });

      setSuccessMessage(`Message envoyé / consigné avec succès à ${notifyRecipientName}.`);
      setSelectedCandidateForNotify(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’envoi de la notification.');
    } finally {
      setIsSaving(false);
    }
  };

  // Send bulk notifications
  const handleSendBulkNotifications = async () => {
    if (incompleteCandidates.length === 0) return;
    try {
      setIsSaving(true);
      const candidateIds = incompleteCandidates.map((c) => c.id);

      const res = await api.sendBulkExamNotifications({
        candidateIds,
        channel: bulkChannel,
        customMessageTemplate: bulkMessageTemplate || undefined,
      });

      setSuccessMessage(
        res.message || `${candidateIds.length} notification(s) envoyée(s) aux dossiers incomplets.`
      );
      setIsBulkNotifyOpen(false);
      setBulkMessageTemplate('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’envoi groupé.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open candidate audit logs modal
  const handleOpenLogsModal = async (cand: ExamCandidate) => {
    setSelectedCandidateForLogs(cand);
    try {
      setIsLoadingLogs(true);
      const res = await api.getCandidateLogs(cand.id);
      setCandidateLogs(res.logs || []);
      setCandidateNotifs(res.notifications || []);
    } catch (err: any) {
      console.error('Erreur chargement historique:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Trigger Print or PDF Download
  const handlePrintSingle = (cand: ExamCandidate) => {
    setPrintCandidate(cand);
    setIsPrintListMode(false);
    setTimeout(() => {
      printDocument('printable-single-dossier', `Fiche_Dossier_${cand.last_name}_${cand.first_name}`);
    }, 150);
  };

  const handleDownloadPdfSingle = async (cand: ExamCandidate) => {
    setPrintCandidate(cand);
    setIsPrintListMode(false);
    setTimeout(async () => {
      await downloadPdf('printable-single-dossier', `Fiche_Dossier_${cand.last_name}_${cand.first_name}.pdf`);
    }, 200);
  };

  const handlePrintList = () => {
    setIsPrintListMode(true);
    setPrintCandidate(null);
    setTimeout(() => {
      const title = `Bordereau_Dossiers_${activeExam}_${activeExam === 'BAC' ? selectedSerie : '3e'}`;
      printDocument('printable-list-dossiers', title);
    }, 150);
  };

  const handleDownloadPdfList = async () => {
    setIsPrintListMode(true);
    setPrintCandidate(null);
    setTimeout(async () => {
      const title = `Bordereau_Dossiers_${activeExam}_${activeExam === 'BAC' ? selectedSerie : '3e'}.pdf`;
      await downloadPdf('printable-list-dossiers', title);
    }, 200);
  };

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8 text-slate-100 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Suivi des dossiers d'examen
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Espace D.E & Direction
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Contrôle physique des pièces obligatoires (BEPC & BAC), alertes échéances et rappels aux familles
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openConfigModal}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>Pièces exigées & Échéance</span>
          </button>

          <button
            onClick={() => {
              const defaultTemplate =
                `Rappel officiel : Le dossier d'inscription au {EXAM} de {ELEVE} ({CLASSE}) est incomplet.\n` +
                `Documents manquants : {PIECES_MANQUANTES}.\nDate limite : {DATE_LIMITE}. Merci de régulariser d'urgence.`;
              setBulkMessageTemplate(defaultTemplate);
              setIsBulkNotifyOpen(true);
            }}
            disabled={incompleteCandidates.length === 0}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition ${
              incompleteCandidates.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800'
                : 'bg-rose-900/40 text-rose-200 border border-rose-700/60 hover:bg-rose-900/60 shadow-sm'
            }`}
          >
            <Send className="w-4 h-4 text-rose-400" />
            <span>Informer les incomplets ({incompleteCandidates.length})</span>
          </button>

          <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-900">
            <button
              onClick={handlePrintList}
              title="Imprimer le bordereau de la sélection"
              className="px-3 py-2 text-xs font-semibold hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 transition border-r border-slate-700"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Imprimer</span>
            </button>
            <button
              onClick={handleDownloadPdfList}
              title="Télécharger le bordereau en PDF"
              className="px-3 py-2 text-xs font-semibold hover:bg-slate-800 text-slate-200 flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            title="Rafraîchir les données"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-100 font-bold">×</button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs sm:text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-100 font-bold">×</button>
        </div>
      )}

      {/* DEADLINE PROXIMITY ALERT BANNER */}
      {deadlineAlert && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ${
            deadlineAlert.isOverdue
              ? 'bg-rose-950/70 border-rose-800 text-rose-100 shadow-rose-950/20'
              : 'bg-amber-950/60 border-amber-800 text-amber-100 shadow-amber-950/20'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg mt-0.5 ${deadlineAlert.isOverdue ? 'bg-rose-900/60 text-rose-300' : 'bg-amber-900/60 text-amber-300'}`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-wide">
                {deadlineAlert.isOverdue ? 'ALERTE : DATE LIMITE DÉPASSÉE' : 'ATTENTION : DATE LIMITE EN APPROCHE'}
              </h4>
              <p className="text-xs opacity-90 mt-0.5">{deadlineAlert.message}</p>
            </div>
          </div>
          <button
            onClick={() => {
              const defaultTemplate =
                `URGENT EXAMEN : La date limite de dépôt des dossiers pour le ${activeExam} arrive à échéance le ${config?.deadline ? new Date(config.deadline).toLocaleDateString('fr-FR') : ''}.\n` +
                `Votre dossier est incomplet. Pièces manquantes : {PIECES_MANQUANTES}.\n` +
                `Veuillez déposer vos pièces au bureau du D.E sans délai.`;
              setBulkMessageTemplate(defaultTemplate);
              setIsBulkNotifyOpen(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
              deadlineAlert.isOverdue
                ? 'bg-rose-700 hover:bg-rose-600 text-white border-rose-500'
                : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
            }`}
          >
            Lancer un rappel d'urgence
          </button>
        </div>
      )}

      {/* EXAM TABS (BEPC vs BAC) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex space-x-1 sm:space-x-3">
          <button
            onClick={() => {
              setActiveExam('BEPC');
              setSelectedSerie('TOUTES');
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeExam === 'BEPC'
                ? 'border-indigo-500 text-white bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Award className="w-4 h-4 text-indigo-400" />
            <span>Classe de 3e — BEPC</span>
            {stats?.bepc && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                {stats.bepc.retained_count} retenus
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setActiveExam('BAC');
              setSelectedSerie('TOUTES');
            }}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeExam === 'BAC'
                ? 'border-indigo-500 text-white bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Classes de Terminale — BAC</span>
            {stats?.bac && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-normal">
                {stats.bac.retained_count} retenus
              </span>
            )}
          </button>
        </div>

        {/* Date limite label */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>Date limite de dépôt :</span>
          <span className="font-semibold text-slate-200">
            {config?.deadline ? new Date(config.deadline).toLocaleDateString('fr-FR') : 'Non configurée'}
          </span>
        </div>
      </div>

      {/* BAC SERIES SUB-TABS (when activeExam === 'BAC') */}
      {activeExam === 'BAC' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-medium text-slate-400 mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Séries :
          </span>
          <button
            onClick={() => setSelectedSerie('TOUTES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedSerie === 'TOUTES'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            Toutes les séries
          </button>
          {availableSeries.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSerie(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedSerie === s
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Série {s}
            </button>
          ))}
        </div>
      )}

      {/* DASHBOARD STATS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-slate-400">Total Candidats Détectés</span>
          <div className="text-2xl font-bold text-white mt-1">{safeCandidates.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {safeCandidates.filter((c) => c.is_retained).length} retenus officiellement
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Dossiers Complets
          </span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {safeCandidates.filter((c) => c.status === 'COMPLET' && c.is_retained).length}
          </div>
          <div className="text-[11px] text-emerald-500/70 mt-0.5">
            {safeCandidates.filter((c) => c.is_retained).length > 0
              ? `${Math.round(
                  (safeCandidates.filter((c) => c.status === 'COMPLET' && c.is_retained).length /
                    safeCandidates.filter((c) => c.is_retained).length) *
                    100
                )}% de conformité`
              : '0%'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-rose-400 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" /> Dossiers Incomplets
          </span>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {safeCandidates.filter((c) => c.status === 'INCOMPLET' && c.is_retained).length}
          </div>
          <div className="text-[11px] text-rose-400/70 mt-0.5">Nécessitent un rappel urgent</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <span className="text-xs font-medium text-indigo-400">Pièces Exigées</span>
          <div className="text-2xl font-bold text-indigo-300 mt-1">
            {config?.required_documents.length || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
            {config?.deadline
              ? `Limite : ${new Date(config.deadline).toLocaleDateString('fr-FR')}`
              : 'Échéance libre'}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, prénom, matricule ou classe..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="COMPLET">Complets uniquement</option>
            <option value="INCOMPLET">Incomplets uniquement</option>
          </select>

          {/* Missing Doc Filter */}
          <select
            value={filterMissingDoc}
            onChange={(e) => setFilterMissingDoc(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">Tout document manquant</option>
            {(config?.required_documents || []).map((doc) => (
              <option key={doc.id} value={doc.id}>
                Manque : {doc.name}
              </option>
            ))}
          </select>

          {/* Retained only toggle button */}
          <button
            onClick={() => setFilterRetainedOnly(!filterRetainedOnly)}
            className={`px-3 py-2 text-xs rounded-lg border flex items-center gap-1.5 transition ${
              filterRetainedOnly
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 font-semibold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Retenus seuls</span>
          </button>

          {/* Bulk Retain / Unretain buttons for currently filtered */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
            <button
              onClick={() => handleToggleAllRetained(true)}
              title="Retenir tous les candidats de cette sélection"
              disabled={isSaving}
              className="px-2.5 py-2 text-xs rounded-lg bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-800/60 transition"
            >
              Tout retenir
            </button>
            <button
              onClick={() => handleToggleAllRetained(false)}
              title="Désélectionner tous les candidats"
              disabled={isSaving}
              className="px-2.5 py-2 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition"
            >
              Désélectionner
            </button>
          </div>
        </div>
      </div>

      {/* CANDIDATES LIST / CHECKLIST SECTION */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm">Chargement des dossiers d'examen...</p>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="p-12 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
          <ClipboardCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Aucun élève inscrit dans cette classe</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Aucun élève inscrit n'a été trouvé pour l'examen du {activeExam}{' '}
            {activeExam === 'BAC' && selectedSerie !== 'TOUTES' ? `(Série ${selectedSerie})` : ''}.
            Les élèves sont lus automatiquement depuis la liste globale des élèves inscrits pour l'année scolaire en cours.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Affichage de <b className="text-slate-200">{filteredCandidates.length}</b> candidat(s)
            </span>
            <span>
              Documents configurés : <b className="text-slate-200">{config?.required_documents.length || 0}</b> pièces
            </span>
          </div>

          {filteredCandidates.map((cand) => {
            const totalDocs = config?.required_documents.length || 0;
            const receivedDocs = cand.documents_received_count || 0;
            const isComplete = cand.status === 'COMPLET';
            const progressPercent = totalDocs > 0 ? Math.round((receivedDocs / totalDocs) * 100) : 0;

            return (
              <div
                key={cand.id}
                className={`rounded-xl border transition p-4 sm:p-5 ${
                  cand.is_retained
                    ? isComplete
                      ? 'bg-slate-900/90 border-emerald-900/50 hover:border-emerald-700/60'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/60 border-slate-900 opacity-60'
                }`}
              >
                {/* Candidate Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Retained checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer mt-0.5 sm:mt-0">
                      <input
                        type="checkbox"
                        checked={Boolean(cand.is_retained)}
                        onChange={() => handleToggleRetained(cand.id, cand.is_retained)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-950 border-slate-700 cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                        {cand.is_retained ? 'Retenu' : 'Non retenu'}
                      </span>
                    </label>

                    {/* Student Info */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-white tracking-wide">
                          {cand.last_name?.toUpperCase()} {cand.first_name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {cand.matricule || 'Sans matricule'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {cand.class_name || (cand.serie_code ? `Terminale ${cand.serie_code}` : '3e')}
                        </span>
                        {cand.serie_code && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                            Série {cand.serie_code}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        {cand.birth_date && (
                          <span>Né(e) le : {new Date(cand.birth_date).toLocaleDateString('fr-FR')}</span>
                        )}
                        {cand.guardian_name && (
                          <span>
                            Tuteur : <b className="text-slate-300">{cand.guardian_name}</b>
                            {cand.guardian_phone ? ` (${cand.guardian_phone})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {/* Progression */}
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                            isComplete
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {isComplete ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              Dossier complet
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              Dossier incomplet
                            </>
                          )}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-300">
                          {receivedDocs}/{totalDocs}
                        </span>
                      </div>

                      {/* Mini progress bar */}
                      <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1.5 ml-auto">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-rose-500 to-amber-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Candidate actions dropdown/buttons */}
                    <div className="flex items-center gap-1">
                      {/* Notify button (active if incomplete) */}
                      {!isComplete && (
                        <button
                          onClick={() => handleOpenNotifyModal(cand)}
                          title="Informer les parents et l'élève"
                          className="p-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 transition"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}

                      {/* Single Print */}
                      <button
                        onClick={() => handlePrintSingle(cand)}
                        title="Imprimer la fiche individuelle"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      >
                        <Printer className="w-4 h-4 text-sky-400" />
                      </button>

                      {/* Single PDF */}
                      <button
                        onClick={() => handleDownloadPdfSingle(cand)}
                        title="Télécharger la fiche en PDF"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                      </button>

                      {/* Audit History */}
                      <button
                        onClick={() => handleOpenLogsModal(cand)}
                        title="Voir l'historique des modifications & rappels"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
                      >
                        <History className="w-4 h-4 text-indigo-400" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* CHECKLIST ROW (PHYSICAL DOCUMENTS) */}
                <div className="mt-3.5 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {(config?.required_documents || []).map((doc) => {
                      const status = cand.checklist?.[doc.id];
                      const isChecked = isDocReceived(status);

                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleToggleDoc(cand.id, doc.id, isChecked)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-emerald-950/40 border-emerald-700/80 hover:bg-emerald-950/60 text-emerald-100'
                              : 'bg-rose-950/20 border-rose-900/40 hover:bg-rose-950/30 text-slate-300'
                          }`}
                        >
                          <div className="mt-0.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}} // handled by parent onClick
                              className={`w-4 h-4 rounded cursor-pointer ${
                                isChecked
                                  ? 'accent-emerald-500 text-emerald-600 focus:ring-emerald-500'
                                  : 'accent-rose-500 bg-slate-900 border-slate-700'
                              }`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`font-semibold truncate ${
                                  isChecked ? 'text-emerald-300' : 'text-slate-200'
                                }`}
                              >
                                {doc.name}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded uppercase tracking-wider font-mono ${
                                  doc.type === 'original'
                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {doc.type}
                              </span>
                            </div>

                            {/* Author and Date if checked */}
                            {isChecked ? (
                              <div className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1 truncate">
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Reçu le {getDocDate(status) ? new Date(getDocDate(status)!).toLocaleDateString('fr-FR') : '—'}</span>
                                {getDocUser(status) && <span>par {getDocUser(status)}</span>}
                              </div>
                            ) : (
                              <div className="text-[10px] text-rose-400/80 mt-1 flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-400" />
                                <span>Non apporté</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CONFIGURATION DES DOCUMENTS ET DATE LIMITE       */}
      {/* ========================================================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg text-white">
                  Configuration des documents — {activeExam}
                </h3>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Date Limite Section */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-200">
                    Date limite officielle de dépôt des pièces (Saisie D.E)
                  </label>
                  {configDeadline && (
                    <button
                      type="button"
                      onClick={() => setConfigDeadline('')}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 text-xs font-medium flex items-center gap-1.5 transition"
                      title="Supprimer la date limite"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer la date limite</span>
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="date"
                    value={configDeadline}
                    onChange={(e) => setConfigDeadline(e.target.value)}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-slate-400">
                    {configDeadline
                      ? "Une alerte visuelle s'activera automatiquement à moins de 15 jours de cette échéance."
                      : "Champ vide au départ. Saisie exclusivement par le D.E (aucune date automatique)."}
                  </span>
                </div>
              </div>

              {/* Documents List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-200">
                    Documents exigés ({configDocs.length})
                  </h4>
                  <button
                    onClick={handleAddConfigDoc}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter un document</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {configDocs.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800"
                    >
                      {/* Reorder Arrows */}
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveDoc(idx, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDoc(idx, 'down')}
                          disabled={idx === configDocs.length - 1}
                          className="p-0.5 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Name input */}
                      <input
                        type="text"
                        value={doc.name}
                        onChange={(e) => handleUpdateConfigDoc(idx, { name: e.target.value })}
                        placeholder="Ex: Acte de naissance légalisé"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                      />

                      {/* Type: original or photocopie */}
                      <select
                        value={doc.type}
                        onChange={(e: any) => handleUpdateConfigDoc(idx, { type: e.target.value })}
                        className="px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="photocopie">Photocopie</option>
                        <option value="original">Original</option>
                        <option value="original_or_photocopy">Original ou Copie</option>
                      </select>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteConfigDoc(idx)}
                        className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer la configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: NOTIFICATION INDIVIDUELLE (PARENTS & ÉLÈVE)      */}
      {/* ========================================================= */}
      {selectedCandidateForNotify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base text-white">
                  Rappel dossier incomplet — {selectedCandidateForNotify.first_name}{' '}
                  {selectedCandidateForNotify.last_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCandidateForNotify(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Channel Selector */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Canal de transmission
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNotifyChannel('WHATSAPP')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      notifyChannel === 'WHATSAPP'
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyChannel('SMS')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      notifyChannel === 'SMS'
                        ? 'bg-sky-950/60 border-sky-600 text-sky-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Phone className="w-4 h-4 text-sky-400" />
                    <span>SMS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifyChannel('IN_APP')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      notifyChannel === 'IN_APP'
                        ? 'bg-indigo-950/60 border-indigo-600 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Espace Parent</span>
                  </button>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Nom du destinataire</label>
                  <input
                    type="text"
                    value={notifyRecipientName}
                    onChange={(e) => setNotifyRecipientName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Numéro de téléphone</label>
                  <input
                    type="text"
                    value={notifyRecipientPhone}
                    onChange={(e) => setNotifyRecipientPhone(e.target.value)}
                    placeholder="Ex: +242 06 123 4567"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Message preview / edit */}
              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Message généré automatiquement (modifiable avant envoi) :
                </label>
                <textarea
                  rows={8}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedCandidateForNotify(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendSingleNotification}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{notifyChannel === 'WHATSAPP' ? 'Ouvrir WhatsApp & Consigner' : 'Envoyer & Consigner'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: NOTIFICATION GROUPÉE (TOUS DOSSIERS INCOMPLETS)  */}
      {/* ========================================================= */}
      {isBulkNotifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base text-white">
                  Rappel groupé — {incompleteCandidates.length} dossier(s) incomplet(s)
                </h3>
              </div>
              <button
                onClick={() => setIsBulkNotifyOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-200 text-xs">
                Cette action va envoyer ou consigner un message officiel à l'ensemble des parents et élèves ayant un dossier incomplet pour la sélection actuelle ({activeExam}{activeExam === 'BAC' && selectedSerie !== 'TOUTES' ? ` Série ${selectedSerie}` : ''}).
              </div>

              {/* Canal */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Canal d'expédition
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkChannel('IN_APP')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      bulkChannel === 'IN_APP'
                        ? 'bg-indigo-950/60 border-indigo-600 text-indigo-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Espace Parents</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkChannel('WHATSAPP')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      bulkChannel === 'WHATSAPP'
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkChannel('SMS')}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                      bulkChannel === 'SMS'
                        ? 'bg-sky-950/60 border-sky-600 text-sky-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Phone className="w-4 h-4 text-sky-400" />
                    <span>SMS Direct</span>
                  </button>
                </div>
              </div>

              {/* Message Template */}
              <div>
                <label className="block text-slate-400 text-xs mb-1">
                  Modèle du message (les balises {`{ELEVE}`}, {`{CLASSE}`}, {`{EXAM}`}, {`{PIECES_MANQUANTES}`} et {`{DATE_LIMITE}`} seront automatiquement remplacées pour chaque candidat) :
                </label>
                <textarea
                  rows={7}
                  value={bulkMessageTemplate}
                  onChange={(e) => setBulkMessageTemplate(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-sans leading-relaxed focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => setIsBulkNotifyOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendBulkNotifications}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Lancer les {incompleteCandidates.length} rappels</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: HISTORIQUE DES ACTIONS & MESSAGES PAR ÉLÈVE      */}
      {/* ========================================================= */}
      {selectedCandidateForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">
                  Historique — {selectedCandidateForLogs.first_name} {selectedCandidateForLogs.last_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCandidateForLogs(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {isLoadingLogs ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                  <span>Chargement de l'audit...</span>
                </div>
              ) : (
                <>
                  {/* Pointage logs */}
                  <div>
                    <h4 className="font-bold text-slate-200 mb-2.5 flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                      Pointages des pièces (Qui a coché / décoché quoi)
                    </h4>
                    {candidateLogs.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg">
                        Aucune modification enregistrée pour le moment.
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {candidateLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {log.action === 'CHECKED' ? (
                                <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : (
                                <span className="p-1 rounded bg-rose-500/10 text-rose-400">
                                  <XCircle className="w-3.5 h-3.5" />
                                </span>
                              )}
                              <div>
                                <span className="font-semibold text-slate-200">{log.doc_name}</span>
                                <span className="text-slate-400 ml-1.5">
                                  {log.action === 'CHECKED' ? 'coché' : 'décoché'} par{' '}
                                  <b className="text-slate-300">{log.user_name}</b>
                                </span>
                              </div>
                            </div>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {new Date(log.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notification logs */}
                  <div>
                    <h4 className="font-bold text-slate-200 mb-2.5 flex items-center gap-2">
                      <Send className="w-4 h-4 text-rose-400" />
                      Rappels et notifications envoyés ({candidateNotifs.length})
                    </h4>
                    {candidateNotifs.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg">
                        Aucun rappel envoyé pour cet élève.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-56 overflow-y-auto">
                        {candidateNotifs.map((notif) => (
                          <div
                            key={notif.id}
                            className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                  {notif.channel}
                                </span>
                                Destinataire : {notif.recipient_name}
                              </span>
                              <span className="text-slate-500 font-mono text-[11px]">
                                {new Date(notif.created_at).toLocaleString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/80 font-mono text-[11px] whitespace-pre-wrap">
                              {notif.message}
                            </p>
                            <div className="text-[11px] text-slate-500">
                              Expédié par : {notif.sent_by_name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedCandidateForLogs(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRINTABLE SECTIONS (OFF-SCREEN / READY FOR PRINT & PDF)   */}
      {/* Uses standard printDocument & downloadPdf utilities       */}
      {/* ========================================================= */}

      {/* 1. INDIVIDUAL STUDENT DOSSIER SHEET */}
      <div className="hidden">
        <div
          id="printable-single-dossier"
          ref={printSingleRef}
          className="printable-document p-8 bg-white text-slate-900 font-sans"
          style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold tracking-tight uppercase text-slate-900">
                {establishment?.name || 'ÉTABLISSEMENT SCOLAIRE'}
              </h2>
              <p className="text-xs text-slate-600">DIRECTION DES ÉTUDES — SERVICE DES EXAMENS D'ÉTAT</p>
              <p className="text-xs text-slate-600">Année scolaire : {config?.academic_year || '2024-2025'}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded">
                FICHE DE CONFORMITÉ
              </span>
              <p className="text-xs text-slate-500 mt-1">Examen : {printCandidate?.exam_type}</p>
            </div>
          </div>

          <div className="text-center my-4">
            <h1 className="text-lg font-black uppercase tracking-wider text-slate-900">
              FICHE INDIVIDUELLE DE SUIVI DU DOSSIER D'EXAMEN
            </h1>
            <p className="text-xs text-slate-600">Session officielle {new Date().getFullYear()}</p>
          </div>

          {/* Student details box */}
          {printCandidate && (
            <div className="border border-slate-300 rounded p-4 mb-6 bg-slate-50 text-xs grid grid-cols-2 gap-4">
              <div>
                <p>
                  <strong className="text-slate-700">Nom & Prénoms :</strong>{' '}
                  <span className="font-bold text-slate-900 uppercase">
                    {printCandidate.last_name} {printCandidate.first_name}
                  </span>
                </p>
                <p className="mt-1.5">
                  <strong className="text-slate-700">Matricule :</strong>{' '}
                  <span className="font-mono font-semibold">{printCandidate.matricule || 'N/A'}</span>
                </p>
                <p className="mt-1.5">
                  <strong className="text-slate-700">Classe :</strong>{' '}
                  <span>{printCandidate.class_name || (printCandidate.serie_code ? 'Tle ' + printCandidate.serie_code : '3e')}</span>
                  {printCandidate.serie_code && <span className="font-bold ml-1">(Série {printCandidate.serie_code})</span>}
                </p>
              </div>
              <div>
                <p>
                  <strong className="text-slate-700">Date de naissance :</strong>{' '}
                  <span>{printCandidate.birth_date ? new Date(printCandidate.birth_date).toLocaleDateString('fr-FR') : 'N/A'}</span>
                </p>
                <p className="mt-1.5">
                  <strong className="text-slate-700">Parent / Tuteur :</strong>{' '}
                  <span>{printCandidate.guardian_name || 'N/A'} {printCandidate.guardian_phone ? `(${printCandidate.guardian_phone})` : ''}</span>
                </p>
                <p className="mt-1.5">
                  <strong className="text-slate-700">Statut du dossier :</strong>{' '}
                  <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${printCandidate.status === 'COMPLET' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {printCandidate.status === 'COMPLET' ? 'COMPLET ET VALIDÉ' : 'INCOMPLET — EN ATTENTE'}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Documents Checklist Table */}
          <div className="mb-6">
            <h3 className="font-bold text-xs uppercase tracking-wide text-slate-800 mb-2">
              LISTE DES PIÈCES OBLIGATOIRES CONTRÔLÉES ({printCandidate?.documents_received_count || 0}/{config?.required_documents.length || 0})
            </h3>
            <table className="w-full text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-left">
                  <th className="p-2 border-r border-slate-300 w-12 text-center">N°</th>
                  <th className="p-2 border-r border-slate-300">Intitulé de la pièce exigée</th>
                  <th className="p-2 border-r border-slate-300 w-24">Exigence</th>
                  <th className="p-2 border-r border-slate-300 w-24 text-center">État</th>
                  <th className="p-2">Date & Agent Récepteur</th>
                </tr>
              </thead>
              <tbody>
                {(config?.required_documents || []).map((doc, idx) => {
                  const item = printCandidate?.checklist?.[doc.id];
                  const isChecked = isDocReceived(item);
                  return (
                    <tr key={doc.id} className="border-b border-slate-200">
                      <td className="p-2 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-semibold">{doc.name}</td>
                      <td className="p-2 border-r border-slate-200 uppercase text-[10px] text-slate-600">{doc.type}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded ${isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isChecked ? 'CONFORME' : 'MANQUANT'}
                        </span>
                      </td>
                      <td className="p-2 text-slate-600">
                        {isChecked
                          ? `Reçu le ${getDocDate(item) ? new Date(getDocDate(item)!).toLocaleDateString('fr-FR') : '—'} (${getDocUser(item) || 'D.E'})`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Observations and Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-300 text-xs">
            <div className="text-center">
              <p className="font-semibold text-slate-700">Le Candidat / Le Tuteur</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">(Mention manuscrite "Lu et approuvé")</p>
              <div className="h-20" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">Le Directeur des Études (D.E)</p>
              <p className="text-[10px] text-slate-500 italic mt-0.5">(Signature et cachet officiel)</p>
              <div className="h-20" />
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 mt-8 border-t border-slate-200 pt-2">
            Document généré le {new Date().toLocaleDateString('fr-FR')} via la plateforme officielle de gestion scolaire Eco GES.
          </div>
        </div>
      </div>

      {/* 2. GLOBAL / SERIES RECAP BORDEREAU */}
      <div className="hidden">
        <div
          id="printable-list-dossiers"
          ref={printListRef}
          className="printable-document p-8 bg-white text-slate-900 font-sans"
          style={{ width: '297mm', minHeight: '210mm', margin: '0 auto' }}
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold uppercase text-slate-900">{establishment?.name || 'ÉTABLISSEMENT SCOLAIRE'}</h2>
              <p className="text-xs text-slate-600">DIRECTION DES ÉTUDES — SERVICE DES EXAMENS D'ÉTAT</p>
            </div>
            <div className="text-right">
              <h1 className="text-base font-black uppercase text-slate-900">
                BORDEREAU RÉCAPITULATIF DES DOSSIERS D'EXAMEN — {activeExam}
              </h1>
              <p className="text-xs text-slate-600">
                {activeExam === 'BAC'
                  ? selectedSerie === 'TOUTES'
                    ? 'Toutes les séries'
                    : `Série ${selectedSerie}`
                  : 'Classe de 3e'} — Année : {config?.academic_year || '2024-2025'}
              </p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-xs border border-slate-300 mb-6">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-left">
                <th className="p-2 border-r border-slate-300 w-10 text-center">N°</th>
                <th className="p-2 border-r border-slate-300 w-24">Matricule</th>
                <th className="p-2 border-r border-slate-300">Nom & Prénoms</th>
                <th className="p-2 border-r border-slate-300 w-20">Classe</th>
                {activeExam === 'BAC' && <th className="p-2 border-r border-slate-300 w-16 text-center">Série</th>}
                <th className="p-2 border-r border-slate-300 w-24 text-center">Progression</th>
                <th className="p-2 border-r border-slate-300 w-28 text-center">Statut</th>
                <th className="p-2">Pièces manquantes éventuelles</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map((cand, idx) => {
                const totalDocs = config?.required_documents.length || 0;
                const receivedCount = cand.documents_received_count || 0;
                const isComplete = cand.status === 'COMPLET';

                const missingNames = (config?.required_documents || [])
                  .filter((d) => !isDocReceived(cand.checklist?.[d.id]))
                  .map((d) => d.name)
                  .join(', ');

                return (
                  <tr key={cand.id} className="border-b border-slate-200">
                    <td className="p-1.5 border-r border-slate-200 text-center font-mono">{idx + 1}</td>
                    <td className="p-1.5 border-r border-slate-200 font-mono text-[11px]">{cand.matricule || '—'}</td>
                    <td className="p-1.5 border-r border-slate-200 font-bold uppercase">
                      {cand.last_name} {cand.first_name}
                    </td>
                    <td className="p-1.5 border-r border-slate-200">{cand.class_name || '—'}</td>
                    {activeExam === 'BAC' && (
                      <td className="p-1.5 border-r border-slate-200 text-center font-bold">{cand.serie_code || '—'}</td>
                    )}
                    <td className="p-1.5 border-r border-slate-200 text-center font-mono">
                      {receivedCount}/{totalDocs}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {isComplete ? 'COMPLET' : 'INCOMPLET'}
                      </span>
                    </td>
                    <td className="p-1.5 text-[11px] text-slate-600">{isComplete ? 'Aucune pièce manquante' : missingNames}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer stats and signatures */}
          <div className="flex justify-between items-end text-xs border-t border-slate-300 pt-4">
            <div>
              <p>
                <strong>Total candidats listés :</strong> {filteredCandidates.length} |{' '}
                <strong className="text-emerald-700">Complets :</strong>{' '}
                {filteredCandidates.filter((c) => c.status === 'COMPLET').length} |{' '}
                <strong className="text-rose-700">Incomplets :</strong>{' '}
                {filteredCandidates.filter((c) => c.status === 'INCOMPLET').length}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Date limite de dépôt : {config?.deadline ? new Date(config.deadline).toLocaleDateString('fr-FR') : 'Non définie'}
              </p>
            </div>
            <div className="text-center pr-12">
              <p className="font-semibold text-slate-800">Le Directeur des Études (D.E)</p>
              <div className="h-16" />
              <p className="text-[10px] text-slate-500 italic">Cachet et signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamDossiersView;
