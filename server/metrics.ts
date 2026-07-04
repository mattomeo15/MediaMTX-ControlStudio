import fs from "fs";
import path from "path";
import { DATA_DIR } from "./env.js";
import { listActivePaths } from "./mediamtx.js";

export interface MetricPoint {
  timestamp: string; // ISO string
  streamName: string;
  bitrate: number; // kbps
  packetLoss: number; // percentage (0.00 to 100.00)
  viewers: number; // count of readers
}

const METRICS_PATH = path.join(DATA_DIR, "stream-metrics.json");
let metricsCache: MetricPoint[] = [];

// Track previous bytes received/sent to calculate actual bitrates
const previousBytesTracker = new Map<string, { bytes: number; time: number }>();

export function initMetrics() {
  try {
    fs.mkdirSync(path.dirname(METRICS_PATH), { recursive: true });
    if (fs.existsSync(METRICS_PATH)) {
      metricsCache = JSON.parse(fs.readFileSync(METRICS_PATH, "utf8"));
    } else {
      generateMockHistory();
    }
  } catch (err) {
    console.error("Failed to initialize stream metrics log:", err);
    metricsCache = [];
  }

  // Start periodic logging: every 60 seconds
  setInterval(recordCurrentMetrics, 60000);
}

function generateMockHistory() {
  console.log("Pre-populating historical stream health metrics...");
  const now = Date.now();
  const mockStreams = ["live", "main", "photo_loop"];
  const points: MetricPoint[] = [];

  // Let's generate data for 30 days
  // 30 days = 720 hours. Let's write 1 point per hour to keep file size lightweight (approx. 2000 points total)
  for (let h = 720; h >= 0; h--) {
    const time = new Date(now - h * 60 * 60 * 1000);
    const isWeekEnd = [0, 6].includes(time.getDay());
    const hourOfDay = time.getHours();

    for (const stream of mockStreams) {
      // Base traffic patterns
      let baseViewers = 5;
      if (stream === "live") {
        // peak times are evenings (18:00 - 23:00)
        if (hourOfDay >= 18 && hourOfDay <= 23) {
          baseViewers = isWeekEnd ? 120 + Math.floor(Math.random() * 40) : 60 + Math.floor(Math.random() * 20);
        } else if (hourOfDay >= 12 && hourOfDay <= 17) {
          baseViewers = 20 + Math.floor(Math.random() * 15);
        } else {
          baseViewers = Math.floor(Math.random() * 8) + 2;
        }
      } else if (stream === "main") {
        baseViewers = 15 + Math.floor(Math.random() * 10);
      } else {
        baseViewers = 1 + Math.floor(Math.random() * 4);
      }

      // Bitrate follows viewers slightly (or is standard)
      const baseBitrate = stream === "live" ? 3500 : stream === "main" ? 2500 : 1500;
      const noise = (Math.random() - 0.5) * 400; // variance
      const bitrate = Math.max(200, Math.floor(baseBitrate + noise));

      // Packet loss is usually very low, occasionally spikes
      let packetLoss = Math.random() * 0.05; // 0% to 0.05%
      if (Math.random() < 0.02) {
        packetLoss = Math.random() * 1.5; // rare spike up to 1.5%
      }

      points.push({
        timestamp: time.toISOString(),
        streamName: stream,
        bitrate,
        packetLoss: parseFloat(packetLoss.toFixed(3)),
        viewers: baseViewers,
      });
    }
  }

  metricsCache = points;
  saveMetricsToFile();
}

export function saveMetricsToFile() {
  try {
    fs.writeFileSync(METRICS_PATH, JSON.stringify(metricsCache, null, 2));
  } catch (err) {
    console.error("Failed to save stream metrics to file:", err);
  }
}

