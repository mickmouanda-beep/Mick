import React from 'react';
import { PayrollRecord, Establishment } from '../types.ts';
import { Printer, X, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PrintablePayslipProps {
  record: PayrollRecord;
  establishment: Establishment;
  onClose?: () => void;
}

// Helper pour convertir un nombre en lettres (français simplifié pour FCFA)
function numberToFrenchWords(n: number): string {
  if (n === 0) return 'Zéro Franc CFA';
  const units = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf'];
  const teens = ['Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf'];
  const tens = ['', 'Dix', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-dix', 'Quatre-vingts', 'Quatre-vingt-dix'];

  function convertGroup(val: number): string {
    let str = '';
    const h = Math.floor(val / 100);
    const rem = val % 100;

    if (h > 0) {
      if (h === 1) str += 'Cent ';
      else str += units[h] + ' Cent' + (rem === 0 ? 's ' : ' ');
    }

    if (rem > 0) {
      if (rem < 10) {
        str += units[rem] + ' ';
      } else if (rem < 20) {
        str += teens[rem - 10] + ' ';
      } else {
        const t = Math.floor(rem / 10);
        const u = rem % 10;
        if (t === 7 || t === 9) {
          str += tens[t - 1] + '-' + teens[u] + ' ';
        } else {
          str += tens[t] + (u === 1 && t !== 8 ? ' et Un ' : u > 0 ? '-' + units[u] + ' ' : ' ');
        }
      }
    }
    return str.trim();
  }

  const millions = Math.floor(n / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const remainder = Math.floor(n % 1000);

  let res = '';
  if (millions > 0) {
    res += (millions === 1 ? 'Un Million ' : convertGroup(millions) + ' Millions ');
  }
  if (thousands > 0) {
    res += (thousands === 1 ? 'Mille ' : convertGroup(thousands) + ' Mille ');
  }
  if (remainder > 0) {
    res += convertGroup(remainder) + ' ';
  }

  return res.trim() + ' Francs CFA';
}

export const PrintablePayslip: React.FC<PrintablePayslipProps> = ({ record, establishment, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const periodLabel = (() => {
    if (!record.period) return '';
    const [year, month] = record.period.split('-');
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${months[mIdx] || month} ${year}`;
  })();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full p-6 sm:p-8 my-8 relative printable-document font-sans text-xs">
        
        {/* Barre d'action à l'écran (masquée à l'impression) */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center space-x-2 text-indigo-950 font-bold">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Bulletin de Paie Officiel • Format Impression Directe</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le Bulletin</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ================= CORPS DU BULLETIN (IMPRIMABLE) ================= */}
        <div className="border border-slate-300 rounded-xl p-6 sm:p-8 bg-white space-y-6">
          
          {/* En-tête officiel établissement */}
          <div className="flex justify-between items-start gap-4 border-b-2 border-indigo-950 pb-4">
            <div className="flex items-center space-x-4">
              {establishment.logo_url ? (
                <img
                  src={establishment.logo_url}
                  alt={establishment.name}
                  className="w-16 h-16 object-contain rounded-lg border border-slate-200 p-1 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-indigo-950 text-white font-black text-xl flex items-center justify-center shrink-0">
                  {establishment.name ? establishment.name.substring(0, 2).toUpperCase() : 'EG'}
                </div>
              )}
              <div>
                <h1 className="font-black text-lg sm:text-xl text-indigo-950 uppercase tracking-tight">
                  {establishment.name}
                </h1>
                <p className="text-[11px] font-semibold text-slate-600">
                  {establishment.motto ? `« ${establishment.motto} »` : 'Enseignement Général & Technique'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {establishment.address ? `${establishment.address}, ` : ''}{establishment.city} • République du Congo
                </p>
                {establishment.phone && (
                  <p className="text-[10px] font-mono text-slate-600">Contact : {establishment.phone} {establishment.email ? `• ${establishment.email}` : ''}</p>
                )}
                <p className="text-[10px] font-mono text-indigo-900 font-bold">Année Scolaire : {establishment.academic_year}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 bg-indigo-950 text-white font-extrabold text-xs uppercase tracking-wider rounded">
                BULLETIN DE PAIE
              </span>
              <p className="text-xs font-bold text-slate-800 mt-1 uppercase">
                Période : <span className="text-indigo-900 font-black">{periodLabel}</span>
              </p>
              <p className="text-[10px] font-mono text-slate-500">Réf : {record.id}</p>
              <div className="mt-2 text-[10px]">
                {record.status === 'PAYE' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-emerald-800 bg-emerald-100 font-bold border border-emerald-300">
                    ACQUITTÉ / PAYÉ
                  </span>
                ) : record.status === 'VALIDE' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-blue-800 bg-blue-100 font-bold border border-blue-300">
                    VALIDÉ PAR DIRECTION
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-amber-800 bg-amber-100 font-bold border border-amber-300">
                    PROVISOIRE / EN COURS
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Fiche d'identification du salarié */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Nom & Prénoms</p>
              <p className="font-extrabold text-sm text-indigo-950">{record.full_name}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Matricule Salarié</p>
              <p className="font-mono font-bold text-xs text-slate-800">{record.employee_code}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Emploi / Fonction</p>
              <p className="font-semibold text-xs text-slate-800">{record.job_title}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Département / Service</p>
              <p className="font-semibold text-xs text-slate-800">{record.department}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Type de Contrat</p>
              <p className="font-semibold text-xs text-slate-800">{record.contract_type || 'CDI'}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Devise de Paiement</p>
              <p className="font-bold text-xs text-indigo-900">{establishment.currency || 'FCFA'}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Mode de Règlement</p>
              <p className="font-semibold text-xs text-slate-800">
                {record.payment_method ? record.payment_method.replace('_', ' ') : 'À définir'} 
                {record.transaction_ref ? ` • Réf : ${record.transaction_ref}` : ''}
              </p>
            </div>
          </div>

          {/* Tableau détaillé Gains & Retenues */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Colonne Gains / Rémunérations */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 font-bold text-slate-800 text-[11px] uppercase tracking-wider flex justify-between">
                <span>Désignation des Gains</span>
                <span>Montant (FCFA)</span>
              </div>
              <div className="divide-y divide-slate-200">
                <div className="px-3 py-2 flex justify-between text-xs">
                  <span>Salaire de base / Rémunération cours</span>
                  <span className="font-mono font-semibold">{record.base_salary.toLocaleString('fr-FR')}</span>
                </div>
                {record.bonuses > 0 && (
                  <div className="px-3 py-2 flex justify-between text-xs">
                    <span>Primes & Indemnités (Transport / Fonction)</span>
                    <span className="font-mono font-semibold">{record.bonuses.toLocaleString('fr-FR')}</span>
                  </div>
                )}
                {record.overtime_amount > 0 && (
                  <div className="px-3 py-2 flex justify-between text-xs">
                    <span>Heures supplémentaires ({record.overtime_hours}h)</span>
                    <span className="font-mono font-semibold text-indigo-900">+{record.overtime_amount.toLocaleString('fr-FR')}</span>
                  </div>
                )}
                <div className="px-3 py-2.5 bg-slate-50 font-bold flex justify-between text-xs border-t-2 border-slate-300">
                  <span className="uppercase text-slate-800">Total Salaire Brut</span>
                  <span className="font-mono text-indigo-950 font-black">{record.gross_amount.toLocaleString('fr-FR')}</span>
                </div>
              </div>
            </div>

            {/* Colonne Retenues / Déductions */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-300 font-bold text-slate-800 text-[11px] uppercase tracking-wider flex justify-between">
                <span>Désignation des Retenues</span>
                <span>Montant (FCFA)</span>
              </div>
              <div className="divide-y divide-slate-200">
                <div className="px-3 py-2 flex justify-between text-xs">
                  <span>Déduction absences / retards non justifiés</span>
                  <span className="font-mono font-semibold text-rose-700">
                    {record.deductions > 0 ? `-${record.deductions.toLocaleString('fr-FR')}` : '0'}
                  </span>
                </div>
                <div className="px-3 py-2 flex justify-between text-xs">
                  <span>Acomptes sur salaire déjà perçus</span>
                  <span className="font-mono font-semibold text-rose-700">
                    {record.advances > 0 ? `-${record.advances.toLocaleString('fr-FR')}` : '0'}
                  </span>
                </div>
                <div className="px-3 py-2 flex justify-between text-xs text-slate-500">
                  <span>Cotisations sociales & fiscales</span>
                  <span className="font-mono">Incluses</span>
                </div>
                <div className="px-3 py-2.5 bg-slate-50 font-bold flex justify-between text-xs border-t-2 border-slate-300">
                  <span className="uppercase text-slate-800">Total Déductions</span>
                  <span className="font-mono text-rose-700 font-black">
                    {(record.deductions + record.advances).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Synthèse : Net à payer */}
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-950">
                NET À PAYER AU SALARIÉ
              </p>
              <p className="text-xs font-semibold text-slate-700 italic mt-0.5">
                Arrêté à la somme de : <strong className="text-indigo-950">{numberToFrenchWords(record.net_amount)}</strong>
              </p>
              {record.notes && (
                <p className="text-[10px] text-slate-500 mt-1">Note de calcul : {record.notes}</p>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono text-2xl sm:text-3xl font-black text-indigo-950">
                {record.net_amount.toLocaleString('fr-FR')}
              </span>
              <span className="text-xs font-bold text-indigo-800 ml-1.5 uppercase">FCFA</span>
            </div>
          </div>

          {/* Émargements & Signatures */}
          <div className="pt-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center">
            <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[100px] flex flex-col justify-between">
              <p className="font-bold text-[10px] uppercase tracking-wider text-slate-600">
                Pour l'Établissement (Direction / Comptabilité)
              </p>
              <div className="text-[9px] text-slate-400 italic">
                Cachet et signature autorisée
              </div>
            </div>

            <div className="border border-dashed border-slate-300 rounded-xl p-4 min-h-[100px] flex flex-col justify-between">
              <p className="font-bold text-[10px] uppercase tracking-wider text-slate-600">
                Signature du Salarié précédée de la mention manuscrite « Lu et approuvé »
              </p>
              <div className="text-[9px] text-slate-400 italic">
                Date et signature
              </div>
            </div>
          </div>

          {/* Pied de page légal */}
          <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200">
            Document généré par la plateforme Eco GES • Logiciel certifié de gestion scolaire et administrative de la République du Congo • Réf : {establishment.code}
          </div>

        </div>

      </div>
    </div>
  );
};
