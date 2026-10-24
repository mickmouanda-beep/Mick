import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  Building,
  Calendar,
  X,
  FileText,
  Printer
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { AdministrativeDecision } from '../types.ts';

export const DecisionsView: React.FC = () => {
  const { user } = useAuth();
  const [decisions, setDecisions] = useState<AdministrativeDecision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [filterService, setFilterService] = useState<string>('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<AdministrativeDecision | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    subject: '',
    requesterName: user?.full_name || '',
    service: 'ADMINISTRATION',
    requestDate: new Date().toISOString().split('T')[0],
    description: '',
    supportingDocs: '',
    assignedTo: '',
    deadline: '',
  });

  // Decision Verdict State
  const [verdictData, setVerdictData] = useState({
    decision: 'APPROUVE' as 'APPROUVE' | 'REFUSE' | 'EN_REVISION',
    reason: '',
    assignedTo: '',
    deadline: '',
    status: 'EN_COURS' as 'OUVERT' | 'EN_COURS' | 'CLOTURE',
  });

  const isDGOrPromoteur = user?.role === 'DIRECTEUR_GENERAL' || user?.role === 'PROMOTEUR';

  const fetchDecisions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDecisions();
      setDecisions(data);
    } catch (err: any) {
      console.error('Erreur chargement décisions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api.createDecision(formData);
      setSuccessMsg('Dossier de demande / décision transmis à la direction générale.');
      setIsCreateModalOpen(false);
      setFormData({
        subject: '',
        requesterName: user?.full_name || '',
        service: 'ADMINISTRATION',
        requestDate: new Date().toISOString().split('T')[0],
        description: '',
        supportingDocs: '',
        assignedTo: '',
        deadline: '',
      });
      fetchDecisions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecision) return;
    setActionLoading(true);
    try {
      await api.updateDecision(selectedDecision.id, verdictData);
      setSuccessMsg('Décision de direction enregistrée et notifiée.');
      setSelectedDecision(null);
      fetchDecisions();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDecisions = decisions.filter((d) => {
    if (filterDecision !== 'ALL' && d.decision !== filterDecision) return false;
    if (filterService !== 'ALL' && d.service !== filterService) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        d.subject.toLowerCase().includes(term) ||
        d.requester_name.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>Direction Générale • Registre des Décisions Administratives</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Coordination & Décisions de Direction
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            Validation des demandes administratives, arrêtés de gestion, réclamations et suivi des responsabilités.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Requête / Décision</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-200 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Rechercher par objet, demandeur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
          >
            <option value="ALL">Toutes les décisions</option>
            <option value="EN_ATTENTE">En attente d'arbitrage</option>
            <option value="APPROUVE">Approuvé</option>
            <option value="REFUSE">Refusé</option>
            <option value="EN_REVISION">En révision</option>
          </select>

          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2"
          >
            <option value="ALL">Tous les services</option>
            <option value="PEDAGOGIE">Direction des Études</option>
            <option value="SCOLARITE">Gestion Scolaire</option>
            <option value="COMPTABILITE">Comptabilité</option>
            <option value="DISCIPLINE">Surveillance Générale</option>
            <option value="ADMINISTRATION">Administration Générale</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
            Chargement des dossiers de décision...
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
            <FileCheck2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-400">Aucun dossier de décision répertorié.</p>
            <p className="text-xs text-slate-600 mt-1">
              Les demandes de direction, requêtes de personnel ou arbitrages administratifs apparaîtront ici.
            </p>
          </div>
        ) : (
          filteredDecisions.map((d) => {
            const badge = {
              EN_ATTENTE: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
              APPROUVE: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
              REFUSE: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
              EN_REVISION: 'bg-blue-950/60 text-blue-300 border-blue-500/40',
            }[d.decision] || 'bg-slate-800 text-slate-300 border-slate-700';

            const label = {
              EN_ATTENTE: 'En attente',
              APPROUVE: 'Approuvé',
              REFUSE: 'Refusé',
              EN_REVISION: 'En révision',
            }[d.decision] || d.decision;

            return (
              <div
                key={d.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-md">
                      {d.service}
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge}`}>
                      {label}
                    </span>
                    <span className="text-xs text-slate-500">Dossier: {d.status}</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Date : {d.request_date}</span>
                </div>

                <h3 className="font-bold text-white text-base leading-snug">{d.subject}</h3>
                <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  {d.description}
                </p>

                {d.reason && (
                  <div className="mt-3 p-3 bg-slate-950/80 border border-indigo-500/30 rounded-xl text-xs">
                    <span className="font-bold text-indigo-400 block mb-0.5">Décision et motif de la direction :</span>
                    <p className="text-slate-200">{d.reason}</p>
                    {d.assigned_to && (
                      <p className="text-slate-400 mt-1">
                        Responsable d'exécution : <strong className="text-slate-200">{d.assigned_to}</strong> (Échéance : {d.deadline || 'Non précisée'})
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    Demandeur : <strong className="text-slate-200">{d.requester_name}</strong>
                  </div>

                  {isDGOrPromoteur && (
                    <button
                      onClick={() => {
                        setSelectedDecision(d);
                        setVerdictData({
                          decision: (d.decision as any) || 'APPROUVE',
                          reason: d.reason || '',
                          assignedTo: d.assigned_to || '',
                          deadline: d.deadline || '',
                          status: (d.status as any) || 'EN_COURS',
                        });
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md"
                    >
                      Arbitrer / Statuer
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Création Demande / Décision */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white text-base">Nouvelle Requête / Projet de Décision</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDecision} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Objet de la requête *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs sm:text-sm text-white"
                  placeholder="Ex: Demande de remplacement d'un professeur d'Anglais"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Demandeur *</label>
                  <input
                    type="text"
                    required
                    value={formData.requesterName}
                    onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Service Concerné *</label>
                  <select
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="PEDAGOGIE">Direction des Études</option>
                    <option value="SCOLARITE">Gestion Scolaire</option>
                    <option value="COMPTABILITE">Comptabilité</option>
                    <option value="DISCIPLINE">Surveillance Générale</option>
                    <option value="ADMINISTRATION">Administration Générale</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description détaillée *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  placeholder="Détails du motif, justification et impact..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Responsable d'Exécution prévu</label>
                  <input
                    type="text"
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                    placeholder="Ex: Directeur des Études"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Date d'Échéance souhaitée</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Soumission...' : 'Transmettre la Demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Arbitrage par la Direction */}
      {selectedDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white text-base">Arbitrage de la Direction Générale</h3>
              <button
                onClick={() => setSelectedDecision(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVerdict} className="p-5 space-y-3.5">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <p className="font-bold text-white mb-1">{selectedDecision.subject}</p>
                <p className="text-slate-400">{selectedDecision.description}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Décision de Direction *</label>
                <select
                  value={verdictData.decision}
                  onChange={(e) => setVerdictData({ ...verdictData, decision: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-semibold"
                >
                  <option value="APPROUVE">APPROUVÉ</option>
                  <option value="REFUSE">REFUSÉ</option>
                  <option value="EN_REVISION">EN RÉVISION</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Motif explicatif de la décision *</label>
                <textarea
                  required
                  rows={3}
                  value={verdictData.reason}
                  onChange={(e) => setVerdictData({ ...verdictData, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  placeholder="Justification administrative ou budgétaire..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Chargé de l'exécution</label>
                  <input
                    type="text"
                    value={verdictData.assignedTo}
                    onChange={(e) => setVerdictData({ ...verdictData, assignedTo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Statut du dossier</label>
                  <select
                    value={verdictData.status}
                    onChange={(e) => setVerdictData({ ...verdictData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  >
                    <option value="OUVERT">Ouvert</option>
                    <option value="EN_COURS">En cours d'exécution</option>
                    <option value="CLOTURE">Clôturé</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedDecision(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Enregistrement...' : 'Valider la Décision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
