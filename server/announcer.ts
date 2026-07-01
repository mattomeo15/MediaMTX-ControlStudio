import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { spawn } from "child_process";
import {
  IMAGES_DIR,
  REEL_PATH,
  SETTINGS_PATH,
  MEDIAMTX_RTSP_URL,
  ANNOUNCEMENTS_PATH_NAME,
} from "./env.js";

export const VALID_TRANSITIONS = [
  "none", "fade", "dissolve", "wipeleft", "wiperight", "wipeup", "wipedown",
  "slideleft", "slideright", "slideup", "slidedown",
  "circleopen", "circleclose", "pixelize",
];

export interface AnnouncementImage {
  filename: string;
  duration: number;
}

export interface AnnouncementSettings {
  transitionType: string;
  transitionDuration: number;
  width: number;
  height: number;
  fps: number;
  images: AnnouncementImage[];
}

export const DEFAULT_SETTINGS: AnnouncementSettings = {
  transitionType: "fade",
  transitionDuration: 1,   // seconds
  width: 1920,
  height: 1080,
  fps: 25,
  images: [],              // [{ filename, duration }] in display order
};

export interface AnnouncerState {
  status: "idle" | "rendering" | "streaming" | "error";
  message: string;
  ffmpegStream: any | null;
}

const state: AnnouncerState = {
  status: "idle",          // idle | rendering | streaming | error
  message: "",
  ffmpegStream: null,      // child process streaming the loop into MediaMTX
};

export function ensureDirs() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
}

export async function loadSettings(): Promise<AnnouncementSettings> {
  ensureDirs();
  try {
    const raw = await fsp.readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AnnouncementSettings) {
  ensureDirs();
  await fsp.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export async function listImages(): Promise<AnnouncementImage[]> {
  const settings = await loadSettings();
  const onDisk = new Set(await fsp.readdir(IMAGES_DIR).catch(() => []));
  // Keep settings.images authoritative for order/duration, but drop any
  // entries whose file no longer exists, and append any orphaned files.
  const known = settings.images.filter((i) => onDisk.has(i.filename));
  const knownNames = new Set(known.map((i) => i.filename));
  for (const filename of onDisk) {
    if (!knownNames.has(filename)) {
      known.push({ filename, duration: 5 });
    }
  }
  return known;
}

export function getStatus() {
  return { status: state.status, message: state.message };
}

export function setStatus(status: "idle" | "rendering" | "streaming" | "error", message: string = "") {
  state.status = status;
  state.message = message;
}

function runFfmpeg(args: string[], options: { label: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args]);
    let stderr = "";
    proc.stderr?.on("data", (d) => {
      stderr += d.toString();
    });
    proc.on("error", (err: any) => {
      if (err.code === "ENOENT") {
        reject(new Error("FFmpeg executable was not found. Please install FFmpeg on your host or container system."));
      } else {
        reject(err);
      }
    });
    proc.on("close", (code) => {
      if (code === 0) return resolve();
      const tail = stderr.split("\n").slice(-25).join("\n");
      reject(new Error(`${options.label} failed (exit ${code}):\n${tail}`));
    });
  });
}

/**
 * Build the looping reel as a single mp4 file from the configured images.
 */
async function renderReel(settings: AnnouncementSettings) {
  const images = settings.images;
  if (images.length === 0) {
    throw new Error("No images to render");
  }

  const { width: W, height: H, fps, transitionType, transitionDuration: t } = settings;
  const scaleFilter = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps},format=yuv420p`;

  if (transitionType === "none" || images.length === 1) {
    // --- Concat demuxer path: simplest, exact per-image durations ---
    const listFile = path.join(path.dirname(REEL_PATH), "concat-list.txt");
    const lines = images.map((img) => {
      const p = path.join(IMAGES_DIR, img.filename).replace(/'/g, "'\\''");
      return `file '${p}'\nduration ${img.duration}`;
    });
    // The concat demuxer requires the last file listed again without a duration.
    const lastPath = path.join(IMAGES_DIR, images[images.length - 1].filename).replace(/'/g, "'\\''");
    lines.push(`file '${lastPath}'`);
    await fsp.writeFile(listFile, lines.join("\n"));

    try {
      await runFfmpeg([
        "-f", "concat", "-safe", "0", "-i", listFile,
        "-vf", scaleFilter,
        "-r", String(fps),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        REEL_PATH,
      ], { label: "Reel render (concat)" });
    } finally {
      await fsp.unlink(listFile).catch(() => {});
    }
    return;
  }

  // --- Crossfade path: chained xfade filter_complex ---
  const inputArgs: string[] = [];
  images.forEach((img, i) => {
    const isLast = i === images.length - 1;
    const dur = img.duration + (isLast ? 0 : t);
    inputArgs.push("-loop", "1", "-t", dur.toFixed(2), "-i", path.join(IMAGES_DIR, img.filename));
  });

  const scaleParts = images.map((_, i) => `[${i}:v]${scaleFilter}[s${i}]`);

  let chainLabel = "s0";
  let cumulative = 0;
  const xfadeParts: string[] = [];
  for (let i = 1; i < images.length; i++) {
    cumulative += images[i - 1].duration;
    const isLast = i === images.length - 1;
    const outLabel = isLast ? "vout" : `x${i}`;
    xfadeParts.push(
      `[${chainLabel}][s${i}]xfade=transition=${transitionType}:duration=${t}:offset=${cumulative.toFixed(2)}[${outLabel}]`
    );
    chainLabel = outLabel;
  }
  const filterComplex = [...scaleParts, ...xfadeParts].join(";");

  await runFfmpeg([
    ...inputArgs,
    "-filter_complex", filterComplex,
    "-map", "[vout]",
    "-r", String(fps),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    REEL_PATH,
  ], { label: "Reel render (crossfade)" });
}

export function stopStreaming() {
  if (state.ffmpegStream) {
    state.ffmpegStream.kill("SIGTERM");
    state.ffmpegStream = null;
  }
}

export function startStreaming() {
  stopStreaming();
  const target = `${MEDIAMTX_RTSP_URL}/${ANNOUNCEMENTS_PATH_NAME}`;
  const proc = spawn("ffmpeg", [
    "-re", "-stream_loop", "-1", "-i", REEL_PATH,
    "-c", "copy",
    "-rtsp_transport", "tcp",
    "-f", "rtsp", target,
  ]);

  let stderrTail = "";
  proc.stderr?.on("data", (d) => {
    stderrTail = (stderrTail + d.toString()).slice(-4000);
  });
  proc.on("error", (err: any) => {
    console.error("FFmpeg stream error:", err);
  });
  proc.on("exit", (code, signal) => {
    if (state.ffmpegStream === proc) {
      state.ffmpegStream = null;
      if (signal !== "SIGTERM" && code !== 0) {
        setStatus("error", `Stream process exited unexpectedly (code ${code}).\n${stderrTail.split("\n").slice(-15).join("\n")}`);
      }
    }
  });

  state.ffmpegStream = proc;
  setStatus("streaming", `Looping into ${target}`);
}

/**
 * Re-render the reel from current settings and (re)start the live loop.
 */
export async function rebuildAndStream() {
  const settings = await loadSettings();
  if (settings.images.length === 0) {
    stopStreaming();
    setStatus("idle", "No images configured");
    return getStatus();
  }
  try {
    setStatus("rendering", "Rendering reel with ffmpeg...");
    await renderReel(settings);
    startStreaming();
  } catch (err: any) {
    stopStreaming();
    setStatus("error", err.message || String(err));
  }
  return getStatus();
}

export function stopAll() {
  stopStreaming();
  setStatus("idle", "Stopped");
}
