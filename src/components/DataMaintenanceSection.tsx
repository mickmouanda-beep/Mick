import React, { useState, useEffect } from 'react';
import {
  Download,
  Database,
  CloudCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Server,
  FileJson,
  Layers,
  ShieldAlert,
  Info,
  PlayCircle,
  CloudUpload,
  ArrowRightLeft,
  HelpCircle,
  Check,
  XCircle,
  FolderTree,
  ShieldCheck
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { formatBrazzavilleDateTime } from '../lib/dateUtils.ts';

interface TableMappingItem {
  tableName: string;
  destinationType: 'ROOT' | 'SUBCOLLECTION' | 'NONE';
  firestorePathPattern: string;
  hasRule: boolean;
  notes: string;
  sourceCount: number;
}

interface DeductionBreakdown {
  direct: number;
  viaClass: number;
  viaTeacher: number;
  viaOther: number;
  missing: number;
}

interface TableMigrationStat {
  tableName: string;
  destinationType: 'ROOT' | 'SUBCOLLECTION' | 'NONE';
  firestorePathPattern: string;
  sourceCount: number;
  alreadyExistingCount: number;
  toCreateCount: number;
  destinationCountAfter?: number;
  discrepancy?: number;
  errorCount: number;
  errors?: string[];
  deductionBreakdown?: DeductionBreakdown;
  status: 'PENDING' | 'SIMULATED' | 'MIGRATED' | 'NO_DESTINATION' | 'IGNORED' | 'MISSING_ESTABLISHMENT' | 'ERROR';
}

interface MigrationReport {
  mode: 'SIMULATION' | 'EXECUTION';
  timestamp: string;
  totalTables: number;
  totalSourceRows: number;
  totalToCreate: number;
  totalAlreadyExisting: number;
  totalErrors: number;
  tablesWithoutDestination: string[];
  results: TableMigrationStat[];
  discrepancies: { tableName: string; source: number; destination: number; diff: number }[];
}

export const DataMaintenanceSection: React.FC = () => {
  // État Exportation SQLite
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<{
    exportedAt: string;
    databaseName: string;
    totalTables: number;
    tableCounts: { name: string; count: number }[];
    totalRows: number;
  } | null>(null);

  // État Test Firestore
  const [pingLoading, setPingLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{
    success: boolean;
    timestamp?: string;
    message?: string;
    gcpProjectId?: string;
    firestoreDatabaseId?: string;
    serviceAccount?: string;
    written?: any;
    read?: any;
    error?: {
      code?: string;
      message?: string;
      details?: any;
      stack?: string;
      fullSerializedError?: string;
    };
  } | null>(null);

  // État Migration SQLite -> Firestore
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappings, setMappings] = useState<TableMappingItem[]>([]);
  const [tablesWithoutDest, setTablesWithoutDest] = useState<TableMappingItem[]>([]);
  const [mappingError, setMappingError] = useState<string | null>(null);

  const [migrationLoading, setMigrationLoading] = useState(false);
  const [migrationMode, setMigrationMode] = useState<'SIMULATION' | 'EXECUTION' | null>(null);
  const [migrationReport, setMigrationReport] = useState<MigrationReport | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Charger le tableau de correspondance SQLite -> Firestore au montage
  const loadMapping = async () => {
    setMappingLoading(true);
    setMappingError(null);
    try {
      const res = await api.getMigrationMapping();
      setMappings(res.mappings || []);
      setTablesWithoutDest(res.tablesWithoutDestination || []);
    } catch (err: any) {
      console.error('Erreur chargement mapping migration:', err);
      setMappingError(err.message || 'Impossible de charger la table de correspondance.');
    } finally {
      setMappingLoading(false);
    }
  };

  useEffect(() => {
    loadMapping();
  }, []);

  // Action 1: Exporter mes données (JSON)
  const handleExportData = async () => {
    setExportLoading(true);
    setExportError(null);
    try {
      const data = await api.exportSqliteData();
      
      const tables = data?.tables || {};
      const counts: { name: string; count: number }[] = [];
      let total = 0;
      for (const [tName, rows] of Object.entries(tables)) {
        const rowCount = Array.isArray(rows) ? rows.length : 0;
        counts.push({ name: tName, count: rowCount });
        total += rowCount;
      }

      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = downloadUrl;
      a.download = `faith_school_sqlite_export_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setExportResult({
        exportedAt: data?.exportedAt || new Date().toISOString(),
        databaseName: data?.databaseName || 'faith_school.sqlite',
        totalTables: counts.length,
        tableCounts: counts.sort((a, b) => b.count - a.count),
        totalRows: total,
      });
    } catch (err: any) {
      console.error('Erreur export SQLite:', err);
      setExportError(err.message || "Erreur lors de l'exportation des données.");
    } finally {
      setExportLoading(false);
    }
  };

  // Action 2: Tester Firestore
  const handlePingFirestore = async () => {
    setPingLoading(true);
    try {
      const result = await api.pingFirestore();
      setPingResult(result);
    } catch (err: any) {
      console.error('Erreur Firestore ping:', err);
      setPingResult({
        success: false,
        timestamp: new Date().toISOString(),
        error: {
          code: err.code || 'FIRESTORE_ERROR',
          message: err.message || "Erreur lors du test de connexion Firestore.",
          fullSerializedError: JSON.stringify(err, Object.getOwnPropertyNames(err))
        },
        gcpProjectId: 'ecolef-7b853',
        firestoreDatabaseId: '(default)',
      });
    } finally {
      setPingLoading(false);
    }
  };

  // Action 3: Exécuter la migration (Simulation ou Réelle)
  const handleRunMigration = async (dryRun: boolean) => {
    setMigrationLoading(true);
    setMigrationMode(dryRun ? 'SIMULATION' : 'EXECUTION');
    setMigrationError(null);
    try {
      const report = await api.runMigration(dryRun);
      setMigrationReport(report);
      // Rafraîchir les comptages du tableau de correspondance
      loadMapping();
    } catch (err: any) {
      console.error('Erreur migration:', err);
      setMigrationError(err.message || 'Erreur lors du traitement de la migration.');
    } finally {
      setMigrationLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* En-tête de section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center space-x-2.5">
              <Database className="w-5 h-5 text-indigo-400" />
              <span>Maintenance des données & Migration Cloud</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Outils de sauvegarde locale, de contrôle IAM et de migration souveraine SQLite ➔ Cloud Firestore.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span>Base source : SQLite (lecture seule) | Cible : Firestore (ecolef-7b853)</span>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 1 : SAUVEGARDE & TEST DIAGNOSTIC */}
      {/* ==================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BLOC 1 : EXPORTATION DES DONNÉES (JSON) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Sauvegarde Complète SQLite</h3>
                <p className="text-xs text-slate-400">Export brut de toutes les tables existantes</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              Télécharge instantanément un export structuré au format JSON de toutes les 36 tables de la base de données SQLite sans altérer ni supprimer aucune information.
            </p>

            {exportError && (
              <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{exportError}</span>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleExportData}
              disabled={exportLoading}
              className="w-full min-h-[48px] px-4 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              {exportLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Génération de l'export...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Exporter mes données (JSON)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* BLOC 2 : TESTEUR DE CONNEXION FIRESTORE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Diagnostic Cloud Firestore</h3>
                <p className="text-xs text-slate-400">Contrôle des permissions IAM & écriture _tests/ping</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              Effectue une écriture puis une lecture immédiate sur <code className="text-indigo-300">_tests/ping</code> sur le projet <strong>ecolef-7b853</strong> pour vérifier la disponibilité de la base sans modifier vos données scolaires.
            </p>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handlePingFirestore}
              disabled={pingLoading}
              className="w-full min-h-[48px] px-4 py-3 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-600/30 cursor-pointer disabled:opacity-50"
            >
              {pingLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Test de connexion en cours...</span>
                </>
              ) : (
                <>
                  <CloudCheck className="w-4 h-4" />
                  <span>Tester Firestore</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* RÉSULTAT EXPORT SQLITE */}
      {exportResult && (
        <div className="bg-slate-900 border border-emerald-800/60 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span className="font-bold text-sm sm:text-base">Exportation réussie & Fichier téléchargé</span>
            </div>
            <span className="text-xs text-slate-400">
              {formatBrazzavilleDateTime(exportResult.exportedAt)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Tables exportées : </span>
              <span className="font-bold text-white">{exportResult.totalTables}</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Total enregistrements : </span>
              <span className="font-bold text-emerald-400">{exportResult.totalRows.toLocaleString('fr-FR')}</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">Source : </span>
              <span className="font-mono text-indigo-300">{exportResult.databaseName}</span>
            </div>
          </div>
        </div>
      )}

      {/* RÉSULTAT PING FIRESTORE */}
      {pingResult && (
        <div className={`rounded-2xl p-4 sm:p-6 shadow-xl border space-y-4 ${
          pingResult.success ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-rose-950/20 border-rose-800/60'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              {pingResult.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="font-bold text-sm sm:text-base text-emerald-300">
                    Connexion Firestore réussie (Écriture & Lecture sur _tests/ping)
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-bold text-sm sm:text-base text-rose-300">
                    Erreur de connexion Firestore : {pingResult.error?.code || 'PERMISSION_DENIED'}
                  </span>
                </>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {formatBrazzavilleDateTime(pingResult.timestamp || new Date().toISOString())}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Projet Firebase :</span>
              <span className="font-mono text-indigo-300 font-bold break-all">{pingResult.gcpProjectId || 'ecolef-7b853'}</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Base de données :</span>
              <span className="font-mono text-indigo-300 font-bold break-all">{pingResult.firestoreDatabaseId || '(default)'}</span>
            </div>
          </div>

          {pingResult.error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/50 rounded-xl text-xs text-rose-200 space-y-1">
              <div className="font-semibold text-rose-300">Détail de l'erreur :</div>
              <div className="font-mono text-[11px] break-all">{pingResult.error.message}</div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SECTION 2 : MIGRATION IDEMPOTENTE SQLITE -> FIRESTORE */}
      {/* ==================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-6">
        
        {/* Titre et Explications des Garanties */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-400">
              <ArrowRightLeft className="w-5 h-5" />
              <h3 className="text-base sm:text-lg font-bold text-white">
                Migration Idempotente SQLite ➔ Cloud Firestore
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Transfère l'intégralité des données scolaires vers Google Cloud Firestore en respectant strictement l'architecture multi-établissements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadMapping}
              disabled={mappingLoading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${mappingLoading ? 'animate-spin' : ''}`} />
              <span>Actualiser les comptages</span>
            </button>
          </div>
        </div>

        {/* Règles d'intégrité & Idempotence */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950/90 border border-slate-800/80 p-3 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Identifiants Déterministes</span>
            </div>
            <p className="text-[11px] text-slate-400">L'identifiant exact de chaque ligne SQLite devient l'ID du document Firestore.</p>
          </div>

          <div className="bg-slate-950/90 border border-slate-800/80 p-3 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Création Sans Écrasement</span>
            </div>
            <p className="text-[11px] text-slate-400">Aucun document existant n'est écrasé ni dupliqué. Totalement idempotent.</p>
          </div>

          <div className="bg-slate-950/90 border border-slate-800/80 p-3 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lots de 400 Écritures</span>
            </div>
            <p className="text-[11px] text-slate-400">Écritures groupées sécurisées (plafond 400 &lt; 500 limite Firestore).</p>
          </div>

          <div className="bg-slate-950/90 border border-slate-800/80 p-3 rounded-xl space-y-1">
            <div className="font-bold text-indigo-300 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Reprise Après Interruption</span>
            </div>
            <p className="text-[11px] text-slate-400">Peut être relancée à tout moment : ignore les documents déjà présents.</p>
          </div>
        </div>

        {/* ALERTE TABLES SANS DESTINATION DÉFINIE */}
        {tablesWithoutDest.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-800/70 p-4 rounded-xl space-y-2">
            <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Attention : {tablesWithoutDest.length} table SQLite n'a aucune destination définie sur Firestore</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              La table suivante n'a pas été ignorée. Veuillez indiquer la conduite à tenir (ex: la conserver uniquement en local SQLite ou l'archiver dans une collection Cloud dédiée) :
            </p>
            <div className="space-y-1.5 pt-1">
              {tablesWithoutDest.map((t) => (
                <div key={t.tableName} className="bg-slate-950/80 border border-amber-800/50 p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-amber-300">{t.tableName}</span>
                    <span className="text-slate-400 ml-2">({t.sourceCount} enregistrement(s))</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t.notes}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
                    En attente d'instruction
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABLEAU DE CORRESPONDANCE TOUTES TABLES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
              <FolderTree className="w-4 h-4 text-indigo-400" />
              <span>Tableau de Correspondance Complet : Table SQLite ➔ Chemin Firestore ({mappings.length} tables)</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Total source : <strong>{mappings.reduce((acc, m) => acc + (m.sourceCount || 0), 0)}</strong> lignes
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/60 max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold sticky top-0 border-b border-slate-800 z-10">
                <tr>
                  <th className="py-2.5 px-3">Table SQLite</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Chemin Firestore</th>
                  <th className="py-2.5 px-3 text-center">Règle</th>
                  <th className="py-2.5 px-3 text-right">Lignes SQLite</th>
                  <th className="py-2.5 px-3">Rôle & Remarques</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                {mappings.map((m) => (
                  <tr key={m.tableName} className="hover:bg-slate-900/50 transition">
                    <td className="py-2 px-3 font-bold text-indigo-300">
                      {m.tableName}
                    </td>
                    <td className="py-2 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.destinationType === 'ROOT'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800/40'
                          : m.destinationType === 'SUBCOLLECTION'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800/40'
                          : m.tableName === 'firestore_sync_queue'
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-amber-950 text-amber-300 border border-amber-800/40'
                      }`}>
                        {m.destinationType === 'ROOT'
                          ? 'RACINE'
                          : m.destinationType === 'SUBCOLLECTION'
                          ? 'SOUS-COLLECTION'
                          : m.tableName === 'firestore_sync_queue'
                          ? 'IGNORÉE'
                          : 'AUCUNE'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300 break-all">
                      {m.firestorePathPattern}
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      {m.hasRule ? (
                        <span className="inline-flex items-center text-emerald-400 text-[10px] font-bold">
                          <Check className="w-3 h-3 mr-0.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-rose-400 text-[10px] font-bold">
                          <XCircle className="w-3 h-3 mr-0.5" /> Aucune
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-200">
                      {m.sourceCount}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-400 text-[11px]">
                      {m.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ZONE DE BOUTONS D'ACTION */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleRunMigration(true)}
            disabled={migrationLoading}
            className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-indigo-600/90 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
          >
            {migrationLoading && migrationMode === 'SIMULATION' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulation en cours...</span>
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                <span>1. Simuler la migration</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleRunMigration(false)}
            disabled={migrationLoading}
            className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
          >
            {migrationLoading && migrationMode === 'EXECUTION' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Migration réelle en cours...</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>2. Lancer la migration</span>
              </>
            )}
          </button>
        </div>

        {/* AFFICHAGE DE L'ERREUR DE MIGRATION LE CAS ÉCHÉANT */}
        {migrationError && (
          <div className="p-4 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-rose-300">Erreur lors de la migration :</span>
              <p className="font-mono text-[11px]">{migrationError}</p>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* RAPPORT DE MIGRATION / SIMULATION DÉTAILLÉ */}
        {/* ==================================================== */}
        {migrationReport && (
          <div className={`p-5 rounded-2xl border space-y-5 ${
            migrationReport.mode === 'SIMULATION'
              ? 'bg-indigo-950/20 border-indigo-800/60'
              : 'bg-emerald-950/20 border-emerald-800/60'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                {migrationReport.mode === 'SIMULATION' ? (
                  <>
                    <PlayCircle className="w-5 h-5 text-indigo-400 shrink-0" />
                    <div>
                      <span className="font-bold text-sm sm:text-base text-indigo-300">
                        Rapport de Simulation (Aucune écriture effectuée)
                      </span>
                      <p className="text-[11px] text-slate-400">Contrôle d'existence et détection des créations à prévoir.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-sm sm:text-base text-emerald-300">
                        Rapport de Migration Réelle (Vérification et Relecture Firestore)
                      </span>
                      <p className="text-[11px] text-slate-400">Écritures idempotentes par lots de 400 et confrontation des totaux.</p>
                    </div>
                  </>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {formatBrazzavilleDateTime(migrationReport.timestamp)}
              </span>
            </div>

            {/* Statistiques Globales Résumées */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Total Lignes Source</span>
                <span className="font-bold text-white text-base">{migrationReport.totalSourceRows}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Nouveaux à créer</span>
                <span className="font-bold text-indigo-400 text-base">{migrationReport.totalToCreate}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Déjà présents (préservés)</span>
                <span className="font-bold text-emerald-400 text-base">{migrationReport.totalAlreadyExisting}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Erreurs rencontrées</span>
                <span className={`font-bold text-base ${migrationReport.totalErrors > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {migrationReport.totalErrors}
                </span>
              </div>
            </div>

            {/* ÉCARTS ÉVENTUELS SIGNALÉS */}
            {migrationReport.discrepancies.length > 0 && (
              <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-xl text-xs text-amber-200 space-y-1">
                <div className="font-bold text-amber-300 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Écarts détectés entre SQLite et Firestore ({migrationReport.discrepancies.length} table(s)) :</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] pt-1">
                  {migrationReport.discrepancies.map((d) => (
                    <li key={d.tableName}>
                      <strong>{d.tableName}</strong> : Source SQLite = {d.source}, Relecture Firestore = {d.destination} (Écart = {d.diff})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* TABLEAU DÉTAILLÉ DE MIGRATION PAR TABLE */}
            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/80 max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold sticky top-0 border-b border-slate-800 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Table SQLite</th>
                    <th className="py-2.5 px-3 text-right">Source SQLite</th>
                    <th className="py-2.5 px-3 text-center">Déductions Établissement (Direct / Classe / Prof / Autre)</th>
                    <th className="py-2.5 px-3 text-right">À créer</th>
                    <th className="py-2.5 px-3 text-right">Déjà sur Cloud</th>
                    {migrationReport.mode === 'EXECUTION' && (
                      <>
                        <th className="py-2.5 px-3 text-right">Relecture Firestore</th>
                        <th className="py-2.5 px-3 text-right">Écart</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-mono text-[11px]">
                  {migrationReport.results.map((r) => (
                    <tr key={r.tableName} className="hover:bg-slate-900/50 transition">
                      <td className="py-2 px-3 font-bold text-indigo-300 font-sans">
                        {r.tableName}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-200">
                        {r.sourceCount}
                      </td>
                      <td className="py-2 px-3 text-center font-sans text-[10px]">
                        {r.deductionBreakdown ? (
                          <div className="flex items-center justify-center space-x-1 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200" title="Directement sur la ligne">{r.deductionBreakdown.direct} direct</span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40" title="Déduit par la classe">{r.deductionBreakdown.viaClass} classe</span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/40" title="Déduit par l'enseignant">{r.deductionBreakdown.viaTeacher} prof</span>
                            {r.deductionBreakdown.viaOther > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/40" title="Déduit par élève / évaluation">{r.deductionBreakdown.viaOther} autre</span>
                            )}
                            {r.deductionBreakdown.missing > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50 font-bold" title="Établissement manquant">{r.deductionBreakdown.missing} manquant</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-indigo-300 font-bold">
                        {r.toCreateCount}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-400">
                        {r.alreadyExistingCount}
                      </td>
                      {migrationReport.mode === 'EXECUTION' && (
                        <>
                          <td className="py-2 px-3 text-right font-bold text-white">
                            {r.destinationCountAfter !== undefined ? r.destinationCountAfter : '-'}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${
                            r.discrepancy && r.discrepancy !== 0 ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {r.discrepancy !== undefined ? r.discrepancy : '-'}
                          </td>
                        </>
                      )}
                      <td className="py-2 px-3 text-center font-sans">
                        {r.status === 'IGNORED' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                            IGNORÉE VOLONTAIREMENT
                          </span>
                        ) : r.status === 'MISSING_ESTABLISHMENT' || (r.deductionBreakdown && r.deductionBreakdown.missing > 0) ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/40">
                            Établissement manquant ({r.deductionBreakdown?.missing || 0})
                          </span>
                        ) : r.status === 'NO_DESTINATION' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/40">
                            SANS DESTINATION
                          </span>
                        ) : r.status === 'ERROR' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/40">
                            ERREUR
                          </span>
                        ) : r.discrepancy && r.discrepancy !== 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/40">
                            ÉCART ({r.discrepancy})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                            CONFORME
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
