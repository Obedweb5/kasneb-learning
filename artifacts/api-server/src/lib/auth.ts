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
