import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logFirestoreAudit } from './firestore_db.ts';

export { jwt };
export const JWT_SECRET = process.env.JWT_SECRET || 'faith_school_manager_ultra_secure_secret_brazzaville_2026';
export const TOKEN_EXPIRY = '24h';

// Rate limiting state for brute force protection
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export type UserRole =
  | 'ADMIN_GENERAL'
  | 'PROMOTEUR'
  | 'DIRECTEUR_GENERAL'
  | 'DIRECTEUR_ETUDES'
  | 'GESTIONNAIRE'
  | 'COMPTABLE'
  | 'SURVEILLANT'
  | 'ENSEIGNANT'
  | 'ELEVE'
  | 'PARENT';

export interface AuthUser {
  id: string;
  establishment_id: string;
  username: string;
  email: string | null;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  student_id?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      establishment_id: user.establishment_id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status || 'ACTIVE',
      student_id: user.student_id || null,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function checkRateLimit(key: string): { allowed: boolean; remainingMinutes?: number } {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil > now) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / 60000);
    return { allowed: false, remainingMinutes };
  }

  // Lock expired
  if (record.lockedUntil <= now && record.lockedUntil !== 0) {
    loginAttempts.delete(key);
  }

  return { allowed: true };
}

export function recordLoginAttempt(key: string, success: boolean): void {
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };

  if (success) {
    loginAttempts.delete(key);
    return;
  }

  record.count += 1;
  if (record.count >= 5) {
    // Lock for 15 minutes
    record.lockedUntil = now + 15 * 60 * 1000;
  }
  loginAttempts.set(key, record);
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Accès non autorisé : Jeton de sécurité manquant.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Jeton de sécurité invalide.' });
    }

    const user: AuthUser = {
      id: decoded.id,
      establishment_id: decoded.establishment_id,
      username: decoded.username,
      email: decoded.email || null,
      full_name: decoded.full_name,
      role: decoded.role,
      status: decoded.status || 'ACTIVE',
      student_id: decoded.student_id || null,
    };

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Votre compte a été suspendu par la direction.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expirée ou jeton invalide. Veuillez vous reconnecter.' });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentification requise.' });
    }

    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'ADMIN_GENERAL') {
      return res.status(403).json({
        error: `Accès refusé. Cette action requiert l'un des rôles suivants : ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}

export function logAudit(
  establishmentId: string,
  userId: string | null,
  userName: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: any = null,
  ipAddress: string = ''
): void {
  try {
    const id = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details ? String(details) : null;
    const logData = {
      id,
      establishment_id: establishmentId,
      user_id: userId,
      user_name: userName,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details: detailsStr,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    };
    logFirestoreAudit(id, logData).catch((err) => {
      console.warn("Échec de l'enregistrement de l'audit log Firestore:", err?.message || err);
    });
  } catch (err) {
    console.error("Échec de l'enregistrement de l'audit log:", err);
  }
}
