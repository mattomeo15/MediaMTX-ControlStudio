import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import * as mtx from "../mediamtx.js";

const router = Router();

router.use(requireAuth);

// --- Active runtime paths ---
router.get("/active", async (req: Request, res: Response) => {
  try {
    const data = await mtx.listActivePaths();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

router.get("/active/:name", async (req: Request, res: Response) => {
  try {
    const data = await mtx.getActivePath(req.params.name);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

// --- Path configurations (persistent wiring) ---
router.get("/config", async (req: Request, res: Response) => {
  try {
    const data = await mtx.listPathConfigs();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

router.get("/config/:name", async (req: Request, res: Response) => {
  try {
    const data = await mtx.getPathConfig(req.params.name);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

router.post("/config/:name", async (req: Request, res: Response) => {
  try {
    await mtx.addPathConfig(req.params.name, req.body || {});
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

router.patch("/config/:name", async (req: Request, res: Response) => {
  try {
    await mtx.patchPathConfig(req.params.name, req.body || {});
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

router.delete("/config/:name", async (req: Request, res: Response) => {
  try {
    await mtx.deletePathConfig(req.params.name);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

export default router;
