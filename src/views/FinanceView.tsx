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
  const [loading, setLoading] = useState(true);

  // Modal Nouveau Plan Tarifaire Promoteur (Partie II)
  const [showTariffPlanModal, setShowTariffPlanModal] = useState(false);
  const [tpCycle, setTpCycle] = useState('COLLEGE');
  const [tpLevel, setTpLevel] = useState('');
  const [tpInscNew, setTpInscNew] = useState<number>(25000);
  const [tpReinsc, setTpReinsc] = useState<number>(20000);
  const [tpMonthly, setTpMonthly] = useState<number>(30000);
  const [tpMonthsCount, setTpMonthsCount] = useState<number>(9);
  const [tpSchedule, setTpSchedule] = useState<'MENSUEL' | 'TRIMESTRIEL'>('MENSUEL');
  const [tpT1, setTpT1] = useState<number>(90000);
  const [tpT2, setTpT2] = useState<number>(90000);
  const [tpT3, setTpT3] = useState<number>(90000);
  const [tpAnnex, setTpAnnex] = useState<number>(15000);
  const [tpAnnexDetails, setTpAnnexDetails] = useState('Assurance scolaire, badge magnétique et activités');

  // Modal Encaisser Paiement
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payStudentId, setPayStudentId] = useState('');
  const [payPayerName, setPayPayerName] = useState('');
  const [payType, setPayType] = useState('FRAIS_MENSUELS');
  const [payAmount, setPayAmount] = useState<number>(25000);
  const [payMethod, setPayMethod] = useState<'ESPECES' | 'AIRTEL_MONEY' | 'MTN_MOMO' | 'CHEQUE' | 'VIREMENT'>('ESPECES');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Modal Sortie de Caisse
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState('FOURNITURES');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState<number>(10000);
  const [expMethod, setExpMethod] = useState('ESPECES');
  const [expBeneficiary, setExpBeneficiary] = useState('');

  // Modal Renforcement de Caisse (Apport de fond)
  const [showInjectionModal, setShowInjectionModal] = useState(false);
  const [injAmount, setInjAmount] = useState<number>(50000);
  const [injProviderName, setInjProviderName] = useState('M. Denis Sassou Mouanda (Promoteur)');
  const [injMethod, setInjMethod] = useState('ESPECES');
  const [injNotes, setInjNotes] = useState('');

  // Modal Nouveau Tarif
  const [showTarifModal, setShowTarifModal] = useState(false);
  const [tarifType, setTarifType] = useState('SCOLARITE_T1');
  const [tarifName, setTarifName] = useState('');
  const [tarifAmount, setTarifAmount] = useState<number>(50000);
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

  // 2. Renforcement de caisse : Réservé au COMPTABLE, PROMOTEUR, DIRECTEUR_GENERAL, ADMIN_GENERAL (bloqué et enlevé pour GESTIONNAIRE / Secrétaire)
  const canInjectCash = hasRole(['COMPTABLE', 'PROMOTEUR', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']) && !isGestionnaire;

  // Sorties de caisse
  const canDisburse = hasRole(['COMPTABLE', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']) && !isPromoteur;
  const canManageTarifs = hasRole(['PROMOTEUR', 'DIRECTEUR_GENERAL', 'ADMIN_GENERAL']);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payData, balData, expData, feeData, sumData, stuData, trfData, injData] = await Promise.all([
        api.getPayments(),
        api.getStudentBalances(),
        api.getExpenses(),
        api.getFeeStructures(),
        api.getFinanceSummary(),
        api.getStudents(),
        api.getTariffs().catch(() => []),
        canInjectCash ? api.getCashInjections().catch(() => []) : Promise.resolve([]),
      ]);

      setPayments(payData);
      setStudentBalances(balData);
      setExpenses(expData);
      setFeeStructures(feeData);
      setSummary(sumData);
      setAllStudents(stuData);
      setTariffPlans(trfData);
      setCashInjections(injData);
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
    try {
      await api.createTariff({
        cycleCode: tpCycle,
        levelCode: tpLevel.trim() || null,
        inscriptionNewFee: Number(tpInscNew),
        reinscriptionFee: Number(tpReinsc),
        monthlyTuition: Number(tpMonthly),
        monthsCount: Number(tpMonthsCount),
        paymentSchedule: tpSchedule,
        trimester1Fee: Number(tpT1),
        trimester2Fee: Number(tpT2),
        trimester3Fee: Number(tpT3),
        annexFees: Number(tpAnnex),
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

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(payAmount);
    if (!payStudentId || isNaN(numAmount) || numAmount < MONTANT_MIN || numAmount > MONTANT_MAX) {
      setError(`Le montant doit être compris entre ${MONTANT_MIN} F et ${MONTANT_MAX.toLocaleString('fr-FR')} F.`);
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
      });

      setSuccess(`Quittance N° ${res.receiptNumber} émise avec succès.`);
      setShowPaymentModal(false);
      setPayRef('');
      setPayNotes('');
      setPayPayerName('');

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

    if (!expDesc.trim() || !expAmount || expAmount < 50 || expAmount > 1000000 || !expBeneficiary.trim()) {
      setError('Veuillez remplir tous les champs de la dépense (montant entre 50 et 1 000 000).');
      return;
    }

    try {
      await api.createExpense({
        category: expCategory,
        description: expDesc.trim(),
        amount: Number(expAmount),
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

    if (!injAmount || injAmount < 50 || injAmount > 1000000 || !injProviderName.trim()) {
      setError('Montant requis entre 50 et 1 000 000, et nom du pourvoyeur requis.');
      return;
    }

    try {
      await api.createCashInjection({
        amount: Number(injAmount),
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

  const handleCreateTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tarifName.trim() || !tarifAmount || tarifAmount < 50 || tarifAmount > 1000000) {
      setError('Libellé obligatoire et montant requis entre 50 et 1 000 000.');
      return;
    }

    try {
      await api.createFeeStructure({
        feeType: tarifType,
        name: tarifName.trim(),
        amount: Number(tarifAmount),
        cycleCode: tarifCycle || null,
        levelCode: tarifLevel || null,
      });

      setSuccess('Tarif ajouté à la grille financière.');
      setShowTarifModal(false);
      setTarifName('');
      await loadData();
    } catch (err: any) {
      setError(err.message);
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

          {/* Section Lignes de Frais Individuels */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">Barèmes des Lignes de Frais Spécifiques</h3>
                <p className="text-xs text-slate-400">Tranches trimestrielles, uniformes, inscriptions et activités.</p>
              </div>
              {canManageTarifs && (
                <button
                  onClick={() => setShowTarifModal(true)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ajouter une Ligne de Frais</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300 min-w-[650px]">
                <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Libellé Frais</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Cycle Concerné</th>
                    <th className="p-3.5">Niveau</th>
                    <th className="p-3.5 text-right">Montant Exigible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {feeStructures.map((f, idx) => (
                    <tr key={f.id ? `${f.id}-${idx}` : idx} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white">{f.name}</td>
                      <td className="p-3.5 font-semibold text-slate-400">{f.fee_type}</td>
                      <td className="p-3.5 font-semibold text-indigo-300">{f.cycle_code || 'Tous cycles'}</td>
                      <td className="p-3.5 text-slate-300">{f.level_code || 'Tous niveaux'}</td>
                      <td className="p-3.5 font-mono font-black text-emerald-400 text-sm text-right">
                        {f.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

            <form onSubmit={handleCreateTariffPlan} className="space-y-4 pt-4 text-xs">
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
                    step="1000"
                    value={tpInscNew}
                    onChange={(e) => setTpInscNew(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Frais Réinscription (Anciens) *</label>
                  <input
                    type="number"
                    min="50"
                    step="1000"
                    value={tpReinsc}
                    onChange={(e) => setTpReinsc(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 mb-1 font-semibold">Mensualité de Scolarité *</label>
                  <input
                    type="number"
                    min="50"
                    step="1000"
                    value={tpMonthly}
                    onChange={(e) => setTpMonthly(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Nb de Mois</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={tpMonthsCount}
                    onChange={(e) => setTpMonthsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Frais Annexes (Uniformes, Assurance)</label>
                  <input
                    type="number"
                    min="50"
                    step="1000"
                    value={tpAnnex}
                    onChange={(e) => setTpAnnex(Number(e.target.value))}
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

            <form onSubmit={handleCreateCashInjection} className="space-y-3.5 pt-4 text-xs">
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
                    step="1"
                    min="50"
                    required
                    value={injAmount}
                    onChange={(e) => setInjAmount(Number(e.target.value))}
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

      {/* MODAL ENCAISSER PAIEMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-teal-400" />
                <span>Encaisser un Versement Scolaire</span>
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Élève *</label>
                <select
                  required
                  value={payStudentId}
                  onChange={(e) => {
                    const sId = e.target.value;
                    setPayStudentId(sId);
                    const foundStu = allStudents.find((s) => s.id === sId);
                    if (foundStu && foundStu.guardian_name && !payPayerName) {
                      setPayPayerName(foundStu.guardian_name);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="">Sélectionner l'élève...</option>
                  {allStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.last_name} {s.first_name} ({s.matricule}) - {s.class_name || 'Sans classe'}
                    </option>
                  ))}
                </select>
              </div>

              {payStudentId && (() => {
                const bal = studentBalances.find((b) => b.id === payStudentId);
                return bal ? (
                  <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-lg flex items-center justify-between text-xs">
                    <span className="text-slate-400">Solde restant dû pour cet élève :</span>
                    <span className="font-mono font-black text-amber-400 text-sm">
                      {bal.balance.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                ) : null;
              })()}

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Montant en FCFA *</label>
                  <input
                    type="number"
                    step="1"
                    inputMode="numeric"
                    min={MONTANT_MIN}
                    max={MONTANT_MAX}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold text-sm"
                  />
                  <span className="block text-[10px] text-slate-400 mt-1 font-mono">
                    Affichage : {payAmount.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Mode de Règlement *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="ESPECES">Espèces (Caisse)</option>
                    <option value="AIRTEL_MONEY">Airtel Money (Congo)</option>
                    <option value="MTN_MOMO">MTN Mobile Money (Congo)</option>
                    <option value="CHEQUE">Chèque bancaire</option>
                    <option value="VIREMENT">Virement bancaire</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Référence Transaction Mobile / Chèque</label>
                <input
                  type="text"
                  placeholder="Ex: ID Airtel/MTN ou N° Chèque..."
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Motif / Tranche concernée</label>
                <input
                  type="text"
                  placeholder="Ex: Scolarité 1er Trimestre (Acompte)"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold shadow-md font-bold"
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

            <form onSubmit={handleCreateExpense} className="space-y-3.5 pt-4 text-xs">
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
                    step="1"
                    min="50"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
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

      {/* MODAL NOUVEAU TARIF */}
      {showTarifModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Nouveau Tarif Scolaire</span>
              </h2>
              <button onClick={() => setShowTarifModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTarif} className="space-y-3.5 pt-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Type de Frais *</label>
                <select
                  value={tarifType}
                  onChange={(e) => setTarifType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="INSCRIPTION">Frais d'Inscription</option>
                  <option value="REINSCRIPTION">Frais de Réinscription</option>
                  <option value="SCOLARITE_T1">Scolarité 1er Trimestre</option>
                  <option value="SCOLARITE_T2">Scolarité 2ème Trimestre</option>
                  <option value="SCOLARITE_T3">Scolarité 3ème Trimestre</option>
                  <option value="FRAIS_ANNEXES">Frais Annexes / Uniforme</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Libellé du Tarif *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Scolarité Collège T1"
                  value={tarifName}
                  onChange={(e) => setTarifName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Cycle</label>
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

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Montant (FCFA) *</label>
                  <input
                    type="number"
                    step="5000"
                    min="50"
                    required
                    value={tarifAmount}
                    onChange={(e) => setTarifAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTarifModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-md"
                >
                  Enregistrer
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
