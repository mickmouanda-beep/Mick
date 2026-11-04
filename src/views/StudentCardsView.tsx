import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  Printer,
  Download,
  Eye,
  Building2,
  User,
  CheckCircle,
  Layers,
  X,
  Loader2
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { downloadStudentCardPdf, printStudentCard } from '../utils/printPdfUtils.ts';

export const StudentCardsView: React.FC = () => {
  const { user, establishment } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [issuedCardsHistory, setIssuedCardsHistory] = useState<Record<string, any>>({});
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [previewStudent, setPreviewStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadingStudentId, setDownloadingStudentId] = useState<string | null>(null);
  const [printingStudentId, setPrintingStudentId] = useState<string | null>(null);

  const isGestionnaire = user?.role === 'GESTIONNAIRE';
  const isDirectionOrPromoteur = ['PROMOTEUR', 'DIRECTEUR_GENERAL', 'DIRECTEUR_ETUDES'].includes(user?.role || '');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuRes, clsRes, historyRes] = await Promise.all([
        api.getStudents().catch(() => []),
        api.getClasses().catch(() => []),
        api.getStudentCardsHistory().catch(() => [])
      ]);
      setStudents(stuRes || []);
      setClasses(clsRes || []);

      const histMap: Record<string, any> = {};
      (historyRes || []).forEach((h: any) => {
        histMap[h.student_id] = h;
      });
      setIssuedCardsHistory(histMap);

      const qrMap: Record<string, string> = {};
      for (const s of (stuRes || [])) {
        if (s.matricule && establishment?.code) {
          const qrText = `MAT:${s.matricule}|ECOLE:${establishment.code}`;
          try {
            const dataUrl = await QRCode.toDataURL(qrText, { width: 140, margin: 1 });
            qrMap[s.id] = dataUrl;
          } catch {}
        }
      }
      setQrCodeDataUrls(qrMap);
    } catch (err) {
      console.error('Erreur chargement cartes scolaires:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueCard = async (studentId: string) => {
    if (!isGestionnaire) return;
    try {
      const res = await api.issueStudentCard(studentId);
      setIssuedCardsHistory(prev => ({
        ...prev,
        [studentId]: res.cardRecord
      }));
      alert('Carte scolaire délivrée et enregistrée avec succès !');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la délivrance de la carte.');
    }
  };

  const handleDownloadPdf = async (s: any) => {
    if (!s) return;
    setDownloadingStudentId(s.id);
    try {
      await downloadStudentCardPdf(s, establishment, qrCodeDataUrls[s.id]);
    } catch (err: any) {
      console.error('Erreur téléchargement carte scolaire:', err);
      alert('Erreur lors du téléchargement de la carte : ' + (err?.message || err));
    } finally {
      setDownloadingStudentId(null);
    }
  };

  const handlePrintPdf = async (s: any) => {
    if (!s) return;
    setPrintingStudentId(s.id);
    try {
      await printStudentCard(s, establishment, qrCodeDataUrls[s.id]);
    } catch (err: any) {
      console.error('Erreur impression carte scolaire:', err);
      alert("Erreur lors de l'impression : " + (err?.message || err));
    } finally {
      setPrintingStudentId(null);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchClass = selectedClassId === 'all' || s.class_id === selectedClassId;
    const q = searchQuery.toLowerCase();
    const matchQuery = !searchQuery ||
      `${s.last_name || ''} ${s.first_name || ''}`.toLowerCase().includes(q) ||
      (s.matricule || '').toLowerCase().includes(q) ||
      (s.class_name || '').toLowerCase().includes(q);
    return matchClass && matchQuery;
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* En-tête du module */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Cartes Scolaires Officielles & Numériques
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Génération, téléchargement en PDF et impression des cartes scolaires recto-verso (Format standard ID-1)
            </p>
          </div>
        </div>


      </div>

      {/* Filtres et recherche */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou matricule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-80 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Layers className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full md:w-64 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">Toutes les classes ({students.length} élèves)</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des élèves avec les 3 boutons requis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map(s => {
          const cardRecord = issuedCardsHistory[s.id];
          const qrCodeUrl = qrCodeDataUrls[s.id];

          return (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{s.last_name} {s.first_name}</h3>
                  <p className="text-xs font-mono text-blue-400 font-bold">{s.matricule}</p>
                  <p className="text-[11px] text-slate-400">Classe : {s.class_name || 'Non assignée'} • Né(e) le {s.birth_date || '—'}</p>
                </div>
                {cardRecord ? (
                  <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Délivrée</span>
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-bold">
                    Non émise
                  </span>
                )}
              </div>

              {/* Aperçu Carte miniature */}
              <div id={`printable-card-${s.id}`} className="bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 rounded-2xl p-3 shadow-inner text-white flex flex-col justify-between h-40">
                <div className="flex items-center justify-between border-b border-blue-500/20 pb-1.5">
                  <span className="text-[10px] font-bold uppercase truncate">{establishment?.name}</span>
                  <span className="text-[8px] bg-blue-600 px-1.5 py-0.5 rounded font-mono">ID-1</span>
                </div>
                <div className="flex items-center space-x-2 my-1">
                  <div className="w-12 h-16 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {s.photo_data ? (
                      <img src={s.photo_data} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="space-y-0.5 text-xs truncate">
                    <p className="font-bold text-white text-xs truncate">{s.last_name} {s.first_name}</p>
                    <p className="font-mono text-[11px] text-amber-400">{s.matricule}</p>
                    <p className="text-[10px] text-slate-300">Classe : {s.class_name || '—'}</p>
                  </div>
                </div>
                <div className="text-[8px] text-slate-400 pt-1 border-t border-blue-500/10 flex justify-between">
                  <span>Année : {s.academic_year || establishment?.academic_year}</span>
                  <span>Code : {establishment?.code}</span>
                </div>
              </div>

              {/* Les 3 boutons actifs pour tous : "Aperçu", "PDF" et "Imprimer" */}
              <div className="grid grid-cols-3 gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPreviewStudent(s)}
                  className="py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer"
                  title="Aperçu grand format recto-verso"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>Aperçu</span>
                </button>

                <button
                  type="button"
                  disabled={downloadingStudentId === s.id}
                  onClick={() => handleDownloadPdf(s)}
                  className="py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                  title="Télécharger la carte scolaire en PDF (Format carte recto-verso)"
                >
                  {downloadingStudentId === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-blue-400" />
                  ) : (
                    <Download className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{downloadingStudentId === s.id ? 'PDF...' : 'PDF'}</span>
                </button>

                <button
                  type="button"
                  disabled={printingStudentId === s.id}
                  onClick={() => handlePrintPdf(s)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                  title="Imprimer directement la carte scolaire"
                >
                  {printingStudentId === s.id ? (
                    <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-slate-300" />
                  ) : (
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Imprimer</span>
                </button>
              </div>

              {isGestionnaire && (
                <button
                  onClick={() => handleIssueCard(s.id)}
                  className="w-full py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-bold transition cursor-pointer"
                >
                  {cardRecord ? 'Émettre un duplicata' : 'Délivrer officiellement'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Aperçu Grand Format (Recto-Verso) */}
      {previewStudent && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewStudent(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold text-white">Aperçu officiel de la carte scolaire</h2>
              <p className="text-xs text-slate-400">
                Élève : <strong className="text-white">{previewStudent.last_name} {previewStudent.first_name}</strong> ({previewStudent.matricule})
              </p>
            </div>

            <div className="flex flex-col items-center justify-center space-y-6 py-4">
              {/* RECTO */}
              <div className="space-y-1 text-center w-full">
                <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">RECTO DE LA CARTE (Format ID-1)</span>
                <div className="w-full max-w-[342px] h-[216px] mx-auto bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950 border-2 border-blue-500 rounded-2xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-blue-500/30 pb-1.5">
                    <div className="flex items-center space-x-2">
                      {establishment?.logo_url ? (
                        <img src={establishment.logo_url} alt="Logo" className="w-6 h-6 rounded-md object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5 text-blue-400" />
                      )}
                      <div>
                        <h4 className="text-[10.5px] font-black uppercase tracking-tight leading-tight">{establishment?.name}</h4>
                        <p className="text-[8.5px] text-blue-300">Carte Scolaire • {previewStudent.academic_year || establishment?.academic_year}</p>
                      </div>
                    </div>
                    <span className="text-[8.5px] bg-blue-600 px-1.5 py-0.5 rounded font-mono font-bold">RECTO</span>
                  </div>

                  <div className="flex items-center space-x-2.5 my-1">
                    <div className="w-14 h-[68px] rounded-lg bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {previewStudent.photo_data ? (
                        <img src={previewStudent.photo_data} alt="Photo" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-1">
                          <User className="w-5 h-5 text-slate-500 mx-auto" />
                          <span className="text-[7.5px] text-slate-400 font-semibold block leading-tight">Photo</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-0.5 text-xs overflow-hidden flex-1">
                      <p className="font-extrabold text-white text-xs truncate">{previewStudent.last_name} {previewStudent.first_name}</p>
                      <p className="font-mono text-[11px] text-amber-400 font-bold">{previewStudent.matricule}</p>
                      <p className="text-[9.5px] text-slate-300">Classe : <strong className="text-white">{previewStudent.class_name || '—'}</strong></p>
                      <p className="text-[9.5px] text-slate-300">Né(e) le : {previewStudent.birth_date || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between pt-1.5 border-t border-blue-500/20 text-[9px]">
                    <div>
                      <p className="text-[8px] text-slate-400 font-medium">Signature de la Direction :</p>
                      <p className="font-serif italic text-blue-200 text-[11px] leading-tight">Direction Générale</p>
                    </div>
                    {qrCodeDataUrls[previewStudent.id] && (
                      <div className="bg-white p-0.5 rounded-md shadow-xs">
                        <img src={qrCodeDataUrls[previewStudent.id]} alt="QR" className="w-8 h-8 object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* VERSO */}
              <div className="space-y-1 text-center w-full">
                <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">VERSO DE LA CARTE</span>
                <div className="w-full max-w-[342px] h-[216px] mx-auto bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border-2 border-blue-500 rounded-2xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-blue-500/30 pb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Règlement & Conditions</span>
                    <span className="text-[8.5px] bg-blue-600 px-1.5 py-0.5 rounded font-mono font-bold">VERSO</span>
                  </div>
                  <div className="text-[8.5px] text-slate-300 space-y-1 text-left leading-snug">
                    <p>1. Cette carte est strictement personnelle et incessible.</p>
                    <p>2. Elle doit être présentée à toute réquisition au sein de l'établissement <strong className="text-white">{establishment?.name}</strong>.</p>
                    <p>3. En cas de perte, veuillez aviser immédiatement la direction.</p>
                    <p className="font-mono text-[7.5px] text-blue-400 mt-1">Code Établissement : {establishment?.code} • Contact : {establishment?.phone || '—'}</p>
                  </div>
                  <div className="text-center pt-1 border-t border-blue-500/20 text-[7.5px] text-slate-400">
                    Plateforme Eco GES • Tous droits réservés
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                disabled={printingStudentId === previewStudent.id}
                onClick={async () => {
                  await handlePrintPdf(previewStudent);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2 border border-slate-700 disabled:opacity-50"
              >
                {printingStudentId === previewStudent.id ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 shrink-0" />
                )}
                <span>Imprimer la carte (Recto-Verso)</span>
              </button>

              <button
                type="button"
                disabled={downloadingStudentId === previewStudent.id}
                onClick={async () => {
                  await handleDownloadPdf(previewStudent);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {downloadingStudentId === previewStudent.id ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 shrink-0" />
                )}
                <span>{downloadingStudentId === previewStudent.id ? 'Téléchargement...' : 'Télécharger en PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewStudent(null)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer border border-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
