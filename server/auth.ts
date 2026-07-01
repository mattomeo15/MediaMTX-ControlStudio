import crypto from "crypto";
import fs from "fs";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { ADMIN_PASSWORD, DATA_DIR } from "./env.js";

const CREDENTIALS_PATH = path.join(DATA_DIR, "credentials.json");

export function getStoredPassword(): string {
  try {
    if (fs.existsSync(CREDENTIALS_PATH)) {
      const data = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
      if (data && data.password) {
        return data.password;
      }
    }
  } catch (err) {
    console.error("Error reading credentials:", err);
  }
  return ADMIN_PASSWORD;
}

export function saveStoredPassword(password: string) {
  try {
    fs.mkdirSync(path.dirname(CREDENTIALS_PATH), { recursive: true });
    fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify({ password }, null, 2));
  } catch (err) {
    console.error("Error writing credentials:", err);
  }
}

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
  return timingSafeEqual(candidate || "", getStoredPassword());
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionReq = req as any;
  if (sessionReq.session && sessionReq.session.authenticated) {
    return next();
  }
  return res.status(401).json({ error: "Not authenticated" });
}
