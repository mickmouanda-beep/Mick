import { hashPassword, generateToken, logAudit, AuthUser } from './auth.ts';
import { DeveloperStats } from '../types.ts';
import {
  setEstablishment,
  getEstablishment,
  setTenantUser,
  setSubscription,
  getSubscription,
  listEstablishments,
  listDocs,
  getDocData,
  setDocData,
  deleteDocData,
} from './firestore_db.ts';

export interface CreateSchoolInput {
  name: string;
  code: string;
  city: string;
  country?: string;
  address?: string;
  phone?: string;
  email?: string;
  motto?: string;
  academic_year?: string;
  active_cycles?: string[];
  logo_url?: string;
  authorization_code?: string;
  promoteurFullName?: string;
  promoteurUsername?: string;
  promoteurEmail?: string;
  promoteurPassword?: string;
  promoteurPhone?: string;
  directorFullName?: string;
  directorUsername?: string;
  directorEmail?: string;
  directorPassword?: string;
  directorPhone?: string;
}

/**
 * Génère une chaîne de code d'autorisation unique, cryptographiquement robuste et facile à lire.
 * Format standard : ECO-AUTH-XXXX-XXXX-XXXX
 */
export function generateAuthCodeString(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const segment = (len: number) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `ECO-AUTH-${segment(4)}-${segment(4)}-${segment(4)}`;
}

/**
 * Normalise et vérifie la disponibilité d'un code d'établissement (ex: ECO-001, CS-REN-BZV)
 */
export async function isSchoolCodeAvailable(code: string, excludeId?: string): Promise<boolean> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return false;

  try {
    const fsEsts = await listEstablishments();
    const existingFs = (fsEsts || []).find(
      (e: any) => e.code && e.code.toUpperCase() === cleanCode && e.id !== excludeId
    );
    return !existingFs;
  } catch {
    return true;
  }
}

/**
 * Vérifie l'authenticité et la validité d'un code d'autorisation de création.
 */
export async function verifyCreationAuthorizationCode(code: string): Promise<{
  valid: boolean;
  authorization?: any;
  error?: string;
}> {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, error: "Veuillez saisir un code d'autorisation." };
  }

  const allAuths = await listDocs<any>('creation_authorizations');
  const record = (allAuths || []).find((a: any) => (a.code || '').toUpperCase() === cleanCode);

  if (!record) {
    return {
      valid: false,
      error: "Code d'autorisation invalide. Aucun enregistrement trouvé pour ce code.",
    };
  }

  if (record.status === 'USED') {
    return {
      valid: false,
      error: `Ce code d'autorisation a déjà été utilisé le ${record.used_at || ''} pour créer l'établissement "${record.created_establishment_name || 'Inconnu'}".`,
    };
  }

  if (record.status === 'REVOKED') {
    return {
      valid: false,
      error: "Ce code d'autorisation a été révoqué par le gestionnaire de la plateforme.",
    };
  }

  if (record.expires_at) {
    const expTime = new Date(record.expires_at).getTime();
    if (Date.now() > expTime) {
      await setDocData('creation_authorizations', record.id, { ...record, status: 'EXPIRED' });
      return {
        valid: false,
        error: "Ce code d'autorisation est expiré. Veuillez solliciter un nouveau code auprès du développeur.",
      };
    }
  }

  if (record.status !== 'AVAILABLE') {
    return {
      valid: false,
      error: `Ce code d'autorisation n'est pas disponible (Statut : ${record.status}).`,
    };
  }

  return {
    valid: true,
    authorization: {
      id: record.id,
      code: record.code,
      promoter_name: record.promoter_name,
      promoter_email: record.promoter_email,
      promoter_phone: record.promoter_phone,
      notes: record.notes,
      expires_at: record.expires_at,
    },
  };
}

/**
 * Crée un nouveau code d'autorisation de création d'école (par le Développeur)
 */