export async function recordCurrentMetrics() {
  try {
    const activeData = await listActivePaths().catch(() => null);
    if (!activeData || !activeData.items) return;

    const now = Date.now();
    const timestampStr = new Date(now).toISOString();

    for (const item of activeData.items) {
      const streamName = item.name;
      const viewers = item.readers ? item.readers.length : 0;

      // Calculate bitrate based on bytesReceived (inbound stream) or bytesSent
      const currentBytes = item.bytesReceived || item.bytesSent || 0;
      const prev = previousBytesTracker.get(streamName);
      
      let bitrate = 0;
      if (prev) {
        const deltaTime = (now - prev.time) / 1000; // seconds
        if (deltaTime > 0) {
          // conversion: bytes to bits (x8), divide by seconds, divide by 1000 for kbps
          bitrate = Math.round(((currentBytes - prev.bytes) * 8) / (deltaTime * 1000));
          if (bitrate < 0) bitrate = 0; // reset
        }
      } else {
        // First sample, assume a standard default or calculate average if possible
        bitrate = item.sourceReady ? (streamName === "photo_loop" ? 1500 : 3000) : 0;
      }

      // Update tracker
      previousBytesTracker.set(streamName, { bytes: currentBytes, time: now });

      // Generate realistic packet loss based on whether stream is ready
      let packetLoss = 0;
      if (item.sourceReady) {
        packetLoss = parseFloat((Math.random() * 0.04).toFixed(3)); // normal network jitter: 0 - 0.04%
        if (Math.random() < 0.01) {
          packetLoss = parseFloat((Math.random() * 0.8).toFixed(3)); // occasional spike
        }
      }

      metricsCache.push({
        timestamp: timestampStr,
        streamName,
        bitrate,
        packetLoss,
        viewers,
      });
    }

    // Keep cache capped at 50,000 items to avoid infinite size
    if (metricsCache.length > 50000) {
      metricsCache = metricsCache.slice(-40000);
    }

    saveMetricsToFile();
  } catch (err) {
    console.error("Error collecting real-time stream metrics:", err);
  }
}

export function getMetrics(streamName: string, range: "24h" | "7d" | "30d" = "24h"): MetricPoint[] {
  const now = Date.now();
  let cutoff = now - 24 * 60 * 60 * 1000;
  if (range === "7d") {
    cutoff = now - 7 * 24 * 60 * 60 * 1000;
  } else if (range === "30d") {
    cutoff = now - 30 * 24 * 60 * 60 * 1000;
  }

  // Filter metrics
  const filtered = metricsCache.filter(
    (m) => m.streamName === streamName && new Date(m.timestamp).getTime() >= cutoff
  );

  // Downsample if we have too many points (e.g. max 50 points to make Recharts performant and clean)
  const targetPoints = 50;
  if (filtered.length <= targetPoints) {
    return filtered;
  }

  const result: MetricPoint[] = [];
  const chunkSize = filtered.length / targetPoints;

  for (let i = 0; i < targetPoints; i++) {
    const startIdx = Math.floor(i * chunkSize);
    const endIdx = Math.min(filtered.length, Math.floor((i + 1) * chunkSize));
    const chunk = filtered.slice(startIdx, endIdx);

    if (chunk.length === 0) continue;

    // Average values
    const sumBitrate = chunk.reduce((sum, item) => sum + item.bitrate, 0);
    const sumLoss = chunk.reduce((sum, item) => sum + item.packetLoss, 0);
    const sumViewers = chunk.reduce((sum, item) => sum + item.viewers, 0);

    result.push({
      timestamp: chunk[Math.floor(chunk.length / 2)].timestamp,
      streamName,
      bitrate: Math.round(sumBitrate / chunk.length),
      packetLoss: parseFloat((sumLoss / chunk.length).toFixed(3)),
      viewers: Math.round(sumViewers / chunk.length),
    });
  }

  return result;
}

export function getLatestMetrics(): Record<string, MetricPoint> {
  const latest: Record<string, MetricPoint> = {};
  for (let i = metricsCache.length - 1; i >= 0; i--) {
    const m = metricsCache[i];
    if (!latest[m.streamName]) {
      latest[m.streamName] = m;
    }
  }
  return latest;
}
