import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import { Server } from "http";
import { DATA_DIR, getDynamicRtspUrl } from "./env.js";
import {
  listActivePaths,
  listPathConfigs,
  addPathConfig,
  patchPathConfig,
  deletePathConfig,
} from "./mediamtx.js";

// Alert type definition
export interface StreamAlert {
  id: string;
  streamName: string;
  type: "disconnect" | "connect" | "routing" | "system";
  message: string;
  timestamp: string;
  read: boolean;
}

// Router settings definition
export interface RouterSettings {
  enabled: boolean;
  primaryPath: string;     // e.g., "live"
  fallbackPath: string;    // e.g., "announcements"
  destinationPath: string; // e.g., "main"
}

const ROUTER_SETTINGS_PATH = path.join(DATA_DIR, "router-settings.json");

const defaultRouterSettings: RouterSettings = {
  enabled: false,
  primaryPath: "",
  fallbackPath: "",
  destinationPath: "main",
};

// Global in-memory lists
export let alerts: StreamAlert[] = [];
const connectedClients = new Set<WebSocket>();

// Load router settings
export function getRouterSettings(): RouterSettings {
  try {
    if (fs.existsSync(ROUTER_SETTINGS_PATH)) {
      const data = JSON.parse(fs.readFileSync(ROUTER_SETTINGS_PATH, "utf8"));
      return { ...defaultRouterSettings, ...data };
    }
  } catch (err) {
    console.error("Failed to read router settings:", err);
  }
  return { ...defaultRouterSettings };
}

