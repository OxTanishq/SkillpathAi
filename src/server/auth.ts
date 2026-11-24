import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db, getUserById, seedStarterWorkspaceForUser } from '../db/database.ts';
import type { AuthUser } from '../types/domain.ts';

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

const SESSION_COOKIE_NAME = 'skillpath_session';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sessionId?: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function hashToken(rawToken: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(rawToken).digest('hex');
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = decodeURIComponent(pair.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

export function createUserSession(res: Response, userId: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const sessionId = `sess-${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  ).run(sessionId, userId, tokenHash, expiresAt);

  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${14 * 24 * 60 * 60}`
  );

  return rawToken;
}

export function clearUserSession(res: Response, req: Request): void {
  const rawToken = extractRawToken(req);
  if (rawToken) {
    db.prepare(`DELETE FROM auth_sessions WHERE token_hash = ?`).run(hashToken(rawToken));
  }
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`
  );
}

function extractRawToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

export function resolveAuthenticatedUser(req: Request): { user: AuthUser; sessionId: string } | null {
  const rawToken = extractRawToken(req);
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const session = db
    .prepare(`SELECT id, user_id, expires_at FROM auth_sessions WHERE token_hash = ?`)
    .get(tokenHash) as { id: string; user_id: string; expires_at: string } | undefined;

  if (!session) return null;
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    db.prepare(`DELETE FROM auth_sessions WHERE id = ?`).run(session.id);
    return null;
  }

  const user = getUserById(session.user_id);
  if (!user) return null;
  return { user, sessionId: session.id };
}

export function verifyMutationOrigin(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }
  const hasCustomHeader = req.headers['x-requested-with'] === 'SkillPath-Client';
  const hasBearer = Boolean(req.headers.authorization?.startsWith('Bearer '));
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host;

  if (hasCustomHeader || hasBearer) {
    next();
    return;
  }
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) {
        next();
        return;
      }
    } catch {
      // fall through
    }
  }
  res.status(403).json({ error: 'Invalid request origin or missing client header' });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const resolved = resolveAuthenticatedUser(req);
  if (!resolved) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  req.user = resolved.user;
  req.sessionId = resolved.sessionId;
  next();
}

export function registerAccount(params: {
  email: string;
  password: string;
  fullName: string;
}): { user: AuthUser; verificationCode: string } {
  const normalizedEmail = params.email.trim().toLowerCase();
  const existing = db
    .prepare(`SELECT id FROM user_profiles WHERE email = ?`)
    .get(normalizedEmail);
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const userId = `usr-${crypto.randomUUID()}`;
  const passwordHash = hashPassword(params.password);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO user_profiles (id, email, password_hash, full_name, email_verified, plan_tier, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 'free', ?, ?)`
  ).run(userId, normalizedEmail, passwordHash, params.fullName.trim(), now, now);

  const verificationCode = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO email_verifications (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)`
  ).run(`ver-${crypto.randomUUID()}`, userId, verificationCode, expiresAt);

  seedStarterWorkspaceForUser(userId, 'ai-engineer');
  return { user: getUserById(userId)!, verificationCode };
}

export function verifyEmailCode(userId: string, code: string): boolean {
  const row = db
    .prepare(
      `SELECT id, expires_at, used FROM email_verifications WHERE user_id = ? AND code = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(userId, code.trim()) as { id: string; expires_at: string; used: number } | undefined;

  if (!row || row.used === 1 || new Date(row.expires_at).getTime() <= Date.now()) {
    return false;
  }
  db.prepare(`UPDATE email_verifications SET used = 1 WHERE id = ?`).run(row.id);
  db.prepare(`UPDATE user_profiles SET email_verified = 1, updated_at = datetime('now') WHERE id = ?`).run(
    userId
  );
  return true;
}

export function issuePasswordReset(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const user = db
    .prepare(`SELECT id FROM user_profiles WHERE email = ?`)
    .get(normalized) as { id: string } | undefined;
  if (!user) return null;

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO password_resets (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
  ).run(`rst-${crypto.randomUUID()}`, user.id, token, expiresAt);
  return token;
}

export function completePasswordReset(token: string, newPassword: string): boolean {
  const row = db
    .prepare(
      `SELECT id, user_id, expires_at, used FROM password_resets WHERE token = ?`
    )
    .get(token.trim()) as { id: string; user_id: string; expires_at: string; used: number } | undefined;
  if (!row || row.used === 1 || new Date(row.expires_at).getTime() <= Date.now()) {
    return false;
  }

  const newHash = hashPassword(newPassword);
  db.prepare(`UPDATE password_resets SET used = 1 WHERE id = ?`).run(row.id);
  db.prepare(`UPDATE user_profiles SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`).run(
    newHash,
    row.user_id
  );
  db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(row.user_id);
  return true;
}
