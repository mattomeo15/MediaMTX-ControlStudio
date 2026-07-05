import path from "path";
import os from "os";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "announcements", "images");
const REEL_PATH = path.join(DATA_DIR, "announcements", "master.mp4");
const SETTINGS_PATH = path.join(DATA_DIR, "announcements", "settings.json");
const UI_SETTINGS_PATH = path.join(DATA_DIR, "ui-settings.json");

export const PORT = process.env.PORT || 3000;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
export const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

export const MEDIAMTX_API_URL = process.env.MEDIAMTX_API_URL || "http://127.0.0.1:9997";
export const MEDIAMTX_API_USER = process.env.MEDIAMTX_API_USER || "";
export const MEDIAMTX_API_PASS = process.env.MEDIAMTX_API_PASS || "";
export const MEDIAMTX_PUBLIC_HLS_URL_DEFAULT = process.env.MEDIAMTX_PUBLIC_HLS_URL || "";

export function getMediaMtxHost(): string {
  const apiUrl = process.env.MEDIAMTX_API_URL || "http://mediamtx:9997";
  try {
    const parsed = new URL(apiUrl);
    const host = parsed.hostname;
    if (host && host !== "127.0.0.1" && host !== "localhost" && host !== "0.0.0.0") {
      return host;
    }
  } catch (e) {
    // Regex fallback
    const match = apiUrl.match(/^(?:https?:\/\/)?([^:/]+)/);
    if (match && match[1] && match[1] !== "127.0.0.1" && match[1] !== "localhost" && match[1] !== "0.0.0.0") {
      return match[1];
    }
  }

  // If MEDIAMTX_API_URL is loopback or parsing fails, resolve a non-loopback network interface
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (netList) {
      for (const net of netList) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  }

  return "mediamtx";
}

export function getDynamicRtspUrl(): string {
  const host = getMediaMtxHost();
  const envRtsp = process.env.MEDIAMTX_RTSP_URL || "";
  let port = "8554";
  if (envRtsp) {
    try {
      const match = envRtsp.match(/:(\d+)/);
      if (match && match[1]) {
        port = match[1];
      }
    } catch (e) {}
  }
  return `rtsp://${host}:${port}`;
}

export {
  DATA_DIR,
  IMAGES_DIR,
  REEL_PATH,
  SETTINGS_PATH,
  UI_SETTINGS_PATH,
};

export const ANNOUNCEMENTS_PATH_NAME = "announcements";
