import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Palette,
  Check,
  Save,
  RotateCcw,
  Printer,
  Upload,
  Trash2,
  Eye,
  Sliders,
  Type,
  ShieldCheck,
  Building,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  Lock,
} from 'lucide-react';
import {
  DocumentType,
  DocumentModelId,
  DocumentFont,
  DocumentTemplateConfig,
  DOCUMENT_MODEL_PRESETS,
  DOCUMENT_TYPE_LABELS,
  getDefaultTemplateConfig,
} from '../../types/documentTemplates.ts';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { DocumentTemplatePreview } from './DocumentTemplatePreview.tsx';
import { printDocument, downloadPdf } from '../../utils/printPdfUtils.ts';

const COLOR_PRESETS_PRIMARY = [
  { label: 'Bleu Marine', value: '#1e3a8a' },
  { label: 'Sarcelle Émeraude', value: '#0f766e' },
  { label: 'Bordeaux Impérial', value: '#7f1d1d' },
  { label: 'Noir Encre', value: '#18181b' },
  { label: 'Bleu Royal', value: '#2563eb' },
  { label: 'Vert Forêt', value: '#166534' },
  { label: 'Violet Cardinal', value: '#581c87' },
];

const COLOR_PRESETS_SECONDARY = [
  { label: 'Ardoise', value: '#475569' },
  { label: 'Bleu Ciel', value: '#0284c7' },
  { label: 'Bronze Doré', value: '#854d0e' },
  { label: 'Gris Neutre', value: '#52525b' },
  { label: 'Ambre Chaud', value: '#d97706' },
  { label: 'Argent Doux', value: '#94a3b8' },
];

const FONT_OPTIONS: { id: DocumentFont; label: string; desc: string }[] = [
  { id: 'inter', label: 'Inter (Sans-serif Moderne)', desc: 'Typographie contemporaine équilibrée et épurée' },
  { id: 'merriweather', label: 'Merriweather (Serif Académique)', desc: 'Style noble, classique et institutionnel pour l’impression' },
  { id: 'roboto', label: 'Roboto (Neutre Standard)', desc: 'Clarté géométrique optimale pour les tableaux chiffrés' },
  { id: 'courier', label: 'Courier (Monospace Administratif)', desc: 'Précision dactylographique des registres officiels' },
];

