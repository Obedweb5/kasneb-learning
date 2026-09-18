import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set to use authentication.`);
  }
  return value;
}

export function hashPassword(password: string): {
  hash: string;
  salt: string;
} {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): boolean {
  const candidate = scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return (
    candidate.length === stored.length && timingSafeEqual(candidate, stored)
  );
}

export function signStudentToken(studentId: string): string {
  return jwt.sign({ sub: studentId }, requireEnv("JWT_SECRET"), {
    expiresIn: "30d",
  });
}

export interface AuthedRequest extends Request {
  studentId?: string;
}

// ---------------------------------------------------------------------------
// Admin auth
//
// Kept deliberately separate from the student token above: admin tokens
// carry `aud: "admin"` so a leaked/stolen student session can never be
// replayed against admin routes (and vice versa), even though both are
// signed with the same JWT_SECRET.
// ---------------------------------------------------------------------------

export type AdminRole = "owner" | "admin";

export interface AuthedAdminRequest extends Request {
  adminId?: string;
  adminRole?: AdminRole;
}

export const ADMIN_COOKIE_NAME = "kasneb_admin_token";

export function signAdminToken(adminId: string, role: AdminRole): string {
  return jwt.sign({ sub: adminId, role, aud: "admin" }, requireEnv("JWT_SECRET"), {
    expiresIn: "12h",
  });
}

/**
 * Reads a bearer token, or falls back to the "kasneb_admin_token" cookie.
 * Rejects with 401 if missing, invalid, or not an admin token. Every
 * admin route in the app is expected to sit behind this.
 */
export function requireAdminAuth(
  req: AuthedAdminRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : undefined;
  const token = bearerToken ?? req.cookies?.[ADMIN_COOKIE_NAME];

  if (!token) {
    res.status(401).json({ message: "Admin sign-in required." });
    return;
  }

  try {
    const payload = jwt.verify(token, requireEnv("JWT_SECRET")) as {
      sub: string;
      role: AdminRole;
      aud: string;
    };
    if (payload.aud !== "admin") {
      res.status(401).json({ message: "Admin sign-in required." });
      return;
    }
    req.adminId = payload.sub;
    req.adminRole = payload.role;
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

/** Chain after requireAdminAuth to restrict a route to the owner. */
export function requireOwner(
  req: AuthedAdminRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.adminRole !== "owner") {
    res.status(403).json({ message: "Only the owner admin can do this." });
    return;
  }
  next();
}

/**
 * Reads a bearer token, or falls back to the "kasneb_token" cookie so
 * the frontend can use either approach. Rejects with 401 if missing
 * or invalid — every route behind this middleware requires a signed-in
 * student.
 */
export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ")
    ? header.slice("Bearer ".length)
    : undefined;
  const token = bearerToken ?? req.cookies?.["kasneb_token"];

  if (!token) {
    res.status(401).json({ message: "Sign in required." });
    return;
  }

  try {
    const payload = jwt.verify(token, requireEnv("JWT_SECRET")) as {
      sub: string;
    };
    req.studentId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}
