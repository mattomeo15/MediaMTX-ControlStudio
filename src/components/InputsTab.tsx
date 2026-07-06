import React, { useState, useRef } from "react";
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
  UploadCloud,
  FileImage,
  Loader2,
  Sliders,
  ArrowUp,
  ArrowDown,
  ShieldAlert,
  SlidersHorizontal,
  Clock
} from "lucide-react";
import MediaStreamManager from "./MediaStreamManager.js";

// Types
import { ActivePath, PathConfig, RouterSettings, MediaStreamConfig, AnnouncerStatus, AnnouncementSettings } from "../types.js";

interface InputsTabProps {
  pathNames: string[];
  activePaths: Record<string, ActivePath>;
  pathConfigs: Record<string, PathConfig>;
  mediaStreams: MediaStreamConfig[];
  localMediaFiles: string[];
  announcerStatus: AnnouncerStatus;
  announcementSettings: AnnouncementSettings;
  setAnnouncementSettings: React.Dispatch<React.SetStateAction<AnnouncementSettings>>;
  hlsBaseUrl: string;
  rtspBaseUrl: string;
  fetchStreamsData: () => Promise<any>;
  fetchMediaStreams: () => Promise<any>;
  fetchAnnouncementData: () => Promise<any>;
  setPreviewStream: (url: string | null) => void;
  handleFileUpload: (files: FileList) => Promise<any>;
  updateSlideDuration: (index: number, duration: number) => Promise<any>;
  moveSlide: (index: number, direction: "up" | "down") => Promise<any>;
  deleteSlide: (filename: string) => Promise<any>;
  handleSettingsUpdate: (e: React.FormEvent) => Promise<any>;
  isSavingSettings: boolean;
  isUploading: boolean;
  uploadProgress: string;

  // Paths CRUD methods (to connect directly with App.tsx hooks)
  onAddPath: (name: string, config: PathConfig & { rtspRangeType?: string }) => Promise<any>;
  onDeletePath: (name: string) => Promise<any>;
  onEditPath: (name: string, config: PathConfig & { rtspRangeType?: string }) => Promise<any>;
}

