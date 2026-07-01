import { Router, Request, Response } from "express";
import { requireAuth } from "../auth.js";
import * as mtx from "../mediamtx.js";
import { alerts, getRouterSettings, saveRouterSettings, broadcast } from "../websocket.js";

const router = Router();

router.use(requireAuth);

// --- Alerts ---
router.get("/alerts", (req: Request, res: Response) => {
  res.json(alerts);
});

router.post("/alerts/read/:id", (req: Request, res: Response) => {
  const item = alerts.find((a) => a.id === req.params.id);
  if (item) {
    item.read = true;
    broadcast("alerts-update", alerts);
  }
  res.json({ ok: true, alerts });
});

router.post("/alerts/clear", (req: Request, res: Response) => {
  alerts.splice(0, alerts.length); // clear the array
  broadcast("alerts-update", alerts);
  res.json({ ok: true, alerts });
});

// --- Autopilot / Router Settings ---
router.get("/router-settings", (req: Request, res: Response) => {
  res.json(getRouterSettings());
});

router.post("/router-settings", (req: Request, res: Response) => {
  try {
    const { enabled, primaryPath, fallbackPath, destinationPath } = req.body || {};
    const settings = {
      enabled: !!enabled,
      primaryPath: String(primaryPath || "live").trim(),
      fallbackPath: String(fallbackPath || "announcements").trim(),
      destinationPath: String(destinationPath || "main").trim(),
    };
    saveRouterSettings(settings);
    broadcast("init-router", settings);
    res.json({ ok: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

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
