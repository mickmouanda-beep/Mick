import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Search,
  CheckCircle,
  Printer,
  AlertCircle,
  FileText,
  X,
  Zap,
  Sliders,
  Lock,
  ChevronLeft,
  Briefcase,
  User,
  GraduationCap,
  Clock,
  Building2,
  Calendar,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { PayrollRecord, StaffSalaryParameter } from '../types.ts';
import { PrintablePayslip } from '../components/PrintablePayslip.tsx';

export const PayrollView: React.FC = () => {
  const { user, establishment } = useAuth();
  const [activeTab, setActiveTab] = useState<'registry' | 'parameters'>('registry');
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [salaryParams, setSalaryParams] = useState<StaffSalaryParameter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isParamsLoading, setIsParamsLoading] = useState(false);
  const [isAutoCalculating, setIsAutoCalculating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRecordForPay, setSelectedRecordForPay] = useState<PayrollRecord | null>(null);
  const [selectedRecordForSlip, setSelectedRecordForSlip] = useState<PayrollRecord | null>(null);
  const [selectedParamForEdit, setSelectedParamForEdit] = useState<StaffSalaryParameter | null>(null);
  
  // Pointages du mois pour enseignant sélectionné
  const [teacherPointedHours, setTeacherPointedHours] = useState<{ college: number; lycee: number; total: number }>({ college: 0, lycee: 0, total: 0 });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state pour nouvelle fiche manuelle
  const [formData, setFormData] = useState({
    userId: '',
    employeeCode: '',
    fullName: '',
    jobTitle: '',
    department: 'ENSEIGNEMENT',
    contractType: 'CDI',
    hireDate: '',
    period: selectedPeriod,
    baseSalary: 0,
    bonuses: 0,
    overtimeHours: 0,
    overtimeAmount: 0,
    advances: 0,
    deductions: 0,
    notes: '',
  });

  // Form state pour Fiche Contrat & Rémunération
  const [contractForm, setContractForm] = useState({
    contractType: 'CDI',
    startDate: '',
    durationEndDate: '',
    wageType: 'MENSUEL_FIXE',
    baseSalary: '',
    hourlyRate: '',
    collegeHourlyRate: '',
    lyceeHourlyRate: '',
    transportAllowance: '',
    responsibilityBonus: '',
    seniorityBonus: '',
    otherBonuses: '',
    overtimeRate: '',
    teachingCategory: 'COLLEGE_ONLY',
    teachingLevel: 'PRE_SCOLAIRE',
    observations: '',
  });

  // Pay modal state
  const [payData, setPayData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'ESPECES',
    transactionRef: '',
  });

  const isComptable = user?.role === 'COMPTABLE';
  const isPromoteur = user?.role === 'PROMOTEUR';
  const isDG = user?.role === 'DIRECTEUR_GENERAL';
  const isDirection = isDG || isPromoteur;
  const canManagePayroll = isPromoteur || isComptable;

  // Sécurité d'accès onglet : Seul le Promoteur voit l'onglet "Grille Salariale & Contrats"
  useEffect(() => {
    if (!isPromoteur && activeTab === 'parameters') {
      setActiveTab('registry');
    }
  }, [isPromoteur, activeTab]);

  const fetchPayroll = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPayrollRecords({
        period: selectedPeriod,
        department: filterDepartment !== 'ALL' ? filterDepartment : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      });
      setRecords(data);
    } catch (err: any) {
      console.error('Erreur chargement paie:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const users = await api.getTeachers();
      setUsersList(users);
    } catch {
      // ignore
    }
  };

  const fetchSalaryParams = async () => {
    if (!isPromoteur) return;
    setIsParamsLoading(true);
    try {
      const data = await api.getStaffSalaryParameters();
      const sanitized = (data || []).map((p: any, idx: number) => {
        const uniqueId = p.user_id || p.id || `staff-${idx}`;
        const codeNum = String(idx + 1).padStart(3, '0');
        const uniqueEmployeeCode = p.employee_code && p.employee_code !== 'EMP-CONGO'
          ? p.employee_code
          : `EMP-${codeNum}`;
        return {
          ...p,
          id: p.id || `SAL-${uniqueId}`,
          user_id: uniqueId,
          employee_code: uniqueEmployeeCode,
        };
      });
      setSalaryParams(sanitized);
    } catch (err: any) {
      console.error('Erreur chargement paramètres salariaux:', err);
    } finally {
      setIsParamsLoading(false);
    }
  };

  const openContractPanel = async (param: StaffSalaryParameter) => {
    setSelectedParamForEdit(param);
    setContractForm({
      contractType: param.contract_type || 'CDI',
      startDate: param.start_date || '',
      durationEndDate: param.duration_end_date || '',
      wageType: param.wage_type || (param.role === 'ENSEIGNANT' ? 'HORAIRE' : 'MENSUEL_FIXE'),
      baseSalary: param.base_salary !== null && param.base_salary !== undefined ? String(param.base_salary) : '',
      hourlyRate: param.hourly_rate !== null && param.hourly_rate !== undefined ? String(param.hourly_rate) : '',
      collegeHourlyRate: param.college_hourly_rate !== null && param.college_hourly_rate !== undefined ? String(param.college_hourly_rate) : '',
      lyceeHourlyRate: param.lycee_hourly_rate !== null && param.lycee_hourly_rate !== undefined ? String(param.lycee_hourly_rate) : '',
      transportAllowance: param.transport_allowance !== null && param.transport_allowance !== undefined ? String(param.transport_allowance) : '',
      responsibilityBonus: param.responsibility_bonus !== null && param.responsibility_bonus !== undefined ? String(param.responsibility_bonus) : '',
      seniorityBonus: param.seniority_bonus !== null && param.seniority_bonus !== undefined ? String(param.seniority_bonus) : '',
      otherBonuses: param.other_bonuses !== null && param.other_bonuses !== undefined ? String(param.other_bonuses) : '',
      overtimeRate: param.overtime_rate !== null && param.overtime_rate !== undefined ? String(param.overtime_rate) : '',
      teachingCategory: param.teaching_category || 'COLLEGE_ONLY',
      teachingLevel: param.teaching_level || 'PRE_SCOLAIRE',
      observations: param.observations || '',
    });

    // Récupérer les heures pointées du mois pour les enseignants
    if (param.role === 'ENSEIGNANT') {
      try {
        const atts = await api.getTeacherAttendances(undefined, param.user_id);
        const monthAtts = (atts || []).filter((a: any) => (a.date || '').startsWith(selectedPeriod) && a.is_absent !== 1);
        const totalH = monthAtts.reduce((acc: number, curr: any) => acc + Number(curr.taught_hours || curr.hours_done || 0), 0);
        setTeacherPointedHours({
          college: Math.round(totalH * 0.6), // estimation indicative si non ventilée
          lycee: Math.round(totalH * 0.4),
          total: totalH,
        });
      } catch {
        setTeacherPointedHours({ college: 0, lycee: 0, total: 0 });
      }
    }
  };

  const handleAutoCalculatePayroll = async () => {
    if (!canManagePayroll) {
      setErrorMsg("Action réservée au Promoteur et au Comptable.");
      return;
    }
    setIsAutoCalculating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.autoCalculatePayroll({ period: selectedPeriod });
      setSuccessMsg(res.message || 'Calcul automatique de la paie effectué.');
      if (res.warning) {
        setErrorMsg(res.warning);
      }
      fetchPayroll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du calcul automatique de la paie');
    } finally {
      setIsAutoCalculating(false);
    }
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParamForEdit || !isPromoteur) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.updateStaffSalaryParameter(selectedParamForEdit.user_id, contractForm);
      setSuccessMsg(`Fiche "Contrat et rémunération" enregistrée pour ${selectedParamForEdit.full_name}.`);
      setSelectedParamForEdit(null);
      fetchSalaryParams();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement du contrat');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
    fetchUsers();
    if (activeTab === 'parameters' && isPromoteur) {
      fetchSalaryParams();
    }
  }, [selectedPeriod, filterDepartment, filterStatus, activeTab, isPromoteur]);

  const handleSelectStaff = (userId: string) => {
    const selected = usersList.find((u) => u.id === userId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        userId: selected.id,
        employeeCode: selected.username ? `EMP-${selected.username.toUpperCase()}` : `EMP-${Date.now().toString().slice(-4)}`,
        fullName: selected.full_name,
        jobTitle: selected.role === 'ENSEIGNANT' ? 'Enseignant Titulaire' : selected.role,
        department: selected.role === 'ENSEIGNANT' ? 'ENSEIGNEMENT' : 'ADMINISTRATION',
      }));
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePayroll) {
      setErrorMsg("Action réservée au Promoteur et au Comptable.");
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.createPayrollRecord({
        ...formData,
        period: selectedPeriod,
      });
      setSuccessMsg('Fiche de paie manuelle enregistrée.');
      setIsCreateModalOpen(false);
      fetchPayroll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitForValidation = async (id: string) => {
    try {
      await api.submitPayrollRecord(id);
      setSuccessMsg('Bulletin soumis pour validation hiérarchique.');
      fetchPayroll();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleValidateSlip = async (id: string) => {
    try {
      await api.validatePayrollRecord(id);
      setSuccessMsg('Bulletin validé officiellement par la direction.');
      fetchPayroll();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDisbursePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordForPay) return;
    setActionLoading(true);
    try {
      await api.payPayrollRecord(selectedRecordForPay.id, payData);
      setSuccessMsg('Paiement du salaire enregistré.');
      setSelectedRecordForPay(null);
      fetchPayroll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics
  const totalNet = records.reduce((acc, r) => acc + (r.net_amount || 0), 0);
  const totalPaid = records.filter((r) => r.status === 'PAYE').reduce((acc, r) => acc + (r.net_amount || 0), 0);
  const totalPending = totalNet - totalPaid;

  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(term) ||
      r.employee_code.toLowerCase().includes(term) ||
      r.job_title.toLowerCase().includes(term)
    );
  });

  const filteredSalaryParams = salaryParams.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.full_name || '').toLowerCase().includes(term) ||
      (p.employee_code || '').toLowerCase().includes(term) ||
      (p.role || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4" />
            <span>Gestion Financière • Espace Comptable & Paie</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Gestion de la Paie & Rémunérations
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Préparation mensuelle, validation hiérarchique, bulletins officiels et suivi des décaissements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 font-semibold"
          />

          {/* Bouton 1 : Calculer Automatiquement la Paie */}
          {canManagePayroll ? (
            <button
              onClick={handleAutoCalculatePayroll}
              disabled={isAutoCalculating}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              title="Calculer automatiquement les salaires du mois selon les contrats saisis"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>{isAutoCalculating ? 'Calcul en cours...' : 'Calculer Automatiquement la Paie'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center space-x-2 bg-slate-900 border border-slate-800 text-slate-500 px-4 py-2 rounded-xl text-sm font-semibold cursor-not-allowed opacity-60"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Calculer Automatiquement la Paie</span>
            </button>
          )}

          {/* Bouton 2 : Nouvelle Fiche Manuelle */}
          {canManagePayroll ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Fiche Manuelle</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex items-center space-x-2 bg-slate-900 border border-slate-800 text-slate-500 px-4 py-2 rounded-xl text-sm font-semibold cursor-not-allowed opacity-60"
            >
              <Lock className="w-4 h-4 text-slate-500" />
              <span>Nouvelle Fiche Manuelle</span>
            </button>
          )}
        </div>
      </div>

      {isDG && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Compte Directeur Général (Consultation seule) :</strong> Vous visualisez l'intégralité des salaires, bulletins et montants du personnel.
            </span>
          </div>
        </div>
      )}

      {/* Onglets Paie */}
      <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex items-center space-x-1 w-fit">
        <button
          onClick={() => setActiveTab('registry')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'registry'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>1. Bulletins & Fiches de Paie ({records.length})</span>
        </button>

        {/* Permissons : Seul le Promoteur voit l'onglet "Grille Salariale & Contrats" */}
        {isPromoteur && (
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer ${
              activeTab === 'parameters'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>2. Grille Salariale & Contrats (Promoteur)</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-amber-950/80 border border-amber-500/50 rounded-xl text-amber-200 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-amber-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VUE 1 : REGISTRE DES BULLETINS & FICHES DE PAIE */}
      {activeTab === 'registry' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <p className="text-slate-400 text-xs font-medium">Masse Salariale Nette ({selectedPeriod})</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-1">
                {totalNet.toLocaleString()} <span className="text-xs text-slate-400 font-normal">FCFA</span>
              </p>
              <div className="flex items-center space-x-1 text-slate-400 text-xs mt-2">
                <span>{records.length} fiches répertoriées</span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <p className="text-emerald-400 text-xs font-medium">Salaires Versés (Payés)</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                {totalPaid.toLocaleString()} <span className="text-xs text-slate-400 font-normal">FCFA</span>
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {records.filter((r) => r.status === 'PAYE').length} salariés réglés
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <p className="text-amber-400 text-xs font-medium">Restant à Décaisser</p>
              <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
                {totalPending.toLocaleString()} <span className="text-xs text-slate-400 font-normal">FCFA</span>
              </p>
              <p className="text-xs text-slate-400 mt-2">En attente de paiement</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
              <p className="text-indigo-400 text-xs font-medium">À Valider par la Direction</p>
              <p className="text-xl sm:text-2xl font-black text-indigo-400 mt-1">
                {records.filter((r) => r.status === 'EN_ATTENTE_VALIDATION' || r.status === 'CALCULE').length}
              </p>
              <p className="text-xs text-slate-400 mt-2">Calculés ou soumis</p>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Rechercher par nom, matricule, poste..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Service :</span>
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="ALL">Tous les services</option>
                  {['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES'].includes(user?.role || '') && (
                    <option value="ENSEIGNEMENT">Corps Enseignant</option>
                  )}
                  <option value="ADMINISTRATION">Administration</option>
                  <option value="SURVEILLANCE">Surveillance Générale</option>
                  <option value="TECHNIQUE">Personnel Technique</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Statut :</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
                >
                  <option value="ALL">Tous les statuts</option>
                  <option value="BROUILLON">Brouillon</option>
                  <option value="CALCULE">Calculé (Automatique)</option>
                  <option value="EN_ATTENTE_VALIDATION">En attente de validation</option>
                  <option value="VALIDE">Validé (Prêt au paiement)</option>
                  <option value="PAYE">Payé</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Salarié</th>
                    <th className="py-3 px-4">Fonction & Service</th>
                    <th className="py-3 px-4">Salaire Base</th>
                    <th className="py-3 px-4">Primes / H.Sup</th>
                    <th className="py-3 px-4">Retenues</th>
                    <th className="py-3 px-4">Net à Payer</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        Chargement des fiches de paie...
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <p className="font-semibold">Aucune fiche de paie enregistrée pour cette période.</p>
                        <p className="text-xs mt-1 text-slate-600">
                          {canManagePayroll
                            ? 'Cliquez sur "Calculer Automatiquement la Paie" ou "Nouvelle Fiche Manuelle".'
                            : 'Les fiches de paie sont calculées et établies par le Promoteur ou le Comptable.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r, rIdx) => {
                      const statusBadge = {
                        BROUILLON: 'bg-slate-800 text-slate-300 border-slate-700',
                        CALCULE: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50',
                        EN_ATTENTE_VALIDATION: 'bg-amber-950/60 text-amber-300 border-amber-600/50',
                        VALIDE: 'bg-blue-950/60 text-blue-300 border-blue-500/50',
                        PAYE: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/50',
                      }[r.status] || 'bg-slate-800 text-slate-300';

                      const statusLabel = {
                        BROUILLON: 'Brouillon',
                        CALCULE: 'Calculé (Automatique)',
                        EN_ATTENTE_VALIDATION: 'En Attente Validation',
                        VALIDE: 'Validé (À Payer)',
                        PAYE: 'Payé',
                      }[r.status] || r.status;

                      return (
                        <tr key={r.id ? `${r.id}-${rIdx}` : `payrec-${rIdx}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{r.full_name}</div>
                            <div className="text-xs text-slate-500 font-mono">{r.employee_code} • {r.contract_type}</div>
                            {(r.department === 'ENSEIGNEMENT' || r.total_taught_hours !== undefined) && (
                              <div className="mt-1">
                                {r.total_taught_hours === 0 || (r.college_hours === 0 && r.lycee_hours === 0 && r.base_salary === 0 && r.department === 'ENSEIGNEMENT') ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                                    0 heure pointée pour {r.period || selectedPeriod}
                                  </span>
                                ) : (
                                  <div className="text-[11px] text-indigo-300 space-y-0.5 font-mono">
                                    <div className="flex items-center space-x-2">
                                      <span>Collège : <strong className="text-white">{r.college_hours || 0}h</strong> @ {(r.college_hourly_rate || 0).toLocaleString()} F/h</span>
                                      <span>|</span>
                                      <span>Lycée : <strong className="text-white">{r.lycee_hours || 0}h</strong> @ {(r.lycee_hourly_rate || 0).toLocaleString()} F/h</span>
                                    </div>
                                    <div className="text-emerald-400 font-semibold">
                                      Total : {r.total_taught_hours || ((r.college_hours || 0) + (r.lycee_hours || 0))}h pointées = {r.base_salary.toLocaleString()} FCFA
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-200">{r.job_title}</div>
                            <div className="text-xs text-slate-500">{r.department}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-300">
                            {(r.base_salary || 0).toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-400">
                            +{((r.bonuses || 0) + (r.overtime_amount || 0)).toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-400">
                            -{((r.advances || 0) + (r.deductions || 0)).toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white text-base">
                            {(r.net_amount || 0).toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setSelectedRecordForSlip(r)}
                                title="Imprimer le bulletin officiel de salaire"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {(r.status === 'BROUILLON' || r.status === 'CALCULE') && isComptable && (
                                <button
                                  onClick={() => handleSubmitForValidation(r.id)}
                                  className="text-xs bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/40 transition-colors cursor-pointer"
                                >
                                  Soumettre
                                </button>
                              )}

                              {(r.status === 'EN_ATTENTE_VALIDATION' || r.status === 'CALCULE') && isDirection && (
                                <button
                                  onClick={() => handleValidateSlip(r.id)}
                                  className="text-xs bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-emerald-500/40 transition-colors cursor-pointer font-semibold"
                                >
                                  Valider
                                </button>
                              )}

                              {r.status === 'VALIDE' && (isComptable || isDirection) && (
                                <button
                                  onClick={() => setSelectedRecordForPay(r)}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-2.5 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                  Payer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VUE 2 : GRILLE DES SALAIRES & CONTRATS (RÉSERVÉ AU PROMOTEUR) */}
      {activeTab === 'parameters' && isPromoteur && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Sliders className="w-4 h-4" />
                <span>Espace Exclusif Promoteur • Contrats & Barèmes Salariaux</span>
              </div>
              <h2 className="text-base font-extrabold text-white">
                Grille Salariale & Contrats du Personnel
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Renseignez le contrat et la rémunération individuelle de chaque membre du personnel. Aucun montant par défaut n'est appliqué.
              </p>
            </div>

            <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              Total Personnel : <span className="text-white font-bold">{salaryParams.length}</span>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filtrer par nom, poste, matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-80 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* VUE DESKTOP : TABLEAU RÉPONDANT EXACTEMENT AUX 7 COLONNES REQUISES */}
          <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Salarié & Matricule</th>
                    <th className="py-3.5 px-4">Poste</th>
                    <th className="py-3.5 px-4">Type de Contrat</th>
                    <th className="py-3.5 px-4">Mode de Rémunération</th>
                    <th className="py-3.5 px-4">Rémunération</th>
                    <th className="py-3.5 px-4">Statut du Contrat</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isParamsLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Chargement de la grille salariale et des contrats...
                      </td>
                    </tr>
                  ) : filteredSalaryParams.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        Aucun membre du personnel trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredSalaryParams.map((p, idx) => {
                      const isConfigured = Boolean(p.is_configured);
                      
                      // Determination du label Rémunération
                      let remLabel = '';
                      if (!isConfigured) {
                        remLabel = 'Non configuré';
                      } else if (p.wage_type === 'MENSUEL_FIXE' || (p.base_salary && p.base_salary > 0)) {
                        remLabel = `${Number(p.base_salary).toLocaleString()} FCFA / mois`;
                      } else if (p.teaching_category === 'COLLEGE_AND_LYCEE') {
                        remLabel = `${Number(p.college_hourly_rate || 0).toLocaleString()} F/h (Collège) • ${Number(p.lycee_hourly_rate || 0).toLocaleString()} F/h (Lycée)`;
                      } else if (p.teaching_category === 'LYCEE_ONLY') {
                        remLabel = `${Number(p.lycee_hourly_rate || p.hourly_rate || 0).toLocaleString()} FCFA/h (Lycée)`;
                      } else if (p.teaching_category === 'COLLEGE_ONLY') {
                        remLabel = `${Number(p.college_hourly_rate || p.hourly_rate || 0).toLocaleString()} FCFA/h (Collège)`;
                      } else if (p.hourly_rate && p.hourly_rate > 0) {
                        remLabel = `${Number(p.hourly_rate).toLocaleString()} FCFA/h`;
                      } else {
                        remLabel = 'Non configuré';
                      }

                      // Mode de rémunération
                      const wageTypeLabel = !isConfigured
                        ? 'À déterminer'
                        : p.wage_type === 'MENSUEL_FIXE'
                        ? 'Mensuel Fixe'
                        : p.teaching_category === 'COLLEGE_AND_LYCEE'
                        ? 'Taux Horaire (Collège & Lycée)'
                        : p.teaching_category === 'LYCEE_ONLY'
                        ? 'Taux Horaire (Lycée)'
                        : 'Taux Horaire (Vacataire)';

                      return (
                        <tr key={p.user_id ? String(p.user_id) : `staff-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                          {/* 1. Salarié & matricule */}
                          <td className="py-3.5 px-4 font-bold text-white">
                            {p.full_name}
                            <div className="text-xs text-slate-500 font-mono font-normal">
                              {p.employee_code || `EMP-${String(idx + 1).padStart(3, '0')}`}
                            </div>
                          </td>

                          {/* 2. Poste */}
                          <td className="py-3.5 px-4 text-slate-300 text-xs">
                            {p.role === 'ENSEIGNANT' ? 'Enseignant' : p.role || 'Personnel'}
                          </td>

                          {/* 3. Type de contrat */}
                          <td className="py-3.5 px-4 font-medium text-slate-200 text-xs">
                            {p.contract_type || '—'}
                          </td>

                          {/* 4. Mode de rémunération */}
                          <td className="py-3.5 px-4 text-xs">
                            <span className="text-slate-300">{wageTypeLabel}</span>
                          </td>

                          {/* 5. Rémunération */}
                          <td className="py-3.5 px-4">
                            {!isConfigured || remLabel === 'Non configuré' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/50">
                                Non configuré
                              </span>
                            ) : (
                              <span className="font-mono font-semibold text-white text-xs">
                                {remLabel}
                              </span>
                            )}
                          </td>

                          {/* 6. Statut du contrat */}
                          <td className="py-3.5 px-4">
                            {!isConfigured ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-950/80 text-orange-400 border border-orange-500/50">
                                Contrat à renseigner
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                                Actif
                              </span>
                            )}
                          </td>

                          {/* 7. Bouton "Contrat et rémunération" */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => openContractPanel(p)}
                              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-colors cursor-pointer"
                            >
                              Contrat et rémunération
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* VUE MOBILE : CARTES PAR EMPLOYÉ SUR TÉLÉPHONE */}
          <div className="block sm:hidden space-y-3">
            {isParamsLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Chargement...</div>
            ) : filteredSalaryParams.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Aucun résultat.</div>
            ) : (
              filteredSalaryParams.map((p, idx) => {
                const isConfigured = Boolean(p.is_configured);
                let remLabel = 'Non configuré';
                if (isConfigured) {
                  if (p.wage_type === 'MENSUEL_FIXE' || (p.base_salary && p.base_salary > 0)) {
                    remLabel = `${Number(p.base_salary).toLocaleString()} FCFA / mois`;
                  } else if (p.teaching_category === 'COLLEGE_AND_LYCEE') {
                    remLabel = `${Number(p.college_hourly_rate || 0).toLocaleString()} F/h (Col.) • ${Number(p.lycee_hourly_rate || 0).toLocaleString()} F/h (Lyc.)`;
                  } else if (p.hourly_rate && p.hourly_rate > 0) {
                    remLabel = `${Number(p.hourly_rate).toLocaleString()} FCFA/h`;
                  }
                }

                return (
                  <div key={p.user_id ? String(p.user_id) : `m-staff-${idx}`} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white text-base">{p.full_name}</h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {p.employee_code || `EMP-${String(idx + 1).padStart(3, '0')}`} • {p.role === 'ENSEIGNANT' ? 'Enseignant' : p.role}
                        </p>
                      </div>
                      <div>
                        {!isConfigured ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-950/80 text-orange-400 border border-orange-500/50">
                            Contrat à renseigner
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                            Actif
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Contrat :</span>
                        <span className="font-medium text-slate-200">{p.contract_type || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Rémunération :</span>
                        {!isConfigured || remLabel === 'Non configuré' ? (
                          <span className="text-amber-400 font-semibold">Non configuré</span>
                        ) : (
                          <span className="font-mono text-white font-semibold">{remLabel}</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => openContractPanel(p)}
                        className="w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-3 rounded-xl shadow transition-colors cursor-pointer text-center"
                      >
                        Contrat et rémunération
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PANNEAU PLEIN ÉCRAN : FICHE "CONTRAT ET RÉMUNÉRATION" ADAPTÉE SELON LE RÔLE */}
      {selectedParamForEdit && isPromoteur && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Bar de navigation en haut */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 max-w-5xl mx-auto">
            <button
              onClick={() => setSelectedParamForEdit(null)}
              className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 font-semibold text-sm cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Retour à la Grille des Contrats</span>
            </button>

            <div className="text-left sm:text-right">
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider block mb-0.5">Fiche Individuelle</span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Contrat & Rémunération
              </h2>
              <p className="text-xs text-slate-400">
                {selectedParamForEdit.full_name} ({selectedParamForEdit.employee_code} • {selectedParamForEdit.role})
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveContract} className="max-w-5xl mx-auto space-y-6">
            {/* 1. SECTEUR SELON LE RÔLE */}

            {/* CAS A : ADMINISTRATIFS (DG, DE, Comptable, Gestionnaire, Surveillant) */}
            {selectedParamForEdit.role !== 'ENSEIGNANT' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm border-b border-slate-800 pb-3">
                  <Briefcase className="w-4 h-4" />
                  <span>Paramètres du Contrat Administratif</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Type de Contrat *</label>
                    <select
                      value={contractForm.contractType}
                      onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    >
                      <option value="CDI">CDI (Durée Indéterminée)</option>
                      <option value="CDD">CDD (Durée Déterminée)</option>
                      <option value="PRESTATAIRE">Prestataire / Indépendant</option>
                      <option value="STAGIAIRE">Stagiaire</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Date de Début du Contrat</label>
                    <input
                      type="date"
                      value={contractForm.startDate}
                      onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Durée / Date de Fin</label>
                    <input
                      type="text"
                      placeholder="Ex: 12 mois ou 2027-08-31"
                      value={contractForm.durationEndDate}
                      onChange={(e) => setContractForm({ ...contractForm, durationEndDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">
                    Éléments de Rémunération Mensuelle (FCFA)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Salaire Mensuel de Base *</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 200000"
                        value={contractForm.baseSalary}
                        onChange={(e) => setContractForm({ ...contractForm, baseSalary: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Indemnité de Transport</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 25000"
                        value={contractForm.transportAllowance}
                        onChange={(e) => setContractForm({ ...contractForm, transportAllowance: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Prime de Responsabilité</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 15000"
                        value={contractForm.responsibilityBonus}
                        onChange={(e) => setContractForm({ ...contractForm, responsibilityBonus: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Prime d'Ancienneté</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 10000"
                        value={contractForm.seniorityBonus}
                        onChange={(e) => setContractForm({ ...contractForm, seniorityBonus: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Autres Primes</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Ex: 5000"
                        value={contractForm.otherBonuses}
                        onChange={(e) => setContractForm({ ...contractForm, otherBonuses: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CAS B & C : ENSEIGNANTS */}
            {selectedParamForEdit.role === 'ENSEIGNANT' && (
              <div className="space-y-6">
                {/* Choix de la typologie d'enseignement */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
                  <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm border-b border-slate-800 pb-3">
                    <GraduationCap className="w-4 h-4" />
                    <span>Typologie de l'Enseignant</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setContractForm({ ...contractForm, wageType: 'MENSUEL_FIXE' })}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition ${
                        contractForm.wageType === 'MENSUEL_FIXE'
                          ? 'bg-indigo-950/60 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-sm">Enseignant Préscolaire & Primaire</div>
                      <div className="text-xs opacity-80 mt-1">
                        Rémunération au forfait / salaire mensuel fixe avec indemnités.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContractForm({ ...contractForm, wageType: 'ENSEIGNANT_COLLEGE_LYCEE' })}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition ${
                        contractForm.wageType === 'ENSEIGNANT_COLLEGE_LYCEE' || contractForm.wageType === 'HORAIRE'
                          ? 'bg-purple-950/60 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-bold text-sm">Enseignant Collège & Lycée</div>
                      <div className="text-xs opacity-80 mt-1">
                        Rémunération au taux horaire selon le niveau (Collège / Lycée).
                      </div>
                    </button>
                  </div>
                </div>

                {/* SOUS-CAS B : PRÉSCOLAIRE ET PRIMAIRE */}
                {contractForm.wageType === 'MENSUEL_FIXE' && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
                    <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                      Fiche Enseignant Préscolaire & Primaire
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Niveau d'Enseignement *</label>
                        <select
                          value={contractForm.teachingLevel}
                          onChange={(e) => setContractForm({ ...contractForm, teachingLevel: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        >
                          <option value="PRE_SCOLAIRE">Préscolaire</option>
                          <option value="PRIMAIRE">Primaire</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Type de Contrat *</label>
                        <select
                          value={contractForm.contractType}
                          onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        >
                          <option value="CDI">CDI</option>
                          <option value="CDD">CDD</option>
                          <option value="VACATAIRE">Vacataire</option>
                          <option value="STAGIAIRE">Stagiaire</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Durée / Date de Fin</label>
                        <input
                          type="text"
                          placeholder="Ex: Année scolaire 2026-2027"
                          value={contractForm.durationEndDate}
                          onChange={(e) => setContractForm({ ...contractForm, durationEndDate: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Salaire Mensuel (FCFA) *</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Saisir le montant du salaire"
                          value={contractForm.baseSalary}
                          onChange={(e) => setContractForm({ ...contractForm, baseSalary: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Indemnités & Primes (FCFA)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Ex: Total transport et primes"
                          value={contractForm.transportAllowance}
                          onChange={(e) => setContractForm({ ...contractForm, transportAllowance: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SOUS-CAS C : COLLÈGE ET LYCÉE */}
                {(contractForm.wageType === 'ENSEIGNANT_COLLEGE_LYCEE' || contractForm.wageType === 'HORAIRE') && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
                    <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                      Fiche Enseignant Collège & Lycée
                    </h3>

                    {/* Choix de la catégorie */}
                    <div className="space-y-2 text-xs">
                      <label className="block text-slate-300 font-semibold">Choix de la Catégorie d'Enseignement *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setContractForm({ ...contractForm, teachingCategory: 'COLLEGE_ONLY' })}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                            contractForm.teachingCategory === 'COLLEGE_ONLY'
                              ? 'bg-purple-950/80 border-purple-500 text-white font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          Collège uniquement
                        </button>

                        <button
                          type="button"
                          onClick={() => setContractForm({ ...contractForm, teachingCategory: 'LYCEE_ONLY' })}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                            contractForm.teachingCategory === 'LYCEE_ONLY'
                              ? 'bg-purple-950/80 border-purple-500 text-white font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          Lycée uniquement
                        </button>

                        <button
                          type="button"
                          onClick={() => setContractForm({ ...contractForm, teachingCategory: 'COLLEGE_AND_LYCEE' })}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                            contractForm.teachingCategory === 'COLLEGE_AND_LYCEE'
                              ? 'bg-purple-950/80 border-purple-500 text-white font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          Collège et lycée
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Type de Contrat</label>
                        <select
                          value={contractForm.contractType}
                          onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        >
                          <option value="VACATAIRE">Vacataire</option>
                          <option value="CDD">CDD</option>
                          <option value="CDI">CDI</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Durée du Contrat</label>
                        <input
                          type="text"
                          placeholder="Ex: 9 mois"
                          value={contractForm.durationEndDate}
                          onChange={(e) => setContractForm({ ...contractForm, durationEndDate: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        />
                      </div>
                    </div>

                    {/* Taux Horaires selon Catégorie */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-800">
                      {(contractForm.teachingCategory === 'COLLEGE_ONLY' || contractForm.teachingCategory === 'COLLEGE_AND_LYCEE') && (
                        <div>
                          <label className="block text-purple-300 font-semibold mb-1">Taux Horaire Collège (FCFA/h) *</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Saisir taux Collège"
                            value={contractForm.collegeHourlyRate}
                            onChange={(e) => setContractForm({ ...contractForm, collegeHourlyRate: e.target.value })}
                            className="w-full bg-slate-950 border border-purple-500/40 rounded-xl p-2.5 text-purple-200 font-mono font-bold text-sm"
                          />
                        </div>
                      )}

                      {(contractForm.teachingCategory === 'LYCEE_ONLY' || contractForm.teachingCategory === 'COLLEGE_AND_LYCEE') && (
                        <div>
                          <label className="block text-purple-300 font-semibold mb-1">Taux Horaire Lycée (FCFA/h) *</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Saisir taux Lycée"
                            value={contractForm.lyceeHourlyRate}
                            onChange={(e) => setContractForm({ ...contractForm, lyceeHourlyRate: e.target.value })}
                            className="w-full bg-slate-950 border border-purple-500/40 rounded-xl p-2.5 text-purple-200 font-mono font-bold text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Affichage des Heures Pointées du Mois en Cours */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center space-x-2 text-slate-400 font-semibold">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        <span>Suivi des Heures Émargées du Mois ({selectedPeriod})</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase">Total Heures Pointées</p>
                          <p className="text-base font-bold text-white font-mono mt-0.5">
                            {teacherPointedHours.total} <span className="text-xs font-normal text-slate-400">heures</span>
                          </p>
                        </div>

                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase">Collège (Est.)</p>
                          <p className="text-base font-bold text-purple-300 font-mono mt-0.5">
                            {teacherPointedHours.college} h
                          </p>
                        </div>

                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase">Lycée (Est.)</p>
                          <p className="text-base font-bold text-purple-300 font-mono mt-0.5">
                            {teacherPointedHours.lycee} h
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Observations & Remarques */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Observations & Mentions Particulières du Promoteur
              </label>
              <textarea
                rows={3}
                value={contractForm.observations}
                onChange={(e) => setContractForm({ ...contractForm, observations: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ex: Prime exceptionnelle accordée sur objectifs, horaires spécifiques..."
              />
            </div>

            {/* Actions de fin */}
            <div className="flex items-center justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => setSelectedParamForEdit(null)}
                className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={actionLoading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Enregistrement...' : 'Enregistrer le Contrat & la Rémunération'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Création Fiche de Paie Manuelle */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-lg">Établissement d'une Fiche de Paie</h3>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayroll} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sélectionner un employé existant (facultatif)
                </label>
                <select
                  onChange={(e) => handleSelectStaff(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-sm rounded-xl p-2.5 text-white"
                >
                  <option value="">Sélectionner dans le personnel...</option>
                  {usersList.map((u, uIdx) => (
                    <option key={u.id ? `${u.id}-${uIdx}` : `user-opt-${uIdx}`} value={u.id}>
                      {u.full_name} ({u.role} - {u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Matricule *</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeCode}
                    onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono uppercase"
                    placeholder="EMP-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nom & Prénom *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Fonction *</label>
                  <input
                    type="text"
                    required
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Service *</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                  >
                    {['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES'].includes(user?.role || '') && (
                      <option value="ENSEIGNEMENT">Corps Enseignant</option>
                    )}
                    <option value="ADMINISTRATION">Administration</option>
                    <option value="SURVEILLANCE">Surveillance Générale</option>
                    <option value="TECHNIQUE">Personnel Technique</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">
                  Éléments de Rémunération (FCFA)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Salaire de base *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.baseSalary}
                      onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Primes & Indemnités</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.bonuses}
                      onChange={(e) => setFormData({ ...formData, bonuses: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Retenues / Avances</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono text-rose-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Enregistrement...' : 'Enregistrer la Fiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Décaissement / Paiement */}
      {selectedRecordForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Règlement du Salaire</h3>
              <button onClick={() => setSelectedRecordForPay(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisbursePay} className="p-5 space-y-4">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <p className="text-xs text-slate-400">Salarié :</p>
                <p className="text-sm font-bold text-white">{selectedRecordForPay.full_name}</p>
                <p className="text-xs text-slate-400 mt-2">Montant net à décaisser :</p>
                <p className="text-xl font-black text-emerald-400 font-mono">
                  {selectedRecordForPay.net_amount.toLocaleString()} FCFA
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Date de paiement *</label>
                <input
                  type="date"
                  required
                  value={payData.paymentDate}
                  onChange={(e) => setPayData({ ...payData, paymentDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">Mode de règlement *</label>
                <select
                  value={payData.paymentMethod}
                  onChange={(e) => setPayData({ ...payData, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                >
                  <option value="ESPECES">Espèces (Caisse)</option>
                  <option value="VIREMENT">Virement bancaire</option>
                  <option value="AIRTEL_MONEY">Airtel Money</option>
                  <option value="MTN_MOMO">MTN Mobile Money</option>
                  <option value="CHEQUE">Chèque</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedRecordForPay(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {actionLoading ? 'Traitement...' : 'Confirmer le Décaissement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Impression Bulletin de Paie */}
      {selectedRecordForSlip && establishment && (
        <PrintablePayslip
          record={selectedRecordForSlip}
          establishment={establishment}
          onClose={() => setSelectedRecordForSlip(null)}
        />
      )}
    </div>
  );
};
