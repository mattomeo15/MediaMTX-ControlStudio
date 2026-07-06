import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Settings,
  Key,
  Database,
  Monitor,
  Terminal,
  RefreshCw,
  Sliders,
  Check,
  AlertTriangle,
  Copy,
  Lock,
  Search,
  Activity,
  Server,
  ChevronUp,
  ChevronDown
} from "lucide-react";

// Types
import { GlobalConfig } from "../types.js";

interface SettingsTabProps {
  hlsBaseUrl: string;
  setHlsBaseUrl: (url: string) => void;
  globalConfig: GlobalConfig;
  setGlobalConfig: React.Dispatch<React.SetStateAction<GlobalConfig>>;
  isLoadingConfig: boolean;
  configError: string;
  saveStatus: { type: "success" | "error"; msg: string } | null;
  fetchGlobalConfig: () => Promise<any>;
  handleSaveGlobalConfig: (e: React.FormEvent) => Promise<any>;
  handleSaveUiSettings: () => Promise<any>;

  // Credentials change states passed from App.tsx
  currentPassword: string;
  setCurrentPassword: (pass: string) => void;
  newPassword: string;
  setNewPassword: (pass: string) => void;
  handleChangePassword: (e: React.FormEvent) => Promise<any>;
  passwordChangeStatus: { type: "success" | "error"; msg: string } | null;
  isChangingPassword: boolean;
}

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
}

