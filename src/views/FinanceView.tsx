import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Plus,
  Receipt,
  Printer,
  Ban,
  FileText,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Search,
  Filter,
  X,
  Layers,
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  Edit2,
  Trash2,
  Clock,
  UserCheck,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Payment, Expense, FeeStructure, Student, SchoolTariffPlan } from '../types.ts';
import { PrintableReceipt } from '../components/PrintableReceipt.tsx';
import { PaymentReceiptModal } from '../components/PaymentReceiptModal.tsx';
import { StudentStatementModal } from '../components/StudentStatementModal.tsx';
import { OFFICIAL_CYCLES, MONTANT_MIN, MONTANT_MAX } from '../constants.ts';

export const FinanceView: React.FC = () => {
  const { establishment, hasRole, user } = useAuth();
  const canManageFinance = hasRole(['COMPTABLE', 'GESTIONNAIRE', 'DIRECTEUR_GENERAL', 'PROMOTEUR', 'ADMIN_GENERAL']);
  const [activeTab, setActiveTab] = useState<'payments' | 'balances' | 'expenses' | 'tarifs' | 'injections'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [studentBalances, setStudentBalances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashInjections, setCashInjections] = useState<any[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [tariffPlans, setTariffPlans] = useState<SchoolTariffPlan[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);
  const [tariffAudits, setTariffAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nouveau Plan Tarifaire Promoteur (Partie II)
  const [showTariffPlanModal, setShowTariffPlanModal] = useState(false);
  const [tpCycle, setTpCycle] = useState('COLLEGE');
  const [tpLevel, setTpLevel] = useState('');
  const [tpInscNew, setTpInscNew] = useState<number | string>('');
  const [tpReinsc, setTpReinsc] = useState<number | string>('');
  const [tpMonthly, setTpMonthly] = useState<number | string>('');
  const [tpMonthsCount, setTpMonthsCount] = useState<number | string>(9);
  const [tpSchedule, setTpSchedule] = useState<'MENSUEL' | 'TRIMESTRIEL'>('MENSUEL');
  const [tpT1, setTpT1] = useState<number | string>('');
  const [tpT2, setTpT2] = useState<number | string>('');
  const [tpT3, setTpT3] = useState<number | string>('');
  const [tpAnnex, setTpAnnex] = useState<number | string>('');
  const [tpAnnexDetails, setTpAnnexDetails] = useState('Assurance scolaire, badge magnétique et activités');

  // Modal Encaisser Paiement (Système de Tarifs Automatiques)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payStudentId, setPayStudentId] = useState('');
  const [studentSearchFilter, setStudentSearchFilter] = useState('');
  const [loadingStudentStatus, setLoadingStudentStatus] = useState(false);
  const [studentStatusData, setStudentStatusData] = useState<any | null>(null);
  const [selectedFeeStructureId, setSelectedFeeStructureId] = useState<string>('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [originalTariffAmount, setOriginalTariffAmount] = useState<number | null>(null);
  const [modificationReason, setModificationReason] = useState<string>('');

  const [payPayerName, setPayPayerName] = useState('');
  const [payType, setPayType] = useState('FRAIS_MENSUELS');
  const [payAmount, setPayAmount] = useState<number | string>('');
  const [payMethod, setPayMethod] = useState<'ESPECES' | 'AIRTEL_MONEY' | 'MTN_MOMO' | 'CHEQUE' | 'VIREMENT'>('ESPECES');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Modal Sortie de Caisse
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('FOURNITURES');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState<number | string>('');
  const [expMethod, setExpMethod] = useState('ESPECES');
  const [expBeneficiary, setExpBeneficiary] = useState('');

  // Modal Renforcement de Caisse (Apport de fond)
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [injAmount, setInjAmount] = useState<number | string>('');
  const [injProviderName, setInjProviderName] = useState('M. Denis Sassou Mouanda (Promoteur)');
  const [injMethod, setInjMethod] = useState('ESPECES');
  const [injNotes, setInjNotes] = useState('');

  // Modal Paramétrage / Édition Tarif Promoteur
  const [showTarifModal, setShowTarifModal] = useState(false);
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
  const [tarifType, setTarifType] = useState('FRAIS_MENSUELS');
  const [tarifName, setTarifName] = useState('');
  const [tarifAmount, setTarifAmount] = useState<number | string>('');
  const [tarifPeriodicity, setTarifPeriodicity] = useState<'UNIQUE' | 'MENSUEL' | 'TRIMESTRIEL'>('MENSUEL');
  const [tarifMonthsCount, setTarifMonthsCount] = useState<number | string>(9);
  const [tarifClassId, setTarifClassId] = useState('');
  const [tarifCycle, setTarifCycle] = useState('COLLEGE');
  const [tarifLevel, setTarifLevel] = useState('');

  // Annulation Quittance
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPaymentId, setCancelPaymentId] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // Impression Quittances (unique ou groupée)
  const [selectedReceipts, setSelectedReceipts] = useState<Payment[] | null>(null);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);

  // Relevé de paiements de l'élève
  const [statementData, setStatementData] = useState<{ student: Student; payments: Payment[]; financialSituation?: any } | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Recherche balances
  const [balanceSearch, setBalanceSearch] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isPromoteur = user?.role === 'PROMOTEUR';
  const isComptable = user?.role === 'COMPTABLE';
  const isGestionnaire = user?.role === 'GESTIONNAIRE';

  // 1. Encaisser un versement élève : Réservé au GESTIONNAIRE / Secrétaire, DIRECTEUR_GENERAL, ADMIN_GENERAL (bloqué pour COMPTABLE et PROMOTEUR)
  const canCashIn = hasRole(['GESTIONNAIRE', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']) && !isPromoteur && !isComptable;

  // 2. Renforcement de caisse : Réservé au COMPTABLE, GESTIONNAIRE, PROMOTEUR, DIRECTEUR_GENERAL, ADMIN_GENERAL
  const canInjectCash = hasRole(['GESTIONNAIRE', 'COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']);

  // Sorties de caisse
  const canDisburse = hasRole(['COMPTABLE', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']) && !isPromoteur;
  const canManageTarifs = hasRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payData, balData, expData, feeData, sumData, stuData, trfData, injData, clsData, auditData] = await Promise.all([
        api.getPayments(),
        api.getStudentBalances(),
        api.getExpenses(),
        api.getFeeStructures(),
        api.getFinanceSummary(),
        api.getStudents(),
        api.getTariffs().catch(() => []),
        canInjectCash ? api.getCashInjections().catch(() => []) : Promise.resolve([]),
        api.getClasses().catch(() => []),
        canManageTarifs ? api.getAuditLogs().catch(() => []) : Promise.resolve([]),
      ]);

      setPayments(payData);
      setStudentBalances(balData);
      setExpenses(expData);
      setFeeStructures(feeData);
      setSummary(sumData);
      setAllStudents(stuData);
      setTariffPlans(trfData);
      setCashInjections(injData);
      setClassesList(clsData || []);
      setTariffAudits((auditData || []).filter((l: any) => l.action === 'MODIFICATION_MONTANT_GRILLE_TARIFAIRE'));
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données financières.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTariffPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const inscNew = Number(tpInscNew || 0);
    const reinsc = Number(tpReinsc || 0);
    const monthly = Number(tpMonthly || 0);
    const months = Number(tpMonthsCount || 9);
    const annex = Number(tpAnnex || 0);

    if (isNaN(inscNew) || inscNew < 0 || isNaN(reinsc) || reinsc < 0 || isNaN(monthly) || monthly < 0 || isNaN(annex) || annex < 0) {
      setError('Veuillez saisir des montants valides (positifs ou nuls uniquement).');
      return;
    }

    try {
      await api.createTariff({
        cycleCode: tpCycle,
        levelCode: tpLevel.trim() || null,
        inscriptionNewFee: inscNew,
        reinscriptionFee: reinsc,
        monthlyTuition: monthly,
        monthsCount: months,
        paymentSchedule: tpSchedule,
        trimester1Fee: Number(tpT1 || 0),
        trimester2Fee: Number(tpT2 || 0),
        trimester3Fee: Number(tpT3 || 0),
        annexFees: annex,
        annexFeesDetails: tpAnnexDetails.trim(),
      });
      setSuccess('Nouvelle grille tarifaire paramétrée avec succès par le Promoteur.');
      setShowTariffPlanModal(false);
      const updatedTariffs = await api.getTariffs();
      setTariffPlans(updatedTariffs);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du paramétrage tarifaire.');
    }
  };

  const handleSelectStudent = async (studentId: string) => {
    setPayStudentId(studentId);
    setSelectedFeeStructureId('');
    setSelectedMonths([]);
    setOriginalTariffAmount(null);
    setModificationReason('');
    setStudentStatusData(null);

    const foundStu = allStudents.find((s) => s.id === studentId);
    if (foundStu && foundStu.guardian_name) {
      setPayPayerName(foundStu.guardian_name);
    }

    if (!studentId) return;

    setLoadingStudentStatus(true);
    try {
      const status = await api.getStudentFeeStatus(studentId);
      setStudentStatusData(status);

      if (status.has_schedule && status.fees && status.fees.length > 0) {
        // Pré-sélectionner le premier frais non soldé (ou le premier)
        const targetFee = status.fees.find((f: any) => !f.is_settled) || status.fees[0];
        handleSelectFee(targetFee);
      } else {
        setPayType('FRAIS_MENSUELS');
        setPayAmount('');
        setOriginalTariffAmount(null);
      }
    } catch (err: any) {
      console.error('Erreur chargement statut élève:', err);
      setError('Impossible de charger la grille tarifaire pour cet élève.');
    } finally {
      setLoadingStudentStatus(false);
    }
  };

  const handleSelectFee = (fee: any) => {
    setSelectedFeeStructureId(fee.id);
    setPayType(fee.fee_type || 'FRAIS_MENSUELS');
    setModificationReason('');

    if (fee.periodicity === 'MENSUEL') {
      // Trouver le 1er mois non réglé (ex: Octobre)
      const unpaidMonths = (fee.months_schedule || []).filter((m: any) => !m.is_paid);
      const initialMonth = unpaidMonths.length > 0 ? [unpaidMonths[0].name] : [];
      setSelectedMonths(initialMonth);

      const calcAmt = initialMonth.length * fee.unit_amount;
      setPayAmount(calcAmt);
      setOriginalTariffAmount(calcAmt);
      setPayNotes(initialMonth.length > 0 ? `Scolarité - Mois de ${initialMonth.join(', ')}` : fee.name);
    } else {
      setSelectedMonths([]);
      const defaultAmt = fee.balance > 0 ? fee.balance : fee.unit_amount;
      setPayAmount(defaultAmt);
      setOriginalTariffAmount(defaultAmt);
      setPayNotes(fee.name);
    }
  };

  const handleToggleMonth = (monthName: string, fee: any) => {
    let updated: string[];
    if (selectedMonths.includes(monthName)) {
      updated = selectedMonths.filter((m) => m !== monthName);
    } else {
      updated = [...selectedMonths, monthName];
    }
    setSelectedMonths(updated);

    const calcAmt = updated.length * fee.unit_amount;
    setPayAmount(calcAmt);
    setOriginalTariffAmount(calcAmt);
    setPayNotes(updated.length > 0 ? `Scolarité - Mois de ${updated.join(', ')}` : fee.name);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(payAmount);
    if (!payStudentId) {
      setError('Veuillez sélectionner un élève.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Veuillez saisir un montant de versement valide supérieur à 0 FCFA.');
      return;
    }

    try {
      const res = await api.createPayment({
        studentId: payStudentId,
        amount: numAmount,
        paymentMethod: payMethod,
        paymentType: payType,
        transactionReference: payRef.trim() || null,
        notes: payNotes.trim() || null,
        payerName: payPayerName.trim() || undefined,
        feeStructureId: selectedFeeStructureId || null,
        selectedMonths: selectedMonths.length > 0 ? selectedMonths : undefined,
        originalTariffAmount: originalTariffAmount !== null ? originalTariffAmount : undefined,
        modificationReason: modificationReason.trim() || undefined,
      });

      setSuccess(`Quittance N° ${res.receiptNumber} émise avec succès.`);
      setShowPaymentModal(false);
      setPayRef('');
      setPayNotes('');
      setPayPayerName('');
      setSelectedFeeStructureId('');
      setSelectedMonths([]);
      setOriginalTariffAmount(null);
      setModificationReason('');
      setStudentStatusData(null);

      await loadData();

      // Proposer ou ouvrir immédiatement l'impression de la quittance
      if (res.payment) {
        setSelectedReceipts([res.payment]);
      } else {
        const found = payments.find((p) => p.receipt_number === res.receiptNumber);
        if (found) setSelectedReceipts([found]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenStudentStatement = async (studentId: string) => {
    setLoadingStatement(true);
    setError(null);
    try {
      const res = await api.getStudentById(studentId);
      setStatementData({
        student: res.student,
        payments: res.payments || [],
        financialSituation: res.financialSituation,
      });
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le relevé de paiements de l’élève.');
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleCancelPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!cancelPaymentId || !cancelReason.trim()) {
      setError("Un motif d'annulation officiel est obligatoire.");
      return;
    }

    try {
      await api.cancelPayment(cancelPaymentId, cancelReason.trim());
      setSuccess('Quittance annulée avec traçabilité dans le journal d’audit.');
      setShowCancelModal(false);
      setCancelReason('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(expAmount);
    if (!expDesc.trim() || isNaN(numAmount) || numAmount <= 0 || !expBeneficiary.trim()) {
      setError('Veuillez renseigner le bénéficiaire, la description et un montant valide supérieur à 0 FCFA.');
      return;
    }

    try {
      await api.createExpense({
        category: expCategory,
        description: expDesc.trim(),
        amount: numAmount,
        paymentMethod: expMethod,
        beneficiary: expBeneficiary.trim(),
      });

      setSuccess('Sortie de caisse enregistrée avec succès.');
      setShowExpenseModal(false);
      setExpDesc('');
      setExpBeneficiary('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCashInjection = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(injAmount);
    if (isNaN(numAmount) || numAmount <= 0 || !injProviderName.trim()) {
      setError('Nom du pourvoyeur et montant valide supérieur à 0 FCFA requis.');
      return;
    }

    try {
      await api.createCashInjection({
        amount: numAmount,
        providerName: injProviderName.trim(),
        paymentMethod: injMethod,
        notes: injNotes.trim() || undefined,
      });

      setSuccess('Renforcement de caisse (Apport de fonds) enregistré avec succès.');
      setShowInjectionModal(false);
      setInjNotes('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenCreateFeeModal = () => {
    setEditingFeeId(null);
    setTarifName('');
    setTarifType('FRAIS_MENSUELS');
    setTarifAmount('');
    setTarifPeriodicity('MENSUEL');
    setTarifMonthsCount(9);
    setTarifClassId('');
    setTarifCycle('COLLEGE');
    setTarifLevel('');
    setShowTarifModal(true);
  };

  const handleOpenEditFeeModal = (fee: FeeStructure) => {
    setEditingFeeId(fee.id);
    setTarifName(fee.name);
    setTarifType(fee.fee_type);
    setTarifAmount(fee.amount);
    setTarifPeriodicity(fee.periodicity || (fee.fee_type === 'FRAIS_MENSUELS' ? 'MENSUEL' : 'UNIQUE'));
    setTarifMonthsCount(fee.months_count || 9);
    setTarifClassId(fee.class_id || '');
    setTarifCycle(fee.cycle_code || 'COLLEGE');
    setTarifLevel(fee.level_code || '');
    setShowTarifModal(true);
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(tarifAmount);
    if (!tarifName.trim() || isNaN(numAmount) || numAmount < 0) {
      setError('Libellé obligatoire et montant valide (positif ou nul) requis.');
      return;
    }

    const selectedCls = classesList.find((c) => c.id === tarifClassId);

    const payload: any = {
      feeType: tarifType,
      name: tarifName.trim(),
      amount: numAmount,
      periodicity: tarifPeriodicity,
      monthsCount: tarifPeriodicity === 'MENSUEL' ? Number(tarifMonthsCount) || 9 : undefined,
      cycleCode: selectedCls?.cycle_code || tarifCycle || undefined,
      levelCode: selectedCls?.level_code || tarifLevel || undefined,
      classId: tarifClassId || undefined,
      className: selectedCls?.name || undefined,
    };

    try {
      if (editingFeeId) {
        await api.updateFeeStructure(editingFeeId, payload);
        setSuccess('Ligne de tarif mise à jour avec succès.');
      } else {
        await api.createFeeStructure(payload);
        setSuccess('Nouveau tarif ajouté à la grille avec succès.');
      }
      setShowTarifModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement du tarif.');
    }
  };

  const handleDeleteFee = async (feeId: string, feeName: string) => {
    if (!window.confirm(`Supprimer le tarif "${feeName}" de la grille ? Les quittances existantes ne seront pas modifiées.`)) {
      return;
    }
    try {
      await api.deleteFeeStructure(feeId);
      setSuccess('Tarif supprimé de la grille avec succès.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suppression.');
    }
  };

  const filteredBalances = studentBalances.filter((b) => {
    if (!balanceSearch) return true;
    const q = balanceSearch.toLowerCase();
    return (
      b.first_name.toLowerCase().includes(q) ||
      b.last_name.toLowerCase().includes(q) ||
      b.matricule.toLowerCase().includes(q) ||
      (b.class_name && b.class_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center space-x-2">
            <DollarSign className="w-6 h-6 text-teal-400" />
            <span>Comptabilité Scolaire, Caisse & Quittances</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Frais de scolarité • Échéanciers • Quittances certifiées • Suivi des impayés • Sorties de caisse
          </p>
        </div>

        {isPromoteur ? (
          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-indigo-500/30 rounded-xl text-[11px] text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Supervision Promoteur • Caisse réservée au Comptable</span>
            </div>
            {canManageTarifs && (
              <button
                onClick={() => { setActiveTab('tarifs'); setShowTariffPlanModal(true); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Paramétrer une Grille Tarifaire</span>
              </button>
            )}
          </div>
        ) : (canInjectCash || canDisburse || canCashIn) ? (
          <div className="flex flex-wrap items-center gap-2">
            {canInjectCash && (
              <button
                onClick={() => setShowInjectionModal(true)}
                className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/60 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Renforcement de Caisse</span>
              </button>
            )}

            {canDisburse && (
              <button
                onClick={() => setShowExpenseModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                <span>Sortie de Caisse / Autres Besoins</span>
              </button>
            )}

            {canCashIn && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-teal-600/30 font-bold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Encaisser un Versement Élève</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl flex items-center space-x-2 text-rose-200 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center space-x-2 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Cartes d'État de Caisse */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Total Recettes Encaissées</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            {(summary?.totalCollected || 0).toLocaleString('fr-FR')}{' '}
            <span className="text-xs text-emerald-400 font-semibold">{establishment?.currency || 'FCFA'}</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Quittances valides uniquement</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Dépenses & Décaissements</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            {(summary?.totalExpenses || 0).toLocaleString('fr-FR')}{' '}
            <span className="text-xs text-rose-400 font-semibold">{establishment?.currency || 'FCFA'}</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Charges et approvisionnements</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Solde Net Disponible en Caisse</span>
            <DollarSign className="w-4 h-4 text-teal-400" />
          </div>
          <p className="text-2xl font-black text-white mt-2 font-mono">
            {(summary?.cashBalance || 0).toLocaleString('fr-FR')}{' '}
            <span className="text-xs text-teal-400 font-semibold">{establishment?.currency || 'FCFA'}</span>
          </p>
          <span className="text-[10px] text-slate-500 mt-1 block">Traçabilité comptable certifiée</span>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'payments'
              ? 'border-teal-500 text-teal-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Journal des Quittances ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'balances'
              ? 'border-teal-500 text-teal-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Soldes Élèves & Impayés ({studentBalances.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'expenses'
              ? 'border-teal-500 text-teal-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          <span>Sorties de Caisse ({expenses.length})</span>
        </button>

        {canInjectCash && (
          <button
            onClick={() => setActiveTab('injections')}
            className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'injections'
                ? 'border-teal-500 text-teal-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Renforcements de Caisse ({cashInjections.length})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('tarifs')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'tarifs'
              ? 'border-teal-500 text-teal-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Grille Tarifaire ({feeStructures.length})</span>
        </button>
      </div>

      {/* TAB 1: JOURNAL DES QUITTANCES */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Receipt className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucun versement enregistré</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Encaissez les frais d'inscription ou de scolarité pour émettre vos premières quittances certifiées.
              </p>
            </div>
          ) : (
            <div>
              {/* BARRE D'ACTIONS GROUPÉES (IMPRESSION MULTIPLE) */}
              {selectedPaymentIds.length > 0 && (
                <div className="bg-teal-950/80 border-b border-teal-800 p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-teal-200">
                    <Receipt className="w-4 h-4 text-teal-400" />
                    <span>
                      <strong className="text-white font-bold">{selectedPaymentIds.length}</strong> quittance(s) sélectionnée(s)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentIds([])}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                    >
                      Désélectionner tout
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const toPrint = payments.filter((p) => selectedPaymentIds.includes(p.id));
                        if (toPrint.length > 0) setSelectedReceipts(toPrint);
                      }}
                      className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 shadow"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer les {selectedPaymentIds.length} quittances</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={payments.length > 0 && selectedPaymentIds.length === payments.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPaymentIds(payments.map((p) => p.id));
                            } else {
                              setSelectedPaymentIds([]);
                            }
                          }}
                          className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          title="Tout sélectionner pour impression multiple"
                        />
                      </th>
                      <th className="p-3.5">N° Quittance</th>
                      <th className="p-3.5">Date & Heure</th>
                      <th className="p-3.5">Élève & Matricule</th>
                      <th className="p-3.5">Classe</th>
                      <th className="p-3.5">Payeur</th>
                      <th className="p-3.5">Mode Règlement</th>
                      <th className="p-3.5">Montant Versé</th>
                      <th className="p-3.5">Caissier</th>
                      <th className="p-3.5">Statut</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {payments.map((p, idx) => {
                      const isSelected = selectedPaymentIds.includes(p.id);
                      return (
                        <tr
                          key={p.id ? `${p.id}-${idx}` : idx}
                          className={`hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-teal-950/20' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPaymentIds((prev) => [...prev, p.id]);
                                } else {
                                  setSelectedPaymentIds((prev) => prev.filter((id) => id !== p.id));
                                }
                              }}
                              className="rounded border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-400">
                            {p.receipt_number}
                            {p.reprint_count ? (
                              <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-sans font-semibold">
                                Duplicata ({p.reprint_count})
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                            {new Date(p.created_at).toLocaleString('fr-FR')}
                          </td>
                          <td className="p-3.5 font-semibold text-white">
                            {p.last_name} {p.first_name}
                            <span className="block text-[10px] text-slate-500 font-mono">{p.matricule}</span>
                          </td>
                          <td className="p-3.5 font-semibold text-indigo-300">{p.class_name || '-'}</td>
                          <td className="p-3.5 text-slate-300 text-[11px]">{p.payer_name || 'Parent / Tuteur'}</td>
                          <td className="p-3.5 font-medium text-slate-300">{p.payment_method}</td>
                          <td className="p-3.5 font-black text-white font-mono text-sm">
                            {p.amount.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px]">{p.cashier_name}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'VALIDE'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedReceipts([p])}
                              className="px-2.5 py-1 text-teal-400 hover:text-white bg-slate-800 hover:bg-teal-600 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                              title="Réimprimer la quittance officielle"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Quittance</span>
                            </button>

                            {canManageFinance && p.status === 'VALIDE' && (
                              <button
                                onClick={() => {
                                  setCancelPaymentId(p.id);
                                  setShowCancelModal(true);
                                }}
                                className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-950 rounded-lg transition"
                                title="Annuler la quittance (motif obligatoire)"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUIVI DES SOLDES ET IMPAYÉS */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher élève, classe, matricule..."
                value={balanceSearch}
                onChange={(e) => setBalanceSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="text-xs text-slate-400">
              Total élèves suivis : <span className="font-bold text-white">{filteredBalances.length}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
              <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Matricule</th>
                  <th className="p-3.5">Élève</th>
                  <th className="p-3.5">Classe & Niveau</th>
                  <th className="p-3.5">Total Exigible</th>
                  <th className="p-3.5">Total Versé</th>
                  <th className="p-3.5">Reste à Payer (Solde)</th>
                  <th className="p-3.5">État du Dossier</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBalances.map((b, idx) => (
                  <tr key={b.id ? `${b.id}-${idx}` : idx} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-mono font-bold text-amber-400">{b.matricule}</td>
                    <td className="p-3.5 font-semibold text-white">
                      {b.last_name} {b.first_name}
                      <span className="block text-[10px] text-slate-500">Contact: {b.guardian_phone}</span>
                    </td>
                    <td className="p-3.5 font-semibold text-indigo-300">
                      {b.class_name || 'Sans classe'} ({b.level_code || '-'})
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      {b.totalDue.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {b.total_paid.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="p-3.5 font-mono font-black text-rose-400 text-sm">
                      {b.balance.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.paymentStatus === 'SOLDE'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : b.paymentStatus === 'PARTIEL'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={loadingStatement}
                        onClick={() => handleOpenStudentStatement(b.id)}
                        className="px-2.5 py-1 text-indigo-300 hover:text-white bg-slate-800 hover:bg-indigo-600 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition cursor-pointer"
                        title="Consulter et imprimer le relevé de paiements de cet élève"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Relevé</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DÉPENSES & DÉCAISSEMENTS */}
      {activeTab === 'expenses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <ArrowDownRight className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucune dépense enregistrée</p>
              <p className="text-xs text-slate-500">
                Enregistrez les sorties de caisse pour le suivi budgétaire de l'établissement.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">N° Bon Dépense</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Catégorie</th>
                    <th className="p-3.5">Description des Dépenses</th>
                    <th className="p-3.5">Bénéficiaire</th>
                    <th className="p-3.5">Mode</th>
                    <th className="p-3.5">Montant Décaissé</th>
                    <th className="p-3.5">Auteur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {expenses.map((e, idx) => (
                    <tr key={e.id ? `${e.id}-${idx}` : idx} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-amber-400">{e.expense_number}</td>
                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {new Date(e.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                          {e.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-white max-w-xs">{e.description}</td>
                      <td className="p-3.5 text-slate-300">{e.beneficiary}</td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">{e.payment_method}</td>
                      <td className="p-3.5 font-mono font-bold text-rose-400 text-sm">
                        -{e.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px]">{e.author_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GRILLES TARIFAIRES PROMOTEUR & FRAIS (PARTIE II) */}
      {activeTab === 'tarifs' && (
        <div className="space-y-6">
          {/* Section Grilles Tarifaires Complètes du Promoteur */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Grilles Tarifaires Officielles • Fixées par le Promoteur</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Frais d'inscription, mensualités, échéanciers et calcul automatique des totaux annuels exigibles.
                </p>
              </div>

              {canManageTarifs && (
                <button
                  onClick={() => setShowTariffPlanModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Paramétrer une Grille Tarifaire</span>
                </button>
              )}
            </div>

            {Array.isArray(tariffPlans) && tariffPlans.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300 min-w-[750px]">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Cycle / Niveau</th>
                      <th className="p-3">Inscription (Nouveaux)</th>
                      <th className="p-3">Réinscription (Anciens)</th>
                      <th className="p-3">Mensualité</th>
                      <th className="p-3">Échéancier</th>
                      <th className="p-3">Frais Annexes</th>
                      <th className="p-3 text-right">Total Annuel (Nouveau)</th>
                      <th className="p-3 text-right">Total Annuel (Ancien)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tariffPlans.map((tp, idx) => (
                      <tr key={tp.id ? `${tp.id}-${idx}` : idx} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">
                          <span className="text-indigo-400 font-extrabold">{tp.cycle_code}</span>
                          {tp.level_code && <span className="text-slate-400 ml-1.5">({tp.level_code})</span>}
                          {tp.class_name && <span className="text-xs text-amber-300 block">{tp.class_name}</span>}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-200">
                          {tp.inscription_new_fee.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-200">
                          {tp.reinscription_fee.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="p-3 font-mono text-emerald-400 font-semibold">
                          {tp.monthly_tuition.toLocaleString('fr-FR')} FCFA <span className="text-[10px] text-slate-400 font-normal">/ mois ({tp.months_count}m)</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            {tp.payment_schedule}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-300">
                          {tp.annex_fees.toLocaleString('fr-FR')} FCFA
                          {tp.annex_fees_details && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-xs">{tp.annex_fees_details}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm text-indigo-300">
                          {tp.annual_total_new.toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="p-3 text-right font-mono font-black text-sm text-teal-300">
                          {tp.annual_total_old.toLocaleString('fr-FR')} FCFA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                <Layers className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="text-xs font-semibold text-slate-300">Aucune grille tarifaire active</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Le Promoteur peut configurer les barèmes annuels par cycle (Maternelle, Primaire, Collège, Lycée).
                </p>
              </div>
            )}
          </div>

          {/* Section Lignes de Frais Individuels & Grille Automatique */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Grille Tarifaire par Classe & Niveau • Barème d'Encaissement</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Frais pré-remplis automatiquement au guichet lors de la sélection d'un élève.
                </p>
              </div>
              {canManageTarifs && (
                <button
                  onClick={handleOpenCreateFeeModal}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter un Frais à la Grille</span>
                </button>
              )}
            </div>

            {feeStructures.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300 min-w-[780px]">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Libellé Frais</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Classe / Niveau</th>
                      <th className="p-3">Périodicité</th>
                      <th className="p-3 text-right">Montant Unitaire</th>
                      <th className="p-3 text-right">Total Annuel Exigible</th>
                      {canManageTarifs && <th className="p-3 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {feeStructures.map((f, idx) => {
                      const pType = f.periodicity || (f.fee_type === 'FRAIS_MENSUELS' ? 'MENSUEL' : 'UNIQUE');
                      const mult = pType === 'MENSUEL' ? (f.months_count || 9) : pType === 'TRIMESTRIEL' ? 3 : 1;
                      const annualTotal = (Number(f.amount) || 0) * mult;

                      return (
                        <tr key={f.id ? `${f.id}-${idx}` : idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-bold text-white">
                            <span>{f.name}</span>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {f.fee_type}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">
                            {f.class_name ? (
                              <span className="text-amber-400 font-bold">{f.class_name}</span>
                            ) : f.level_code ? (
                              <span className="text-indigo-400 font-bold">{f.level_code}</span>
                            ) : f.cycle_code ? (
                              <span className="text-indigo-300 font-bold">{f.cycle_code}</span>
                            ) : (
                              <span className="text-slate-400">Tous niveaux</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pType === 'MENSUEL'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : pType === 'TRIMESTRIEL'
                                ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {pType === 'MENSUEL' ? `Mensuel (${f.months_count || 9} mois)` : pType === 'TRIMESTRIEL' ? 'Trimestriel (3 tr.)' : 'Paiement Unique'}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-white text-right">
                            {Number(f.amount).toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-400 text-sm text-right">
                            {annualTotal.toLocaleString('fr-FR')} FCFA
                          </td>
                          {canManageTarifs && (
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => handleOpenEditFeeModal(f)}
                                  title="Modifier ce tarif"
                                  className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteFee(f.id, f.name)}
                                  title="Supprimer ce tarif"
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs font-semibold">Aucun frais configuré dans la grille tarifaire.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Cliquez sur "Ajouter un Frais à la Grille" pour définir les montants par classe.
                </p>
              </div>
            )}
          </div>

          {/* Section Journal d'Audit des Dérogations / Modifications de Tarifs en Caisse (Exigence 4) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-400 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Journal d'Audit • Dérogations & Modifications de Tarifs par la Caisse</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Traçabilité inviolable : montants initiaux proposés par la grille vs montants réellement encaissés avec motifs.
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-800/80 rounded">
                {tariffAudits.length} dérogation(s)
              </span>
            </div>

            {tariffAudits.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300 min-w-[850px]">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Date & Heure</th>
                      <th className="p-3">N° Quittance</th>
                      <th className="p-3">Élève & Classe</th>
                      <th className="p-3">Frais</th>
                      <th className="p-3 text-right">Tarif Initial (Grille)</th>
                      <th className="p-3 text-right">Montant Encaissé</th>
                      <th className="p-3 text-right">Écart</th>
                      <th className="p-3">Caissier(e)</th>
                      <th className="p-3">Motif / Justification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {tariffAudits.map((audit, idx) => {
                      const details = audit.details || {};
                      const orig = Number(details.originalTariffAmount || details.originalAmount || 0);
                      const mod = Number(details.modifiedAmount || 0);
                      const diff = mod - orig;

                      return (
                        <tr key={audit.id ? `${audit.id}-${idx}` : idx} className="hover:bg-slate-800/40">
                          <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                            {audit.created_at ? new Date(audit.created_at).toLocaleString('fr-FR') : '—'}
                          </td>
                          <td className="p-3 font-mono font-bold text-teal-400">
                            {details.receiptNumber || '—'}
                          </td>
                          <td className="p-3 font-bold text-white">
                            <span>{details.studentName || 'Élève'}</span>
                            {details.className && (
                              <span className="text-[10px] text-amber-300 block font-normal">{details.className}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-300 text-[11px]">
                            {details.feeType || 'Frais'}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-400 text-right">
                            {orig.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="p-3 font-mono font-black text-amber-400 text-right">
                            {mod.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className={`p-3 font-mono font-bold text-right ${diff < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {diff > 0 ? `+${diff.toLocaleString('fr-FR')}` : diff.toLocaleString('fr-FR')} FCFA
                          </td>
                          <td className="p-3 text-slate-300 font-medium text-[11px]">
                            {details.cashierName || audit.user_name || 'Gestionnaire'}
                          </td>
                          <td className="p-3 text-[11px] text-amber-200/90 italic">
                            {details.modificationReason || details.reason || 'Aucun motif renseigné'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
                <p className="text-xs font-semibold text-slate-400">Aucune modification manuelle de tarif enregistrée.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dès qu'une gestionnaire modifie un montant proposé par la grille tarifaire lors d'un encaissement, la dérogation apparaîtra ici avec son motif.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RENFORCEMENTS & APPORTS DE CAISSE */}
      {activeTab === 'injections' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          {cashInjections.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <TrendingUp className="w-12 h-12 mx-auto text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Aucun renforcement de caisse enregistré</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Enregistrez les apports de fonds effectués par le Promoteur pour renflouer la caisse de l'établissement.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">N° Apport</th>
                    <th className="p-3.5">Date & Heure</th>
                    <th className="p-3.5">Pourvoyeur du Fond (Promoteur)</th>
                    <th className="p-3.5">Mode Règlement</th>
                    <th className="p-3.5">Montant Injecté</th>
                    <th className="p-3.5">Motif / Remarques</th>
                    <th className="p-3.5">Auteur Saisie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {cashInjections.map((inj, idx) => (
                    <tr key={inj.id ? `${inj.id}-${idx}` : idx} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-emerald-400">{inj.injection_number}</td>
                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {new Date(inj.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="p-3.5 font-bold text-white">{inj.provider_name}</td>
                      <td className="p-3.5 text-slate-300">{inj.payment_method}</td>
                      <td className="p-3.5 font-mono font-extrabold text-emerald-400 text-sm">
                        +{inj.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="p-3.5 text-slate-400">{inj.notes || '-'}</td>
                      <td className="p-3.5 text-slate-400 text-[11px]">{inj.author_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL NOUVELLE GRILLE TARIFAIRE PROMOTEUR */}
      {showTariffPlanModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Paramétrer une Grille Tarifaire (Promoteur)</span>
              </h2>
              <button onClick={() => setShowTariffPlanModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTariffPlan} noValidate className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Cycle d'enseignement *</label>
                  <select
                    value={tpCycle}
                    onChange={(e) => setTpCycle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    {OFFICIAL_CYCLES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Niveau Spécifique (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: 3ème, Terminale (ou vide)"
                    value={tpLevel}
                    onChange={(e) => setTpLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Frais Inscription (Nouveaux) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={tpInscNew}
                    onChange={(e) => setTpInscNew(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Frais Réinscription (Anciens) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={tpReinsc}
                    onChange={(e) => setTpReinsc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 mb-1 font-semibold">Mensualité de Scolarité *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={tpMonthly}
                    onChange={(e) => setTpMonthly(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Nb de Mois</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max="12"
                    value={tpMonthsCount}
                    onChange={(e) => setTpMonthsCount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Frais Annexes (Uniformes, Assurance)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={tpAnnex}
                    onChange={(e) => setTpAnnex(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Mode d'Échéancier</label>
                  <select
                    value={tpSchedule}
                    onChange={(e) => setTpSchedule(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="MENSUEL">Mensuel (9 ou 10 mensualités)</option>
                    <option value="TRIMESTRIEL">Trimestriel (T1, T2, T3)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Détails des Frais Annexes</label>
                <input
                  type="text"
                  value={tpAnnexDetails}
                  onChange={(e) => setTpAnnexDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              {/* Total calculé en direct */}
              <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Annuel Calculé (Nouveaux)</p>
                  <p className="font-mono text-base font-black text-indigo-300">
                    {(Number(tpInscNew) + (Number(tpMonthly) * Number(tpMonthsCount)) + Number(tpAnnex)).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Total Annuel (Anciens)</p>
                  <p className="font-mono text-base font-black text-teal-300">
                    {(Number(tpReinsc) + (Number(tpMonthly) * Number(tpMonthsCount)) + Number(tpAnnex)).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTariffPlanModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Valider la Grille Tarifaire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL RENFORCEMENT DE CAISSE / APPORT DE FONDS */}
      {showInjectionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Renforcement de Caisse (Apport de Fonds)</span>
              </h2>
              <button onClick={() => setShowInjectionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCashInjection} noValidate className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Pourvoyeur du Fond / Origine (Promoteur) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: M. Denis Sassou Mouanda (Promoteur)"
                  value={injProviderName}
                  onChange={(e) => setInjProviderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold font-mono">Montant (FCFA) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={injAmount}
                    onChange={(e) => setInjAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Mode de Règlement *</label>
                  <select
                    value={injMethod}
                    onChange={(e) => setInjMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="VIREMENT">Virement bancaire</option>
                    <option value="CHEQUE">Chèque bancaire</option>
                    <option value="AIRTEL_MONEY">Airtel Money</option>
                    <option value="MTN_MOMO">MTN Mobile Money</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Motif / Remarques</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Renforcement de trésorerie pour paie des enseignants et travaux..."
                  value={injNotes}
                  onChange={(e) => setInjNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInjectionModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-md font-bold cursor-pointer"
                >
                  Enregistrer l'Apport de Fonds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ENCAISSER PAIEMENT (SYSTÈME DE TARIFS AUTOMATIQUES PAR CLASSE) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-teal-400" />
                <span>Encaisser un Versement Scolaire • Tarifs Automatiques</span>
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setStudentStatusData(null);
                  setSelectedFeeStructureId('');
                  setSelectedMonths([]);
                  setOriginalTariffAmount(null);
                  setModificationReason('');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} noValidate className="space-y-4 pt-4 text-xs">
              {/* RECHERCHE ET SÉLECTION DE L'ÉLÈVE */}
              <div className="space-y-1.5 bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-200 font-bold">Sélectionner l'Élève *</label>
                  <span className="text-[10px] text-slate-400">Reconnaissance automatique de classe</span>
                </div>

                {/* Champ de recherche rapide */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrer par nom, prénom ou matricule (ex: BAYAKALA, FSM-2026-0001)..."
                    value={studentSearchFilter}
                    onChange={(e) => setStudentSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs placeholder:text-slate-500"
                  />
                </div>

                <select
                  required
                  value={payStudentId}
                  onChange={(e) => handleSelectStudent(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium cursor-pointer"
                >
                  <option value="">-- Choisir un élève dans la liste --</option>
                  {allStudents
                    .filter((s) => {
                      if (!studentSearchFilter) return true;
                      const q = studentSearchFilter.toLowerCase();
                      return (
                        s.last_name?.toLowerCase().includes(q) ||
                        s.first_name?.toLowerCase().includes(q) ||
                        s.matricule?.toLowerCase().includes(q) ||
                        s.class_name?.toLowerCase().includes(q)
                      );
                    })
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.last_name} {s.first_name} ({s.matricule}) — Classe : {s.class_name || 'Sans classe'}
                      </option>
                    ))}
                </select>

                {/* Indicateur de chargement du statut tarifaire */}
                {loadingStudentStatus && (
                  <div className="flex items-center space-x-2 py-2 text-indigo-400">
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Chargement de la grille tarifaire de la classe...</span>
                  </div>
                )}

                {/* CARTE D'IDENTIFICATION DE L'ÉLÈVE ET SA CLASSE */}
                {studentStatusData && studentStatusData.student && (
                  <div className="mt-3 p-3 bg-slate-900/90 border border-indigo-900/60 rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-sm text-white">
                          {studentStatusData.student.last_name} {studentStatusData.student.first_name}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] ml-2">
                          ({studentStatusData.student.matricule})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-900/80 text-indigo-300 border border-indigo-700">
                          Classe : {studentStatusData.student.class_name || 'N/A'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {studentStatusData.student.status === 'REINSCRIT' ? 'Réinscrit (Ancien)' : 'Inscrit (Nouveau)'}
                        </span>
                      </div>
                    </div>

                    {/* Synthèse globale du solde annuel de l'élève */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center text-[11px]">
                      <div className="p-1.5 bg-slate-950/60 rounded-lg">
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Total Dû Annuel</span>
                        <span className="font-mono font-bold text-white">
                          {studentStatusData.total_due.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                      <div className="p-1.5 bg-slate-950/60 rounded-lg">
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Déjà Réglé</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {studentStatusData.total_paid.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                      <div className="p-1.5 bg-slate-950/60 rounded-lg">
                        <span className="text-slate-400 block text-[9px] uppercase font-semibold">Reste Global Dû</span>
                        <span className={`font-mono font-black ${studentStatusData.total_balance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {studentStatusData.total_balance.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION GRILLE TARIFAIRE OU SAISIE MANUELLE SI PAS DE GRILLE */}
              {payStudentId && studentStatusData && (
                <>
                  {!studentStatusData.has_schedule ? (
                    /* Saisie Manuelle de Secours si pas de grille pour cette classe */
                    <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-3">
                      <div className="flex items-center space-x-2 text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="font-semibold text-xs">
                          Aucun tarif configuré pour cette classe. Saisie manuelle activée.
                        </span>
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Type de Paiement *</label>
                        <select
                          value={payType}
                          onChange={(e) => setPayType(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        >
                          <option value="INSCRIPTION">Frais d'Inscription</option>
                          <option value="REINSCRIPTION">Frais de Réinscription</option>
                          <option value="FRAIS_MENSUELS">Frais Mensuels / Scolarité</option>
                          <option value="AUTRES_FRAIS">Autres Frais (Annexes, Uniforme, etc.)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* Sélection parmi les Frais de la Grille Tarifaire */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-200 font-bold">
                          Frais de la Grille Tarifaire (Sélectionnez le frais à encaisser) *
                        </label>
                        <span className="text-[10px] text-teal-400 font-semibold flex items-center space-x-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Montants pré-remplis automatiquement</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {studentStatusData.fees.map((fee: any, feeIdx: number) => {
                          const isSelected = selectedFeeStructureId === fee.id;
                          return (
                            <div
                              key={fee.id ? `${fee.id}-${feeIdx}` : `fee-${feeIdx}`}
                              onClick={() => handleSelectFee(fee)}
                              className={`p-3 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-900/30'
                                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <input
                                  type="radio"
                                  checked={isSelected}
                                  onChange={() => handleSelectFee(fee)}
                                  className="text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-white text-xs">{fee.name}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                      fee.periodicity === 'MENSUEL'
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}>
                                      {fee.periodicity === 'MENSUEL' ? `Mensuel (${fee.unit_amount.toLocaleString()} F/m)` : 'Unique'}
                                    </span>
                                    {fee.is_settled && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-950 text-emerald-400 border border-emerald-700">
                                        RÉGLÉ
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    Exigible : <span className="font-mono">{fee.total_exigible.toLocaleString()} F</span> • Déjà payé : <span className="font-mono text-emerald-400">{fee.already_paid.toLocaleString()} F</span>
                                  </p>
                                </div>
                              </div>

                              <div className="text-right sm:pl-3">
                                <span className="text-[10px] text-slate-400 block">Reste à payer :</span>
                                <span className={`font-mono font-black text-sm ${fee.balance > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                  {fee.balance.toLocaleString('fr-FR')} FCFA
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* CHOIX DES MOIS SI FRAIS MENSUEL SÉLECTIONNÉ (Exigence 2) */}
                      {(() => {
                        const currentFee = studentStatusData.fees.find((f: any) => f.id === selectedFeeStructureId);
                        if (!currentFee || currentFee.periodicity !== 'MENSUEL' || !currentFee.months_schedule) {
                          return null;
                        }

                        return (
                          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-200 font-bold flex items-center space-x-1.5 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Échéancier Mensuel • Sélectionnez les mois réglés :</span>
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {selectedMonths.length} mois sélectionné(s) ({((selectedMonths.length * currentFee.unit_amount)).toLocaleString()} FCFA)
                              </span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                              {currentFee.months_schedule.map((m: any, mIdx: number) => {
                                const isChecked = selectedMonths.includes(m.name);
                                const isPaid = m.is_paid;

                                if (isPaid) {
                                  return (
                                    <div
                                      key={m.id ? `${m.id}-${mIdx}` : `m-${mIdx}`}
                                      className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/60 text-emerald-400 flex flex-col items-center justify-center text-center opacity-75 cursor-not-allowed"
                                      title="Ce mois a déjà été intégralement réglé"
                                    >
                                      <span className="font-bold text-[11px] flex items-center space-x-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>{m.name}</span>
                                      </span>
                                      <span className="text-[8px] font-black uppercase mt-0.5 text-emerald-300">RÉGLÉ</span>
                                    </div>
                                  );
                                }

                                const isOverdue = m.status === 'EN_RETARD';

                                return (
                                  <button
                                    type="button"
                                    key={m.id ? `${m.id}-${mIdx}` : `m2-${mIdx}`}
                                    onClick={() => handleToggleMonth(m.name, currentFee)}
                                    className={`p-1.5 rounded-lg border flex flex-col items-center justify-center text-center transition cursor-pointer ${
                                      isChecked
                                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                        : isOverdue
                                        ? 'bg-rose-950/30 border-rose-800/80 text-rose-300 hover:bg-rose-950/60'
                                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                                    }`}
                                  >
                                    <span className="font-bold text-[11px]">{m.name}</span>
                                    <span className={`text-[8px] font-black uppercase mt-0.5 ${
                                      isChecked ? 'text-indigo-200' : isOverdue ? 'text-rose-400 font-extrabold' : 'text-slate-400'
                                    }`}>
                                      {isChecked ? 'SÉLECTIONNÉ' : isOverdue ? 'EN RETARD' : 'À VENIR'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {/* MONTANT À ENCAISSER AVEC DÉTECTION DE MODIFICATION (Exigences 2 & 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">Montant en FCFA *</label>
                    {originalTariffAmount !== null && (
                      <span className="text-[10px] text-slate-400">
                        Tarif grille : {originalTariffAmount.toLocaleString('fr-FR')} F
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="numeric"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm"
                  />
                  {payAmount !== '' && (
                    <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                      Affichage : {Number(payAmount).toLocaleString('fr-FR')} FCFA
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Mode de Règlement *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white cursor-pointer"
                  >
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="AIRTEL_MONEY">Airtel Money (Congo)</option>
                    <option value="MTN_MOMO">MTN Mobile Money (Congo)</option>
                    <option value="CHEQUE">Chèque bancaire</option>
                    <option value="VIREMENT">Virement bancaire</option>
                  </select>
                </div>
              </div>

              {/* ALERTE ET MOTIF EN CAS DE DÉROGATION / MODIFICATION DU MONTANT (Exigence 4) */}
              {originalTariffAmount !== null && payAmount !== '' && Number(payAmount) !== Number(originalTariffAmount) && (
                <div className="p-3 bg-amber-950/60 border border-amber-700/80 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-start space-x-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-bold text-[11px] text-amber-200">
                        Dérogation de montant détectée par rapport à la grille officielle
                      </p>
                      <p className="text-[10px] text-amber-300/90 mt-0.5">
                        Tarif proposé : <span className="font-mono font-bold">{originalTariffAmount.toLocaleString()} FCFA</span> → Montant saisi : <span className="font-mono font-bold text-white">{Number(payAmount).toLocaleString()} FCFA</span> (Écart : <span className="font-mono font-bold">{(Number(payAmount) - originalTariffAmount).toLocaleString()} FCFA</span>). Cette dérogation sera consignée dans le journal d'audit du Promoteur.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-amber-200 mb-1 font-semibold text-[11px]">
                      Motif de la modification (Acompte, remise, arrangement) :
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Acompte partiel accordé, remise promoteur, arrangement familial..."
                      value={modificationReason}
                      onChange={(e) => setModificationReason(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-amber-700/70 rounded-lg text-white text-xs placeholder:text-amber-400/50"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Nom du Parent / Payeur</label>
                  <input
                    type="text"
                    placeholder="Ex: Nom complet du parent ou payeur..."
                    value={payPayerName}
                    onChange={(e) => setPayPayerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Référence Mobile / Chèque</label>
                  <input
                    type="text"
                    placeholder="Ex: ID Airtel/MTN ou N° Chèque..."
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Motif / Notes imprimées sur la quittance</label>
                <input
                  type="text"
                  placeholder="Ex: Scolarité - Mois de Octobre 2026"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setStudentStatusData(null);
                    setSelectedFeeStructureId('');
                    setSelectedMonths([]);
                    setOriginalTariffAmount(null);
                    setModificationReason('');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold shadow-md font-bold cursor-pointer"
                >
                  Valider et Émettre Quittance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SORTIE DE CAISSE */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <ArrowDownRight className="w-5 h-5 text-rose-400" />
                <span>Enregistrer une Sortie de Caisse</span>
              </h2>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} noValidate className="space-y-3.5 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Catégorie *</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="FOURNITURES">Fournitures de bureau</option>
                    <option value="MAINTENANCE">Maintenance & Travaux</option>
                    <option value="EAU_ELECTRICITE">Eau & Électricité (SNE/LC)</option>
                    <option value="SALAIRES">Avances sur Salaire</option>
                    <option value="AUTRES_BESOINS">Autres besoins (Dépenses/Besoins urgents)</option>
                    <option value="AUTRE">Autre dépense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Montant en FCFA *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Bénéficiaire du Paiement *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Électricien, Librairie Les Manguiers..."
                  value={expBeneficiary}
                  onChange={(e) => setExpBeneficiary(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Description / Justification *</label>
                <input
                  type="text"
                  required
                  placeholder="Achat de rames de papier pour examens..."
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Décaisser les Fonds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOUVEAU / ÉDITION TARIF SCOLAIRE */}
      {showTarifModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>{editingFeeId ? 'Modifier la Ligne Tarifaire' : 'Ajouter un Frais à la Grille'}</span>
              </h2>
              <button onClick={() => setShowTarifModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFee} noValidate className="space-y-3.5 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Type de Frais *</label>
                  <select
                    value={tarifType}
                    onChange={(e) => setTarifType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="INSCRIPTION">Frais d'Inscription</option>
                    <option value="REINSCRIPTION">Frais de Réinscription</option>
                    <option value="FRAIS_MENSUELS">Frais Mensuels / Scolarité</option>
                    <option value="AUTRES_FRAIS">Frais Annexes / Uniforme / Examen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Périodicité *</label>
                  <select
                    value={tarifPeriodicity}
                    onChange={(e) => setTarifPeriodicity(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="MENSUEL">Mensuel (Scolarité)</option>
                    <option value="UNIQUE">Unique (Inscription, Tenue)</option>
                    <option value="TRIMESTRIEL">Trimestriel (Tranches)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Libellé du Tarif *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Scolarité Collège 3e, Inscription 6e, Tenue scolaire..."
                  value={tarifName}
                  onChange={(e) => setTarifName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Montant Unitaire (FCFA) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={tarifAmount}
                    onChange={(e) => setTarifAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm text-emerald-400"
                  />
                </div>

                {tarifPeriodicity === 'MENSUEL' ? (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Nombre de Mois</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={tarifMonthsCount}
                      onChange={(e) => setTarifMonthsCount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Cycle Cible</label>
                    <select
                      value={tarifCycle}
                      onChange={(e) => setTarifCycle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">Tous les cycles</option>
                      {OFFICIAL_CYCLES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Classe Spécifique (Optionnel)</label>
                <select
                  value={tarifClassId}
                  onChange={(e) => setTarifClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">-- Appliquer à tout le niveau ou cycle --</option>
                  {classesList.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.level_code || cls.cycle_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTarifModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md cursor-pointer"
                >
                  {editingFeeId ? 'Mettre à jour' : 'Enregistrer le Tarif'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ANNULATION QUITTANCE (AVEC MOTIF OBLIGATOIRE & TRACE AUDIT) */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-base font-bold text-rose-400 mb-2 flex items-center space-x-2">
              <Ban className="w-5 h-5" />
              <span>Annulation Contrôlée de Quittance</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Pour des motifs de sécurité financière, les quittances ne sont jamais effacées silencieusement. L'annulation sera irrévocablement consignée dans le journal d'audit.
            </p>

            <form onSubmit={handleCancelPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Motif Officiel d'Annulation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Erreur de saisie de montant, chèque retourné sans provision..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Abandonner
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold shadow"
                >
                  Confirmer l'Annulation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPRESSION QUITTANCE (UNIQUE OU MULTIPLE) */}
      {selectedReceipts && selectedReceipts.length > 0 && (
        <PaymentReceiptModal
          payments={selectedReceipts}
          establishment={establishment!}
          onClose={() => setSelectedReceipts(null)}
          onPaymentUpdated={(updated) => {
            setPayments((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
        />
      )}

      {/* MODAL RELEVÉ INDIVIDUEL DE PAIEMENTS DE L'ÉLÈVE */}
      {statementData && (
        <StudentStatementModal
          student={statementData.student}
          payments={statementData.payments}
          financialSituation={statementData.financialSituation}
          establishment={establishment!}
          onClose={() => setStatementData(null)}
          onPrintReceipt={(p) => setSelectedReceipts([p])}
        />
      )}

    </div>
  );
};