export default function InputsTab({
  pathNames,
  activePaths,
  pathConfigs,
  mediaStreams,
  localMediaFiles,
  announcerStatus,
  announcementSettings,
  setAnnouncementSettings,
  hlsBaseUrl,
  rtspBaseUrl,
  fetchStreamsData,
  fetchMediaStreams,
  fetchAnnouncementData,
  setPreviewStream,
  handleFileUpload,
  updateSlideDuration,
  moveSlide,
  deleteSlide,
  handleSettingsUpdate,
  isSavingSettings,
  isUploading,
  uploadProgress,
  onAddPath,
  onDeletePath,
  onEditPath
}: InputsTabProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    ingestion: false,
    photoLoop: false,
    videoLoops: false,
  });

  // New path form state
  const [isAddingPath, setIsAddingPath] = useState(false);
  const [newPathName, setNewPathName] = useState("");
  const [newPathSource, setNewPathSource] = useState("");
  const [newPathOnDemand, setNewPathOnDemand] = useState(false);
  const [newPathRunOnReady, setNewPathRunOnReady] = useState("");
  const [newPathAbsTimestamps, setNewPathAbsTimestamps] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmittingPath, setIsSubmittingPath] = useState(false);

  // Edit path state
  const [editingPathName, setEditingPathName] = useState<string | null>(null);

  // Drag over state for photo slide uploader
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleAddPathSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const trimmedName = newPathName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    
    if (!trimmedName) {
      setFormError("Path route name is required.");
      return;
    }

    if (trimmedName === "main") {
      setFormError("The route 'main' is reserved for system router output.");
      return;
    }

    setIsSubmittingPath(true);
    try {
      const configPayload: PathConfig & { rtspRangeType?: string } = {
        name: trimmedName,
        source: newPathSource.trim() || "publisher",
        sourceOnDemand: newPathOnDemand,
        runOnReady: newPathRunOnReady.trim() || undefined,
        rtspRangeType: newPathAbsTimestamps ? "absolute" : undefined
      };

      if (editingPathName) {
        await onEditPath(editingPathName, configPayload);
        setEditingPathName(null);
      } else {
        await onAddPath(trimmedName, configPayload);
      }

      // Reset form
      setNewPathName("");
      setNewPathSource("");
      setNewPathOnDemand(false);
      setNewPathRunOnReady("");
      setNewPathAbsTimestamps(false);
      setIsAddingPath(false);
      fetchStreamsData();
    } catch (err: any) {
      setFormError(err.message || "Failed to configure the path.");
    } finally {
      setIsSubmittingPath(false);
    }
  };

  const startEdit = (name: string, cfg: PathConfig & { rtspRangeType?: string }) => {
    setEditingPathName(name);
    setNewPathName(name);
    setNewPathSource(cfg.source || "");
    setNewPathOnDemand(cfg.sourceOnDemand || false);
    setNewPathRunOnReady(cfg.runOnReady || "");
    setNewPathAbsTimestamps(cfg.rtspRangeType === "absolute");
    setIsAddingPath(true);
    setFormError("");
  };

  const cancelEdit = () => {
    setEditingPathName(null);
    setNewPathName("");
    setNewPathSource("");
    setNewPathOnDemand(false);
    setNewPathRunOnReady("");
    setNewPathAbsTimestamps(false);
    setIsAddingPath(false);
    setFormError("");
  };

  // Filter list to get only ingestion inputs (excluding 'main')
  const ingestionPaths = pathNames.filter(n => n !== "main");

  return (
    <motion.div
      key="inputs"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-wider">Input Streams</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Configure stream ingestion points, external RTSP network cameras, local MP4 loop files, and static photo loop slideshows</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStreamsData();
              fetchMediaStreams();
              fetchAnnouncementData();
            }}
            className="p-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REFRESH</span>
          </button>
          {!isAddingPath && (
            <button
              onClick={() => { cancelEdit(); setIsAddingPath(true); }}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/15 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>CONFIGURE NEW INPUT</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
          
          {/* Section 2: Network Path Ingestion form */}
          {isAddingPath && (
            <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                    {editingPathName ? `Edit Input Ingestion: /${editingPathName}` : "Configure Network Ingestion Path"}
                  </h2>
                </div>
                <button 
                  onClick={cancelEdit}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-semibold"
                >
                  CANCEL
                </button>
              </div>

              <form onSubmit={handleAddPathSubmit} className="space-y-4">
                {formError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-2 rounded-xl">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Path Route Name</label>
                    <input
                      type="text"
                      required
                      value={newPathName}
                      onChange={(e) => setNewPathName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      disabled={!!editingPathName}
                      placeholder="e.g. lobby_cam"
                      className="w-full bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500 disabled:opacity-30"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Source Address URL</label>
                    <input
                      type="text"
                      value={newPathSource}
                      onChange={(e) => setNewPathSource(e.target.value)}
                      placeholder="e.g. rtsp://192.168.1.100:554/stream1"
                      className="w-full bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[9px] text-slate-400 mt-0.5">Leave empty (or write "publisher") to push a direct feed via RTMP/RTSP from OBS Studio or vMix.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="input-on-demand"
                      checked={newPathOnDemand}
                      onChange={(e) => setNewPathOnDemand(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded border-slate-300 dark:border-white/10 bg-white/5 cursor-pointer"
                    />
                    <label htmlFor="input-on-demand" className="text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer">
                      <strong>On-Demand Mode:</strong> Only connect when viewed
                    </label>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="input-abs-timestamps"
                      checked={newPathAbsTimestamps}
                      onChange={(e) => setNewPathAbsTimestamps(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded border-slate-300 dark:border-white/10 bg-white/5 cursor-pointer"
                    />
                    <label htmlFor="input-abs-timestamps" className="text-xs text-slate-600 dark:text-slate-300 select-none cursor-pointer flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Enable Absolute Timestamps</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Run on Stream Ready command</label>
                  <input
                    type="text"
                    value={newPathRunOnReady}
                    onChange={(e) => setNewPathRunOnReady(e.target.value)}
                    placeholder="ffmpeg -i rtsp://localhost:$RTSP_PORT/$MTX_PATH -c copy -f flv rtmp://..."
                    className="w-full bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[9px] text-slate-500">A local system command to trigger automatically as soon as this stream feed starts broadcasting.</p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPath}
                    className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1"
                  >
                    {isSubmittingPath ? <Loader2 className="w-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{editingPathName ? "UPDATE INGESTION PATH" : "CREATE INGESTION PATH"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Section 1: Active Input Inventory */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, ingestion: !prev.ingestion }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-emerald-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Active Ingestion Paths</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Push endpoints, reader concurrency, and source connections</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.ingestion ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.ingestion && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5">
                {ingestionPaths.length === 0 ? (
                  <div className="border border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-16 text-center text-slate-400 space-y-3 bg-white/2">
                    <Radio className="w-10 h-10 mx-auto text-slate-500 animate-pulse" />
                    <p className="text-xs">No active network ingestion paths exist yet.</p>
                    <button
                      onClick={() => { cancelEdit(); setIsAddingPath(true); }}
                      className="text-xs font-semibold text-blue-500 hover:text-blue-400 hover:underline"
                    >
                      Add your first live network input now →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ingestionPaths.map((name) => {
                      const active = activePaths[name];
                      const cfg = pathConfigs[name];
                      const isLive = !!(active && active.sourceReady);
                      const isConfigOnly = !!cfg && !isLive;

                      const srcUrl = cfg?.source || active?.sourceType || "Push Ingestion";
                      const readerCount = active?.readers?.length || 0;

                      return (
                        <div
                          key={name}
                          className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/10"
                        >
                          <div className="bg-slate-100/50 dark:bg-slate-950/60 px-4 py-2.5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-white text-xs truncate">/{name}</span>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              isLive 
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-pulse" 
                                : isConfigOnly 
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" 
                                : "bg-slate-100 dark:bg-white/5 text-slate-400"
                            }`}>
                              {isLive ? "LIVE" : isConfigOnly ? "CONFIGURED" : "OFFLINE"}
                            </span>
                          </div>

                          <div className="p-4 space-y-3 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Source:</span>
                              <span className="truncate max-w-[160px] text-slate-800 dark:text-slate-200">{srcUrl}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">On-demand:</span>
                              <span className="text-slate-800 dark:text-slate-200">{cfg?.sourceOnDemand ? "Yes" : "No"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Viewers:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{readerCount}</span>
                            </div>

                            {/* Stream Connection info */}
                            <div className="border-t border-slate-200 dark:border-white/5 pt-2 space-y-1 text-[9px] text-slate-500">
                              <p className="truncate">HLS: <span className="text-blue-500">{hlsBaseUrl}/{name}</span></p>
                              <p className="truncate">RTSP: <span className="text-indigo-400">{rtspBaseUrl}/{name}</span></p>
                            </div>
                          </div>

                          <div className="bg-slate-100/30 dark:bg-slate-950/40 p-2 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                            <button
                              onClick={() => setPreviewStream(`${hlsBaseUrl}/${name}`)}
                              className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-500 dark:hover:text-blue-400 flex items-center gap-1 px-2 py-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>PREVIEW</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              {cfg && (
                                <button
                                  onClick={() => startEdit(name, cfg)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-white/5 border border-transparent hover:border-slate-300 dark:hover:border-white/10 rounded text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all"
                                  title="Edit Configuration"
                                >
                                  <Settings className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => onDeletePath(name)}
                                className="p-1 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded text-slate-500 hover:text-rose-500 transition-all"
                                title="Delete Path"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Static Photo Loop Generator */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, photoLoop: !prev.photoLoop }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileImage className="w-4 h-4 text-purple-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Photo Loop Slideshow</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Slides sequence & canvas transitions renderer</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.photoLoop ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.photoLoop && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5 space-y-4">
                
                {/* Announcement Slides Parameters Form */}
                <form onSubmit={handleSettingsUpdate} className="space-y-3 bg-slate-100/30 dark:bg-slate-950/20 p-4 border border-slate-200 dark:border-white/5 rounded-xl">
                  {/* Custom directory source check */}
                  <div className="space-y-2 border-b border-slate-200 dark:border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="custom-dir"
                        checked={announcementSettings.useCustomDirectory || false}
                        onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, useCustomDirectory: e.target.checked }))}
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                      />
                      <label htmlFor="custom-dir" className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                        Play from local folder directory
                      </label>
                    </div>
                    {announcementSettings.useCustomDirectory && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Server Directory Path</label>
                        <input
                          type="text"
                          required
                          value={announcementSettings.directoryPath || ""}
                          onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, directoryPath: e.target.value }))}
                          placeholder="/var/media/images"
                          className="w-full bg-slate-950/40 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-xs py-1.5 px-2.5 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Transition Type</label>
                      <select
                        value={announcementSettings.transitionType}
                        onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, transitionType: e.target.value }))}
                        className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-xs py-1 px-2 focus:outline-none"
                      >
                        <option value="none">Cut (No transition)</option>
                        <option value="fade">Fade</option>
                        <option value="dissolve">Dissolve</option>
                        <option value="wipeleft">Wipe Left</option>
                        <option value="wiperight">Wipe Right</option>
                        <option value="slideleft">Slide Left</option>
                        <option value="pixelize">Pixelize</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Duration (s)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={announcementSettings.transitionDuration}
                        onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, transitionDuration: Number(e.target.value) }))}
                        className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-xs py-1 px-2 focus:outline-none text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase font-mono">Width</label>
                      <input
                        type="number"
                        value={announcementSettings.width}
                        onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, width: Number(e.target.value) }))}
                        className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-xs py-1 px-2 focus:outline-none text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase font-mono">Height</label>
                      <input
                        type="number"
                        value={announcementSettings.height}
                        onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, height: Number(e.target.value) }))}
                        className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-xs py-1 px-2 focus:outline-none text-center font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase font-mono">FPS</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={announcementSettings.fps}
                        onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, fps: Number(e.target.value) }))}
                        className="w-full bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 text-xs py-1 px-2 focus:outline-none text-center font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[10px] font-bold rounded-lg uppercase tracking-wider flex items-center justify-center gap-1"
                  >
                    {isSavingSettings ? <Loader2 className="w-3 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                    <span>Update Parameters</span>
                  </button>
                </form>

                {/* Upload drag drop or customized layout */}
                {announcementSettings.useCustomDirectory ? (
                  <div className="p-3 border border-dashed border-blue-500/20 bg-blue-500/5 rounded-xl text-center text-[10px] text-slate-500">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Watching folder directory for slideshow images</p>
                    <p className="font-mono mt-1 select-all">{announcementSettings.directoryPath}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Upload box */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("inputs-tab-slides-file")?.click()}
                      className={`border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                        dragOver ? "border-blue-500 bg-blue-500/5" : "border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20"
                      }`}
                    >
                      <input
                        type="file"
                        id="inputs-tab-slides-file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      />
                      {isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          <span className="text-[9px] font-mono text-slate-400">{uploadProgress}</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Drag slides or Click to upload</p>
                            <p className="text-[8px] text-slate-500 font-mono mt-0.5">JPG, PNG, WEBP, GIF (Max 50MB)</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Images listing */}
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {announcementSettings.images.map((slide, index) => (
                        <div
                          key={slide.filename}
                          className="bg-slate-100/40 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-lg p-2 flex items-center justify-between gap-2 text-[10px]"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-mono text-[9px] bg-slate-200 dark:bg-slate-950 border border-slate-300 dark:border-white/5 px-1 py-0.5 rounded text-slate-500">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <img
                              src={`/api/announcements/images/${encodeURIComponent(slide.filename)}`}
                              alt="Slide Preview"
                              className="w-10 h-7 object-cover rounded border border-slate-300 dark:border-white/5 flex-shrink-0"
                            />
                            <div className="overflow-hidden">
                              <p className="truncate font-semibold text-slate-700 dark:text-slate-300">
                                {slide.filename.substring(slide.filename.indexOf("_") + 1)}
                              </p>
                              <div className="flex items-center gap-1 font-mono text-[9px] text-slate-400">
                                <span>Play:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="120"
                                  value={slide.duration}
                                  onChange={(e) => updateSlideDuration(index, Number(e.target.value))}
                                  className="w-8 bg-slate-200 dark:bg-slate-950/60 border border-slate-300 dark:border-white/5 text-center text-slate-700 dark:text-slate-300 rounded focus:outline-none text-[8px]"
                                />
                                <span>sec</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => moveSlide(index, "up")}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-25"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveSlide(index, "down")}
                              disabled={index === announcementSettings.images.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-25"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteSlide(slide.filename)}
                              className="p-1 text-slate-400 hover:text-rose-500 ml-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                )}

              </div>
            )}
          </div>

          {/* Section 4: Media File & YouTube Looper */}
          <div className="bg-white/5 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-all">
            <div
              onClick={() => setExpandedSections(prev => ({ ...prev, videoLoops: !prev.videoLoops }))}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.02] select-none transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Video className="w-4 h-4 text-indigo-500" />
                <div>
                  <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Media File &amp; YouTube Looper</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Route uploaded video loops or YouTube playlists</p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                {expandedSections.videoLoops ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {expandedSections.videoLoops && (
              <div className="p-5 border-t border-slate-200 dark:border-white/5">
                <MediaStreamManager
                  configs={mediaStreams}
                  localFiles={localMediaFiles}
                  onRefresh={fetchMediaStreams}
                  hlsBaseUrl={hlsBaseUrl}
                  onPreview={(url) => setPreviewStream(url)}
                />
              </div>
            )}
          </div>

      </div>

    </motion.div>
  );
}