export async function createAuthorizationCode(input: {
  promoter_name: string;
  promoter_email?: string;
  promoter_phone?: string;
  notes?: string;
  validityDays?: number;
  created_by_user_id?: string;
  created_by_name?: string;
}): Promise<any> {
  if (!input.promoter_name?.trim()) {
    throw new Error('Le nom complet du promoteur bénéficiaire est obligatoire.');
  }

  const allAuths = await listDocs<any>('creation_authorizations');
  let code = generateAuthCodeString();
  let attempts = 0;
  while ((allAuths || []).some((a: any) => a.code === code) && attempts < 10) {
    code = generateAuthCodeString();
    attempts++;
  }

  const id = `AUTH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  let expiresAt: string | null = null;
  if (input.validityDays && input.validityDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() + input.validityDays);
    expiresAt = d.toISOString();
  }

  const authDoc = {
    id,
    code,
    promoter_name: input.promoter_name.trim(),
    promoter_email: input.promoter_email?.trim() || null,
    promoter_phone: input.promoter_phone?.trim() || null,
    notes: input.notes?.trim() || null,
    status: 'AVAILABLE',
    created_by_user_id: input.created_by_user_id || 'DEV-ADMIN',
    created_by_name: input.created_by_name || 'Développeur Eco GES',
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
  };

  await setDocData('creation_authorizations', id, authDoc);
  return authDoc;
}

/**
 * Révoque un code d'autorisation encore disponible
 */
export async function revokeAuthorizationCode(
  codeId: string,
  revokedBy: string,
  reason?: string
): Promise<any> {
  const existing = await getDocData<any>('creation_authorizations', codeId);
  if (!existing) {
    throw new Error("Code d'autorisation introuvable.");
  }
  if (existing.status === 'USED') {
    throw new Error("Impossible de révoquer un code d'autorisation déjà consommé.");
  }

  const updated = {
    ...existing,
    status: 'REVOKED',
    revoked_at: new Date().toISOString(),
    revoked_by: revokedBy,
    revocation_reason: reason || 'Révocation manuelle par le gestionnaire',
  };

  await setDocData('creation_authorizations', codeId, updated);
  return updated;
}

/**
 * Enregistre un nouvel établissement scolaire avec son espace de travail dédié.
 * EXIGE un code d'autorisation valide délivré par le Développeur.
 */
export async function registerSchool(input: CreateSchoolInput): Promise<{
  token: string;
  user: AuthUser;
  establishment: any;
}> {
  const cleanCode = (input?.code || (input as any)?.school_code || '').trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Le code unique de l'établissement est obligatoire.");
  }

  if (!(await isSchoolCodeAvailable(cleanCode))) {
    throw new Error(`Le code d'établissement "${cleanCode}" est déjà utilisé par une autre école. Veuillez en choisir un autre.`);
  }

  const authCodeRaw = (input?.authorization_code || (input as any)?.authorizationCode || '').trim().toUpperCase();
  if (!authCodeRaw) {
    throw new Error("Un code d'autorisation unique Eco GES est obligatoire pour inscrire un établissement. Seul le Développeur de la plateforme peut vous délivrer ce code.");
  }

  const check = await verifyCreationAuthorizationCode(authCodeRaw);
  if (!check.valid || !check.authorization) {
    throw new Error(check.error || "Code d'autorisation Eco GES invalide, expiré ou révoqué.");
  }
  const authRecord = check.authorization;

  const establishmentId = `EST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const academicYear = input.academic_year?.trim() || '2026-2027';
  const country = input.country || 'Congo-Brazzaville';
  const activeCycles = Array.isArray(input.active_cycles) && input.active_cycles.length > 0
    ? input.active_cycles
    : ['PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'];

  const promoteurFullName = (input.promoteurFullName || input.directorFullName || '').trim();
  const promoteurUsername = (input.promoteurUsername || input.directorUsername || '').trim().toLowerCase();
  const promoteurEmail = (input.promoteurEmail || input.directorEmail || '')?.trim() || null;
  const rawPassword = input.promoteurPassword || input.directorPassword || '';
  const promoteurPhone = (input.promoteurPhone || input.directorPhone || '')?.trim() || null;

  if (!promoteurFullName || !promoteurUsername || !rawPassword) {
    throw new Error("Le nom complet, l'identifiant et le mot de passe du promoteur sont obligatoires.");
  }

  const promoteurId = `USR-PROM-${Date.now().toString(36).toUpperCase()}`;
  const passwordHash = await hashPassword(rawPassword);

  const formulaKey = ((input as any).formula || 'EXCELLENCE').toUpperCase();
  const formulaDefaults: Record<string, { name: string; max_students: number; max_staff: number }> = {
    EXCELLENCE: { name: 'Formule Excellence — Illimité', max_students: 1500, max_staff: 150 },
    PACK_MOYEN: { name: 'Formule Pack Moyen', max_students: 700, max_staff: 80 },
    START: { name: 'Formule Start', max_students: 400, max_staff: 50 },
  };
  const chosenFormula = formulaDefaults[formulaKey] || formulaDefaults.EXCELLENCE;
  const subId = `SUB-${Date.now().toString(36).toUpperCase()}`;
  const licenseRef = `LIC-${new Date().getFullYear()}-${cleanCode}`;

  // 1. Enregistrement de l'établissement dans Firestore
  await setEstablishment(establishmentId, {
    id: establishmentId,
    name: input.name.trim(),
    code: cleanCode,
    country,
    city: input.city.trim(),
    address: input.address?.trim() || '',
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    motto: input.motto?.trim() || '',
    academic_year: academicYear,
    currency: 'FCFA',
    active_cycles: activeCycles,
    logo_url: input.logo_url || null,
    status: 'ACTIVE',
    auth_code_used: authCodeRaw,
    promoter_id: promoteurId,
    promoter_name: promoteurFullName,
    promoter_email: promoteurEmail,
    promoter_phone: promoteurPhone,
    created_at: new Date().toISOString(),
  });

  // 2. Compte Promoteur dans Firestore
  const authUser: AuthUser = {
    id: promoteurId,
    establishment_id: establishmentId,
    username: promoteurUsername,
    email: promoteurEmail,
    full_name: promoteurFullName,
    role: 'PROMOTEUR',
    status: 'ACTIVE',
  };

  await setTenantUser(establishmentId, {
    ...authUser,
    password_hash: passwordHash,
    phone: promoteurPhone,
    created_at: new Date().toISOString(),
  });

  // 3. Licence commerciale dans Firestore
  await setSubscription(establishmentId, {
    id: subId,
    establishment_id: establishmentId,
    plan_name: formulaKey,
    formula: formulaKey,
    formula_name: chosenFormula.name,
    license_ref: licenseRef,
    status: 'ACTIVE',
    max_students: chosenFormula.max_students,
    max_users: chosenFormula.max_staff,
    duration_months: 12,
    activated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    renewal_count: 0,
  });

  // 4. Consommation du code d'autorisation dans Firestore
  await setDocData('creation_authorizations', authRecord.id, {
    ...authRecord,
    status: 'USED',
    used_at: new Date().toISOString(),
    used_by_user_id: promoteurId,
    used_by_username: promoteurUsername,
    created_establishment_id: establishmentId,
    created_establishment_name: input.name.trim(),
  });

  // 5. Journal d'audit
  logAudit(
    establishmentId,
    promoteurId,
    promoteurFullName,
    'INSCRIPTION_ETABLISSEMENT_CODE_VALIDE',
    'ESTABLISHMENT',
    establishmentId,
    {
      name: input.name,
      code: cleanCode,
      codeAutorisationUtilise: authCodeRaw,
      promoteur: promoteurFullName,
      ville: input.city,
    }
  );

  const token = generateToken(authUser);

  return {
    token,
    user: authUser,
    establishment: {
      id: establishmentId,
      name: input.name.trim(),
      code: cleanCode,
      country,
      city: input.city.trim(),
      address: input.address?.trim() || '',
      phone: input.phone?.trim() || '',
      email: input.email?.trim() || '',
      motto: input.motto?.trim() || '',
      academic_year: academicYear,
      currency: 'FCFA',
      active_cycles: activeCycles,
      logo_url: input.logo_url || null,
      status: 'ACTIVE',
      auth_code_used: authCodeRaw,
    },
  };
}

/**
 * Création directe d'un établissement scolaire par le Gestionnaire d'application (ADMIN_GENERAL).
 */
export async function registerSchoolDirectAdmin(input: any, adminUserId: string, adminName: string): Promise<any> {
  const cleanCode = (input.code || '').trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Le code unique de l'établissement est obligatoire.");
  }

  if (!(await isSchoolCodeAvailable(cleanCode))) {
    throw new Error(`Le code d'établissement "${cleanCode}" est déjà utilisé par une autre école. Veuillez en choisir un autre.`);
  }

  const establishmentId = `EST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const academicYear = input.academic_year?.trim() || '2026-2027';
  const country = input.country || 'Congo-Brazzaville';
  const activeCycles = Array.isArray(input.active_cycles) && input.active_cycles.length > 0
    ? input.active_cycles
    : ['PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'];

  const promoteurFullName = (input.promoteurFullName || input.directorFullName || '').trim();
  const promoteurUsername = (input.promoteurUsername || input.directorUsername || '').trim().toLowerCase();
  const promoteurEmail = (input.promoteurEmail || input.directorEmail || '')?.trim() || null;
  const rawPassword = input.promoteurPassword || input.directorPassword || '';
  const promoteurPhone = (input.promoteurPhone || input.directorPhone || '')?.trim() || null;

  if (!promoteurFullName || !promoteurUsername || !rawPassword) {
    throw new Error("Le nom complet, l'identifiant et le mot de passe du promoteur sont obligatoires.");
  }

  const promoteurId = `USR-PROM-${Date.now().toString(36).toUpperCase()}`;
  const passwordHash = await hashPassword(rawPassword);

  const formulaKey = ((input as any).formula || 'EXCELLENCE').toUpperCase();
  const formulaDefaults: Record<string, { name: string; max_students: number; max_staff: number }> = {
    EXCELLENCE: { name: 'Formule Excellence — Illimité', max_students: 1500, max_staff: 150 },
    PACK_MOYEN: { name: 'Formule Pack Moyen', max_students: 700, max_staff: 80 },
    START: { name: 'Formule Start', max_students: 400, max_staff: 50 },
  };
  const chosenFormula = formulaDefaults[formulaKey] || formulaDefaults.EXCELLENCE;
  const subId = `SUB-${Date.now().toString(36).toUpperCase()}`;
  const licenseRef = `LIC-${new Date().getFullYear()}-${cleanCode}`;

  await setEstablishment(establishmentId, {
    id: establishmentId,
    name: input.name.trim(),
    code: cleanCode,
    country,
    city: input.city.trim(),
    address: input.address?.trim() || '',
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    motto: input.motto?.trim() || '',
    academic_year: academicYear,
    currency: 'FCFA',
    active_cycles: activeCycles,
    logo_url: input.logo_url || null,
    status: 'ACTIVE',
    auth_code_used: 'CREATION_DIRECTE_GESTIONNAIRE',
    promoter_id: promoteurId,
    promoter_name: promoteurFullName,
    promoter_email: promoteurEmail,
    promoter_phone: promoteurPhone,
    created_at: new Date().toISOString(),
  });

  await setTenantUser(establishmentId, {
    id: promoteurId,
    establishment_id: establishmentId,
    username: promoteurUsername,
    email: promoteurEmail,
    password_hash: passwordHash,
    full_name: promoteurFullName,
    phone: promoteurPhone,
    role: 'PROMOTEUR',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  });

  await setSubscription(establishmentId, {
    id: subId,
    establishment_id: establishmentId,
    plan_name: formulaKey,
    formula: formulaKey,
    formula_name: chosenFormula.name,
    license_ref: licenseRef,
    status: 'ACTIVE',
    max_students: chosenFormula.max_students,
    max_users: chosenFormula.max_staff,
    duration_months: 12,
    activated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    renewal_count: 0,
  });

  logAudit(
    establishmentId,
    adminUserId,
    adminName,
    'CREATION_DIRECTE_ETABLISSEMENT_GESTIONNAIRE',
    'ESTABLISHMENT',
    establishmentId,
    {
      name: input.name,
      code: cleanCode,
      formule: chosenFormula.name,
      promoteur: promoteurFullName,
      ville: input.city,
    }
  );

  return {
    id: establishmentId,
    name: input.name.trim(),
    code: cleanCode,
    city: input.city.trim(),
    academic_year: academicYear,
    status: 'ACTIVE',
    promoter_name: promoteurFullName,
    promoter_username: promoteurUsername,
    formula: formulaKey,
  };
}

/**
 * Statistiques globales du tableau de bord développeur (calculées à partir des données Firestore réelles)
 */
export async function getDeveloperMetrics(): Promise<DeveloperStats> {
  const allEsts = await listEstablishments();
  const allSubs = await listDocs('subscriptions');
  const allAuths = await listDocs('creation_authorizations');
  const allUsers = await listDocs('users');

  const activeEsts = (allEsts || []).filter(e => e.code !== 'ECO-HQ' && (!e.status || e.status === 'ACTIVE'));
  const pendingEsts = (allEsts || []).filter(e => e.status === 'PENDING_ACTIVATION');
  const suspendedEsts = (allEsts || []).filter(e => e.status === 'SUSPENDED');

  const activeCodes = (allAuths || []).filter(a => a.status === 'AVAILABLE');
  const usedCodes = (allAuths || []).filter(a => a.status === 'USED');
  const expiredOrRevoked = (allAuths || []).filter(a => ['EXPIRED', 'REVOKED'].includes(a.status));

  const promoters = (allUsers || []).filter(u => u.role === 'PROMOTEUR');

  const activeLicenses = (allSubs || []).filter(s => {
    const est = (allEsts || []).find(e => e.id === s.establishment_id);
    return est && est.code !== 'ECO-HQ' && (s.status === 'ACTIVE' || !s.status);
  });

  const expiredLicenses = (allSubs || []).filter(s => {
    const est = (allEsts || []).find(e => e.id === s.establishment_id);
    const expiresDate = new Date(s.expires_at || 0);
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    return est && est.code !== 'ECO-HQ' && (expiresDate <= soon || s.status === 'SUSPENDED');
  });

  const distExcellence = (allSubs || []).filter(s => {
    const est = (allEsts || []).find(e => e.id === s.establishment_id);
    return est && est.code !== 'ECO-HQ' && (['EXCELLENCE', 'STANDARD'].includes(s.formula || s.plan_name || ''));
  });

  const distMoyen = (allSubs || []).filter(s => {
    const est = (allEsts || []).find(e => e.id === s.establishment_id);
    return est && est.code !== 'ECO-HQ' && (['PACK_MOYEN'].includes(s.formula || s.plan_name || ''));
  });

  const distStart = (allSubs || []).filter(s => {
    const est = (allEsts || []).find(e => e.id === s.establishment_id);
    return est && est.code !== 'ECO-HQ' && (['START', 'STARTER'].includes(s.formula || s.plan_name || ''));
  });

  return {
    totalEstablishments: (allEsts || []).filter(e => e.code !== 'ECO-HQ').length,
    activeEstablishments: activeEsts.length,
    pendingEstablishments: pendingEsts.length,
    suspendedEstablishments: suspendedEsts.length,
    totalCodes: (allAuths || []).length,
    availableCodes: activeCodes.length,
    usedCodes: usedCodes.length,
    expiredOrRevokedCodes: expiredOrRevoked.length,
    totalPromoters: promoters.length,
    activeLicenses: activeLicenses.length,
    expiredOrExpiringLicenses: expiredLicenses.length,
    formulaDistribution: {
      excellence: distExcellence.length,
      packMoyen: distMoyen.length,
      start: distStart.length,
    },
  };
}

/**
 * Récupère tous les établissements pour la console Développeur avec détails opérationnels depuis Firestore
 */
export async function getDeveloperEstablishments(filters?: {
  search?: string;
  status?: string;
  city?: string;
}): Promise<any[]> {
  const allEsts = await listEstablishments();
  const allSubs = await listDocs('subscriptions');
  const allUsers = await listDocs('users');

  const filtered = (allEsts || []).filter(e => e.code !== 'ECO-HQ').map((est: any) => {
    let activeCycles = [];
    try {
      activeCycles = typeof est.active_cycles === 'string' ? JSON.parse(est.active_cycles) : (est.active_cycles || []);
    } catch {
      activeCycles = [];
    }

    const sub = (allSubs || []).find((s: any) => s.establishment_id === est.id);
    const estUsers = (allUsers || []).filter((u: any) => u.establishment_id === est.id);
    const staffCount = estUsers.filter((u: any) => !['ELEVE', 'PARENT'].includes(u.role)).length;

    return {
      ...est,
      active_cycles: activeCycles,
      status: est.status || 'ACTIVE',
      student_count: est.student_count || 0,
      staff_count: staffCount,
      user_count: estUsers.length,
      formula: sub?.formula || sub?.plan_name || 'EXCELLENCE',
      formula_name: sub?.formula_name || 'Formule Excellence — Illimité',
      license_ref: sub?.license_ref || `LIC-2026-${est.code}`,
      max_students: sub?.max_students || 1500,
      max_staff: sub?.max_users || 150,
      subscription_status: sub?.status || 'ACTIVE',
      subscription_expires_at: sub?.expires_at,
      subscription_activated_at: sub?.activated_at || est.created_at,
      renewal_count: sub?.renewal_count || 0,
    };
  });

  return filtered.filter(e => {
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      const match = (e.name || '').toLowerCase().includes(q) ||
                    (e.code || '').toLowerCase().includes(q) ||
                    (e.city || '').toLowerCase().includes(q) ||
                    (e.promoter_name || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filters?.status && filters.status !== 'ALL') {
      if ((e.status || 'ACTIVE') !== filters.status) return false;
    }
    if (filters?.city && filters.city !== 'ALL') {
      if ((e.city || '').toLowerCase() !== filters.city.toLowerCase()) return false;
    }
    return true;
  }).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

/**
 * Récupère la liste complète des licences pour la rubrique « Gestion des licences »
 */
export async function getDeveloperLicenses(): Promise<any[]> {
  const allEsts = await listEstablishments();
  const allSubs = await listDocs('subscriptions');

  const licenses = (allSubs || []).map((sub) => {
    const est = (allEsts || []).find(e => e.id === sub.establishment_id);
    if (!est) return null;

    return {
      establishment_id: est.id,
      establishment_name: est.name,
      establishment_code: est.code,
      city: est.city,
      country: est.country,
      logo_url: est.logo_url,
      promoter_name: est.promoter_name,
      subscription_id: sub.id,
      license_ref: sub.license_ref || `LIC-2026-${est.code}`,
      formula: sub.formula || sub.plan_name || 'EXCELLENCE',
      formula_name: sub.formula_name || 'Formule Excellence — Illimité',
      status: sub.status || 'ACTIVE',
      max_students: sub.max_students || 1500,
      max_staff: sub.max_users || 150,
      activated_at: sub.activated_at || est.created_at,
      expires_at: sub.expires_at,
      renewal_count: sub.renewal_count || 0,
    };
  }).filter(l => l !== null);

  return licenses.map((lic: any) => {
    const expiresMs = lic.expires_at ? new Date(lic.expires_at).getTime() : Date.now() + 365 * 86400000;
    const nowMs = Date.now();
    const daysRemaining = Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;

    return {
      ...lic,
      days_remaining: daysRemaining,
      is_expired: isExpired,
      student_quota_percent: 0,
      staff_quota_percent: 0,
    };
  });
}

/**
 * Renouvelle la licence d'un établissement dans Firestore
 */
export async function renewEstablishmentLicense(
  establishmentId: string,
  durationMonths: number = 12,
  operatorName = "Gestionnaire d'application",
  notes?: string
): Promise<any> {
  let sub = await getSubscription(establishmentId);
  const est = await getEstablishment(establishmentId);
  if (!sub) {
    const subId = `SUB-${Date.now().toString(36).toUpperCase()}`;
    const licRef = `LIC-${new Date().getFullYear()}-${est?.code || 'GEN'}`;
    sub = {
      id: subId,
      establishment_id: establishmentId,
      plan_name: 'EXCELLENCE',
      formula: 'EXCELLENCE',
      formula_name: 'Formule Excellence — Illimité',
      license_ref: licRef,
      status: 'ACTIVE',
      max_students: 1500,
      max_users: 150,
      duration_months: 12,
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      renewal_count: 0
    };
    await setSubscription(establishmentId, sub);
  }

  const previousExpires = sub.expires_at || new Date().toISOString().split('T')[0];
  const prevDate = new Date(previousExpires);
  const baseDate = isNaN(prevDate.getTime()) || prevDate.getTime() < Date.now() ? new Date() : prevDate;
  baseDate.setMonth(baseDate.getMonth() + durationMonths);
  const newExpiresAt = baseDate.toISOString().split('T')[0];

  const renewalId = `REN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const renewalRecord = {
    id: renewalId,
    subscription_id: sub.id,
    establishment_id: establishmentId,
    formula: sub.formula || 'EXCELLENCE',
    duration_months: durationMonths,
    previous_expires_at: previousExpires,
    new_expires_at: newExpiresAt,
    notes: notes || `Renouvellement officiel de ${durationMonths} mois`,
    renewed_by_name: operatorName,
    created_at: new Date().toISOString()
  };
  await setDocData('license_renewals', renewalId, renewalRecord);

  const updatedSub = {
    ...sub,
    expires_at: newExpiresAt,
    status: 'ACTIVE',
    renewed_at: new Date().toISOString(),
    renewal_count: (sub.renewal_count || 0) + 1
  };
  await setSubscription(establishmentId, updatedSub);

  logAudit(
    establishmentId,
    'CENTRAL-PLATFORM',
    operatorName,
    'RENOUVELLEMENT_LICENCE',
    'SUBSCRIPTION',
    sub.id,
    { previousExpires, newExpiresAt, durationMonths, notes }
  );

  return {
    success: true,
    renewalId,
    previousExpires,
    newExpiresAt,
    durationMonths,
  };
}