export default function SettingsTab({
  hlsBaseUrl,
  setHlsBaseUrl,
  globalConfig,
  setGlobalConfig,
  isLoadingConfig,
  configError,
  saveStatus,
  fetchGlobalConfig,
  handleSaveGlobalConfig,
  handleSaveUiSettings,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  handleChangePassword,
  passwordChangeStatus,
  isChangingPassword
}: SettingsTabProps) {
  // System Logs states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    connection: false,
    port: false,
    security: false,
    logs: false,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsSuccessMsg, setLogsSuccessMsg] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Connection status testing state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; msg: string } | null>(null);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/config/system-logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load system logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const testCoreConnection = async () => {
    setIsTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        setConnectionResult({ success: true, msg: "MediaMTX Control Studio core services connected! HTTP Ingress OK." });
      } else {
        setConnectionResult({ success: false, msg: "Core responded but with non-200 status code. Verify API server is active." });
      }
    } catch {
      setConnectionResult({ success: false, msg: "Core connection timed out or unreachable. Check MediaMTX container status." });
    } finally {
      setIsTestingConnection(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto scroll terminal to bottom on log updates
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const copyLogsToClipboard = () => {
    const rawText = logs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join("\n");
    navigator.clipboard.writeText(rawText);
    setLogsSuccessMsg("Copied logs to clipboard!");
    setTimeout(() => setLogsSuccessMsg(""), 3000);
  };

  const clearLogRegistry = () => {
    setLogs([]);
  };

  // Filter and search logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === "all" || log.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider">System Settings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure API connections, port parameters, supervisor passwords, and review diagnostic stream telemetry logs</p>
        </div>
      </div>

      <div className="space-y-6">
          
          {/* Section 1: MediaMTX Core API Connection */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, connection: !prev.connection }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-blue-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">MediaMTX Core Connection</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Configure host linking, dynamic API environments, and test active socket channels</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.connection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.connection && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                <div className="space-y-4 text-xs">
                  
                  {/* Core HLS URL */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">MediaMTX Public HLS Base URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hlsBaseUrl}
                        onChange={(e) => setHlsBaseUrl(e.target.value)}
                        placeholder="e.g. http://192.168.2.233:8888"
                        className="flex-1 bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-none"
                      />
                      <button
                        onClick={handleSaveUiSettings}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/10"
                      >
                        SAVE LINKING
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 font-mono">
                      This Base URL is used to dynamically construct stream previews (HLS/HTTP players) for your active channels.
                    </p>
                  </div>

                  {/* Ping connection card */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={testCoreConnection}
                      disabled={isTestingConnection}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      {isTestingConnection ? <RefreshCw className="w-3 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-blue-500" />}
                      <span>Ping Core Service Connection</span>
                    </button>

                    {connectionResult && (
                      <div className={`mt-2.5 p-3 rounded-xl border text-[11px] font-semibold flex items-start gap-2 ${
                        connectionResult.success 
                          ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-600 dark:text-emerald-400" 
                          : "bg-rose-500/10 border-rose-500/15 text-rose-500"
                      }`}>
                        <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{connectionResult.msg}</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Section 2: Global Protocol Port Configuration & Log Toggles */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, port: !prev.port }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-purple-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Global Protocol Port Config</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Toggle listening ports and global MediaMTX configurations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); fetchGlobalConfig(); }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Reload configuration"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  {expandedSections.port ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {expandedSections.port && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                {configError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{configError}</span>
                  </div>
                )}

                {isLoadingConfig ? (
                  <div className="text-center py-10 text-slate-500 flex flex-col items-center justify-center gap-1.5">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="text-[10px] font-mono text-slate-400">Loading listening configurations...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveGlobalConfig} className="space-y-4 text-xs">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Log level parameter */}
                      <div className="bg-slate-100/40 dark:bg-slate-950/20 p-3.5 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">System Core Log Level</label>
                        <select
                          value={globalConfig.logLevel || "info"}
                          onChange={(e) => setGlobalConfig(prev => ({ ...prev, logLevel: e.target.value }))}
                          className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1 px-2 focus:outline-none"
                        >
                          <option value="debug">debug (verbose telemetry)</option>
                          <option value="info">info (standard activity)</option>
                          <option value="warn">warn (warnings only)</option>
                          <option value="error">error (critical crashes)</option>
                        </select>
                      </div>

                      {/* RTSP Address */}
                      <div className="bg-slate-100/40 dark:bg-slate-950/20 p-3.5 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">RTSP Port Address</label>
                        <input
                          type="text"
                          value={globalConfig.rtspAddress || ""}
                          onChange={(e) => setGlobalConfig(prev => ({ ...prev, rtspAddress: e.target.value }))}
                          className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1 px-2 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* RTMP listen */}
                      <div className="bg-slate-100/40 dark:bg-slate-950/20 p-3.5 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">RTMP Server</span>
                          <input
                            type="checkbox"
                            checked={!!globalConfig.rtmpEnable}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, rtmpEnable: e.target.checked }))}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </div>
                        <input
                          type="text"
                          value={globalConfig.rtmpAddress || ""}
                          onChange={(e) => setGlobalConfig(prev => ({ ...prev, rtmpAddress: e.target.value }))}
                          className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1 px-2 focus:outline-none font-mono"
                        />
                      </div>

                      {/* HLS listen */}
                      <div className="bg-slate-100/40 dark:bg-slate-950/20 p-3.5 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">HLS Server</span>
                          <input
                            type="checkbox"
                            checked={!!globalConfig.hlsEnable}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, hlsEnable: e.target.checked }))}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </div>
                        <input
                          type="text"
                          value={globalConfig.hlsAddress || ""}
                          onChange={(e) => setGlobalConfig(prev => ({ ...prev, hlsAddress: e.target.value }))}
                          className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1 px-2 focus:outline-none font-mono"
                        />
                      </div>

                      {/* WebRTC listen */}
                      <div className="bg-slate-100/40 dark:bg-slate-950/20 p-3.5 border border-slate-200 dark:border-white/5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">WebRTC Server</span>
                          <input
                            type="checkbox"
                            checked={!!globalConfig.webrtcEnable}
                            onChange={(e) => setGlobalConfig(prev => ({ ...prev, webrtcEnable: e.target.checked }))}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </div>
                        <input
                          type="text"
                          value={globalConfig.webrtcAddress || ""}
                          onChange={(e) => setGlobalConfig(prev => ({ ...prev, webrtcAddress: e.target.value }))}
                          className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1 px-2 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    {saveStatus && (
                      <div className={`text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 border ${
                        saveStatus.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                      }`}>
                        <Check className="w-3.5 h-3.5" />
                        <span>{saveStatus.msg}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={fetchGlobalConfig}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                      >
                        RELOAD CONFIG
                      </button>
                      <button
                        type="submit"
                        className="py-1.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-500/10 flex items-center gap-1"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>APPLY GLOBAL CHANGES</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Control Studio Administrator Credentials */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, security: !prev.security }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-emerald-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Administrator Security</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Modify master password keys protecting your ingestion flows</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.security ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.security && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1.5 px-2.5 focus:outline-none"
                />
              </div>

              {passwordChangeStatus && (
                <p className={`text-[10px] font-bold uppercase tracking-wider ${
                  passwordChangeStatus.type === "success" ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {passwordChangeStatus.msg}
                </p>
              )}

              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                {isChangingPassword ? <RefreshCw className="w-3 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>CHANGE MASTER KEY</span>
              </button>
            </form>
          </div>
        )}
      </div>

          {/* Section 4: Live Core System Logs Console */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, logs: !prev.logs }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Live Core System Logs</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); copyLogsToClipboard(); }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Copy logs to clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); fetchLogs(); }}
                  disabled={isLoadingLogs}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  title="Force reload logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
                </button>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  {expandedSections.logs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {expandedSections.logs && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-3.5">
                
                {/* Search + Filter */}
                <div className="grid grid-cols-5 gap-1.5">
                  <div className="col-span-3 relative">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search logs..."
                      className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-[10px] pl-7 pr-1 py-1 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-[10px] py-1 px-1 focus:outline-none"
                    >
                      <option value="all">All Levels</option>
                      <option value="info">Info</option>
                      <option value="warn">Warn</option>
                      <option value="error">Error</option>
                      <option value="debug">Debug</option>
                    </select>
                  </div>
                </div>

                {logsSuccessMsg && (
                  <p className="text-[10px] text-emerald-500 font-semibold uppercase font-mono">{logsSuccessMsg}</p>
                )}

                {/* Logs display shell terminal console */}
                <div className="h-64 bg-slate-950 rounded-xl p-3 border border-slate-200 dark:border-white/5 font-mono text-[9px] overflow-y-auto space-y-1.5 select-text">
                  {filteredLogs.length === 0 ? (
                    <p className="text-slate-500 text-center py-20">No matching system logs found.</p>
                  ) : (
                    filteredLogs.map((log, index) => {
                      const levelColors = {
                        info: "text-slate-300",
                        warn: "text-amber-400",
                        error: "text-rose-500 font-bold",
                        debug: "text-purple-400"
                      };

                      return (
                        <div key={index} className="leading-relaxed flex items-start gap-1">
                          <span className="text-slate-600 flex-shrink-0">[{log.timestamp.split("T")[1]?.slice(0, 8) || log.timestamp}]</span>
                          <span className={`flex-shrink-0 uppercase font-bold text-[8px] tracking-wide px-1 rounded ${
                            log.level === "error" ? "bg-rose-500/10 text-rose-400" : log.level === "warn" ? "bg-amber-500/10 text-amber-400" : "bg-white/5"
                          }`}>
                            {log.level}
                          </span>
                          <span className={levelColors[log.level]}>{log.message}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={terminalEndRef} />
                </div>

                <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                  <span>Showing {filteredLogs.length} of {logs.length} logs</span>
                  <button
                    onClick={clearLogRegistry}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Clear Terminal View
                  </button>
                </div>

              </div>
            )}
          </div>

      </div>

    </motion.div>
  );
}
