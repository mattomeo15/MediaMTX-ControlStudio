import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import ytdl from "@distube/ytdl-core";
import { DATA_DIR, MEDIAMTX_RTSP_URL } from "./env.js";

export interface MediaStreamConfig {
  name: string; // Stream route path name, e.g. "my_video"
  type: "file" | "youtube";
  sourceUrl: string; // YouTube URL or relative/absolute path to file
  loop: boolean;
  status: "idle" | "streaming" | "error";
  errorMessage?: string;
}

export const MEDIA_DIR = path.join(DATA_DIR, "media");
const MEDIA_STREAMS_CONFIG_PATH = path.join(DATA_DIR, "media-streams.json");

let streamConfigs: MediaStreamConfig[] = [];
const activeProcesses = new Map<string, ChildProcess>();

export function ensureMediaDirs() {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

export async function loadMediaConfigs(): Promise<MediaStreamConfig[]> {
  ensureMediaDirs();
  try {
    if (fs.existsSync(MEDIA_STREAMS_CONFIG_PATH)) {
      const raw = await fsp.readFile(MEDIA_STREAMS_CONFIG_PATH, "utf8");
      const parsed = JSON.parse(raw) as MediaStreamConfig[];
      // Sync initial statuses to idle (processes aren't running yet)
      streamConfigs = parsed.map(c => ({ ...c, status: "idle", errorMessage: undefined }));
      return streamConfigs;
    }
  } catch (err) {
    console.error("Failed to load media streams config:", err);
  }
  streamConfigs = [];
  return streamConfigs;
}

export async function saveMediaConfigs() {
  ensureMediaDirs();
  try {
    const serialized = streamConfigs.map(({ name, type, sourceUrl, loop }) => ({
      name, type, sourceUrl, loop
    }));
    await fsp.writeFile(MEDIA_STREAMS_CONFIG_PATH, JSON.stringify(serialized, null, 2));
  } catch (err) {
    console.error("Failed to save media streams config:", err);
  }
}

export function getMediaStreams(): MediaStreamConfig[] {
  return streamConfigs;
}

export async function addMediaStream(config: Omit<MediaStreamConfig, "status">): Promise<MediaStreamConfig> {
  const existingIndex = streamConfigs.findIndex(c => c.name === config.name);
  const newConfig: MediaStreamConfig = {
    ...config,
    status: "idle"
  };

  if (existingIndex >= 0) {
    // Stop running process if existing
    await stopMediaStream(config.name);
    streamConfigs[existingIndex] = newConfig;
  } else {
    streamConfigs.push(newConfig);
  }

  await saveMediaConfigs();
  return newConfig;
}

export async function deleteMediaStream(name: string): Promise<boolean> {
  const index = streamConfigs.findIndex(c => c.name === name);
  if (index >= 0) {
    await stopMediaStream(name);
    streamConfigs.splice(index, 1);
    await saveMediaConfigs();
    return true;
  }
  return false;
}

export async function startMediaStream(name: string): Promise<boolean> {
  const cfg = streamConfigs.find(c => c.name === name);
  if (!cfg) return false;

  // If already running, stop first
  if (activeProcesses.has(name)) {
    await stopMediaStream(name);
  }

  cfg.status = "idle";
  cfg.errorMessage = undefined;

  const targetUrl = `${MEDIAMTX_RTSP_URL}/${name}`;
  console.log(`Starting media stream '${name}' of type '${cfg.type}' to ${targetUrl}`);

  try {
    let ffmpegArgs: string[] = [];

    if (cfg.type === "file") {
      let filePath = cfg.sourceUrl;
      // If it's a relative filename in MEDIA_DIR
      if (!path.isAbsolute(filePath)) {
        filePath = path.join(MEDIA_DIR, filePath);
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`Video file not found: ${filePath}`);
      }

      // Stream a local video file
      ffmpegArgs = [
        "-re",
        ...(cfg.loop ? ["-stream_loop", "-1"] : []),
        "-i", filePath,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-b:v", "2000k",
        "-g", "50",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-rtsp_transport", "tcp",
        "-f", "rtsp",
        targetUrl
      ];
    } else if (cfg.type === "youtube") {
      // Resolve YouTube URLs
      console.log(`Resolving YouTube stream formats for: ${cfg.sourceUrl}`);
      const info = await ytdl.getInfo(cfg.sourceUrl);
      
      // Select formats: find best video and best audio
      const videoFormat = ytdl.chooseFormat(info.formats, { quality: "highestvideo", filter: "videoonly" });
      const audioFormat = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });

      if (!videoFormat || !videoFormat.url) {
        throw new Error("Could not extract a valid video stream from YouTube");
      }

      const videoUrl = videoFormat.url;
      const audioUrl = audioFormat ? audioFormat.url : null;

      ffmpegArgs = [
        "-re",
        "-i", videoUrl,
        ...(audioUrl ? ["-re", "-i", audioUrl] : []),
        "-map", "0:v",
        ...(audioUrl ? ["-map", "1:a"] : []),
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-b:v", "2000k",
        "-g", "50",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "44100",
        "-rtsp_transport", "tcp",
        "-f", "rtsp",
        targetUrl
      ];
    }

    // Spawn FFmpeg process
    const proc = spawn("ffmpeg", ["-y", ...ffmpegArgs]);
    activeProcesses.set(name, proc);
    cfg.status = "streaming";

    let stderrOutput = "";
    proc.stderr?.on("data", (chunk) => {
      stderrOutput = (stderrOutput + chunk.toString()).slice(-2000);
    });

    proc.on("error", (err: any) => {
      console.error(`FFmpeg media stream '${name}' error:`, err);
      cfg.status = "error";
      cfg.errorMessage = err.message || "FFmpeg spawn error";
    });

    proc.on("close", (code, signal) => {
      console.log(`FFmpeg media stream '${name}' closed with code ${code}, signal ${signal}`);
      if (activeProcesses.get(name) === proc) {
        activeProcesses.delete(name);
        
        if (cfg.status === "streaming") {
          // If stopped naturally but looping is desired (for YouTube where -stream_loop doesn't work directly on live URLs)
          if (cfg.type === "youtube" && cfg.loop && signal !== "SIGTERM") {
            console.log(`YouTube stream ended, restarting loop for '${name}'...`);
            startMediaStream(name).catch(e => console.error(`Failed to loop restart media stream '${name}':`, e));
          } else {
            cfg.status = "idle";
          }
        } else if (code !== 0 && signal !== "SIGTERM") {
          cfg.status = "error";
          cfg.errorMessage = `FFmpeg stream failed (exit code ${code}). Stderr tail:\n${stderrOutput.split("\n").slice(-8).join("\n")}`;
        }
      }
    });

    return true;
  } catch (err: any) {
    console.error(`Failed to start media stream '${name}':`, err);
    cfg.status = "error";
    cfg.errorMessage = err.message || String(err);
    return false;
  }
}

export async function stopMediaStream(name: string): Promise<boolean> {
  const proc = activeProcesses.get(name);
  const cfg = streamConfigs.find(c => c.name === name);
  
  if (proc) {
    proc.kill("SIGTERM");
    activeProcesses.delete(name);
  }

  if (cfg) {
    cfg.status = "idle";
    cfg.errorMessage = undefined;
    return true;
  }
  return false;
}

export async function listLocalFiles(): Promise<string[]> {
  ensureMediaDirs();
  try {
    const list = await fsp.readdir(MEDIA_DIR);
    return list.filter(f => /\.(mp4|mkv|mov|avi|wmv|flv|m4v|webm)$/i.test(f));
  } catch {
    return [];
  }
}