/**
 * Modifie la formule commerciale et les plafonds d'un établissement dans Firestore
 */
export async function updateEstablishmentLicenseFormula(
  establishmentId: string,
  formulaKey: 'EXCELLENCE' | 'PACK_MOYEN' | 'START',
  operatorName = "Gestionnaire d'application",
  notes?: string
): Promise<any> {
  let sub = await getSubscription(establishmentId);
  const est = await getEstablishment(establishmentId);
  const formulas: Record<string, { name: string; max_students: number; max_staff: number }> = {
    EXCELLENCE: { name: 'Formule Excellence — Illimité', max_students: 1500, max_staff: 150 },
    PACK_MOYEN: { name: 'Formule Pack Moyen', max_students: 700, max_staff: 80 },
    START: { name: 'Formule Start', max_students: 400, max_staff: 50 },
  };
  const target = formulas[formulaKey] || formulas.EXCELLENCE;

  if (!sub) {
    const subId = `SUB-${Date.now().toString(36).toUpperCase()}`;
    const licRef = `LIC-${new Date().getFullYear()}-${est?.code || 'GEN'}`;
    sub = {
      id: subId,
      establishment_id: establishmentId,
      plan_name: formulaKey,
      formula: formulaKey,
      formula_name: target.name,
      license_ref: licRef,
      status: 'ACTIVE',
      max_students: target.max_students,
      max_users: target.max_staff,
      duration_months: 12,
      activated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      renewal_count: 0
    };
  } else {
    sub = {
      ...sub,
      formula: formulaKey,
      formula_name: target.name,
      max_students: target.max_students,
      max_users: target.max_staff
    };
  }
  await setSubscription(establishmentId, sub);

  logAudit(
    establishmentId,
    'CENTRAL-PLATFORM',
    operatorName,
    'MODIFICATION_FORMULE_LICENCE',
    'SUBSCRIPTION',
    sub.id,
    {
      ancienneFormule: sub.formula || sub.plan_name,
      nouvelleFormule: formulaKey,
      nouveauxPlafonds: { max_students: target.max_students, max_staff: target.max_staff },
      notes,
    }
  );

  return {
    success: true,
    formula: formulaKey,
    formula_name: target.name,
    max_students: target.max_students,
    max_staff: target.max_staff,
  };
}

