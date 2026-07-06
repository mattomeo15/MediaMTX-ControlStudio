import { Router, Request, Response } from "express";
import { checkPassword, saveStoredPassword, requireAuth } from "../auth.js";
import * as mtx from "../mediamtx.js";

const router = Router();

router.get("/mediamtx-status", async (req: Request, res: Response) => {
  try {
    await mtx.listPathConfigs();
    res.json({ mediaMtxConnected: true });
  } catch (err) {
    console.log("MediaMTX status check: offline or booting");
    res.json({ mediaMtxConnected: false });
  }
});

router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body || {};
  if (checkPassword(password)) {
    const sessionReq = req as any;
    if (sessionReq.session) {
      sessionReq.session.authenticated = true;
      return sessionReq.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ error: "Session save failed" });
        }
        return res.json({ ok: true });
      });
    }
  }
  return res.status(401).json({ error: "Incorrect password" });
});

router.post("/change-password", requireAuth, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: "New password must be at least 4 characters long" });
  }
  if (!checkPassword(currentPassword)) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }
  saveStoredPassword(newPassword.trim());
  res.json({ ok: true });
});

router.post("/logout", (req: Request, res: Response) => {
  const sessionReq = req as any;
  if (sessionReq.session) {
    sessionReq.session.destroy(() => res.json({ ok: true }));
  } else {
    res.json({ ok: true });
  }
});

router.get("/status", (req: Request, res: Response) => {
  const sessionReq = req as any;
  let authenticated = !!(sessionReq.session && sessionReq.session.authenticated);
  if (!authenticated) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (checkPassword(token)) {
        authenticated = true;
        if (sessionReq.session) {
          sessionReq.session.authenticated = true;
        }
      }
    }
  }
  res.json({ authenticated });
});

export default router;
