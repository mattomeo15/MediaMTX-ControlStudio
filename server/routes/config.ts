import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "../auth.js";
import * as mtx from "../mediamtx.js";
import { UI_SETTINGS_PATH, MEDIAMTX_PUBLIC_HLS_URL_DEFAULT } from "../env.js";

const router = Router();

router.use(requireAuth);

// --- MediaMTX global config ---
router.get("/global", async (req: Request, res: Response) => {
  try {
    const data = await mtx.getGlobalConfig();
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

router.patch("/global", async (req: Request, res: Response) => {
  try {
    await mtx.patchGlobalConfig(req.body || {});
    res.json({ ok: true });
  } catch (err: any) {
    res.status(502).json({ error: err.message || String(err) });
  }
});

// --- UI settings (HLS preview URL, etc.) ---
function loadUiSettings() {
  try {
    return JSON.parse(fs.readFileSync(UI_SETTINGS_PATH, "utf8"));
  } catch {
    return { publicHlsUrl: MEDIAMTX_PUBLIC_HLS_URL_DEFAULT };
  }
}

function saveUiSettings(s: any) {
  fs.mkdirSync(path.dirname(UI_SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(UI_SETTINGS_PATH, JSON.stringify(s, null, 2));
}

router.get("/ui", (req: Request, res: Response) => {
  res.json(loadUiSettings());
});

router.put("/ui", (req: Request, res: Response) => {
  try {
    const current = loadUiSettings();
    if (req.body.publicHlsUrl !== undefined) {
      current.publicHlsUrl = String(req.body.publicHlsUrl).trim();
    }
    saveUiSettings(current);
    res.json({ ok: true, settings: current });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