/**
 * Met à jour le statut d'un établissement (ACTIVE, SUSPENDED, DELETED) dans Firestore
 */
export async function changeEstablishmentStatus(
  establishmentId: string,
  newStatus: 'ACTIVE' | 'SUSPENDED' | 'DELETED',
  reason?: string,
  operatorName = 'Développeur Eco GES'
): Promise<any> {
  if (establishmentId === 'EST-ECO-HQ') {
    throw new Error('Impossible de modifier le statut de la plateforme centrale.');
  }

  const est = await getEstablishment(establishmentId);
  if (!est) {
    throw new Error('Établissement introuvable.');
  }

  const updated: any = { ...est, status: newStatus };
  if (newStatus === 'SUSPENDED') {
    updated.suspended_at = new Date().toISOString();
    updated.suspension_reason = reason || 'Suspension administrative par la direction centrale';
    updated.suspended_by = operatorName;
  } else if (newStatus === 'ACTIVE') {
    updated.activated_at = new Date().toISOString();
    updated.suspended_at = null;
    updated.suspension_reason = null;
    updated.suspended_by = null;
  } else if (newStatus === 'DELETED') {
    updated.deleted_at = new Date().toISOString();
    updated.deletion_reason = reason || 'Désactivation / suppression logique';
  }

  await setEstablishment(establishmentId, updated);

  logAudit(
    establishmentId,
    'DEV-PLATFORM',
    operatorName,
    `CHANGEMENT_STATUT_${newStatus}`,
    'ESTABLISHMENT',
    establishmentId,
    { ancienStatut: est.status || 'ACTIVE', nouveauStatut: newStatus, motif: reason }
  );

  return updated;
}

