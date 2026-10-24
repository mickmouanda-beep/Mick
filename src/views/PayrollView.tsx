import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Printer,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  UserCheck,
  Building,
  ChevronRight,
  TrendingUp,
  Download,
  X,
  CreditCard,
  Zap,
  Sliders,
  Sparkles
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

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRecordForPay, setSelectedRecordForPay] = useState<PayrollRecord | null>(null);
  const [selectedRecordForSlip, setSelectedRecordForSlip] = useState<PayrollRecord | null>(null);
  const [selectedParamForEdit, setSelectedParamForEdit] = useState<StaffSalaryParameter | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    userId: '',
    employeeCode: '',
    fullName: '',
    jobTitle: '',
    department: 'ENSEIGNEMENT',
    contractType: 'CDI',
    hireDate: '',
    period: selectedPeriod,
    baseSalary: 150000,
    bonuses: 0,
    overtimeHours: 0,
    overtimeAmount: 0,
    advances: 0,
    deductions: 0,
    notes: '',
  });

  // Salary parameter form state
  const [paramEditForm, setParamEditForm] = useState({
    wageType: 'MENSUEL_FIXE' as 'MENSUEL_FIXE' | 'HORAIRE',
    baseSalary: 150000,
    hourlyRate: 3500,
    transportAllowance: 25000,
    responsibilityBonus: 15000,
    seniorityBonus: 0,
    overtimeRate: 4000,
  });

  // Pay modal state
  const [payData, setPayData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'ESPECES',
    transactionRef: '',
  });

  const isComptable = user?.role === 'COMPTABLE';
  const isDirection = user?.role === 'DIRECTEUR_GENERAL' || user?.role === 'PROMOTEUR';

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
    setIsParamsLoading(true);
    try {
      const data = await api.getStaffSalaryParameters();
      setSalaryParams(data);
    } catch (err: any) {
      console.error('Erreur chargement paramètres salariaux:', err);
    } finally {
      setIsParamsLoading(false);
    }
  };

  const handleAutoCalculatePayroll = async () => {
    setIsAutoCalculating(true);
    setErrorMsg(null);
    try {
      const res = await api.autoCalculatePayroll({ period: selectedPeriod });
      setSuccessMsg(res.message || 'Calcul automatique de la paie effectué avec succès.');
      fetchPayroll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du calcul automatique de la paie');
    } finally {
      setIsAutoCalculating(false);
    }
  };

  const handleSaveSalaryParam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParamForEdit) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.updateStaffSalaryParameter(selectedParamForEdit.user_id, paramEditForm);
      setSuccessMsg(`Paramètres salariaux enregistrés pour ${selectedParamForEdit.full_name || 'le salarié'}.`);
      setSelectedParamForEdit(null);
      fetchSalaryParams();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la mise à jour des paramètres');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
    fetchUsers();
    if (activeTab === 'parameters') {
      fetchSalaryParams();
    }
  }, [selectedPeriod, filterDepartment, filterStatus, activeTab]);

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
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.createPayrollRecord({
        ...formData,
        period: selectedPeriod,
      });
      setSuccessMsg('Fiche de paie enregistrée avec succès.');
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
  const totalBase = records.reduce((acc, r) => acc + (r.base_salary || 0), 0);
  const totalGross = records.reduce((acc, r) => acc + (r.gross_amount || 0), 0);
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

          {(isComptable || isDirection) && (
            <button
              onClick={handleAutoCalculatePayroll}
              disabled={isAutoCalculating}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              title="Calculer automatiquement les salaires du mois selon les contrats et les pointages d'assiduité réels"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>{isAutoCalculating ? 'Calcul en cours...' : 'Calculer Automatiquement la Paie'}</span>
            </button>
          )}

          {(isComptable || isDirection) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Fiche Manuelle</span>
            </button>
          )}
        </div>
      </div>

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

        <button
          onClick={() => setActiveTab('parameters')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer ${
            activeTab === 'parameters'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span>2. Grille Salariale & Contrats (Promoteur & Direction)</span>
        </button>
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
        <div className="p-4 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-200 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
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
                  <option value="ENSEIGNEMENT">Corps Enseignant</option>
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
                          Cliquez sur "Calculer Automatiquement la Paie" ou "Nouvelle Fiche Manuelle".
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => {
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
                        <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{r.full_name}</div>
                            <div className="text-xs text-slate-500 font-mono">{r.employee_code} • {r.contract_type}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-200">{r.job_title}</div>
                            <div className="text-xs text-slate-500">{r.department}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-300">
                            {r.base_salary.toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4 font-mono text-emerald-400">
                            +{(r.bonuses + r.overtime_amount).toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4 font-mono text-rose-400">
                            -{(r.advances + r.deductions).toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white text-base">
                            {r.net_amount.toLocaleString()} FCFA
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge}`}>
                              {statusLabel}
                            </span>
                            {r.payment_date && (
                              <div className="text-[10px] text-slate-400 mt-0.5">Payé le {r.payment_date}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {/* Print bulletin button */}
                              <button
                                onClick={() => setSelectedRecordForSlip(r)}
                                title="Imprimer le bulletin officiel de salaire"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Submit button for Comptable */}
                              {(r.status === 'BROUILLON' || r.status === 'CALCULE') && isComptable && (
                                <button
                                  onClick={() => handleSubmitForValidation(r.id)}
                                  className="text-xs bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/40 transition-colors cursor-pointer"
                                  title="Soumettre pour validation hiérarchique"
                                >
                                  Soumettre
                                </button>
                              )}

                              {/* Validate button for DG / Promoteur */}
                              {(r.status === 'EN_ATTENTE_VALIDATION' || r.status === 'CALCULE') && isDirection && (
                                <button
                                  onClick={() => handleValidateSlip(r.id)}
                                  className="text-xs bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-emerald-500/40 transition-colors cursor-pointer font-semibold"
                                  title="Valider officiellement le bulletin"
                                >
                                  Valider
                                </button>
                              )}

                              {/* Pay button */}
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

      {/* VUE 2 : GRILLE DES SALAIRES & CONTRATS DU PERSONNEL */}
      {activeTab === 'parameters' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div>
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Sliders className="w-4 h-4" />
                <span>Paramétrage Salarial • Promoteur & Direction Générale</span>
              </div>
              <h2 className="text-base font-extrabold text-white">
                Contrats, Modes de Rémunération & Barèmes Salariaux du Personnel
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configuration des salaires mensuels fixes, des taux horaires d'enseignement (vacataires), primes de transport, responsabilité et heures supp.
              </p>
            </div>

            <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              Total Personnel Configuré : <span className="text-white font-bold">{salaryParams.length}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Salarié & Matricule</th>
                    <th className="py-3 px-4">Poste / Rôle</th>
                    <th className="py-3 px-4">Mode Rémunération</th>
                    <th className="py-3 px-4">Salaire Base / Taux Horaire</th>
                    <th className="py-3 px-4">Indemnité Transport</th>
                    <th className="py-3 px-4">Prime Responsabilité</th>
                    <th className="py-3 px-4">Prime Ancienneté</th>
                    <th className="py-3 px-4">Taux Heure Supp</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isParamsLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        Chargement des paramètres de rémunération...
                      </td>
                    </tr>
                  ) : salaryParams.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        Aucun paramètre salarial enregistré.
                      </td>
                    </tr>
                  ) : (
                    salaryParams.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-bold text-white">
                          {p.full_name}
                          <div className="text-xs text-slate-500 font-mono">{p.employee_code || 'EMP-CONGO'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 text-xs">
                          {p.role || 'Personnel'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              p.wage_type === 'MENSUEL_FIXE'
                                ? 'bg-blue-950/60 text-blue-300 border-blue-500/50'
                                : 'bg-purple-950/60 text-purple-300 border-purple-500/50'
                            }`}
                          >
                            {p.wage_type === 'MENSUEL_FIXE' ? 'Mensuel Fixe' : 'Taux Horaire (Vacataire)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-white">
                          {p.wage_type === 'MENSUEL_FIXE'
                            ? `${p.base_salary.toLocaleString()} FCFA / mois`
                            : `${p.hourly_rate.toLocaleString()} FCFA / heure`}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {p.transport_allowance.toLocaleString()} FCFA
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          +{p.responsibility_bonus.toLocaleString()} FCFA
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-400">
                          +{p.seniority_bonus.toLocaleString()} FCFA
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-300">
                          {p.overtime_rate.toLocaleString()} FCFA/h
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(isDirection || isComptable) && (
                            <button
                              onClick={() => {
                                setSelectedParamForEdit(p);
                                setParamEditForm({
                                  wageType: p.wage_type,
                                  baseSalary: p.base_salary,
                                  hourlyRate: p.hourly_rate,
                                  transportAllowance: p.transport_allowance,
                                  responsibilityBonus: p.responsibility_bonus,
                                  seniorityBonus: p.seniority_bonus,
                                  overtimeRate: p.overtime_rate,
                                });
                              }}
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                            >
                              Paramétrer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Création Fiche de Paie */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-lg">Établissement d'une Fiche de Paie</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayroll} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Sélectionner un employé existant (facultatif pour préremplir)
                </label>
                <select
                  onChange={(e) => handleSelectStaff(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-sm rounded-xl p-2.5 text-white"
                >
                  <option value="">Sélectionner dans le personnel...</option>
                  {usersList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.role} - {u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Matricule Professionnel *
                  </label>
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom & Prénom du Salarié *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                    placeholder="Ex: NGOUABI Jean-Paul"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Fonction / Poste *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                    placeholder="Ex: Professeur de Mathématiques"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Service / Département *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                  >
                    <option value="ENSEIGNEMENT">Corps Enseignant</option>
                    <option value="ADMINISTRATION">Administration</option>
                    <option value="SURVEILLANCE">Surveillance Générale</option>
                    <option value="TECHNIQUE">Personnel Technique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Type de Contrat
                  </label>
                  <select
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="VACATAIRE">Vacataire</option>
                    <option value="STAGIAIRE">Stagiaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Période de Paie (Mois) *
                  </label>
                  <input
                    type="month"
                    required
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white"
                  />
                </div>
              </div>

              {/* Éléments Financiers */}
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
                    <label className="block text-xs text-slate-400 mb-1">Montant Heures Sup.</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.overtimeAmount}
                      onChange={(e) => setFormData({ ...formData, overtimeAmount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Avances sur Salaire</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.advances}
                      onChange={(e) => setFormData({ ...formData, advances: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono text-rose-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Retenues / Cotisations</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.deductions}
                      onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-sm text-white font-mono text-rose-400"
                    />
                  </div>

                  <div className="bg-slate-900 border border-indigo-500/30 p-2.5 rounded-xl flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Net Calculé</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {Math.max(
                        0,
                        formData.baseSalary +
                          formData.bonuses +
                          formData.overtimeAmount -
                          formData.advances -
                          formData.deductions
                      ).toLocaleString()}{' '}
                      FCFA
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observations / Mentions particulières
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white placeholder-slate-600"
                  placeholder="Ex: Prime de rendement accordée par la direction..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-700 cursor-pointer"
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
              <button
                onClick={() => setSelectedRecordForPay(null)}
                className="text-slate-400 hover:text-white"
              >
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

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Référence de transaction / Numéro de chèque
                </label>
                <input
                  type="text"
                  value={payData.transactionRef}
                  onChange={(e) => setPayData({ ...payData, transactionRef: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white font-mono"
                  placeholder="Ex: VIR-2026-09823"
                />
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

      {/* Modal Impression Professionnelle du Bulletin de Paie */}
      {selectedRecordForSlip && establishment && (
        <PrintablePayslip
          record={selectedRecordForSlip}
          establishment={establishment}
          onClose={() => setSelectedRecordForSlip(null)}
        />
      )}

      {/* Modal Paramétrage Salarial Individuel */}
      {selectedParamForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Paramètres Salariaux — {selectedParamForEdit.full_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedParamForEdit(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalaryParam} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">Mode de Rémunération *</label>
                <select
                  value={paramEditForm.wageType}
                  onChange={(e) => setParamEditForm({ ...paramEditForm, wageType: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                >
                  <option value="MENSUEL_FIXE">Mensuel Fixe (Personnel titulaire / administratif)</option>
                  <option value="HORAIRE">Taux Horaire (Vacataire / Enseignant payé à l'heure dispensée)</option>
                </select>
              </div>

              {paramEditForm.wageType === 'MENSUEL_FIXE' ? (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Salaire de Base Mensuel (FCFA) *</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={paramEditForm.baseSalary}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-sm"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Taux Horaire par Heure Dispensée (FCFA/h) *</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={paramEditForm.hourlyRate}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-purple-300 font-mono text-sm font-bold"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Multiplié automatiquement par les heures effectives émargées du mois lors du calcul.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Indemnité de Transport (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={paramEditForm.transportAllowance}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, transportAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Prime de Responsabilité (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={paramEditForm.responsibilityBonus}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, responsibilityBonus: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Prime d'Ancienneté (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={paramEditForm.seniorityBonus}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, seniorityBonus: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Taux Heures Supp. (FCFA/h)</label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={paramEditForm.overtimeRate}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, overtimeRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-300 font-mono font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedParamForEdit(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Enregistrement...' : 'Enregistrer les Paramètres'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
