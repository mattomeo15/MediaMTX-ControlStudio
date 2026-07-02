import { Router, Request, Response } from "express";
import path from "path";
import multer from "multer";
import { requireAuth } from "../auth.js";
import {
  loadMediaConfigs,
  getMediaStreams,
  addMediaStream,
  deleteMediaStream,
  startMediaStream,
  stopMediaStream,
  listLocalFiles,
  MEDIA_DIR,
} from "../mediaStreamer.js";

const router = Router();

// Configure multer for video file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MEDIA_DIR);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const name = `${Date.now()}_${safe}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // Max 500 MB for videos
  fileFilter: (req, file, cb) => {
    const ok = /\.(mp4|mkv|mov|avi|wmv|flv|m4v|webm)$/i.test(file.originalname);
    if (ok) return cb(null, true);
    cb(new Error("Only standard video files are accepted (mp4, mkv, mov, avi, wmv, flv, m4v, webm)"));
  },
});

router.use(requireAuth);

// Load configs at router startup
loadMediaConfigs().catch(err => console.error("Error loading media stream configurations:", err));

// GET /api/media-streams
router.get("/", async (req: Request, res: Response) => {
  try {
    const configs = getMediaStreams();
    const localFiles = await listLocalFiles();
    res.json({ configs, localFiles });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/media-streams
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, type, sourceUrl, loop } = req.body;
    if (!name || !type || !sourceUrl) {
      return res.status(400).json({ error: "Missing required fields: name, type, sourceUrl" });
    }
    const cleanName = String(name).trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanName) {
      return res.status(400).json({ error: "Invalid stream name" });
    }

    const cfg = await addMediaStream({
      name: cleanName,
      type: type === "youtube" ? "youtube" : "file",
      sourceUrl: String(sourceUrl).trim(),
      loop: !!loop,
    });
    res.json({ ok: true, config: cfg });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// DELETE /api/media-streams/:name
router.delete("/:name", async (req: Request, res: Response) => {
  try {
    const success = await deleteMediaStream(req.params.name);
    if (success) {
      res.json({ ok: true });
    } else {
      res.status(444).json({ error: "Media stream configuration not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/media-streams/start/:name
router.post("/start/:name", async (req: Request, res: Response) => {
  try {
    const success = await startMediaStream(req.params.name);
    if (success) {
      res.json({ ok: true });
    } else {
      res.status(400).json({ error: "Failed to start media stream (check file existence or YouTube URL)" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/media-streams/stop/:name
router.post("/stop/:name", async (req: Request, res: Response) => {
  try {
    const success = await stopMediaStream(req.params.name);
    if (success) {
      res.json({ ok: true });
    } else {
      res.status(404).json({ error: "Media stream not found" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

// POST /api/media-streams/upload
router.post("/upload", upload.single("video"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file provided" });
    }
    res.json({ ok: true, filename: req.file.filename });
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

export default router;
