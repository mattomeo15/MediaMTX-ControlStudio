import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "../auth.js";
import * as mtx from "../mediamtx.js";
import { UI_SETTINGS_PATH, MEDIAMTX_PUBLIC_HLS_URL_DEFAULT, getDynamicRtspUrl, getMediaMtxHost } from "../env.js";
import { getSystemLogs } from "../logger.js";

const router = Router();

router.use(requireAuth);

router.get("/system-logs", (req: Request, res: Response) => {
  res.json({ logs: getSystemLogs() });
});

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
    const data = JSON.parse(fs.readFileSync(UI_SETTINGS_PATH, "utf8"));
    return {
      publicHlsUrl: data.publicHlsUrl || MEDIAMTX_PUBLIC_HLS_URL_DEFAULT,
      mediaMtxApiUrl: data.mediaMtxApiUrl || "",
    };
  } catch {
    return { publicHlsUrl: MEDIAMTX_PUBLIC_HLS_URL_DEFAULT, mediaMtxApiUrl: "" };
  }
}

function saveUiSettings(s: any) {
  fs.mkdirSync(path.dirname(UI_SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(UI_SETTINGS_PATH, JSON.stringify(s, null, 2));
}

router.get("/ui", (req: Request, res: Response) => {
  const settings = loadUiSettings();
  const host = getMediaMtxHost();
  const defaultHlsUrl = `http://${host}:8888`;
  res.json({
    publicHlsUrl: settings.publicHlsUrl || defaultHlsUrl,
    mediaMtxApiUrl: settings.mediaMtxApiUrl || `http://127.0.0.1:9997`,
    rtspUrl: getDynamicRtspUrl(),
  });
});

router.put("/ui", (req: Request, res: Response) => {
  try {
    const current = loadUiSettings();
    if (req.body.publicHlsUrl !== undefined) {
      current.publicHlsUrl = String(req.body.publicHlsUrl).trim();
    }
    if (req.body.mediaMtxApiUrl !== undefined) {
      current.mediaMtxApiUrl = String(req.body.mediaMtxApiUrl).trim();
    }
    saveUiSettings(current);
    res.json({ ok: true, settings: { ...current, rtspUrl: getDynamicRtspUrl() } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
