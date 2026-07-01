import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "announcements", "images");
const REEL_PATH = path.join(DATA_DIR, "announcements", "master.mp4");
const SETTINGS_PATH = path.join(DATA_DIR, "announcements", "settings.json");
const UI_SETTINGS_PATH = path.join(DATA_DIR, "ui-settings.json");

export const PORT = process.env.PORT || 3000;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
export const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

export const MEDIAMTX_API_URL = process.env.MEDIAMTX_API_URL || "http://127.0.0.1:9997";
export const MEDIAMTX_RTSP_URL = process.env.MEDIAMTX_RTSP_URL || "rtsp://127.0.0.1:8554";
export const MEDIAMTX_API_USER = process.env.MEDIAMTX_API_USER || "";
export const MEDIAMTX_API_PASS = process.env.MEDIAMTX_API_PASS || "";
export const MEDIAMTX_PUBLIC_HLS_URL_DEFAULT = process.env.MEDIAMTX_PUBLIC_HLS_URL || "";

export {
  DATA_DIR,
  IMAGES_DIR,
  REEL_PATH,
  SETTINGS_PATH,
  UI_SETTINGS_PATH,
};

export const ANNOUNCEMENTS_PATH_NAME = "announcements";
