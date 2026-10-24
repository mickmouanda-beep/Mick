import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Clock,
  BookOpen,
  DollarSign,
  Calendar,
  FileText,
  Printer,
  ChevronRight,
  Send,
  Bell,
  MessageSquare,
  ShieldCheck,
  User,
  Info,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Download,
  AlertTriangle,
  Phone
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { StudentView } from './StudentView.tsx';
import { SchoolAnnouncement } from '../types.ts';

export const ParentView: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'child-space' | 'finance-summary' | 'contact-school' | 'announcements'>('child-space');

  // Contact / Requête Form
  const [contactForm, setContactForm] = useState({
    category: 'DEMANDE_RDV',
    subject: '',
    description: '',
    priority: 'NORMALE',
  });
  const [submittingContact, setSubmittingContact] = useState(false);
  const [contactSuccessMsg, setContactSuccessMsg] = useState('');
  const [contactErrorMsg, setContactErrorMsg] = useState('');

  const fetchData = async (childIdToSelect?: string) => {
    setLoading(true);
    try {
      const res = await api.getParentPortalData(childIdToSelect);
      setChildren(res.children || []);
      setAnnouncements(res.announcements || []);
      if (res.children && res.children.length > 0) {
        setSelectedChildId(childIdToSelect || res.selectedChildId || res.children[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement Espace Parent:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSelectChild = (childId: string) => {
    setSelectedChildId(childId);
  };

  const handleSendContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingContact(true);
    setContactSuccessMsg('');
    setContactErrorMsg('');

    try {
      const selectedChild = children.find((c) => c.id === selectedChildId);
      const fullDesc = `[Enfant concerné : ${selectedChild ? `${selectedChild.first_name} ${selectedChild.last_name} (${selectedChild.class_name || ''})` : 'Général'}]\n\n${contactForm.description}`;

      await api.createComplaint({
        personConcerned: selectedChild ? `${selectedChild.first_name} ${selectedChild.last_name}` : 'Direction / Scolarité',
        category: contactForm.category,
        description: fullDesc,
        priority: contactForm.priority,
      });

      setContactSuccessMsg('Votre message / demande a été transmis avec succès au secrétariat de direction.');
      setContactForm({
        category: 'DEMANDE_RDV',
        subject: '',
        description: '',
        priority: 'NORMALE',
      });
    } catch (err: any) {
      setContactErrorMsg(err.message || 'Erreur lors de la transmission.');
    } finally {
      setSubmittingContact(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-3 text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Chargement du portail famille et tuteurs...</p>
        </div>
      </div>
    );
  }

  const selectedChild = children.find((c) => c.id === selectedChildId) || children[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* En-tête Espace Parent / Tuteur Légal */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Portail Famille & Tuteurs Légaux • Eco. Ges.</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              Bienvenue, {user?.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Suivi pédagogique, assiduité, devoirs, scolarité et communication directe avec les enseignants.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-700 rounded-xl px-3.5 py-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 font-medium">Accès Parent Certifié</span>
          </div>
        </div>

        {/* Sélecteur Multi-Enfants (si le parent a plusieurs enfants scolarisés) */}
        {children.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Vos enfants scolarisés ({children.length}) :
            </div>
            <div className="flex flex-wrap gap-2.5">
              {children.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <button
                    key={child.id}
                    onClick={() => handleSelectChild(child.id)}
                    className={`flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 text-[11px] font-black">
                      {child.first_name[0]}{child.last_name[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-bold">{child.first_name} {child.last_name}</div>
                      <div className={`text-[10px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {child.class_name || 'Classe non assignée'} • Matr. {child.matricule}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Onglets Espace Parent */}
      <div className="flex border-b border-slate-800 overflow-x-auto pb-px space-x-2">
        {[
          { id: 'child-space', label: `Dossier de ${selectedChild ? selectedChild.first_name : 'l\'enfant'}`, icon: GraduationCap },
          { id: 'finance-summary', label: 'Point Financier & Reçus', icon: DollarSign },
          { id: 'contact-school', label: 'Contacter l\'Établissement / RDV', icon: MessageSquare },
          { id: 'announcements', label: 'Circulaires & Convocations', icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-indigo-400 border-t-2 border-indigo-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. ONGLET : DOSSIER SCOLAIRE COMPLET DE L'ENFANT SÉLECTIONNÉ */}
      {activeTab === 'child-space' && selectedChild && (
        <div className="space-y-6">
          <StudentView studentIdOverride={selectedChild.id} readOnlyBanner={false} />
        </div>
      )}

      {/* 2. ONGLET : POINT FINANCIER & REÇUS POUR LA FAMILLE */}
      {activeTab === 'finance-summary' && (
        <div className="space-y-6">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs text-slate-300">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Gestion des frais de scolarité :</span> Retrouvez le statut comptable de chacun de vos enfants, les versements validés par la caisse et téléchargez vos reçus officiels.
            </div>
          </div>

          <div className="space-y-4">
            {children.map((ch) => (
              <div key={ch.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-700/50 flex items-center justify-center font-bold text-indigo-300">
                      {ch.first_name[0]}{ch.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">{ch.first_name} {ch.last_name}</h3>
                      <span className="text-xs text-slate-400">Classe : {ch.class_name || '—'} • Matricule : {ch.matricule}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedChildId(ch.id);
                      setActiveTab('child-space');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1"
                  >
                    <span>Voir le dossier complet</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70">
                    <span className="text-[11px] text-slate-400 block">Frais Annuels Exigibles</span>
                    <span className="text-base font-bold text-white font-mono mt-0.5 block">220 000 FCFA</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70">
                    <span className="text-[11px] text-emerald-400 block">Total Versé</span>
                    <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">90 000 FCFA</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70">
                    <span className="text-[11px] text-amber-400 block">Solde à Régler</span>
                    <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">130 000 FCFA</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>Prochaine échéance : Tranche 2 avant le 10 Janvier 2027</span>
                  <button
                    onClick={() => window.print()}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimer état des versements</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ONGLET : CONTACTER L'ÉTABLISSEMENT / RENDEZ-VOUS */}
      {activeTab === 'contact-school' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <span>Formulaire de Contact & Demande de Rendez-vous</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Transmettez une demande officielle, une réclamation ou sollicitez un entretien avec la direction ou le professeur principal.
              </p>
            </div>

            {contactSuccessMsg && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{contactSuccessMsg}</span>
              </div>
            )}

            {contactErrorMsg && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{contactErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSendContact} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enfant concerné
                </label>
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.class_name || 'Classe non assignée'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nature de la demande <span className="text-rose-400">*</span>
                </label>
                <select
                  value={contactForm.category}
                  onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="DEMANDE_RDV">Demande de rendez-vous avec la direction</option>
                  <option value="PEDAGOGIE">Question pédagogique / Professeur principal</option>
                  <option value="ADMINISTRATIF">Demande de certificat / document administratif</option>
                  <option value="DISCIPLINE">Échange concernant la vie scolaire / discipline</option>
                  <option value="RECLAMATION">Réclamation officielle</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Priorité
                </label>
                <select
                  value={contactForm.priority}
                  onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="NORMALE">Normale</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message détaillé / Disponibilités souhaitées <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Décrivez précisément votre demande ou vos créneaux de disponibilité pour un entretien..."
                  value={contactForm.description}
                  onChange={(e) => setContactForm({ ...contactForm, description: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingContact}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingContact ? 'Envoi en cours...' : 'Envoyer la Demande'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ONGLET : CIRCULAIRES & CONVOCATIONS OFFICIELLES */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Circulaires & Convocations de l'Établissement</h3>
              <p className="text-xs text-slate-400">Informations officielles diffusées aux parents d'élèves</p>
            </div>
          </div>

          {announcements.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              Aucune annonce spécifique aux parents n'est publiée pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-700/40 rounded text-[10px] font-bold">
                      {ann.category}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(ann.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{ann.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                    Direction de l'établissement • Signé par {ann.author_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
