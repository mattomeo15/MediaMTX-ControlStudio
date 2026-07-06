import fs from "fs";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

const maxLogs = 200;
const logBuffer: LogEntry[] = [];

// Pre-populate with some initial system startup logs
const startTime = Date.now();
addLogEntry("info", "Control Studio v3.0 core supervisor booting...");
addLogEntry("info", "Initializing MediaMTX Control client...");
addLogEntry("info", "Stream Health Metrics worker initialized successfully.");
addLogEntry("info", "WebSocket event bus started on port 3000.");

export function addLogEntry(level: "info" | "warn" | "error" | "debug", message: string) {
  const timestamp = new Date().toISOString();
  logBuffer.push({ timestamp, level, message });
  if (logBuffer.length > maxLogs) {
    logBuffer.shift();
  }
  // Also log to console
  console.log(`[${level.toUpperCase()}] [${timestamp}] ${message}`);
}

export function getSystemLogs(): LogEntry[] {
  return logBuffer;
}

export function formatLogString(): string {
  return logBuffer
    .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
    .join("\n");
}