// Save router settings
export function saveRouterSettings(settings: RouterSettings) {
  try {
    fs.mkdirSync(path.dirname(ROUTER_SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(ROUTER_SETTINGS_PATH, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error("Failed to save router settings:", err);
  }
}

// Broadcast to all clients
export function broadcast(type: string, payload: any) {
  const message = JSON.stringify({ type, payload });
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// Previous state tracker for paths: maps streamName -> isReady (sourceReady)
const pathPreviousReadyState = new Map<string, boolean>();
let isFirstCheck = true;

// Active stream monitor and routing loop
async function runMonitoringCycle() {
  try {
    // 1. Fetch current active stream states from MediaMTX
    const activeData = await listActivePaths().catch(() => null);
    if (!activeData) {
      // MediaMTX is down or unreachable
      return;
    }

    const items = activeData.items || [];
    const currentReadyMap = new Map<string, boolean>();

    items.forEach((item: any) => {
      currentReadyMap.set(item.name, !!item.sourceReady);
    });

    // On first check, just populate the initial states to avoid startup alert spam
    if (isFirstCheck) {
      for (const [name, isReady] of currentReadyMap) {
        pathPreviousReadyState.set(name, isReady);
      }
      isFirstCheck = false;
      return;
    }

    // 2. Scan for disconnections and connections
    // First, scan existing previous states
    for (const [name, wasReady] of pathPreviousReadyState) {
      const isCurrentlyReady = currentReadyMap.get(name) === true;

      if (wasReady && !isCurrentlyReady) {
        // Disconnected unexpectedly!
        // Ignore announcements path unless desired, but usually we want to alert on other streams like camera, obs, etc.
        const alertId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const alert: StreamAlert = {
          id: alertId,
          streamName: name,
          type: "disconnect",
          message: `Stream '/${name}' disconnected unexpectedly.`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        alerts.unshift(alert);
        broadcast("alert", alert);
        if (alerts.length > 100) alerts.pop();
      } else if (!wasReady && isCurrentlyReady) {
        // Stream came back online!
        const alertId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const alert: StreamAlert = {
          id: alertId,
          streamName: name,
          type: "connect",
          message: `Stream '/${name}' is now online!`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        alerts.unshift(alert);
        broadcast("alert", alert);
        if (alerts.length > 100) alerts.pop();
      }
    }

    // Next, scan for brand new paths that were not in previous state
    for (const [name, isReady] of currentReadyMap) {
      if (!pathPreviousReadyState.has(name)) {
        if (isReady) {
          const alertId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const alert: StreamAlert = {
            id: alertId,
            streamName: name,
            type: "connect",
            message: `Stream '/${name}' is now online!`,
            timestamp: new Date().toISOString(),
            read: false,
          };
          alerts.unshift(alert);
          broadcast("alert", alert);
          if (alerts.length > 100) alerts.pop();
        }
      }
    }

    // Synchronize previous state tracker
    pathPreviousReadyState.clear();
    for (const [name, isReady] of currentReadyMap) {
      pathPreviousReadyState.set(name, isReady);
    }

    // 3. Broadcast stream status updates to UI
    broadcast("streams", {
      activePaths: items.reduce((acc: any, curr: any) => {
        acc[curr.name] = curr;
        return acc;
      }, {}),
    });

    // 4. Failover Director switching logic
    const rSettings = getRouterSettings();
    if (rSettings.enabled) {
      const primaryActive = currentReadyMap.get(rSettings.primaryPath) === true;
      const expectedPath = primaryActive ? rSettings.primaryPath : rSettings.fallbackPath;
      const rtspUrl = getDynamicRtspUrl();
      const expectedSource = `${rtspUrl}/${expectedPath}`;

      // Check existing config list
      const configData = await listPathConfigs().catch(() => null);
      if (configData) {
        const configList = configData.items || [];
        const destinationConfig = configList.find((c: any) => c.name === rSettings.destinationPath);

        if (destinationConfig) {
          // If the configured source does not match the expected source, update it!
          if (destinationConfig.source !== expectedSource) {
            console.log(`Failover Director: switching '${rSettings.destinationPath}' source from '${destinationConfig.source}' to '${expectedSource}'`);
            await patchPathConfig(rSettings.destinationPath, { source: expectedSource }).catch((e) => {
              console.error(`Failover Director patch error:`, e);
            });

            const alertId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            const alert: StreamAlert = {
              id: alertId,
              streamName: rSettings.destinationPath,
              type: "routing",
              message: `Failover Director: Routed output '/${rSettings.destinationPath}' to target '/${expectedPath}'`,
              timestamp: new Date().toISOString(),
              read: false,
            };
            alerts.unshift(alert);
            broadcast("alert", alert);
            if (alerts.length > 100) alerts.pop();
          }
        } else {
          // Create the destination path with the expected source
          console.log(`Failover Director: creating destination path '${rSettings.destinationPath}' with source '${expectedSource}'`);
          await addPathConfig(rSettings.destinationPath, { source: expectedSource }).catch((e) => {
            console.error(`Failover Director create error:`, e);
          });

          const alertId = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const alert: StreamAlert = {
            id: alertId,
            streamName: rSettings.destinationPath,
            type: "routing",
            message: `Failover Director: Initialized output '/${rSettings.destinationPath}' target to '/${expectedPath}'`,
            timestamp: new Date().toISOString(),
            read: false,
          };
          alerts.unshift(alert);
          broadcast("alert", alert);
          if (alerts.length > 100) alerts.pop();
        }
      }
    }
  } catch (err) {
    console.error("Error in stream monitoring cycle:", err);
  }
}

// Bootstrapper for WebSocket Server
export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    // Only handle WebSocket requests on path '/api/ws'
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/api/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    connectedClients.add(ws);

    // Send initial alerts list and router settings immediately on connect
    ws.send(JSON.stringify({ type: "init-alerts", payload: alerts }));
    ws.send(JSON.stringify({ type: "init-router", payload: getRouterSettings() }));

    ws.on("close", () => {
      connectedClients.delete(ws);
    });

    ws.on("error", (err) => {
      console.error("WebSocket client error:", err);
      connectedClients.delete(ws);
    });
  });

  // Start periodic 2-second background check
  setInterval(runMonitoringCycle, 2000);
  console.log("WebSocket monitoring and Autopilot loop initialized successfully.");

  // Run clean slate routine to remove pre-configured default paths
  cleanSlateStartup();
}

async function cleanSlateStartup() {
  try {
    console.log("[Clean Slate] Checking MediaMTX for pre-configured 'live' and 'announcements' paths...");
    setTimeout(async () => {
      try {
        await deletePathConfig("live").catch(() => {});
        await deletePathConfig("announcements").catch(() => {});
        console.log("[Clean Slate] Successfully removed pre-configured 'live' and 'announcements' paths.");
      } catch (e) {
        console.warn("[Clean Slate] Warning while clearing pre-configured paths:", e);
      }
    }, 5000);
  } catch (err) {
    console.error("[Clean Slate] Error in cleanSlateStartup:", err);
  }
}
