import { hashPassword, generateToken, logAudit, AuthUser } from './auth.ts';
import { run, queryOne, queryAll, saveDb } from './db.ts';
import { DeveloperStats } from '../types.ts';
import { setEstablishment, setTenantUser } from './firestore_db.ts';

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
  // Code d'autorisation obligatoire fourni par le Développeur
  authorization_code?: string;
  // Compte Administrateur de l'établissement : le Promoteur
  promoteurFullName?: string;
  promoteurUsername?: string;
  promoteurEmail?: string;
  promoteurPassword?: string;
  promoteurPhone?: string;
  // Compatibilité ascendante
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
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Caractères lisibles (sans 0, O, 1, I)
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
export function isSchoolCodeAvailable(code: string, excludeId?: string): boolean {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return false;
  let sql = 'SELECT id FROM establishments WHERE UPPER(code) = UPPER(?)';
  const params: any[] = [cleanCode];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  const existing = queryOne(sql, params);
  return !existing;
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

  const record = queryOne<any>(
    'SELECT * FROM creation_authorizations WHERE UPPER(code) = UPPER(?)',
    [cleanCode]
  );

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
      error: "Ce code d'autorisation a été révoqué par le développeur de la plateforme.",
    };
  }

  if (record.expires_at) {
    const expTime = new Date(record.expires_at).getTime();
    if (Date.now() > expTime) {
      run('UPDATE creation_authorizations SET status = "EXPIRED" WHERE id = ?', [record.id]);
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

  let code = generateAuthCodeString();
  // S'assurer de l'unicité
  let attempts = 0;
  while (queryOne('SELECT id FROM creation_authorizations WHERE code = ?', [code]) && attempts < 10) {
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

  run(`
    INSERT INTO creation_authorizations (
      id, code, promoter_name, promoter_email, promoter_phone, notes, status,
      created_by_user_id, created_by_name, created_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, CURRENT_TIMESTAMP, ?)
  `, [
    id,
    code,
    input.promoter_name.trim(),
    input.promoter_email?.trim() || null,
    input.promoter_phone?.trim() || null,
    input.notes?.trim() || null,
    input.created_by_user_id || 'DEV-ADMIN',
    input.created_by_name || 'Développeur Eco GES',
    expiresAt,
  ]);

  saveDb();
  return queryOne('SELECT * FROM creation_authorizations WHERE id = ?', [id]);
}

/**
 * Révoque un code d'autorisation encore disponible
 */
export async function revokeAuthorizationCode(
  codeId: string,
  revokedBy: string,
  reason?: string
): Promise<any> {
  const existing = queryOne<any>('SELECT * FROM creation_authorizations WHERE id = ?', [codeId]);
  if (!existing) {
    throw new Error("Code d'autorisation introuvable.");
  }
  if (existing.status === 'USED') {
    throw new Error("Impossible de révoquer un code d'autorisation déjà consommé.");
  }

  run(`
    UPDATE creation_authorizations
    SET status = 'REVOKED',
        revoked_at = CURRENT_TIMESTAMP,
        revoked_by = ?,
        revocation_reason = ?
    WHERE id = ?
  `, [revokedBy, reason || 'Révocation manuelle par le développeur', codeId]);

  saveDb();
  return queryOne('SELECT * FROM creation_authorizations WHERE id = ?', [codeId]);
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
  const cleanCode = input.code.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Le code unique de l'établissement est obligatoire.");
  }

  if (!isSchoolCodeAvailable(cleanCode)) {
    throw new Error(`Le code d'établissement "${cleanCode}" est déjà utilisé par une autre école. Veuillez en choisir un autre.`);
  }

  // 0. VÉRIFICATION STRICTE DU CODE D'AUTORISATION UNIQUE DU DÉVELOPPEUR
  const authCodeRaw = (input.authorization_code || '').trim().toUpperCase();
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

  // Compte Promoteur
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

  // 1. Insertion de l'établissement (statut ACTIVE ou PENDING_ACTIVATION)
  run(`
    INSERT INTO establishments (
      id, name, code, country, city, address, phone, email, motto, academic_year, currency, active_cycles, logo_url,
      status, activated_at, auth_code_used, promoter_id, promoter_name, promoter_email, promoter_phone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FCFA', ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
  `, [
    establishmentId,
    input.name.trim(),
    cleanCode,
    country,
    input.city.trim(),
    input.address?.trim() || '',
    input.phone?.trim() || '',
    input.email?.trim() || '',
    input.motto?.trim() || '',
    academicYear,
    JSON.stringify(activeCycles),
    input.logo_url || null,
    authCodeRaw || 'INSCRIPTION_DIRECTE',
    promoteurId,
    promoteurFullName,
    promoteurEmail,
    promoteurPhone,
  ]);

  // 2. Création de la licence et de l'abonnement commercial initial
  const formulaKey = ((input as any).formula || 'EXCELLENCE').toUpperCase();
  const formulaDefaults: Record<string, { name: string; max_students: number; max_staff: number }> = {
    EXCELLENCE: { name: 'Formule Excellence — Illimité', max_students: 1500, max_staff: 150 },
    PACK_MOYEN: { name: 'Formule Pack Moyen', max_students: 700, max_staff: 80 },
    START: { name: 'Formule Start', max_students: 400, max_staff: 50 },
  };
  const chosenFormula = formulaDefaults[formulaKey] || formulaDefaults.EXCELLENCE;
  const subId = `SUB-${Date.now().toString(36).toUpperCase()}`;
  const licenseRef = `LIC-${new Date().getFullYear()}-${cleanCode}`;

  run(`
    INSERT INTO subscriptions (
      id, establishment_id, plan_name, formula, formula_name, license_ref,
      status, max_students, max_users, duration_months, activated_at, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, 12, CURRENT_TIMESTAMP, date('now', '+1 year'))
  `, [
    subId,
    establishmentId,
    formulaKey,
    formulaKey,
    chosenFormula.name,
    licenseRef,
    chosenFormula.max_students,
    chosenFormula.max_staff,
  ]);

  // 3. Création du compte du Promoteur
  run(`
    INSERT INTO users (
      id, establishment_id, username, email, password_hash, full_name, phone, role, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PROMOTEUR', 'ACTIVE')
  `, [
    promoteurId,
    establishmentId,
    promoteurUsername,
    promoteurEmail,
    passwordHash,
    promoteurFullName,
    promoteurPhone,
  ]);

  // 4. Consommation DÉFINITIVE et ATOMIQUE du code d'autorisation unique
  run(`
    UPDATE creation_authorizations
    SET status = 'USED',
        used_at = CURRENT_TIMESTAMP,
        used_by_user_id = ?,
        used_by_username = ?,
        created_establishment_id = ?,
        created_establishment_name = ?
    WHERE id = ? AND status = 'AVAILABLE'
  `, [
    promoteurId,
    promoteurUsername,
    establishmentId,
    input.name.trim(),
    authRecord.id,
  ]);

  const verifyConsumed = queryOne<any>('SELECT status FROM creation_authorizations WHERE id = ?', [authRecord.id]);
  if (verifyConsumed?.status !== 'USED') {
    throw new Error("Conflit de sécurité : ce code d'autorisation a été consommé simultanément par une autre requête.");
  }

  // 5. Initialisation des matières de base selon les cycles activés
  const baseSubjects = [
    { code: 'FRAN', name: 'Français & Expression', cycle: 'COLLEGE', coef: 4 },
    { code: 'MATH', name: 'Mathématiques', cycle: 'COLLEGE', coef: 4 },
    { code: 'PC', name: 'Physique-Chimie', cycle: 'COLLEGE', coef: 2 },
    { code: 'SVT', name: 'Sciences de la Vie et de la Terre', cycle: 'COLLEGE', coef: 2 },
    { code: 'ANG', name: 'Anglais', cycle: 'COLLEGE', coef: 2 },
    { code: 'HIST', name: 'Histoire-Géographie', cycle: 'COLLEGE', coef: 2 },
    { code: 'EPS', name: 'Éducation Physique et Sportive', cycle: 'COLLEGE', coef: 1 },
  ];

  for (const sub of baseSubjects) {
    if (activeCycles.includes(sub.cycle)) {
      run(`
        INSERT INTO subjects (id, establishment_id, code, name, cycle_code, default_coefficient)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [`SUB-${cleanCode}-${sub.code}`, establishmentId, sub.code, sub.name, sub.cycle, sub.coef]);
    }
  }

  // 6. Journal d'audit avec référence au code consommé
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

  saveDb();

  try {
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
  } catch (fsErr) {
    console.warn('Persistance Cloud Firestore établissement (registerSchool) asynchrone:', fsErr);
  }

  const authUser: AuthUser = {
    id: promoteurId,
    establishment_id: establishmentId,
    username: promoteurUsername,
    email: promoteurEmail,
    full_name: promoteurFullName,
    role: 'PROMOTEUR',
    status: 'ACTIVE',
  };

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
 * Ne requiert pas de code d'autorisation préalable (action souveraine de l'administration centrale).
 */
export async function registerSchoolDirectAdmin(input: any, adminUserId: string, adminName: string): Promise<any> {
  const cleanCode = (input.code || '').trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Le code unique de l'établissement est obligatoire.");
  }

  if (!isSchoolCodeAvailable(cleanCode)) {
    throw new Error(`Le code d'établissement "${cleanCode}" est déjà utilisé par une autre école. Veuillez en choisir un autre.`);
  }

  const establishmentId = `EST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const academicYear = input.academic_year?.trim() || '2026-2027';
  const country = input.country || 'Congo-Brazzaville';
  const activeCycles = Array.isArray(input.active_cycles) && input.active_cycles.length > 0
    ? input.active_cycles
    : ['PRE_SCOLAIRE', 'PRIMAIRE', 'COLLEGE', 'LYCEE'];

  // Compte Promoteur
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

  // 1. Insertion de l'établissement
  run(`
    INSERT INTO establishments (
      id, name, code, country, city, address, phone, email, motto, academic_year, currency, active_cycles, logo_url,
      status, activated_at, auth_code_used, promoter_id, promoter_name, promoter_email, promoter_phone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FCFA', ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, 'CREATION_DIRECTE_GESTIONNAIRE', ?, ?, ?, ?)
  `, [
    establishmentId,
    input.name.trim(),
    cleanCode,
    country,
    input.city.trim(),
    input.address?.trim() || '',
    input.phone?.trim() || '',
    input.email?.trim() || '',
    input.motto?.trim() || '',
    academicYear,
    JSON.stringify(activeCycles),
    input.logo_url || null,
    promoteurId,
    promoteurFullName,
    promoteurEmail,
    promoteurPhone,
  ]);

  // 2. Création de la licence et de l'abonnement commercial
  const formulaKey = ((input as any).formula || 'EXCELLENCE').toUpperCase();
  const formulaDefaults: Record<string, { name: string; max_students: number; max_staff: number }> = {
    EXCELLENCE: { name: 'Formule Excellence — Illimité', max_students: 1500, max_staff: 150 },
    PACK_MOYEN: { name: 'Formule Pack Moyen', max_students: 700, max_staff: 80 },
    START: { name: 'Formule Start', max_students: 400, max_staff: 50 },
  };
  const chosenFormula = formulaDefaults[formulaKey] || formulaDefaults.EXCELLENCE;
  const subId = `SUB-${Date.now().toString(36).toUpperCase()}`;
  const licenseRef = `LIC-${new Date().getFullYear()}-${cleanCode}`;

  run(`
    INSERT INTO subscriptions (
      id, establishment_id, plan_name, formula, formula_name, license_ref,
      status, max_students, max_users, duration_months, activated_at, expires_at
    )
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, 12, CURRENT_TIMESTAMP, date('now', '+1 year'))
  `, [
    subId,
    establishmentId,
    formulaKey,
    formulaKey,
    chosenFormula.name,
    licenseRef,
    chosenFormula.max_students,
    chosenFormula.max_staff,
  ]);

  // 3. Création du compte du Promoteur
  run(`
    INSERT INTO users (
      id, establishment_id, username, email, password_hash, full_name, phone, role, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PROMOTEUR', 'ACTIVE')
  `, [
    promoteurId,
    establishmentId,
    promoteurUsername,
    promoteurEmail,
    passwordHash,
    promoteurFullName,
    promoteurPhone,
  ]);

  // 4. Initialisation des matières selon les cycles activés
  const baseCollege = [
    { code: 'FRAN', name: 'Français & Expression', cycle: 'COLLEGE', coef: 4 },
    { code: 'MATH', name: 'Mathématiques', cycle: 'COLLEGE', coef: 4 },
    { code: 'PC', name: 'Physique-Chimie', cycle: 'COLLEGE', coef: 2 },
    { code: 'SVT', name: 'Sciences de la Vie et de la Terre', cycle: 'COLLEGE', coef: 2 },
    { code: 'ANG', name: 'Anglais', cycle: 'COLLEGE', coef: 2 },
    { code: 'HIST', name: 'Histoire-Géographie', cycle: 'COLLEGE', coef: 2 },
    { code: 'EPS', name: 'Éducation Physique et Sportive', cycle: 'COLLEGE', coef: 1 },
  ];

  for (const sub of baseCollege) {
    run(`
      INSERT OR IGNORE INTO subjects (id, establishment_id, code, name, cycle_code, default_coefficient)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [`SUB-${cleanCode}-${sub.code}`, establishmentId, sub.code, sub.name, sub.cycle, sub.coef]);
  }

  // 5. Journal d'audit central
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

  saveDb();

  try {
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
  } catch (fsErr) {
    console.warn('Persistance Cloud Firestore établissement (registerSchoolDirectAdmin) asynchrone:', fsErr);
  }

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
 * Statistiques globales du tableau de bord développeur (calculées à partir des données réelles)
 */
export function getDeveloperMetrics(): DeveloperStats {
  const totalEsts = queryOne<any>('SELECT COUNT(*) as count FROM establishments WHERE code != "ECO-HQ"') || { count: 0 };
  const activeEsts = queryOne<any>('SELECT COUNT(*) as count FROM establishments WHERE code != "ECO-HQ" AND (status IS NULL OR status = "ACTIVE")') || { count: 0 };
  const pendingEsts = queryOne<any>('SELECT COUNT(*) as count FROM establishments WHERE status = "PENDING_ACTIVATION"') || { count: 0 };
  const suspendedEsts = queryOne<any>('SELECT COUNT(*) as count FROM establishments WHERE status = "SUSPENDED"') || { count: 0 };

  const totalCodes = queryOne<any>('SELECT COUNT(*) as count FROM creation_authorizations') || { count: 0 };
  const availableCodes = queryOne<any>('SELECT COUNT(*) as count FROM creation_authorizations WHERE status = "AVAILABLE"') || { count: 0 };
  const usedCodes = queryOne<any>('SELECT COUNT(*) as count FROM creation_authorizations WHERE status = "USED"') || { count: 0 };
  const expiredOrRevoked = queryOne<any>('SELECT COUNT(*) as count FROM creation_authorizations WHERE status IN ("EXPIRED", "REVOKED")') || { count: 0 };

  const totalPromoters = queryOne<any>('SELECT COUNT(DISTINCT id) as count FROM users WHERE role = "PROMOTEUR"') || { count: 0 };

  // Licences réelles
  const activeLicenses = queryOne<any>(`
    SELECT COUNT(*) as count FROM subscriptions s
    JOIN establishments e ON s.establishment_id = e.id
    WHERE e.code != "ECO-HQ" AND (s.status = "ACTIVE" OR s.status IS NULL)
  `) || { count: 0 };

  const expiredLicenses = queryOne<any>(`
    SELECT COUNT(*) as count FROM subscriptions s
    JOIN establishments e ON s.establishment_id = e.id
    WHERE e.code != "ECO-HQ" AND (s.expires_at <= date('now', '+30 days') OR s.status = 'SUSPENDED')
  `) || { count: 0 };

  const distExcellence = queryOne<any>(`
    SELECT COUNT(*) as count FROM subscriptions s
    JOIN establishments e ON s.establishment_id = e.id
    WHERE e.code != "ECO-HQ" AND (s.formula = 'EXCELLENCE' OR s.plan_name = 'EXCELLENCE' OR s.plan_name = 'STANDARD')
  `) || { count: 0 };

  const distMoyen = queryOne<any>(`
    SELECT COUNT(*) as count FROM subscriptions s
    JOIN establishments e ON s.establishment_id = e.id
    WHERE e.code != "ECO-HQ" AND (s.formula = 'PACK_MOYEN' OR s.plan_name = 'PACK_MOYEN')
  `) || { count: 0 };

  const distStart = queryOne<any>(`
    SELECT COUNT(*) as count FROM subscriptions s
    JOIN establishments e ON s.establishment_id = e.id
    WHERE e.code != "ECO-HQ" AND (s.formula = 'START' OR s.plan_name = 'START' OR s.plan_name = 'STARTER')
  `) || { count: 0 };

  return {
    totalEstablishments: totalEsts.count,
    activeEstablishments: activeEsts.count,
    pendingEstablishments: pendingEsts.count,
    suspendedEstablishments: suspendedEsts.count,
    totalCodes: totalCodes.count,
    availableCodes: availableCodes.count,
    usedCodes: usedCodes.count,
    expiredOrRevokedCodes: expiredOrRevoked.count,
    totalPromoters: totalPromoters.count,
    activeLicenses: activeLicenses.count,
    expiredOrExpiringLicenses: expiredLicenses.count,
    formulaDistribution: {
      excellence: distExcellence.count,
      packMoyen: distMoyen.count,
      start: distStart.count,
    },
  };
}

/**
 * Récupère tous les établissements pour la console Développeur avec détails opérationnels
 */
export function getDeveloperEstablishments(filters?: {
  search?: string;
  status?: string;
  city?: string;
}): any[] {
  let sql = `
    SELECT 
      e.id, e.name, e.code, e.city, e.address, e.country, e.phone, e.email, e.motto,
      e.academic_year, e.currency, e.active_cycles, e.logo_url, e.created_at,
      COALESCE(e.status, 'ACTIVE') as status,
      e.activated_at, e.suspended_at, e.suspension_reason, e.suspended_by,
      e.deleted_at, e.deletion_reason, e.auth_code_used,
      e.promoter_name, e.promoter_email, e.promoter_phone,
      (SELECT COUNT(*) FROM students s WHERE s.establishment_id = e.id) as student_count,
      (SELECT COUNT(*) FROM users u WHERE u.establishment_id = e.id AND u.role NOT IN ('ELEVE', 'PARENT')) as staff_count,
      (SELECT COUNT(*) FROM users u WHERE u.establishment_id = e.id) as user_count,
      COALESCE(sub.formula, sub.plan_name, 'EXCELLENCE') as formula,
      COALESCE(sub.formula_name, 'Formule Excellence — Illimité') as formula_name,
      COALESCE(sub.license_ref, 'LIC-2026-' || e.code) as license_ref,
      COALESCE(sub.max_students, 1500) as max_students,
      COALESCE(sub.max_users, 150) as max_staff,
      COALESCE(sub.status, 'ACTIVE') as subscription_status,
      sub.expires_at as subscription_expires_at,
      sub.activated_at as subscription_activated_at,
      COALESCE(sub.renewal_count, 0) as renewal_count
    FROM establishments e
    LEFT JOIN subscriptions sub ON sub.establishment_id = e.id
    WHERE e.code != 'ECO-HQ'
  `;

  const params: any[] = [];

  if (filters?.search) {
    const q = `%${filters.search.trim().toLowerCase()}%`;
    sql += ` AND (LOWER(e.name) LIKE ? OR LOWER(e.code) LIKE ? OR LOWER(e.city) LIKE ? OR LOWER(COALESCE(e.promoter_name, '')) LIKE ?)`;
    params.push(q, q, q, q);
  }

  if (filters?.status && filters.status !== 'ALL') {
    sql += ` AND COALESCE(e.status, 'ACTIVE') = ?`;
    params.push(filters.status);
  }

  if (filters?.city && filters.city !== 'ALL') {
    sql += ` AND LOWER(e.city) = LOWER(?)`;
    params.push(filters.city);
  }

  sql += ` ORDER BY e.created_at DESC`;

  return queryAll(sql, params).map((est) => {
    try {
      est.active_cycles = JSON.parse(est.active_cycles);
    } catch {
      est.active_cycles = [];
    }
    return est;
  });
}

/**
 * Récupère la liste complète des licences pour la rubrique « Gestion des licences »
 */
export function getDeveloperLicenses(): any[] {
  const sql = `
    SELECT 
      e.id as establishment_id,
      e.name as establishment_name,
      e.code as establishment_code,
      e.city,
      e.country,
      e.logo_url,
      e.promoter_name,
      sub.id as subscription_id,
      COALESCE(sub.license_ref, 'LIC-2026-' || e.code) as license_ref,
      COALESCE(sub.formula, sub.plan_name, 'EXCELLENCE') as formula,
      COALESCE(sub.formula_name, 'Formule Excellence — Illimité') as formula_name,
      COALESCE(sub.status, 'ACTIVE') as status,
      COALESCE(sub.max_students, 1500) as max_students,
      (SELECT COUNT(*) FROM students s WHERE s.establishment_id = e.id) as current_students,
      COALESCE(sub.max_users, 150) as max_staff,
      (SELECT COUNT(*) FROM users u WHERE u.establishment_id = e.id AND u.role NOT IN ('ELEVE', 'PARENT')) as current_staff,
      COALESCE(sub.activated_at, e.created_at) as activated_at,
      sub.expires_at,
      COALESCE(sub.renewal_count, 0) as renewal_count
    FROM establishments e
    LEFT JOIN subscriptions sub ON sub.establishment_id = e.id
    WHERE e.code != 'ECO-HQ'
    ORDER BY e.created_at DESC
  `;

  return queryAll(sql).map((lic) => {
    const expiresMs = lic.expires_at ? new Date(lic.expires_at).getTime() : Date.now() + 365 * 86400000;
    const nowMs = Date.now();
    const daysRemaining = Math.ceil((expiresMs - nowMs) / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;
    const studentPercent = Math.min(100, Math.round(((lic.current_students || 0) / (lic.max_students || 1)) * 100));
    const staffPercent = Math.min(100, Math.round(((lic.current_staff || 0) / (lic.max_staff || 1)) * 100));

    return {
      ...lic,
      days_remaining: daysRemaining,
      is_expired: isExpired,
      student_quota_percent: studentPercent,
      staff_quota_percent: staffPercent,
    };
  });
}

/**
 * Renouvelle la licence d'un établissement
 */
export function renewEstablishmentLicense(
  establishmentId: string,
  durationMonths: number = 12,
  operatorName = "Gestionnaire d'application",
  notes?: string
): any {
  let sub = queryOne<any>('SELECT * FROM subscriptions WHERE establishment_id = ?', [establishmentId]);
  if (!sub) {
    const est = queryOne<any>('SELECT code FROM establishments WHERE id = ?', [establishmentId]);
    const subId = `SUB-${Date.now().toString(36).toUpperCase()}`;
    const licRef = `LIC-${new Date().getFullYear()}-${est?.code || 'GEN'}`;
    run(`
      INSERT INTO subscriptions (
        id, establishment_id, plan_name, formula, formula_name, license_ref,
        status, max_students, max_users, duration_months, activated_at, expires_at
      ) VALUES (?, ?, 'EXCELLENCE', 'EXCELLENCE', 'Formule Excellence — Illimité', ?, 'ACTIVE', 1500, 150, 12, CURRENT_TIMESTAMP, date('now', '+1 year'))
    `, [subId, establishmentId, licRef]);
    sub = queryOne<any>('SELECT * FROM subscriptions WHERE id = ?', [subId]);
  }

  const previousExpires = sub.expires_at || new Date().toISOString().split('T')[0];
  const prevDate = new Date(previousExpires);
  const baseDate = isNaN(prevDate.getTime()) || prevDate.getTime() < Date.now() ? new Date() : prevDate;
  baseDate.setMonth(baseDate.getMonth() + durationMonths);
  const newExpiresAt = baseDate.toISOString().split('T')[0];

  const renewalId = `REN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  run(`
    INSERT INTO license_renewals (
      id, subscription_id, establishment_id, formula, duration_months,
      previous_expires_at, new_expires_at, notes, renewed_by_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    renewalId,
    sub.id,
    establishmentId,
    sub.formula || 'EXCELLENCE',
    durationMonths,
    previousExpires,
    newExpiresAt,
    notes || `Renouvellement officiel de ${durationMonths} mois`,
    operatorName,
  ]);

  run(`
    UPDATE subscriptions
    SET expires_at = ?,
        status = 'ACTIVE',
        renewed_at = CURRENT_TIMESTAMP,
        renewal_count = COALESCE(renewal_count, 0) + 1
    WHERE id = ?
  `, [newExpiresAt, sub.id]);

  logAudit(
    establishmentId,
    'CENTRAL-PLATFORM',
    operatorName,
    'RENOUVELLEMENT_LICENCE',
    'SUBSCRIPTION',
    sub.id,
    { previousExpires, newExpiresAt, durationMonths, notes }
  );

  saveDb();
  return {
    success: true,
    renewalId,
    previousExpires,
    newExpiresAt,
    durationMonths,
  };
}

/**
 * Modifie la formule commerciale et les plafonds d'un établissement
 */
export function updateEstablishmentLicenseFormula(
  establishmentId: string,
  formulaKey: 'EXCELLENCE' | 'PACK_MOYEN' | 'START',
  operatorName = "Gestionnaire d'application",
  notes?: string
): any {
  let sub = queryOne<any>('SELECT * FROM subscriptions WHERE establishment_id = ?', [establishmentId]);
  if (!sub) {
    const est = queryOne<any>('SELECT code FROM establishments WHERE id = ?', [establishmentId]);
    const subId = `SUB-${Date.now().toString(36).toUpperCase()}`;
    const licRef = `LIC-${new Date().getFullYear()}-${est?.code || 'GEN'}`;
    run(`
      INSERT INTO subscriptions (
        id, establishment_id, plan_name, formula, formula_name, license_ref,
        status, max_students, max_users, duration_months, activated_at, expires_at
      ) VALUES (?, ?, 'EXCELLENCE', 'EXCELLENCE', 'Formule Excellence — Illimité', ?, 'ACTIVE', 1500, 150, 12, CURRENT_TIMESTAMP, date('now', '+1 year'))
    `, [subId, establishmentId, licRef]);
    sub = queryOne<any>('SELECT * FROM subscriptions WHERE id = ?', [subId]);
  }

  const formulas: Record<string, { name: string; max_students: number; max_staff: number }> = {
    EXCELLENCE: { name: 'Formule Excellence — Illimité', max_students: 1500, max_staff: 150 },
    PACK_MOYEN: { name: 'Formule Pack Moyen', max_students: 700, max_staff: 80 },
    START: { name: 'Formule Start', max_students: 400, max_staff: 50 },
  };

  const target = formulas[formulaKey] || formulas.EXCELLENCE;

  run(`
    UPDATE subscriptions
    SET formula = ?,
        formula_name = ?,
        max_students = ?,
        max_users = ?
    WHERE id = ?
  `, [formulaKey, target.name, target.max_students, target.max_staff, sub.id]);

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

  saveDb();
  return {
    success: true,
    formula: formulaKey,
    formula_name: target.name,
    max_students: target.max_students,
    max_staff: target.max_staff,
  };
}

/**
 * Met à jour le statut d'un établissement (ACTIVE, SUSPENDED, DELETED)
 */
export function changeEstablishmentStatus(
  establishmentId: string,
  newStatus: 'ACTIVE' | 'SUSPENDED' | 'DELETED',
  reason?: string,
  operatorName = 'Développeur Eco GES'
): any {
  if (establishmentId === 'EST-ECO-HQ') {
    throw new Error('Impossible de modifier le statut de la plateforme centrale.');
  }

  const est = queryOne<any>('SELECT * FROM establishments WHERE id = ?', [establishmentId]);
  if (!est) {
    throw new Error('Établissement introuvable.');
  }

  if (newStatus === 'SUSPENDED') {
    run(`
      UPDATE establishments
      SET status = 'SUSPENDED',
          suspended_at = CURRENT_TIMESTAMP,
          suspension_reason = ?,
          suspended_by = ?
      WHERE id = ?
    `, [reason || 'Suspension administrative par la direction centrale', operatorName, establishmentId]);
  } else if (newStatus === 'ACTIVE') {
    run(`
      UPDATE establishments
      SET status = 'ACTIVE',
          activated_at = CURRENT_TIMESTAMP,
          suspended_at = NULL,
          suspension_reason = NULL,
          suspended_by = NULL
      WHERE id = ?
    `, [establishmentId]);
  } else if (newStatus === 'DELETED') {
    run(`
      UPDATE establishments
      SET status = 'DELETED',
          deleted_at = CURRENT_TIMESTAMP,
          deletion_reason = ?
      WHERE id = ?
    `, [reason || 'Désactivation / suppression logique', establishmentId]);
  }

  logAudit(
    establishmentId,
    'DEV-PLATFORM',
    operatorName,
    `CHANGEMENT_STATUT_${newStatus}`,
    'ESTABLISHMENT',
    establishmentId,
    { ancienStatut: est.status || 'ACTIVE', nouveauStatut: newStatus, motif: reason }
  );

  saveDb();
  return queryOne('SELECT * FROM establishments WHERE id = ?', [establishmentId]);
}

/**
 * Suppression définitive d'un établissement (réservée au Développeur avec confirmation)
 */
export function deleteEstablishmentPermanently(
  establishmentId: string,
  operatorName = 'Développeur Eco GES'
): void {
  if (establishmentId === 'EST-ECO-HQ') {
    throw new Error('Impossible de supprimer la plateforme centrale.');
  }

  const est = queryOne<any>('SELECT name, code FROM establishments WHERE id = ?', [establishmentId]);
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

  run('DELETE FROM users WHERE establishment_id = ?', [establishmentId]);
  run('DELETE FROM students WHERE establishment_id = ?', [establishmentId]);
  run('DELETE FROM classes WHERE establishment_id = ?', [establishmentId]);
  run('DELETE FROM subjects WHERE establishment_id = ?', [establishmentId]);
  run('DELETE FROM payments WHERE establishment_id = ?', [establishmentId]);
  run('DELETE FROM subscriptions WHERE establishment_id = ?', [establishmentId]);
  run('DELETE FROM audit_logs WHERE establishment_id = ?', [establishmentId]);
  run('DELETE FROM establishments WHERE id = ?', [establishmentId]);

  saveDb();
}

/**
 * Récupère la liste des promoteurs enregistrés et leurs établissements
 */
export function getRegisteredPromoters(): any[] {
  const promoters = queryAll<any>(`
    SELECT 
      u.id, u.full_name, u.username, u.email, u.phone, u.status, u.created_at,
      e.id as establishment_id, e.name as establishment_name, e.code as establishment_code,
      e.city as establishment_city, e.status as establishment_status
    FROM users u
    JOIN establishments e ON u.establishment_id = e.id
    WHERE u.role = 'PROMOTEUR'
    ORDER BY u.created_at DESC
  `);
  return promoters;
}

/**
 * Initialise la plateforme centrale, le compte développeur et les écoles de test.
 */
export async function ensureMultiSchoolTestEnvironments(): Promise<void> {
  // 1. Initialiser le compte Plateforme ADMIN_GENERAL Eco GES si manquant
  let platformHq = queryOne<any>("SELECT id FROM establishments WHERE code = 'ECO-HQ'");
  if (!platformHq) {
    run(`
      INSERT OR REPLACE INTO establishments (
        id, name, code, country, city, address, phone, email, motto, academic_year, currency, active_cycles, status
      ) VALUES (
        'EST-ECO-HQ', 'Plateforme Centrale Eco GES', 'ECO-HQ', 'Congo-Brazzaville', 'Brazzaville',
        'Direction des Opérations Eco GES', '+242 06 999 00 00', 'direction@ecoges.cg',
        'Excellence Scolaire & Numérique', '2026-2027', 'FCFA',
        '["PRE_SCOLAIRE","PRIMAIRE","COLLEGE","LYCEE"]', 'ACTIVE'
      )
    `);
  }

  const standardPass = await hashPassword('EcoGes2026!');

  // Mot de passe souverain du compte Gestionnaire d'application (ADMIN_GENERAL)
  // Supporte la variable d'environnement ECO_ADMIN_PASSWORD ou la clé configurée
  const adminPassword = process.env.ECO_ADMIN_PASSWORD || 'Faith.Mick.@Ecoges.2018';
  const adminPassHash = await hashPassword(adminPassword);

  const adminUser = queryOne<any>("SELECT id, password_hash FROM users WHERE username = 'admin.general' LIMIT 1");
  if (!adminUser) {
    run(`
      INSERT INTO users (
        id, establishment_id, username, email, password_hash, full_name, phone, role, status
      ) VALUES (
        'USR-ADMIN-GEN-01', 'EST-ECO-HQ', 'admin.general', 'superadmin@ecoges.cg', ?,
        'Administrateur Général Eco GES', '+242 06 999 00 00', 'ADMIN_GENERAL', 'ACTIVE'
      )
    `, [adminPassHash]);
  } else {
    run('UPDATE users SET password_hash = ? WHERE username = ?', [adminPassHash, 'admin.general']);
  }

  // 2. Établissement de Test 1 : ECO-001
  let eco1 = queryOne<any>("SELECT id FROM establishments WHERE code = 'ECO-001'");
  if (!eco1) {
    const est1Id = 'EST-ECO-001';
    run(`
      INSERT OR REPLACE INTO establishments (
        id, name, code, country, city, address, phone, email, motto, academic_year, currency, active_cycles,
        status, promoter_name, promoter_email, promoter_phone
      ) VALUES (
        ?, 'Institut Pilote Brazza Excellence', 'ECO-001', 'Congo-Brazzaville', 'Brazzaville',
        'Boulevard Denis Sassou Nguesso, Ouenzé', '+242 06 701 01 01', 'contact@eco1-excellence.cg',
        'Rigueur • Savoir • Réussite', '2026-2027', 'FCFA',
        '["COLLEGE","LYCEE"]', 'ACTIVE', 'M. Rodrigue BIKINDOU', 'promoteur@eco1.cg', '+242 06 701 00 00'
      )
    `, [est1Id]);

    const usersEco1 = [
      { id: 'USR-ECO1-PROM', username: 'prom.eco1', name: 'M. Rodrigue BIKINDOU', role: 'PROMOTEUR', email: 'promoteur@eco1.cg' },
      { id: 'USR-ECO1-DIR', username: 'directeur.eco1', name: 'M. Rodrigue BIKINDOU', role: 'DIRECTEUR_GENERAL', email: 'directeur@eco1.cg' },
      { id: 'USR-ECO1-ENS', username: 'prof.eco1', name: 'M. Christian MBOUNGOU', role: 'ENSEIGNANT', email: 'c.mboungou@eco1.cg' },
      { id: 'USR-ECO1-ELV', username: 'eleve.eco1', name: 'Jean-Marc KOUKA', role: 'ELEVE', email: 'jm.kouka@eco1.cg', stuId: 'STU-ECO1-001' },
      { id: 'USR-ECO1-PAR', username: 'parent.eco1', name: 'Mme. Véronique KOUKA', role: 'PARENT', email: 'v.kouka@parent.cg' },
    ];

    for (const u of usersEco1) {
      run(`
        INSERT OR REPLACE INTO users (
          id, establishment_id, username, email, password_hash, full_name, phone, role, student_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, '+242 06 701 00 00', ?, ?, 'ACTIVE')
      `, [u.id, est1Id, u.username, u.email, standardPass, u.name, u.role, (u as any).stuId || null]);
    }

    run(`
      INSERT OR REPLACE INTO classes (id, establishment_id, academic_year, name, cycle_code, level_code, serie_code, room, capacity, main_teacher_id)
      VALUES 
      ('CLS-ECO1-3A', ?, '2026-2027', '3ème Excellence A', 'COLLEGE', '3ème', null, 'Salle 101', 40, 'USR-ECO1-ENS'),
      ('CLS-ECO1-TLE-C', ?, '2026-2027', 'Terminale C Pilote', 'LYCEE', 'Terminale', 'C', 'Salle 204', 35, 'USR-ECO1-ENS')
    `, [est1Id, est1Id]);

    run(`
      INSERT OR REPLACE INTO subscriptions (id, establishment_id, plan_name, status, max_students, max_users, expires_at)
      VALUES ('SUB-ECO-001', ?, 'PREMIUM', 'ACTIVE', 800, 60, date('now', '+1 year'))
    `, [est1Id]);
  }

  // 3. Établissement de Test 2 : ECO-002
  let eco2 = queryOne<any>("SELECT id FROM establishments WHERE code = 'ECO-002'");
  if (!eco2) {
    const est2Id = 'EST-ECO-002';
    run(`
      INSERT OR REPLACE INTO establishments (
        id, name, code, country, city, address, phone, email, motto, academic_year, currency, active_cycles,
        status, promoter_name, promoter_email, promoter_phone
      ) VALUES (
        ?, 'Collège Moderne du Littoral', 'ECO-002', 'Congo-Brazzaville', 'Pointe-Noire',
        'Avenue Moe Pratt, Centre-Ville', '+242 05 602 02 02', 'contact@eco2-littoral.cg',
        'Travail • Intégrité • Progrès', '2026-2027', 'FCFA',
        '["PRIMAIRE","COLLEGE"]', 'ACTIVE', 'Dr. Solange MAVOUNGOU', 'promotrice@eco2.cg', '+242 05 602 00 00'
      )
    `, [est2Id]);

    const usersEco2 = [
      { id: 'USR-ECO2-PROM', username: 'prom.eco2', name: 'Dr. Solange MAVOUNGOU', role: 'PROMOTEUR', email: 'promotrice@eco2.cg' },
      { id: 'USR-ECO2-DIR', username: 'directeur.eco2', name: 'Dr. Solange MAVOUNGOU', role: 'DIRECTEUR_GENERAL', email: 'directrice@eco2.cg' },
      { id: 'USR-ECO2-ENS', username: 'prof.eco2', name: 'M. Fabrice LOUNDOU', role: 'ENSEIGNANT', email: 'f.loundou@eco2.cg' },
      { id: 'USR-ECO2-ELV', username: 'eleve.eco2', name: 'Grace TCHISSEMBO', role: 'ELEVE', email: 'g.tchissembo@eco2.cg', stuId: 'STU-ECO2-001' },
    ];

    for (const u of usersEco2) {
      run(`
        INSERT OR REPLACE INTO users (
          id, establishment_id, username, email, password_hash, full_name, phone, role, student_id, status
        ) VALUES (?, ?, ?, ?, ?, ?, '+242 05 602 00 00', ?, ?, 'ACTIVE')
      `, [u.id, est2Id, u.username, u.email, standardPass, u.name, u.role, (u as any).stuId || null]);
    }

    run(`
      INSERT OR REPLACE INTO subscriptions (id, establishment_id, plan_name, status, max_students, max_users, expires_at)
      VALUES ('SUB-ECO-002', ?, 'STANDARD', 'ACTIVE', 500, 40, date('now', '+1 year'))
    `, [est2Id]);
  }

  // 4. Initialisation des Codes d'Autorisation de Test si la table est vide
  const authCount = queryOne<any>('SELECT COUNT(*) as count FROM creation_authorizations');
  if (!authCount || authCount.count === 0) {
    run(`
      INSERT INTO creation_authorizations (
        id, code, promoter_name, promoter_email, promoter_phone, notes, status,
        created_by_user_id, created_by_name, created_at, expires_at
      ) VALUES
      (
        'AUTH-INIT-001', 'ECO-AUTH-2026-PILOTE-BRAZZA',
        'M. Denis Sassou Mouanda', 'mickmouanda@gmail.com', '+242 06 600 00 01',
        'Autorisation officielle pour établissement pilote à Brazzaville', 'AVAILABLE',
        'USR-ADMIN-GEN-01', 'Développeur Eco GES', CURRENT_TIMESTAMP, date('now', '+90 days')
      ),
      (
        'AUTH-INIT-002', 'ECO-AUTH-2026-EXCELLENCE-PN',
        'Dr. Solange Mavoungou', 'solange.mavoungou@gmail.com', '+242 05 500 00 02',
        'Autorisation pour établissement d enseignement général à Pointe-Noire', 'AVAILABLE',
        'USR-ADMIN-GEN-01', 'Développeur Eco GES', CURRENT_TIMESTAMP, date('now', '+90 days')
      )
    `);
  }

  saveDb();
}

/**
 * Recherche les comptes promoteurs et leurs établissements associés pour le module d'assistance
 */
export function searchPromotersNetwork(searchTerm?: string): any[] {
  let sql = `
    SELECT 
      u.id as promoter_user_id,
      u.username,
      u.email as promoter_email,
      u.full_name as promoter_name,
      u.phone as promoter_phone,
      u.status as promoter_status,
      u.created_at as promoter_created_at,
      e.id as establishment_id,
      e.name as establishment_name,
      e.code as establishment_code,
      e.city,
      e.country,
      e.academic_year,
      e.status as establishment_status
    FROM users u
    JOIN establishments e ON u.establishment_id = e.id
    WHERE u.role = 'PROMOTEUR'
  `;
  const params: any[] = [];
  if (searchTerm && searchTerm.trim()) {
    const q = `%${searchTerm.trim().toLowerCase()}%`;
    sql += ` AND (LOWER(e.name) LIKE ? OR LOWER(e.code) LIKE ? OR LOWER(u.full_name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(COALESCE(u.email, '')) LIKE ? OR LOWER(COALESCE(u.phone, '')) LIKE ?)`;
    params.push(q, q, q, q, q, q);
  }
  sql += ` ORDER BY e.created_at DESC`;
  return queryAll(sql, params);
}

