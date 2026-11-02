import React, { useState, useEffect } from 'react';
import { Sliders, X } from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StaffSalaryParameter } from '../types.ts';

export const ContractsSalariesView: React.FC = () => {
  const { user } = useAuth();
  const [salaryParams, setSalaryParams] = useState<StaffSalaryParameter[]>([]);
  const [isParamsLoading, setIsParamsLoading] = useState(false);
  const [selectedParamForEdit, setSelectedParamForEdit] = useState<StaffSalaryParameter | null>(null);
  const [paramEditForm, setParamEditForm] = useState({
    teachingLevel: 'PRESCOLAIRE' as 'PRESCOLAIRE' | 'PRIMAIRE' | 'COLLEGE' | 'LYCEE' | '',
    wageType: 'MENSUEL_FIXE' as 'MENSUEL_FIXE' | 'HORAIRE',
    baseSalary: 0,
    hourlyRate: 0,
    transportAllowance: 20000,
    responsibilityBonus: 0,
    seniorityBonus: 0,
    overtimeRate: 4000,
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isPromoteur = user?.role === 'PROMOTEUR';

  useEffect(() => {
    fetchSalaryParams();
  }, [user]);

  const fetchSalaryParams = async () => {
    setIsParamsLoading(true);
    try {
      const data = await api.getStaffSalaryParameters();
      console.log('Fetched salary parameters:', data);
      const sanitized = (data || []).map((p: any, idx: number) => {
        const uniqueId = p.user_id || p.id || `staff-${idx}-${Date.now()}`;
        const codeNum = String(idx + 1).padStart(3, '0');
        const uniqueEmployeeCode = p.employee_code && p.employee_code !== 'EMP-CONGO'
          ? p.employee_code
          : `EMP-${codeNum}`;
        return {
          ...p,
          id: p.id && p.id !== '' ? p.id : `SAL-${uniqueId}`,
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

  const handleSaveSalaryParam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPromoteur) {
      setErrorMsg("Action réservée exclusivement au Promoteur.");
      return;
    }
    if (!selectedParamForEdit) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.updateStaffSalaryParameter(selectedParamForEdit.user_id || selectedParamForEdit.id, paramEditForm);
      setSuccessMsg(`Paramètres salariaux enregistrés pour ${selectedParamForEdit.full_name}.`);
      setSelectedParamForEdit(null);
      fetchSalaryParams();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la mise à jour des paramètres');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>Contrats & Salaires • Promoteur</span>
          </div>
          <h2 className="text-base font-extrabold text-white">Gestion Individuelle des Contrats & Salaires</h2>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Salarié</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Salaire / Taux</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {salaryParams.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-white font-bold">{p.full_name}</td>
                  <td className="py-3 px-4 text-slate-300">{p.role}</td>
                  <td className="py-3 px-4">{p.wage_type === 'MENSUEL_FIXE' ? 'Mensuel' : 'Horaire'}</td>
                  <td className="py-3 px-4 font-mono">
                    {p.wage_type === 'MENSUEL_FIXE' ? `${p.base_salary} FCFA` : `${p.hourly_rate} FCFA/h`}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isPromoteur ? (
                      <button
                        onClick={() => {
                          setSelectedParamForEdit(p);
                          const tLevel = (p as any).teaching_level || '';
                          setParamEditForm({
                            teachingLevel: tLevel,
                            wageType: p.wage_type === 'HORAIRE' ? 'HORAIRE' : 'MENSUEL_FIXE',
                            baseSalary: p.base_salary || 0,
                            hourlyRate: p.hourly_rate || 0,
                            transportAllowance: p.transport_allowance || 0,
                            responsibilityBonus: p.responsibility_bonus || 0,
                            seniorityBonus: p.seniority_bonus || 0,
                            overtimeRate: p.overtime_rate || 4000,
                          });
                        }}
                        className="bg-indigo-600 px-3 py-1 rounded-lg text-white text-xs font-bold"
                      >
                        Modifier
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">Lecture seule</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {selectedParamForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Paramètres Salariaux — {selectedParamForEdit.full_name}</h3>
              <button onClick={() => setSelectedParamForEdit(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSalaryParam} className="p-5 space-y-4 text-xs">
              {selectedParamForEdit.role === 'ENSEIGNANT' ? (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Niveau d'Enseignement *</label>
                  <select
                    value={paramEditForm.teachingLevel}
                    onChange={(e) => {
                      const level = e.target.value;
                      const isHourly = level === 'COLLEGE' || level === 'LYCEE';
                      setParamEditForm({
                        ...paramEditForm,
                        teachingLevel: level as any,
                        wageType: isHourly ? 'HORAIRE' : 'MENSUEL_FIXE',
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-semibold"
                    required
                  >
                    <option value="PRESCOLAIRE">Préscolaire (Mode : Mensuel Fixe)</option>
                    <option value="PRIMAIRE">Primaire (Mode : Mensuel Fixe)</option>
                    <option value="COLLEGE">Collège (Mode : Taux Horaire)</option>
                    <option value="LYCEE">Lycée (Mode : Taux Horaire)</option>
                  </select>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mode de Rémunération (Administratif)</span>
                  <span className="text-sm font-bold text-white">Mensuel Fixe</span>
                </div>
              )}

              {paramEditForm.wageType === 'MENSUEL_FIXE' ? (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Salaire Mensuel de Base (FCFA) *</label>
                  <input
                    type="number"
                    value={paramEditForm.baseSalary}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, baseSalary: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-sm font-bold"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Taux Horaire (FCFA/h) *</label>
                  <input
                    type="number"
                    value={paramEditForm.hourlyRate}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, hourlyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-purple-300 font-mono text-sm font-bold"
                    required
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Indemnité de Transport (FCFA)</label>
                  <input
                    type="number"
                    value={paramEditForm.transportAllowance}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, transportAllowance: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">Prime de Responsabilité (FCFA)</label>
                  <input
                    type="number"
                    value={paramEditForm.responsibilityBonus}
                    onChange={(e) => setParamEditForm({ ...paramEditForm, responsibilityBonus: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setSelectedParamForEdit(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 cursor-pointer">Annuler</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
