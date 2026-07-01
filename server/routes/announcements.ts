import { Router, Request, Response, NextFunction } from "express";
import path from "path";
import fs, { promises as fsp } from "fs";
import multer from "multer";
import { requireAuth } from "../auth.js";
import * as announcer from "../announcer.js";
import { IMAGES_DIR } from "../env.js";

announcer.ensureDirs();

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const name = `${Date.now()}_${safe}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(file.originalname);
    if (ok) return cb(null, true);
    cb(new Error("Only image files are accepted (jpg, png, gif, webp, bmp, tiff)"));
  },
});

router.use(requireAuth);

// GET /api/announcements/status
router.get("/status", (req: Request, res: Response) => {
  res.json(announcer.getStatus());
});

// GET /api/announcements/settings
router.get("/settings", async (req: Request, res: Response) => {
  try {
    const settings = await announcer.loadSettings();
    const images = await announcer.listImages();
    res.json({ ...settings, images });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// PUT /api/announcements/settings
router.put("/settings", async (req: Request, res: Response) => {
  try {
    const current = await announcer.loadSettings();
    const {
      transitionType,
      transitionDuration,
      width,
      height,
      fps,
    } = req.body;

    if (transitionType !== undefined) {
      if (!announcer.VALID_TRANSITIONS.includes(transitionType)) {
        return res.status(400).json({
          error: `Invalid transitionType. Valid: ${announcer.VALID_TRANSITIONS.join(", ")}`,
        });
      }
      current.transitionType = transitionType;
    }
    if (transitionDuration !== undefined) {
      const d = Number(transitionDuration);
      if (isNaN(d) || d < 0.1 || d > 10) return res.status(400).json({ error: "transitionDuration must be 0.1-10 seconds" });
      current.transitionDuration = d;
    }
    if (width !== undefined) {
      const w = Number(width);
      if (isNaN(w) || w < 320 || w > 7680) return res.status(400).json({ error: "width must be 320-7680" });
      current.width = w;
    }
    if (height !== undefined) {
      const h = Number(height);
      if (isNaN(h) || h < 240 || h > 4320) return res.status(400).json({ error: "height must be 240-4320" });
      current.height = h;
    }
    if (fps !== undefined) {
      const f = Number(fps);
      if (isNaN(f) || f < 1 || f > 60) return res.status(400).json({ error: "fps must be 1-60" });
      current.fps = f;
    }

    await announcer.saveSettings(current);
    res.json({ ok: true, settings: current });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// PUT /api/announcements/images/order
router.put("/images/order", async (req: Request, res: Response) => {
  try {
    const newOrder = req.body;
    if (!Array.isArray(newOrder)) return res.status(400).json({ error: "Body must be an array" });

    const current = await announcer.loadSettings();
    current.images = newOrder.map((item: any) => ({
      filename: String(item.filename),
      duration: Math.max(0.5, Number(item.duration) || 5),
    }));
    await announcer.saveSettings(current);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/announcements/images
router.post("/images", upload.array("images", 50), async (req: Request, res: Response) => {
  try {
    const current = await announcer.loadSettings();
    const files = (req.files as Express.Multer.File[]) || [];
    const added = files.map((f) => ({ filename: f.filename, duration: 5 }));
    current.images = [...current.images, ...added];
    await announcer.saveSettings(current);
    res.json({ ok: true, added });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// GET /api/announcements/images/:filename
router.get("/images/:filename", (req: Request, res: Response) => {
  const safe = path.basename(req.params.filename);
  res.sendFile(path.join(IMAGES_DIR, safe));
});

// DELETE /api/announcements/images/:filename
router.delete("/images/:filename", async (req: Request, res: Response) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(IMAGES_DIR, filename);
    await fsp.unlink(filePath).catch(() => {});
    const current = await announcer.loadSettings();
    current.images = current.images.filter((i) => i.filename !== filename);
    await announcer.saveSettings(current);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/announcements/build
router.post("/build", async (req: Request, res: Response) => {
  try {
    announcer.rebuildAndStream().catch((e) => {
      console.error("Async rebuild error:", e);
    });
    res.json({ ok: true, status: announcer.getStatus() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/announcements/stop
router.post("/stop", (req: Request, res: Response) => {
  announcer.stopAll();
  res.json({ ok: true });
});

export default router;
