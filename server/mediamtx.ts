import {
  getMediaMtxApiUrl,
  MEDIAMTX_API_USER,
  MEDIAMTX_API_PASS,
} from "./env.js";

function authHeader(): Record<string, string> {
  if (!MEDIAMTX_API_USER || !MEDIAMTX_API_PASS) return {};
  const token = Buffer.from(`${MEDIAMTX_API_USER}:${MEDIAMTX_API_PASS}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

async function call(method: string, urlPath: string, body?: any): Promise<any> {
  const url = `${getMediaMtxApiUrl()}${urlPath}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeader(),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err: any) {
    const e = new Error(`Could not reach MediaMTX API at ${url}: ${err.message}`) as any;
    e.cause = err;
    throw e;
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const message = (parsed && parsed.error) || text || res.statusText;
    const e = new Error(`MediaMTX API ${method} ${urlPath} -> ${res.status}: ${message}`) as any;
    e.status = res.status;
    throw e;
  }

  return parsed;
}

// --- Runtime status (what's actually live right now) ---
export const listActivePaths = () => call("GET", "/v3/paths/list");
export const getActivePath = (name: string) => call("GET", `/v3/paths/get/${encodeURIComponent(name)}`);

// --- Path configuration ---
export const listPathConfigs = () => call("GET", "/v3/config/paths/list");
export const getPathConfig = (name: string) => call("GET", `/v3/config/paths/get/${encodeURIComponent(name)}`);
export const addPathConfig = (name: string, cfg: any) => call("POST", `/v3/config/paths/add/${encodeURIComponent(name)}`, cfg);
export const patchPathConfig = (name: string, cfg: any) => call("PATCH", `/v3/config/paths/patch/${encodeURIComponent(name)}`, cfg);
export const replacePathConfig = (name: string, cfg: any) => call("PUT", `/v3/config/paths/replace/${encodeURIComponent(name)}`, cfg);
export const deletePathConfig = (name: string) => call("DELETE", `/v3/config/paths/delete/${encodeURIComponent(name)}`);

// --- Global server configuration ---
export const getGlobalConfig = () => call("GET", "/v3/config/global/get");
export const patchGlobalConfig = (cfg: any) => call("PATCH", "/v3/config/global/patch", cfg);