/**
 * Suppression définitive d'un établissement dans Firestore
 */
export async function deleteEstablishmentPermanently(
  establishmentId: string,
  operatorName = 'Développeur Eco GES'
): Promise<void> {
  if (establishmentId === 'EST-ECO-HQ') {
    throw new Error('Impossible de supprimer la plateforme centrale.');
  }

  const est = await getEstablishment(establishmentId);
  if (!est) {
    throw new Error('Établissement introuvable.');
  }

  logAudit(
    'EST-ECO-HQ',
    'DEV-PLATFORM',
    operatorName,
    'SUPPRESSION_DEFINITIVE_ETABLISSEMENT',
    'ESTABLISHMENT',
    establishmentId,
    { name: est.name, code: est.code }
  );

  await deleteDocData('establishments', establishmentId);
  await deleteDocData('subscriptions', establishmentId);
}

/**
 * Récupère la liste des promoteurs enregistrés et leurs établissements depuis Firestore
 */
export async function getRegisteredPromoters(): Promise<any[]> {
  const allUsers = await listDocs<any>('users');
  const allEsts = await listEstablishments();
  const estMap = new Map((allEsts || []).map(e => [e.id, e]));

  const promoters = (allUsers || [])
    .filter(u => u.role === 'PROMOTEUR')
    .map(u => {
      const est = estMap.get(u.establishment_id);
      return {
        id: u.id,
        full_name: u.full_name,
        username: u.username,
        email: u.email,
        phone: u.phone,
        status: u.status,
        created_at: u.created_at,
        establishment_id: u.establishment_id,
        establishment_name: est?.name || 'Inconnu',
        establishment_code: est?.code || 'N/A',
        establishment_city: est?.city || 'N/A',
        establishment_status: est?.status || 'ACTIVE',
      };
    });

  return promoters.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

/**
 * Initialise la plateforme centrale (désactivé au démarrage pour préserver Firestore)
 */
export async function ensureMultiSchoolTestEnvironments(): Promise<void> {
  return;
}

/**
 * Recherche les comptes promoteurs et leurs établissements associés depuis Firestore
 */
export async function searchPromotersNetwork(searchTerm?: string): Promise<any[]> {
  const allPromoters = await getRegisteredPromoters();
  if (!searchTerm || !searchTerm.trim()) {
    return allPromoters.map(p => ({
      promoter_user_id: p.id,
      username: p.username,
      promoter_email: p.email,
      promoter_name: p.full_name,
      promoter_phone: p.phone,
      promoter_status: p.status,
      promoter_created_at: p.created_at,
      establishment_id: p.establishment_id,
      establishment_name: p.establishment_name,
      establishment_code: p.establishment_code,
      city: p.establishment_city,
      country: 'Congo-Brazzaville',
      academic_year: '2026-2027',
      establishment_status: p.establishment_status,
    }));
  }

  const q = searchTerm.trim().toLowerCase();
  return allPromoters
    .filter(p =>
      (p.establishment_name || '').toLowerCase().includes(q) ||
      (p.establishment_code || '').toLowerCase().includes(q) ||
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    )
    .map(p => ({
      promoter_user_id: p.id,
      username: p.username,
      promoter_email: p.email,
      promoter_name: p.full_name,
      promoter_phone: p.phone,
      promoter_status: p.status,
      promoter_created_at: p.created_at,
      establishment_id: p.establishment_id,
      establishment_name: p.establishment_name,
      establishment_code: p.establishment_code,
      city: p.establishment_city,
      country: 'Congo-Brazzaville',
      academic_year: '2026-2027',
      establishment_status: p.establishment_status,
    }));
}
