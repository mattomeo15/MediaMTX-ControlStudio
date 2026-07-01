import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { ADMIN_PASSWORD } from "./env.js";

// Add typed session helper
export interface AuthenticatedRequest extends Request {
  session: any;
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function checkPassword(candidate: string): boolean {
  return timingSafeEqual(candidate || "", ADMIN_PASSWORD);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionReq = req as any;
  if (sessionReq.session && sessionReq.session.authenticated) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
}
