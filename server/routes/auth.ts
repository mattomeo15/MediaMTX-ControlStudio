import { Router, Request, Response } from "express";
import { checkPassword } from "../auth.js";

const router = Router();

router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body || {};
  if (checkPassword(password)) {
    const sessionReq = req as any;
    if (sessionReq.session) {
      sessionReq.session.authenticated = true;
      return res.json({ ok: true });
    }
  }
  return res.status(401).json({ error: "Incorrect password" });
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
  res.json({ authenticated: !!(sessionReq.session && sessionReq.session.authenticated) });
});

export default router;
