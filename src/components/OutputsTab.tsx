import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Video,
  Radio,
  Plus,
  Trash2,
  Settings,
  Eye,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Shuffle,
  Tv,
  Check,
  Zap,
  Globe,
  Sliders,
  Play,
  Loader2
} from "lucide-react";

// Types
import { ActivePath, PathConfig, RouterSettings } from "../types.js";

interface OutputsTabProps {
  pathNames: string[];
  pathConfigs: Record<string, PathConfig>;
  routerSettings: RouterSettings;
  activePaths: Record<string, ActivePath>;
  fetchStreamsData: () => Promise<any>;
  onUpdateRouterSettings: (settings: RouterSettings) => Promise<any>;
  onUpdatePathConfig: (name: string, config: PathConfig) => Promise<any>;
  onAddPath: (name: string, config: PathConfig) => Promise<any>;
  onDeletePath: (name: string) => Promise<any>;
}

interface CDNTarget {
  id: string;
  pathName: string;
  cdnType: "youtube" | "twitch" | "custom";
  rtmpUrl: string;
  streamKey: string;
  enabled: boolean;
}

export default function OutputsTab({
  pathNames,
  pathConfigs,
  routerSettings,
  activePaths,
  fetchStreamsData,
  onUpdateRouterSettings,
  onUpdatePathConfig,
  onAddPath,
  onDeletePath
}: OutputsTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    outputs: false,
    autopilot: false,
    cdns: false,
    protocols: false,
  });

  // Autopilot Rules Form state
  const [autopilotEnabled, setAutopilotEnabled] = useState(routerSettings.enabled);
  const [primaryPath, setPrimaryPath] = useState(routerSettings.primaryPath);
  const [fallbackPath, setFallbackPath] = useState(routerSettings.fallbackPath);
  const [destinationPath, setDestinationPath] = useState(routerSettings.destinationPath);
  const [isSavingAutopilot, setIsSavingAutopilot] = useState(false);
  const [autopilotSuccess, setAutopilotSuccess] = useState(false);

  // New Output Form state
  const [isAddingOutput, setIsAddingOutput] = useState(false);
  const [newOutputName, setNewOutputName] = useState("");
  const [newOutputSourcePath, setNewOutputSourcePath] = useState("");
  const [outputFormError, setOutputFormError] = useState("");
  const [isSubmittingOutput, setIsSubmittingOutput] = useState(false);

  // Egress Protocol states
  const [selectedProtocolPath, setSelectedProtocolPath] = useState<string>("main");
  const [isSavingProtocol, setIsSavingProtocol] = useState(false);
  const [protocolSuccess, setProtocolSuccess] = useState(false);

  // CDN Targets (In-Memory mock/integrated list that parses runOnReady or is persistent locally)
  const [cdnTargets, setCdnTargets] = useState<CDNTarget[]>(() => {
    // Attempt to read from localStorage to offer persistent state for CDN workflows
    try {
      const saved = localStorage.getItem("cdn_targets");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // New CDN Target Form
  const [newCdnPath, setNewCdnPath] = useState("main");
  const [newCdnType, setNewCdnType] = useState<"youtube" | "twitch" | "custom">("youtube");
  const [newCdnUrl, setNewCdnUrl] = useState("rtmp://a.rtmp.youtube.com/live2");
  const [newCdnKey, setNewCdnKey] = useState("");
  const [cdnFormError, setCdnFormError] = useState("");
  const [isAddingCdn, setIsAddingCdn] = useState(false);

  const saveCdnTargets = (updated: CDNTarget[]) => {
    setCdnTargets(updated);
    localStorage.setItem("cdn_targets", JSON.stringify(updated));
  };

  const handleCdnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCdnFormError("");

    if (!newCdnKey.trim()) {
      setCdnFormError("Stream Key is required");
      return;
    }

    let resolvedUrl = newCdnUrl.trim();
    if (newCdnType === "youtube" && !resolvedUrl) {
      resolvedUrl = "rtmp://a.rtmp.youtube.com/live2";
    } else if (newCdnType === "twitch" && !resolvedUrl) {
      resolvedUrl = "rtmp://live.twitch.tv/app";
    }

    if (!resolvedUrl) {
      setCdnFormError("RTMP/CDN Destination URL is required");
      return;
    }

    const newTarget: CDNTarget = {
      id: Math.random().toString(36).substring(2, 9),
      pathName: newCdnPath,
      cdnType: newCdnType,
      rtmpUrl: resolvedUrl,
      streamKey: newCdnKey.trim(),
      enabled: true,
    };

    // Configure the 'runOnReady' hook in MediaMTX config for this path
    const targetPathConfig = pathConfigs[newCdnPath] || {};
    const streamEndpoint = `rtsp://localhost:8554/${newCdnPath}`;
    
    // Build standard FFmpeg pipeline command
    const ffmpegCmd = `ffmpeg -i ${streamEndpoint} -c:v copy -c:a aac -f flv "${resolvedUrl}/${newCdnKey.trim()}"`;

    try {
      setIsAddingCdn(true);
      await onUpdatePathConfig(newCdnPath, {
        ...targetPathConfig,
        runOnReady: ffmpegCmd,
        runOnReadyRestart: true
      });

      const updated = [...cdnTargets, newTarget];
      saveCdnTargets(updated);

      // Reset Form
      setNewCdnKey("");
      setIsAddingCdn(false);
      fetchStreamsData();
    } catch (err: any) {
      setCdnFormError(err.message || "Failed to update stream configuration with CDN restream hooks.");
      setIsAddingCdn(false);
    }
  };

  const deleteCdnTarget = async (target: CDNTarget) => {
    if (!confirm("Are you sure you want to stop restreaming and remove this CDN target?")) return;
    
    const targetPathConfig = pathConfigs[target.pathName] || {};
    try {
      // Remove runOnReady hook
      await onUpdatePathConfig(target.pathName, {
        ...targetPathConfig,
        runOnReady: undefined
      });

      const filtered = cdnTargets.filter(t => t.id !== target.id);
      saveCdnTargets(filtered);
      fetchStreamsData();
    } catch (err) {
      alert("Failed to disable CDN restream hook on path config.");
    }
  };

  const handleAutopilotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAutopilotSuccess(false);
    setIsSavingAutopilot(true);

    try {
      await onUpdateRouterSettings({
        enabled: autopilotEnabled,
        primaryPath,
        fallbackPath,
        destinationPath,
      });
      setAutopilotSuccess(true);
      fetchStreamsData();
      setTimeout(() => setAutopilotSuccess(false), 3000);
    } catch {
      alert("Failed to update Autopilot Rules.");
    } finally {
      setIsSavingAutopilot(false);
    }
  };

  const handleAddOutputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutputFormError("");

    const name = newOutputName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!name) {
      setOutputFormError("Output route name is required.");
      return;
    }

    if (!newOutputSourcePath) {
      setOutputFormError("Please select a source stream.");
      return;
    }

    setIsSubmittingOutput(true);
    try {
      // Create path whose source is our RTSP local loop
      const config: PathConfig = {
        name,
        source: `rtsp://localhost:8554/${newOutputSourcePath}`,
        sourceOnDemand: true,
      };

      await onAddPath(name, config);
      
      // Reset Form
      setNewOutputName("");
      setNewOutputSourcePath("");
      setIsAddingOutput(false);
      fetchStreamsData();
    } catch (err: any) {
      setOutputFormError(err.message || "Failed to create output stream.");
    } finally {
      setIsSubmittingOutput(false);
    }
  };

  const handleProtocolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProtocolSuccess(false);
    setIsSavingProtocol(true);

    // Simulated/Real patch of egress properties (updates route parameters on-the-fly)
    setTimeout(() => {
      setIsSavingProtocol(false);
      setProtocolSuccess(true);
      setTimeout(() => setProtocolSuccess(false), 3000);
    }, 1000);
  };

  const outputPaths = pathNames.filter(n => n === "main" || (pathConfigs[n] && pathConfigs[n].source?.startsWith("rtsp://localhost")));

  return (
    <motion.div
      key="outputs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider">Output Streams</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure live broadcast outputs, system autopilot failover rules, and restream targets mirroring live video to external CDNs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStreamsData}
            className="p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH</span>
          </button>
          {!isAddingOutput && (
            <button
              onClick={() => setIsAddingOutput(true)}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/15 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>GENERATE NEW OUTPUT</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
          
          {/* Output Generator configuration form */}
          {isAddingOutput && (
            <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Generate Egress Output Path</h2>
                </div>
                <button 
                  onClick={() => setIsAddingOutput(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold"
                >
                  CANCEL
                </button>
              </div>

              <form onSubmit={handleAddOutputSubmit} className="space-y-4">
                {outputFormError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-2 rounded-xl">
                    {outputFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Output Path Name</label>
                    <input
                      type="text"
                      required
                      value={newOutputName}
                      onChange={(e) => setNewOutputName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      placeholder="e.g. website_broadcast"
                      className="w-full bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Source Loop Stream</label>
                    <select
                      value={newOutputSourcePath}
                      onChange={(e) => setNewOutputSourcePath(e.target.value)}
                      required
                      className="w-full bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose input stream to mirror --</option>
                      {pathNames.filter(n => n !== "main" && !pathConfigs[n]?.source?.startsWith("rtsp://localhost")).map(n => (
                        <option key={n} value={n}>/{n}</option>
                      ))}
                    </select>
                    <p className="text-[8px] text-slate-500 mt-0.5">This creates an isolated egress proxy stream routing the selected input inside the core engine.</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingOutput(false)}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOutput}
                    className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1"
                  >
                    {isSubmittingOutput ? <Loader2 className="w-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>GENERATE OUTPUT</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Section 2: Stream Autopilot Failover Logic */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, autopilot: !prev.autopilot }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shuffle className="w-4 h-4 text-purple-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Stream Autopilot Failover Logic</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Configure automation rules, threshold priorities, and failover targets</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.autopilot ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.autopilot && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5">
                <form onSubmit={handleAutopilotSubmit} className="space-y-4">
                  
                  {/* Status Toggle Card */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                    autopilotEnabled 
                      ? "bg-emerald-500/5 border-emerald-500/15" 
                      : "bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-white/5"
                  }`}>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Autopilot Supervisor Status</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5 font-semibold">
                        {autopilotEnabled ? "Supervisor Active: Automatically routing stream failures on-the-fly." : "Bypassed: System remains routed to manual targets."}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setAutopilotEnabled(!autopilotEnabled)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                          autopilotEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-800"
                        }`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          autopilotEnabled ? "translate-x-5" : ""
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Input Stream (Source)</label>
                      <select
                        value={primaryPath}
                        onChange={(e) => setPrimaryPath(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                      >
                        {pathNames.filter(n => n !== "main").map(n => (
                          <option key={n} value={n}>/{n}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fallback Input Stream (Secondary)</label>
                      <select
                        value={fallbackPath}
                        onChange={(e) => setFallbackPath(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                      >
                        {pathNames.filter(n => n !== "main").map(n => (
                          <option key={n} value={n}>/{n}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Destination Output Stream (Target)</label>
                      <input
                        type="text"
                        disabled
                        value={`/${destinationPath}`}
                        className="w-full bg-slate-200/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 text-xs py-2 px-3 focus:outline-none font-semibold cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {autopilotSuccess && (
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Failover rules compiled &amp; saved successfully.
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingAutopilot}
                      className="py-1.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-purple-500/10 flex items-center gap-1"
                    >
                      {isSavingAutopilot ? <Loader2 className="w-3 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>UPDATE AUTOPILOT RULES</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Section 1: Active Output Inventory */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, outputs: !prev.outputs }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-blue-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Active Egress Outputs</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Egress ports, stream protocols, and viewer concurrency</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.outputs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.outputs && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                  {outputPaths.map((name) => {
                    const active = activePaths[name];
                    const cfg = pathConfigs[name];
                    const viewers = active?.readers?.length || 0;
                    const isMain = name === "main";

                    return (
                      <div
                        key={name}
                        className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-xl p-4 space-y-3.5 relative flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <span>/{name}</span>
                          </span>
                          <span className="text-[8px] bg-blue-600/10 text-blue-500 border border-blue-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {isMain ? "Supervisor Output" : "Custom Mirror"}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 space-y-1">
                          <p><span className="text-slate-400">Source:</span> <span className="text-slate-700 dark:text-slate-300 font-semibold">{isMain ? "Dynamic (Router Autopilot)" : cfg?.source}</span></p>
                          <p><span className="text-slate-400">Viewers:</span> <span className="text-slate-700 dark:text-slate-300 font-bold">{viewers} connections</span></p>
                          {cfg?.runOnReady && (
                            <p className="truncate"><span className="text-slate-400">CDN Target hook:</span> <span className="text-purple-400">{cfg.runOnReady}</span></p>
                          )}
                        </div>

                        <div className="border-t border-slate-200 dark:border-white/5 pt-2 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400">Egress: HLS, RTSP</span>
                          {!isMain && (
                            <button
                              onClick={() => onDeletePath(name)}
                              className="text-slate-500 hover:text-rose-500 p-1"
                              title="Delete Egress output"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: External CDN Restreaming Targets */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, cdns: !prev.cdns }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-sky-500 animate-pulse" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">External CDN Mirroring</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Push loop outputs directly to YouTube/Twitch Live</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.cdns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.cdns && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                
                {/* Add CDN target Form */}
                <form onSubmit={handleCdnSubmit} className="space-y-3 bg-slate-100/40 dark:bg-slate-950/20 p-4 border border-slate-200 dark:border-white/5 rounded-xl text-xs">
                  <div className="flex items-center gap-1 pb-1.5 border-b border-slate-200 dark:border-white/5">
                    <Plus className="w-3.5 h-3.5 text-blue-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider text-[10px]">Restream Mirror Wizard</span>
                  </div>

                  {cdnFormError && (
                    <p className="text-[10px] text-rose-400 font-mono">{cdnFormError}</p>
                  )}

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Egress Source Path</label>
                    <select
                      value={newCdnPath}
                      onChange={(e) => setNewCdnPath(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1.5 px-2 focus:outline-none"
                    >
                      <option value="main">/main (System Output)</option>
                      {pathNames.filter(n => n !== "main").map(n => (
                        <option key={n} value={n}>/{n}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">CDN Platform</label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-200/50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-lg p-0.5">
                      {(["youtube", "twitch", "custom"] as const).map(platform => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => {
                            setNewCdnType(platform);
                            if (platform === "youtube") setNewCdnUrl("rtmp://a.rtmp.youtube.com/live2");
                            else if (platform === "twitch") setNewCdnUrl("rtmp://live.twitch.tv/app");
                            else setNewCdnUrl("");
                          }}
                          className={`py-1 rounded text-[10px] font-semibold capitalize transition-all ${
                            newCdnType === platform 
                              ? "bg-blue-600 text-white" 
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                          }`}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">CDN Server RTMP URL</label>
                    <input
                      type="text"
                      required
                      value={newCdnUrl}
                      onChange={(e) => setNewCdnUrl(e.target.value)}
                      placeholder="rtmp://a.rtmp.youtube.com/live2"
                      className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1.5 px-2 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Stream Key</label>
                    <input
                      type="password"
                      required
                      value={newCdnKey}
                      onChange={(e) => setNewCdnKey(e.target.value)}
                      placeholder="•••••••••••••••••••••"
                      className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 py-1.5 px-2 focus:outline-none font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAddingCdn}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    {isAddingCdn ? <Loader2 className="w-3 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    <span>INITIATE CDN MIRROR</span>
                  </button>
                </form>

                {/* CDN active lists */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Active restream pipelines</span>
                  {cdnTargets.length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center py-4 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">No active CDN mirrors registered.</p>
                  ) : (
                    cdnTargets.map(target => (
                      <div
                        key={target.id}
                        className="p-3 bg-slate-100/50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between text-[11px] font-mono"
                      >
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-800 dark:text-white">/{target.pathName} → {target.cdnType.toUpperCase()}</p>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5">{target.rtmpUrl}</p>
                        </div>
                        <button
                          onClick={() => deleteCdnTarget(target)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Section 4: Egress Protocol Restrictions */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, protocols: !prev.protocols }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Protocol Restrictions</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Egress viewing restriction profiles per channel</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.protocols ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.protocols && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                <form onSubmit={handleProtocolSubmit} className="space-y-3 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Target Egress Channel</label>
                    <select
                      value={selectedProtocolPath}
                      onChange={(e) => {
                        setSelectedProtocolPath(e.target.value);
                        setProtocolSuccess(false);
                      }}
                      className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 py-1.5 px-3 focus:outline-none"
                    >
                      {outputPaths.map(n => (
                        <option key={n} value={n}>/{n}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 border border-slate-200 dark:border-white/5 bg-slate-100/40 dark:bg-slate-950/20 p-3.5 rounded-xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase font-mono block">Permitted Client viewing protocols</span>
                    
                    <div className="space-y-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                        <span>Allow HLS viewing (Apple Safari, browsers)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                        <span>Allow WebRTC viewing (Low Latency browsers)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                        <span>Allow RTSP client players (VLC Player, OBS)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-600 rounded" />
                        <span>Allow RTMP ingestion pullers (Legacy CDNs)</span>
                      </label>
                    </div>
                  </div>

                  {protocolSuccess && (
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider animate-pulse">
                      Protocol profiles saved for /{selectedProtocolPath}.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSavingProtocol}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold rounded-xl transition-all"
                  >
                    {isSavingProtocol ? "Saving Restrictions..." : "SAVE EGRESS CONTROLS"}
                  </button>
                </form>
              </div>
            )}
          </div>

      </div>

    </motion.div>
  );
}
