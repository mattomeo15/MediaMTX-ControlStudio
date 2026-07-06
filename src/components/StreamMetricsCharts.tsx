import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Activity, Radio, AlertTriangle, Users, Loader2 } from "lucide-react";

interface StreamMetricsChartsProps {
  availableStreams: string[];
}

interface MetricPoint {
  timestamp: string;
  streamName: string;
  bitrate: number;
  packetLoss: number;
  viewers: number;
}

export default function StreamMetricsCharts({ availableStreams }: StreamMetricsChartsProps) {
  const [selectedStream, setSelectedStream] = useState<string>("");
  const [range, setRange] = useState<"1h" | "24h" | "7d" | "30d">("24h");
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Set default stream on load
  useEffect(() => {
    if (availableStreams.length > 0 && !selectedStream) {
      // Prefer "live" or "main" as default, otherwise pick the first
      const defaultStream = availableStreams.includes("live")
        ? "live"
        : availableStreams.includes("main")
        ? "main"
        : availableStreams[0];
      setSelectedStream(defaultStream);
    }
  }, [availableStreams, selectedStream]);

  // Fetch metrics
  useEffect(() => {
    if (!selectedStream) return;

    const fetchMetrics = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/streams/metrics?streamName=${encodeURIComponent(selectedStream)}&range=${range}`);
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        } else {
          throw new Error("Unable to load historical stream metrics");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load metrics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
    // Poll metrics every 30 seconds to update charts live
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [selectedStream, range]);

  // Format time labels based on range
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      if (range === "1h") {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      } else if (range === "24h") {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      } else {
        return date.toLocaleDateString([], { month: "short", day: "numeric" }) + 
               " " + date.toLocaleTimeString([], { hour: "2-digit" });
      }
    } catch {
      return tickItem;
    }
  };

  const customTooltipFormatter = (value: any, name: string) => {
    if (name === "bitrate") return [`${value} kbps`, "Bitrate"];
    if (name === "packetLoss") return [`${value}%`, "Packet Loss"];
    if (name === "viewers") return [`${value} viewers`, "Concurrency"];
    return [value, name];
  };

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
      {/* Selector Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-blue-500 animate-pulse" />
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stream Health & Historical Metrics</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Real-time charts powered by MediaMTX collector telemetry</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Stream Selector */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Stream:</span>
            <select
              value={selectedStream}
              onChange={(e) => setSelectedStream(e.target.value)}
              className="bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-1.5 px-3 focus:outline-none focus:border-blue-500 w-full sm:w-44"
            >
              {availableStreams.length === 0 ? (
                <option value="">No streams available</option>
              ) : (
                availableStreams.map((s) => (
                  <option key={s} value={s}>
                    /{s}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Range Toggle */}
          <div className="bg-slate-950/40 border border-white/10 rounded-xl p-0.5 flex flex-wrap gap-0.5">
            {(["1h", "24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-[10px] font-bold uppercase py-1 px-3 rounded-lg transition-all ${
                  range === r
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {r === "1h" ? "1 Hour" : r === "24h" ? "24 Hours" : r === "7d" ? "1 Week" : "1 Month"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && metrics.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs font-mono tracking-widest">GATHERING TELEMETRY...</span>
        </div>
      ) : error ? (
        <div className="h-64 border border-dashed border-rose-500/20 rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-2 bg-rose-500/5">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
          <p className="text-sm text-rose-400 font-semibold">{error}</p>
          <p className="text-xs text-slate-500">Ensure your streaming feed is running and container is healthy</p>
        </div>
      ) : metrics.length === 0 ? (
        <div className="h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center space-y-2 bg-white/2">
          <Radio className="w-8 h-8 text-slate-500" />
          <p className="text-sm text-slate-400 font-semibold">No metrics recorded yet</p>
          <p className="text-xs text-slate-500">Metrics will appear automatically once the stream starts broadcasting</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Bitrate AreaChart */}
          <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Radio className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bitrate Throughput (kbps)</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bitrateGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fill: "var(--text-dim)", fontSize: 8 }} />
                  <YAxis tick={{ fill: "var(--text-dim)", fontSize: 8 }} />
                  <Tooltip formatter={customTooltipFormatter} />
                  <Area type="monotone" dataKey="bitrate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#bitrateGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Packet Loss LineChart */}
          <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Network Packet Loss (%)</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fill: "var(--text-dim)", fontSize: 8 }} />
                  <YAxis tick={{ fill: "var(--text-dim)", fontSize: 8 }} unit="%" />
                  <Tooltip formatter={customTooltipFormatter} />
                  <Line type="monotone" dataKey="packetLoss" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Viewer Concurrency BarChart */}
          <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Viewer Concurrency (Readers)</span>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fill: "var(--text-dim)", fontSize: 8 }} />
                  <YAxis tick={{ fill: "var(--text-dim)", fontSize: 8 }} />
                  <Tooltip formatter={customTooltipFormatter} />
                  <Bar dataKey="viewers" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