export const DocumentSettingsTab: React.FC = () => {
  const { establishment, user, hasRole } = useAuth();
  const isPromoteur = hasRole('PROMOTEUR');

  const [activeDocType, setActiveDocType] = useState<DocumentType>('bulletin');
  const [config, setConfig] = useState<DocumentTemplateConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'editor' | 'preview'>('editor');

  const stampInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Charger le modèle pour le document sélectionné
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    api.getDocumentTemplate(activeDocType)
      .then((cfg) => {
        if (!isMounted) return;
        if (cfg) {
          setConfig(cfg);
        } else {
          setConfig(getDefaultTemplateConfig(activeDocType, establishment));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Erreur chargement modèle:', err);
        setConfig(getDefaultTemplateConfig(activeDocType, establishment));
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeDocType, establishment?.id]);

  // Changement de modèle prédéfini
  const handleSelectModel = (modelId: DocumentModelId) => {
    if (!config) return;
    const preset = DOCUMENT_MODEL_PRESETS.find((p) => p.id === modelId);
    setConfig({
      ...config,
      modelId,
      styling: {
        ...config.styling,
        primaryColor: preset?.primaryColorDefault || config.styling.primaryColor,
        secondaryColor: preset?.secondaryColorDefault || config.styling.secondaryColor,
        fontFamily: preset?.fontDefault || config.styling.fontFamily,
      },
    });
  };

  // Téléversement du cachet / signature
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('L’image du cachet ne doit pas dépasser 2 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setConfig({
        ...config,
        signatory: {
          ...config.signatory,
          stampUrl: base64,
        },
      });
      setSuccess('Cachet importé dans le modèle.');
    };
    reader.readAsDataURL(file);
  };

  // Téléversement du logo du modèle
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('L’image du logo ne doit pas dépasser 2 Mo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setConfig({
        ...config,
        schoolInfo: {
          ...config.schoolInfo,
          logoUrl: base64,
        },
      });
      setSuccess('Logo mis à jour dans le modèle.');
    };
    reader.readAsDataURL(file);
  };

  // Sauvegarde dans Firestore
  const handleSave = async () => {
    if (!config) return;
    if (!isPromoteur) {
      setError('Accès refusé : Seul le Promoteur peut modifier les modèles de documents.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.saveDocumentTemplate(activeDocType, config);
      setConfig(res.config);
      setSuccess(res.message || 'Modèle enregistré avec succès dans Firestore.');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l’enregistrement du modèle.');
    } finally {
      setSaving(false);
    }
  };

  // Réinitialisation aux valeurs par défaut de l'établissement
  const handleResetDefaults = () => {
    if (!window.confirm('Voulez-vous réinitialiser ce modèle avec les valeurs par défaut de votre école ?')) {
      return;
    }
    const def = getDefaultTemplateConfig(activeDocType, establishment);
    setConfig(def);
    setSuccess('Valeurs par défaut restaurées. Cliquez sur "Enregistrer les modifications" pour valider.');
  };

  // Test d'impression A4
  const handlePrintTest = () => {
    printDocument('document-template-preview-wrapper', `Modele_${activeDocType}_${config?.modelId || 'test'}`);
  };

  if (loading || !config) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold">Chargement des modèles de documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Bandeau de Contrôle d'Accès Promoteur (Règle 9) */}
      {!isPromoteur && (
        <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-2xl flex items-center space-x-3 text-amber-200 text-xs">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold block">Mode Consultation Uniquement (Rôle : {user?.role})</span>
            <span>
              Seul le Promoteur de l’établissement est autorisé à modifier et enregistrer les modèles de documents officiels. Vous visualisez la configuration active utilisée pour les impressions.
            </span>
          </div>
        </div>
      )}

      {/* Messages d'état */}
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

      {/* 2. Sélecteur de type de document (Extensible) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Document à Personnaliser</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Sélectionnez le document scolaire pour ajuster sa maquette, ses couleurs et ses signatures.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintTest}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              title="Tester le rendu A4 de l'aperçu"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tester Impression A4</span>
            </button>

            {isPromoteur && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Enregistrement...' : 'Enregistrer le Modèle'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Pilules de documents */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/80">
          {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((type) => {
            const meta = DOCUMENT_TYPE_LABELS[type];
            const isSelected = activeDocType === type;
            const isAvailable = meta.available;

            return (
              <button
                key={type}
                disabled={!isAvailable}
                onClick={() => setActiveDocType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : isAvailable
                    ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                    : 'bg-slate-900/60 text-slate-600 border border-slate-800 cursor-not-allowed opacity-60'
                }`}
              >
                <span>{meta.label}</span>
                {!isAvailable && (
                  <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded-full font-mono">
                    Bientôt
                  </span>
                )}
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Boutons d'onglets pour petits écrans (Éditeur vs Aperçu) */}
      <div className="flex lg:hidden bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
        <button
          onClick={() => setPreviewTab('editor')}
          className={`flex-1 py-2 rounded-lg transition ${
            previewTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400'
          }`}
        >
          Options & Réglages
        </button>
        <button
          onClick={() => setPreviewTab('preview')}
          className={`flex-1 py-2 rounded-lg transition ${
            previewTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400'
          }`}
        >
          Aperçu Réel en Direct
        </button>
      </div>

      {/* 3. Grid Principal : Formulaire de Réglages + Aperçu en Direct */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLONNE GAUCHE : Options & Personnalisation */}
        <div className={`lg:col-span-6 space-y-6 ${previewTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          
          {/* A. Choix des 4 modèles prédéfinis */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>1. Choix du Modèle Prédéfini ({DOCUMENT_MODEL_PRESETS.length})</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Version {config.version || 1}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {DOCUMENT_MODEL_PRESETS.map((preset) => {
                const isSelected = config.modelId === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => isPromoteur && handleSelectModel(preset.id)}
                    className={`p-3.5 rounded-xl border transition text-left relative cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{preset.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono bg-slate-800 text-slate-300">
                          {preset.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="mb-1.5">
                      <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/50">
                        📐 Forme : {preset.shapeType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-700/50">
                      <span className="text-[9px] text-slate-500">Palette :</span>
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: preset.primaryColorDefault }} />
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: preset.secondaryColorDefault }} />
                      <span className="text-[9px] text-slate-400 font-mono capitalize ml-auto">{preset.fontDefault}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. Couleurs & Typographie */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>2. Couleurs & Typographie d'Impression</span>
            </h3>

            {/* Couleur Principale */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Couleur Principale (En-têtes, titres et bordures maîtresses)</span>
                <span className="font-mono text-slate-400">{config.styling.primaryColor}</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled={!isPromoteur}
                  value={config.styling.primaryColor}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styling: { ...config.styling, primaryColor: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-800 border border-slate-700 p-0.5 shrink-0"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS_PRIMARY.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      disabled={!isPromoteur}
                      onClick={() =>
                        setConfig({
                          ...config,
                          styling: { ...config.styling, primaryColor: col.value },
                        })
                      }
                      title={col.label}
                      className={`w-6 h-6 rounded-md border transition ${
                        config.styling.primaryColor === col.value
                          ? 'border-white scale-110 shadow-xs'
                          : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: col.value }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Couleur Secondaire */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Couleur Secondaire (Accents, mentions et sous-titres)</span>
                <span className="font-mono text-slate-400">{config.styling.secondaryColor}</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled={!isPromoteur}
                  value={config.styling.secondaryColor}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      styling: { ...config.styling, secondaryColor: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-800 border border-slate-700 p-0.5 shrink-0"
                />
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PRESETS_SECONDARY.map((col) => (
                    <button
                      key={col.value}
                      type="button"
                      disabled={!isPromoteur}
                      onClick={() =>
                        setConfig({
                          ...config,
                          styling: { ...config.styling, secondaryColor: col.value },
                        })
                      }
                      title={col.label}
                      className={`w-6 h-6 rounded-md border transition ${
                        config.styling.secondaryColor === col.value
                          ? 'border-white scale-110 shadow-xs'
                          : 'border-slate-700 hover:scale-105'
                      }`}
                      style={{ backgroundColor: col.value }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Police d'impression */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-indigo-400" />
                <span>Police d'Impression (3 à 4 polices lisibles & calibrées)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FONT_OPTIONS.map((f) => {
                  const isFontSelected = config.styling.fontFamily === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      disabled={!isPromoteur}
                      onClick={() =>
                        setConfig({
                          ...config,
                          styling: { ...config.styling, fontFamily: f.id },
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        isFontSelected
                          ? 'bg-indigo-950/40 border-indigo-500 text-white'
                          : 'bg-slate-800/40 hover:bg-slate-800 text-slate-300 border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{f.label.split(' ')[0]}</span>
                        {isFontSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{f.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* C. En-tête & Pied de page libres */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>3. En-tête & Pied de Page (Texte Libre)</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Texte supérieur de l'en-tête officiel
              </label>
              <textarea
                rows={2}
                disabled={!isPromoteur}
                value={config.headerText}
                onChange={(e) => setConfig({ ...config, headerText: e.target.value })}
                placeholder="ex. RÉPUBLIQUE DU CONGO • MINISTÈRE DE L'ENSEIGNEMENT..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Figure tout en haut du document avant le nom de l'établissement.
              </span>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">
                Texte légal du pied de page
              </label>
              <textarea
                rows={2}
                disabled={!isPromoteur}
                value={config.footerText}
                onChange={(e) => setConfig({ ...config, footerText: e.target.value })}
                placeholder="ex. Document officiel émis par ordinateur • Toute rature annule le document."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Figure en bas de la page A4 avec les mentions de sécurité et légales.
              </span>
            </div>
          </div>

          {/* D. Signataire, Cachet & Logo */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>4. Signataire & Cachet Officiel</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nom du Signataire</label>
                <input
                  type="text"
                  disabled={!isPromoteur}
                  value={config.signatory.name}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      signatory: { ...config.signatory, name: e.target.value },
                    })
                  }
                  placeholder="ex. M. BASSOUAMINA Alain"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Titre Officiel du Signataire</label>
                <input
                  type="text"
                  disabled={!isPromoteur}
                  value={config.signatory.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      signatory: { ...config.signatory, title: e.target.value },
                    })
                  }
                  placeholder="ex. Le Directeur des Études"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Téléversement Cachet */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">
                  Cachet officiel et/ou Signature numérisée
                </span>
                <span className="text-[10px] text-slate-500">
                  Image PNG avec fond transparent recommandée (max 2 Mo).
                </span>
              </div>

              <div className="flex items-center gap-2">
                {config.signatory.stampUrl && (
                  <div className="relative group">
                    <img
                      src={config.signatory.stampUrl}
                      alt="Cachet"
                      className="w-12 h-12 object-contain rounded-lg border border-slate-700 p-0.5 bg-white"
                    />
                    {isPromoteur && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            signatory: { ...config.signatory, stampUrl: null },
                          })
                        }
                        className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-500 cursor-pointer"
                        title="Supprimer ce cachet"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {isPromoteur && (
                  <>
                    <input
                      ref={stampInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleStampUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => stampInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{config.signatory.stampUrl ? 'Remplacer' : 'Téléverser Cachet'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Téléversement Logo du Document */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-300 block">
                  Logo de l'école pour ce document
                </span>
                <span className="text-[10px] text-slate-500">
                  Par défaut, reprend le logo de l'établissement.
                </span>
              </div>

              <div className="flex items-center gap-2">
                {config.schoolInfo.logoUrl && (
                  <img
                    src={config.schoolInfo.logoUrl}
                    alt="Logo Modèle"
                    className="w-10 h-10 object-contain rounded-lg border border-slate-700 p-0.5 bg-white"
                  />
                )}

                {isPromoteur && (
                  <>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{config.schoolInfo.logoUrl ? 'Changer Logo' : 'Ajouter Logo'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* E. Blocs affichables (Toggles) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>5. Affichage ou Masquage des Blocs</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer">
                <span className="text-xs font-medium text-slate-300">Afficher la Mention</span>
                <input
                  type="checkbox"
                  disabled={!isPromoteur}
                  checked={config.toggles.showMention}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      toggles: { ...config.toggles, showMention: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer">
                <span className="text-xs font-medium text-slate-300">Afficher le Rang</span>
                <input
                  type="checkbox"
                  disabled={!isPromoteur}
                  checked={config.toggles.showRank}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      toggles: { ...config.toggles, showRank: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer">
                <span className="text-xs font-medium text-slate-300">Appréciations Matières</span>
                <input
                  type="checkbox"
                  disabled={!isPromoteur}
                  checked={config.toggles.showAppreciation}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      toggles: { ...config.toggles, showAppreciation: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/60 cursor-pointer">
                <span className="text-xs font-medium text-slate-300">Observations du Conseil</span>
                <input
                  type="checkbox"
                  disabled={!isPromoteur}
                  checked={config.toggles.showObservations}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      toggles: { ...config.toggles, showObservations: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
              </label>
            </div>
          </div>

          {/* Boutons d'action en bas de colonne */}
          {isPromoteur && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurer Valeurs par Défaut</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Enregistrement en cours...' : 'Enregistrer ce Modèle'}</span>
              </button>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : Aperçu en Direct avec Données Réelles (Règle 4) */}
        <div className={`lg:col-span-6 space-y-3 ${previewTab === 'editor' ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Aperçu Réel en Direct ({DOCUMENT_TYPE_LABELS[activeDocType].label} • Modèle « {DOCUMENT_MODEL_PRESETS.find(p => p.id === config.modelId)?.name} »)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrintTest}
                className="px-3 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>Imprimer A4</span>
              </button>
            </div>
          </div>

          {/* Conteneur d'Aperçu Défilant / Zoomable */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 overflow-x-auto shadow-inner max-h-[85vh] overflow-y-auto">
            <div id="document-template-preview-wrapper" className="min-w-[620px] mx-auto scale-95 origin-top transition-all duration-200">
              <DocumentTemplatePreview
                docType={activeDocType}
                config={config}
                establishment={establishment}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
