import React, { useState, useRef } from "react";
import {
  Video,
  Youtube,
  Play,
  Square,
  Trash2,
  Plus,
  UploadCloud,
  FileVideo,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export interface MediaStreamConfig {
  name: string;
  type: "file" | "youtube";
  sourceUrl: string;
  loop: boolean;
  status: "idle" | "streaming" | "error";
  errorMessage?: string;
}

interface MediaStreamManagerProps {
  configs: MediaStreamConfig[];
  localFiles: string[];
  onRefresh: () => void;
  hlsBaseUrl: string;
  onPreview: (url: string) => void;
}

export default function MediaStreamManager({
  configs,
  localFiles,
  onRefresh,
  hlsBaseUrl,
  onPreview
}: MediaStreamManagerProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"file" | "youtube">("file");
  const [sourceUrl, setSourceUrl] = useState("");
  const [loop, setLoop] = useState(true);
  const [selectedLocalFile, setSelectedLocalFile] = useState("");

  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form submission state
  const [isAdding, setIsAdding] = useState(false);
  const [formError, setFormError] = useState("");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError("");
    setUploadSuccess("");

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadError("");
      setUploadSuccess("");
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!/\.(mp4|mkv|mov|avi|wmv|flv|m4v|webm)$/i.test(file.name)) {
      setUploadError("Only standard video formats are allowed");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await fetch("/api/media-streams/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadSuccess(`Successfully uploaded ${file.name}`);
        setSelectedLocalFile(data.filename);
        if (type === "file") {
          setSourceUrl(data.filename);
        }
        onRefresh();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload video file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsAdding(true);

    const streamSource = type === "file" ? selectedLocalFile : sourceUrl;
    if (!name.trim()) {
      setFormError("Stream route name is required");
      setIsAdding(false);
      return;
    }
    if (!streamSource) {
      setFormError(type === "file" ? "Please upload or select a video file" : "YouTube link is required");
      setIsAdding(false);
      return;
    }

    try {
      const res = await fetch("/api/media-streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          sourceUrl: streamSource.trim(),
          loop,
        }),
      });

      if (res.ok) {
        setName("");
        setSourceUrl("");
        setSelectedLocalFile("");
        onRefresh();
      } else {
        const data = await res.json();
        setFormError(data.error || "Failed to add media stream");
      }
    } catch (err: any) {
      setFormError(err.message || "Request failed");
    } finally {
      setIsAdding(false);
    }
  };

  const startStream = async (streamName: string) => {
    try {
      await fetch(`/api/media-streams/start/${streamName}`, { method: "POST" });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const stopStream = async (streamName: string) => {
    try {
      await fetch(`/api/media-streams/stop/${streamName}`, { method: "POST" });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteStream = async (streamName: string) => {
    if (!confirm(`Are you sure you want to delete media stream /${streamName}?`)) return;
    try {
      await fetch(`/api/media-streams/${streamName}`, { method: "DELETE" });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Configure Stream Form */}
      <div className="lg:col-span-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl space-y-4 h-fit">
        <div className="flex items-center gap-2 border-b border-white/10 pb-2">
          <Plus className="w-4 h-4 text-blue-500" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add Media / YouTube Loop</h2>
        </div>

        <form onSubmit={handleAddStream} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stream Name (e.g. video_loop)</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              placeholder="video_loop"
              className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type Toggle */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Loop Source Type</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950/40 border border-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setType("file")}
                className={`py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  type === "file" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <FileVideo className="w-3.5 h-3.5" />
                <span>Video File</span>
              </button>
              <button
                type="button"
                onClick={() => setType("youtube")}
                className={`py-1.5 text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  type === "youtube" ? "bg-red-600/95 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                <Youtube className="w-3.5 h-3.5" />
                <span>YouTube Clip</span>
              </button>
            </div>
          </div>

          {/* Conditional Input based on type */}
          {type === "file" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Video File</label>
                <select
                  value={selectedLocalFile}
                  onChange={(e) => setSelectedLocalFile(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select uploaded file --</option>
                  {localFiles.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Drag and Drop Uploader */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Or Upload Video (Max 500MB)</span>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 bg-slate-950/20 ${
                    dragActive ? "border-blue-500 bg-blue-500/5" : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={handleFileChange}
                  />
                  {isUploading ? (
                    <>
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                      <span className="text-[10px] text-slate-400 font-mono">UPLOADING STREAM MEDIA...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-slate-400" />
                      <div className="text-left text-center">
                        <p className="text-[10px] font-semibold text-slate-300">Drag video file or Click to browse</p>
                        <p className="text-[8px] text-slate-500 font-mono mt-0.5">MP4, MKV, MOV, WEBM</p>
                      </div>
                    </>
                  )}
                </div>

                {uploadError && (
                  <p className="text-[10px] text-rose-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {uploadError}</p>
                )}
                {uploadSuccess && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {uploadSuccess}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">YouTube Link</label>
              <input
                type="url"
                required
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[8px] text-slate-500 font-mono mt-0.5">Directly transcoded & looped into MediaMTX via RTSP</p>
            </div>
          )}

          {/* Loop Option */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="media-loop"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="w-4 h-4 accent-blue-600 rounded border-white/25 bg-white/5 cursor-pointer"
            />
            <label htmlFor="media-loop" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
              Continuous Loop Stream
            </label>
          </div>

          {formError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] p-3 rounded-xl flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isAdding}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-500/15"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>ADD TO MEDIA REGISTRY</span>
          </button>
        </form>
      </div>

      {/* Streams Registry List */}
      <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-500" />
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Media Streams Registry</h2>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-950/40 border border-white/5 text-slate-400 uppercase font-bold">
            {configs.length} registered
          </span>
        </div>

        {configs.length === 0 ? (
          <div className="h-64 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2 bg-slate-950/10">
            <FileVideo className="w-8 h-8 text-slate-500" />
            <p className="text-xs">No media loop streams registered yet.</p>
            <p className="text-[10px] text-slate-500">Add video loops or YouTube clips on the left panel to configure failures backup streams.</p>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
            {configs.map((cfg) => {
              const streamTarget = `/${cfg.name}`;
              const hlsUrl = `${hlsBaseUrl}/${cfg.name}`;

              return (
                <div
                  key={cfg.name}
                  className="bg-slate-950/20 border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-white/15 transition-all"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        cfg.status === "streaming"
                          ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"
                          : cfg.status === "error"
                          ? "bg-rose-500 shadow-[0_0_8px_#ef4444]"
                          : "bg-slate-500"
                      }`} />
                      <span className="font-bold text-white text-xs truncate">/{cfg.name}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.25 rounded uppercase border flex items-center gap-0.5 ${
                        cfg.type === "youtube"
                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      }`}>
                        {cfg.type === "youtube" ? <Youtube className="w-2 h-2" /> : <Video className="w-2 h-2" />}
                        {cfg.type}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                      <p className="truncate"><span className="text-slate-500">Source URL:</span> {cfg.sourceUrl}</p>
                      <p><span className="text-slate-500">Continuous loop:</span> {cfg.loop ? "Enabled" : "Disabled"}</p>
                      <p className="truncate"><span className="text-slate-500">RTSP Stream target:</span> 8554/{cfg.name}</p>
                    </div>

                    {cfg.status === "error" && cfg.errorMessage && (
                      <p className="text-[9px] text-rose-400 bg-rose-500/5 p-1 px-2 rounded border border-rose-500/10 font-mono mt-1 max-w-full overflow-hidden text-ellipsis">
                        Error: {cfg.errorMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onPreview(hlsUrl)}
                      className="text-[10px] font-bold border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white py-1.5 px-3 rounded-lg transition-all"
                    >
                      PREVIEW
                    </button>

                    {cfg.status === "streaming" ? (
                      <button
                        onClick={() => stopStream(cfg.name)}
                        className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Square className="w-3 h-3 fill-slate-950 text-slate-950" />
                        <span>STOP</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => startStream(cfg.name)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Play className="w-3 h-3 fill-white text-white" />
                        <span>START</span>
                      </button>
                    )}

                    <button
                      onClick={() => deleteStream(cfg.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 border border-transparent hover:border-white/10 hover:bg-rose-500/5 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
