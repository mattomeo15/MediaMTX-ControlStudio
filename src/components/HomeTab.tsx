import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Monitor,
  Tv,
  ChevronUp,
  ChevronDown,
  Radio,
  Check,
  RefreshCw,
  Cpu,
  ArrowDownLeft,
  ArrowUpRight,
  Video,
  FileImage,
  Shuffle,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Users,
  HardDrive
} from "lucide-react";
import StreamMetricsCharts from "./StreamMetricsCharts.js";

// Types
import { ActivePath, PathConfig, RouterSettings, MediaStreamConfig, AnnouncerStatus } from "../types.js";

interface HomeTabProps {
  pathNames: string[];
  activePaths: Record<string, ActivePath>;
  pathConfigs: Record<string, PathConfig>;
  routerSettings: RouterSettings;
  mediaStreams: MediaStreamConfig[];
  announcerStatus: AnnouncerStatus;
  systemStats: any;
  selectedMonitorPath: string;
  setSelectedMonitorPath: (val: string) => void;
  previewStream: string | null;
  setPreviewStream: (val: string | null) => void;
  hlsBaseUrl: string;
  computedBitrates: Record<string, number>;
  fetchStreamsData: () => Promise<any>;
  fetchAnnouncementStatus: () => Promise<any>;
  fetchMediaStreams: () => Promise<any>;
  handleRouteToOutput: (sourcePath: string) => Promise<any>;
  handleToggleAutopilotOn: (enabled: boolean) => Promise<any>;
  getAvailableSourcesList: () => string[];
  getCurrentlyRoutedSource: () => string;
  stopReel: () => Promise<any>;
  buildAndStreamReel: () => Promise<any>;
}

export default function HomeTab({
  pathNames,
  activePaths,
  pathConfigs,
  routerSettings,
  mediaStreams,
  announcerStatus,
  systemStats,
  selectedMonitorPath,
  setSelectedMonitorPath,
  previewStream,
  setPreviewStream,
  hlsBaseUrl,
  computedBitrates,
  fetchStreamsData,
  fetchAnnouncementStatus,
  fetchMediaStreams,
  handleRouteToOutput,
  handleToggleAutopilotOn,
  getAvailableSourcesList,
  getCurrentlyRoutedSource,
  stopReel,
  buildAndStreamReel
}: HomeTabProps) {
  const [expandedHomepage, setExpandedHomepage] = useState<Record<string, boolean>>({
    monitor: false,
    matrix: false,
    health: false,
    resources: false,
    trends: false,
  });

  const availableInputs = getAvailableSourcesList();
  const currentlyRouted = getCurrentlyRoutedSource();

  // Helper to format system uptime
  const formatUptime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0s";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(" ");
  };

  // Helper to format bitrates
  const formatBitrate = (kbps: number | undefined): string => {
    if (kbps === undefined || isNaN(kbps)) return "0.0 kbps";
    if (kbps > 1000) {
      return `${(kbps / 1000).toFixed(2)} Mbps`;
    }
    return `${kbps.toFixed(1)} kbps`;
  };

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider">Broadcaster Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live player monitoring, route selectors, stream health metrics, and on-demand start/stop triggers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStreamsData();
              fetchAnnouncementStatus();
              fetchMediaStreams();
            }}
            className="p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH STATUS</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Section 1: Active Streams Matrix / Live Output Monitor */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedHomepage((prev) => ({ ...prev, monitor: !prev.monitor }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Monitor className="w-4 h-4 text-blue-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Live Output Monitor</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Real-time HLS feed playback and stream routing overview</p>
                </div>
              </div>
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Monitor Path:</span>
                  <select
                    value={selectedMonitorPath}
                    onChange={(e) => {
                      setSelectedMonitorPath(e.target.value);
                      setPreviewStream(`${hlsBaseUrl}/${e.target.value}`);
                    }}
                    className="bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-xs py-1 px-2.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="main" className="bg-slate-100 dark:bg-slate-900">/main (Autopilot Output)</option>
                    {pathNames.filter(n => n !== "main").map(n => {
                      let label = `/${n}`;
                      if (n === "live") label = "/live (Primary Target)";
                      if (n === "announcements") label = "/announcements (Photo Loop)";
                      return (
                        <option key={n} value={n} className="bg-slate-100 dark:bg-slate-900">{label}</option>
                      );
                    })}
                  </select>
                </div>
                <button
                  onClick={() => setExpandedHomepage((prev) => ({ ...prev, monitor: !prev.monitor }))}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {expandedHomepage.monitor ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {expandedHomepage.monitor && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                {/* Stream Video Player Frame */}
                <div className="aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 relative flex items-center justify-center">
                  {(() => {
                    const active = activePaths[selectedMonitorPath];
                    const isLive = active && active.sourceReady;
                    
                    if (isLive && previewStream) {
                      return (
                        <video
                          src={previewStream}
                          controls
                          autoPlay
                          muted
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      );
                    } else {
                      return (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3">
                          <Radio className="w-12 h-12 text-slate-600 animate-pulse" />
                          <div>
                            <p className="text-sm font-bold text-slate-300">Stream Output is Offline</p>
                            <p className="text-xs text-slate-500 mt-1">Select an active path or start a fallback loop below to stream</p>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Quick controls for the selected stream path */}
                {(() => {
                  const pathName = selectedMonitorPath;
                  const active = activePaths[pathName];
                  const isLive = !!(active && active.sourceReady);
                  const isPhotoLoop = pathName === "announcements";
                  const mediaConfig = mediaStreams.find(m => m.name === pathName);
                  
                  return (
                    <div className="bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-mono">
                          <span className={`w-2 h-2 rounded-full ${isLive || (isPhotoLoop && announcerStatus.status === "streaming") ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          <span>Active Path: /{pathName}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {isPhotoLoop
                            ? "Renders a high-resolution canvas loop using your uploaded photos."
                            : mediaConfig
                            ? `Dynamic MP4 loop configuration: ${mediaConfig.type === "youtube" ? "YouTube Direct Link" : "Local File Video"}`
                            : "Static OBS RTSP broadcast ingestion point"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPhotoLoop && (
                          announcerStatus.status === "streaming" ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); stopReel(); }}
                              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg transition-all"
                            >
                              STOP REEL
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); buildAndStreamReel(); }}
                              disabled={announcerStatus.status === "rendering"}
                              className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded-lg transition-all disabled:opacity-50"
                            >
                              START REEL
                            </button>
                          )
                        )}

                        {mediaConfig && (
                          mediaConfig.status === "streaming" ? (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await fetch(`/api/media-streams/stop/${mediaConfig.name}`, { method: "POST" });
                                fetchMediaStreams();
                              }}
                              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg transition-all"
                            >
                              STOP LOOP
                            </button>
                          ) : (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                await fetch(`/api/media-streams/start/${mediaConfig.name}`, { method: "POST" });
                                fetchMediaStreams();
                              }}
                              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-all"
                            >
                              START LOOP
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Section 2: Stream Routing Matrix / Patch-Panel Table */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedHomepage((prev) => ({ ...prev, matrix: !prev.matrix }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shuffle className="w-4 h-4 text-purple-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Stream Routing Matrix</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Patch-panel map of configured Input Streams to Output Streams</p>
                </div>
              </div>
              <button
                onClick={() => setExpandedHomepage((prev) => ({ ...prev, matrix: !prev.matrix }))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {expandedHomepage.matrix ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {expandedHomepage.matrix && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-6">
                
                {/* Stream Autopilot Toggle control embedded directly */}
                <div className={`p-4 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-300 ${
                  routerSettings.enabled 
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300" 
                    : "bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-300"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${routerSettings.enabled ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                      <Shuffle className={`w-4 h-4 ${routerSettings.enabled ? "animate-spin [animation-duration:15s]" : ""}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 flex-wrap">
                        <span>Stream Autopilot Failover Status:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${routerSettings.enabled ? "bg-emerald-500 text-white animate-pulse" : "bg-amber-500 text-white"}`}>
                          {routerSettings.enabled ? "ACTIVE" : "BYPASSED"}
                        </span>
                      </p>
                      <p className="text-[10px] opacity-90 mt-0.5 leading-relaxed">
                        {routerSettings.enabled ? (
                          `Failover automation is running. Primary Input: /${routerSettings.primaryPath || "(none)"}. Fallback Input: /${routerSettings.fallbackPath || "(none)"}. Target Output: /${routerSettings.destinationPath || "main"}`
                        ) : (
                          `Autopilot is disabled. The destination output (/${routerSettings.destinationPath || "main"}) will remain pointing to your manual routing selection.`
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 self-end sm:self-center">
                    {routerSettings.enabled ? (
                      <button
                        onClick={() => handleToggleAutopilotOn(false)}
                        className="py-1.5 px-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 rounded-lg text-[10px] font-bold transition-all shadow-sm"
                      >
                        BYPASS AUTOMATION
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleAutopilotOn(true)}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin [animation-duration:4s]" />
                        <span>RESUME AUTOMATION</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* PATCH-PANEL MATRIX GRID */}
                <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-slate-900/10">
                  <table className="w-full border-collapse text-left text-xs text-slate-800 dark:text-slate-200">
                    <thead className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-white/10">
                      <tr>
                        <th className="p-4 font-bold uppercase tracking-wider text-slate-400 text-[10px]">Input Stream (Source)</th>
                        <th className="p-4 font-bold uppercase tracking-wider text-slate-400 text-[10px] text-center">Status</th>
                        <th className="p-4 font-bold uppercase tracking-wider text-slate-400 text-[10px] text-center">Route to Output (/{routerSettings.destinationPath || "main"})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 font-mono">
                      {availableInputs.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-slate-400 text-xs">
                            No active input ingestion points found.
                          </td>
                        </tr>
                      ) : (
                        availableInputs.map((inputName) => {
                          const active = activePaths[inputName];
                          const isReady = !!(active && active.sourceReady);
                          const isRouted = currentlyRouted === inputName;

                          return (
                            <tr key={inputName} className={`transition-colors ${isRouted ? "bg-blue-600/5" : "hover:bg-slate-500/5"}`}>
                              <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">
                                <div className="flex items-center gap-2">
                                  {inputName === "announcements" ? (
                                    <FileImage className="w-4 h-4 text-purple-400" />
                                  ) : (
                                    <Radio className="w-4 h-4 text-emerald-400" />
                                  )}
                                  <span>/{inputName}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  isReady 
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-pulse" 
                                    : "bg-slate-100 dark:bg-white/5 text-slate-400"
                                }`}>
                                  {isReady ? "Ready" : "Offline"}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex justify-center">
                                  {isRouted ? (
                                    <button
                                      className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400"
                                      title="Currently Connected"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleRouteToOutput(inputName)}
                                      disabled={!isReady}
                                      className={`h-6 w-6 rounded-full flex items-center justify-center border transition-all ${
                                        isReady 
                                          ? "border-slate-300 dark:border-white/20 hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer" 
                                          : "border-slate-200 dark:border-white/5 opacity-40 cursor-not-allowed"
                                      }`}
                                      title={isReady ? `Route /${inputName} to output` : "Input must be active to route"}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>

          {/* Section 3: Live Real-Time Stream Health */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedHomepage((prev) => ({ ...prev, health: !prev.health }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-emerald-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Real-Time Ingestion</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Bitrate concurrency & dynamic network statistics</p>
                </div>
              </div>
              <button
                onClick={() => setExpandedHomepage((prev) => ({ ...prev, health: !prev.health }))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {expandedHomepage.health ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {expandedHomepage.health && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                {(() => {
                  const active = activePaths[selectedMonitorPath];
                  const isLive = !!(active && active.sourceReady);
                  const bitrate = computedBitrates[selectedMonitorPath] || 0;
                  const viewers = active?.readers?.length || 0;
                  const tracks = active?.tracks || [];

                  return (
                    <div className="space-y-4">
                      {/* Metric Card 1: Live Bitrate */}
                      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Active Bitrate</span>
                          <span className="text-lg font-mono font-bold text-slate-800 dark:text-white">
                            {isLive ? formatBitrate(bitrate) : "0.0 kbps"}
                          </span>
                        </div>
                        <div className={`p-2.5 rounded-lg ${isLive && bitrate > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-white/5 text-slate-500"}`}>
                          <Activity className={`w-5 h-5 ${isLive && bitrate > 0 ? "animate-pulse" : ""}`} />
                        </div>
                      </div>

                      {/* Metric Card 2: Viewer Concurrency */}
                      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Viewer Concurrency</span>
                          <span className="text-lg font-mono font-bold text-slate-800 dark:text-white">
                            {viewers} {viewers === 1 ? "viewer" : "viewers"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-lg">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                      </div>

                      {/* Tracks & Stream Info */}
                      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 space-y-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Codec / Stream Tracks</span>
                        {tracks.length === 0 ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">No active codecs detected.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 font-mono">
                            {tracks.map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded text-[10px] uppercase font-bold">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Section 4: Server Resource Monitor */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedHomepage((prev) => ({ ...prev, resources: !prev.resources }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-indigo-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Supervisor Resources</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Control studio container and system load levels</p>
                </div>
              </div>
              <button
                onClick={() => setExpandedHomepage((prev) => ({ ...prev, resources: !prev.resources }))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                {expandedHomepage.resources ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>

            {expandedHomepage.resources && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                {systemStats ? (
                  (() => {
                    const cpuVal = typeof systemStats.cpu === "number" ? systemStats.cpu : 1.2;
                    const memUsed = (systemStats.memory && typeof systemStats.memory.used === "number")
                      ? systemStats.memory.used
                      : (systemStats.memoryHeapUsed ? systemStats.memoryHeapUsed * 1024 * 1024 : 32 * 1024 * 1024);
                    const memTotal = (systemStats.memory && typeof systemStats.memory.total === "number")
                      ? systemStats.memory.total
                      : (systemStats.memoryRss ? systemStats.memoryRss * 1024 * 1024 : 128 * 1024 * 1024);
                    return (
                      <div className="space-y-4">
                        {/* CPU Usage Load */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                            <span>Supervisor CPU usage</span>
                            <span>{cpuVal.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-300 dark:border-white/5">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 rounded-full" 
                              style={{ width: `${Math.min(100, Math.max(2, cpuVal))}%` }}
                            />
                          </div>
                        </div>

                        {/* Memory Usage load */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                            <span>Supervisor Memory Load</span>
                            <span>{(memUsed / 1024 / 1024).toFixed(0)} MB / {(memTotal / 1024 / 1024).toFixed(0)} MB</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-300 dark:border-white/5">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500 rounded-full" 
                              style={{ width: `${Math.min(100, Math.max(2, memTotal > 0 ? (memUsed / memTotal) * 100 : 0))}%` }}
                            />
                          </div>
                        </div>

                        {/* Uptime and PID */}
                        <div className="pt-2 flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-200 dark:border-white/5">
                          <span>Server Uptime</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {formatUptime(systemStats.uptime)}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    Fetching host supervisor stats...
                  </div>
                )}
              </div>
            )}
          </div>

      {/* Section 5: Historical Stream Health charts */}
      <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
        <div
          onClick={() => setExpandedHomepage((prev) => ({ ...prev, trends: !prev.trends }))}
          className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
            <div>
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Historical Stream Analytics</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Plot bandwidth fluctuations and viewer trends across historical ranges</p>
            </div>
          </div>
          <button
            onClick={() => setExpandedHomepage((prev) => ({ ...prev, trends: !prev.trends }))}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            {expandedHomepage.trends ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {expandedHomepage.trends && (
          <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
            <StreamMetricsCharts
              availableStreams={Array.from(new Set([
                "main", ...pathNames, ...mediaStreams.map(m => m.name)
              ]))}
            />
          </div>
        )}
      </div>

      </div>

    </motion.div>
  );
}
