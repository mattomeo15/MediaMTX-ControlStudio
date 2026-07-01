import { useState, useEffect, useRef, FormEvent, DragEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Video,
  Radio,
  Tv,
  Settings,
  LogOut,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  Square,
  UploadCloud,
  Copy,
  Check,
  Eye,
  X,
  Sliders,
  ShieldAlert,
  AlertTriangle,
  FileImage,
  ExternalLink,
  Lock,
  Loader2,
  FlameKindling,
  Bell,
  Cable,
  Key
} from "lucide-react";
import {
  ActivePath,
  PathConfig,
  AnnouncementImage,
  AnnouncementSettings,
  AnnouncerStatus,
  GlobalConfig,
  StreamAlert,
  RouterSettings
} from "./types.js";

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // App shell states
  const [activeTab, setActiveTab] = useState<"streams" | "announcements" | "config">("streams");
  const [hlsBaseUrl, setHlsBaseUrl] = useState("");

  // Real-time alerts & Autopilot states
  const [alerts, setAlerts] = useState<StreamAlert[]>([]);
  const [routerSettings, setRouterSettings] = useState<RouterSettings>({
    enabled: false,
    primaryPath: "live",
    fallbackPath: "announcements",
    destinationPath: "main",
  });
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [activeToast, setActiveToast] = useState<{ id: string; message: string; type: string } | null>(null);

  // Password modification state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Streams list states
  const [activePaths, setActivePaths] = useState<Record<string, ActivePath>>({});
  const [pathConfigs, setPathConfigs] = useState<Record<string, PathConfig>>({});
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [streamsError, setStreamsError] = useState("");

  // Path Modal states
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [editingPathName, setEditingPathName] = useState<string | null>(null);
  const [modalPathName, setModalPathName] = useState("");
  const [modalSource, setModalSource] = useState("");
  const [modalOnDemand, setModalOnDemand] = useState(false);
  const [modalRunOnReady, setModalRunOnReady] = useState("");
  const [modalError, setModalError] = useState("");
  const [isSavingPath, setIsSavingPath] = useState(false);

  // Announcements states
  const [announcementSettings, setAnnouncementSettings] = useState<AnnouncementSettings>({
    transitionType: "fade",
    transitionDuration: 1.0,
    width: 1920,
    height: 1080,
    fps: 25,
    images: []
  });
  const [announcerStatus, setAnnouncerStatus] = useState<AnnouncerStatus>({
    status: "idle",
    message: ""
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [announcementsError, setAnnouncementsError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Config tab states
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({});
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState("");
  const [saveStatus, setSaveStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Copy-to-clipboard confirmation states
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Video preview state
  const [previewStream, setPreviewStream] = useState<string | null>(null);

  // Check auth on load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Poll active streams and status in the background when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchStreamsData();
      fetchAnnouncementData();
      fetchUiSettings();
      fetchGlobalConfig();

      const interval = setInterval(() => {
        fetchAnnouncementStatus();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}/api/ws`;
      let ws: WebSocket;
      let reconnectTimer: any;

      const connect = () => {
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "init-alerts") {
              setAlerts(data.payload);
            } else if (data.type === "alerts-update") {
              setAlerts(data.payload);
            } else if (data.type === "init-router") {
              setRouterSettings(data.payload);
            } else if (data.type === "alert") {
              const alert: StreamAlert = data.payload;
              setAlerts((prev) => {
                if (prev.some((a) => a.id === alert.id)) return prev;
                return [alert, ...prev];
              });
              // Show rich banner toast notification
              setActiveToast({
                id: alert.id,
                message: alert.message,
                type: alert.type,
              });
            } else if (data.type === "streams") {
              setActivePaths(data.payload.activePaths);
            }
          } catch (err) {
            console.error("Error parsing WS message:", err);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed. Reconnecting in 3 seconds...");
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.error("WebSocket encountered error:", err);
        };
      };

      connect();

      // Initial fetch of alerts and autopilot settings via REST API
      fetchAlerts();
      fetchRouterSettings();

      return () => {
        if (ws) {
          ws.onclose = null;
          ws.close();
        }
        clearTimeout(reconnectTimer);
      };
    }
  }, [isAuthenticated]);

  // Dismiss toast banner after 6 seconds
  useEffect(() => {
    if (activeToast) {
      const t = setTimeout(() => {
        setActiveToast(null);
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [activeToast]);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/streams/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    }
  };

  const fetchRouterSettings = async () => {
    try {
      const res = await fetch("/api/streams/router-settings");
      if (res.ok) {
        const data = await res.json();
        setRouterSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch router settings:", err);
    }
  };

  const handleClearAlerts = async () => {
    try {
      const res = await fetch("/api/streams/alerts/clear", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error("Failed to clear alerts:", err);
    }
  };

  const handleMarkAlertRead = async (id: string) => {
    try {
      const res = await fetch(`/api/streams/alerts/read/${id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
  };

  const handleSaveRouterSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/streams/router-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(routerSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setRouterSettings(data.settings);
        alert("Autopilot router configuration saved!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save router settings");
      }
    } catch {
      alert("Network error trying to save router settings");
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    setIsSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordStatus({ type: "success", msg: "Password successfully updated! Keep it safe." });
        setCurrentPassword("");
        setNewPassword("");
      } else {
        const err = await res.json();
        setPasswordStatus({ type: "error", msg: err.error || "Failed to change password" });
      }
    } catch {
      setPasswordStatus({ type: "error", msg: "Could not reach password service" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        const err = await res.json();
        setLoginError(err.error || "Login failed");
      }
    } catch {
      setLoginError("Could not connect to the authentication service");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setIsAuthenticated(false);
      setPassword("");
    }
  };

  // --- Fetchers ---

  const fetchUiSettings = async () => {
    try {
      const res = await fetch("/api/config/ui");
      if (res.ok) {
        const data = await res.json();
        setHlsBaseUrl(data.publicHlsUrl || window.location.origin.replace(":3000", ":8888"));
      }
    } catch (err) {
      console.error("Failed to load UI settings", err);
    }
  };

  const fetchStreamsData = async () => {
    try {
      const [activeRes, configRes] = await Promise.all([
        fetch("/api/streams/active"),
        fetch("/api/streams/config")
      ]);

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        // MediaMTX path lists return { items: [...] } or direct arrays depending on configuration
        const list = activeData.items || [];
        const activeMap: Record<string, ActivePath> = {};
        list.forEach((item: any) => {
          activeMap[item.name] = item;
        });
        setActivePaths(activeMap);
      } else {
        throw new Error("Unable to retrieve live stream metrics");
      }

      if (configRes.ok) {
        const configData = await configRes.json();
        const configList = configData.items || [];
        const configMap: Record<string, PathConfig> = {};
        configList.forEach((item: any) => {
          configMap[item.name] = item;
        });
        setPathConfigs(configMap);
        setStreamsError("");
      } else {
        throw new Error("Unable to retrieve persistent path configs");
      }
    } catch (err: any) {
      // Don't flag error if just fetching background, but show state
      setStreamsError(err.message || "Failed to fetch stream configuration from MediaMTX");
    }
  };

  const fetchAnnouncementData = async () => {
    try {
      const res = await fetch("/api/announcements/settings");
      if (res.ok) {
        const data = await res.json();
        setAnnouncementSettings(data);
      }
    } catch (err: any) {
      setAnnouncementsError("Failed to fetch slideshow settings");
    }
  };

  const fetchAnnouncementStatus = async () => {
    try {
      const res = await fetch("/api/announcements/status");
      if (res.ok) {
        const data = await res.json();
        setAnnouncerStatus(data);
      }
    } catch (err: any) {
      console.error("Failed to update slideshow state", err);
    }
  };

  const fetchGlobalConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch("/api/config/global");
      if (res.ok) {
        const data = await res.json();
        setGlobalConfig(data);
        setConfigError("");
      } else {
        throw new Error("Failed to load configuration");
      }
    } catch (err: any) {
      setConfigError(err.message || "Unreachable MediaMTX service. Configure the control API correctly.");
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // --- Stream Path Management ---

  const openAddPath = () => {
    setEditingPathName(null);
    setModalPathName("");
    setModalSource("");
    setModalOnDemand(false);
    setModalRunOnReady("");
    setModalError("");
    setIsPathModalOpen(true);
  };

  const openEditPath = (name: string, cfg: PathConfig) => {
    setEditingPathName(name);
    setModalPathName(name);
    setModalSource(cfg.source || "");
    setModalOnDemand(cfg.sourceOnDemand || false);
    setModalRunOnReady(cfg.runOnReady || "");
    setModalError("");
    setIsPathModalOpen(true);
  };

  const savePath = async () => {
    if (!modalPathName.trim()) {
      setModalError("Path name is required");
      return;
    }
    setIsSavingPath(true);
    setModalError("");

    const payload = {
      source: modalSource.trim() || "publisher",
      sourceOnDemand: modalOnDemand,
      runOnReady: modalRunOnReady.trim() || undefined
    };

    try {
      const url = `/api/streams/config/${encodeURIComponent(modalPathName.trim())}`;
      const method = editingPathName ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsPathModalOpen(false);
        fetchStreamsData();
      } else {
        const err = await res.json();
        setModalError(err.error || "Failed to save path configuration");
      }
    } catch {
      setModalError("Connection error while editing stream config");
    } finally {
      setIsSavingPath(false);
    }
  };

  const deletePath = async (name: string) => {
    if (!confirm(`Are you sure you want to delete stream path '${name}'?`)) return;
    try {
      const res = await fetch(`/api/streams/config/${encodeURIComponent(name)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchStreamsData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete path");
      }
    } catch {
      alert("Network error trying to delete stream path");
    }
  };

  // --- Announcements Actions ---

  const handleSettingsUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/announcements/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transitionType: announcementSettings.transitionType,
          transitionDuration: Number(announcementSettings.transitionDuration),
          width: Number(announcementSettings.width),
          height: Number(announcementSettings.height),
          fps: Number(announcementSettings.fps)
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAnnouncementSettings((prev) => ({ ...prev, ...data.settings }));
        alert("Slideshow settings saved successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save settings");
      }
    } catch {
      alert("Network error updating slideshow setup");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files.length) return;
    setIsUploading(true);
    setUploadProgress("Uploading...");

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    try {
      const res = await fetch("/api/announcements/images", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        await fetchAnnouncementData();
        setUploadProgress("Upload complete!");
        setTimeout(() => setUploadProgress(""), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
        setUploadProgress("");
      }
    } catch {
      alert("File upload connection error");
      setUploadProgress("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const deleteSlide = async (filename: string) => {
    if (!confirm("Are you sure you want to remove this slide image?")) return;
    try {
      const res = await fetch(`/api/announcements/images/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchAnnouncementData();
      }
    } catch {
      alert("Error deleting image");
    }
  };

  const updateSlideDuration = async (index: number, duration: number) => {
    const updatedImages = [...announcementSettings.images];
    updatedImages[index] = { ...updatedImages[index], duration: Math.max(0.5, duration) };

    // Update locally immediately
    setAnnouncementSettings((prev) => ({ ...prev, images: updatedImages }));

    // Send order + durations to server
    try {
      await fetch("/api/announcements/images/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedImages)
      });
    } catch (err) {
      console.error("Failed to auto-save slide duration adjustments", err);
    }
  };

  const moveSlide = async (index: number, direction: "up" | "down") => {
    const images = [...announcementSettings.images];
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === images.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = images[index];
    images[index] = images[targetIndex];
    images[targetIndex] = temp;

    // Save order immediately
    setAnnouncementSettings((prev) => ({ ...prev, images }));

    try {
      await fetch("/api/announcements/images/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(images)
      });
    } catch (err) {
      console.error("Failed to persist slide reorder", err);
    }
  };

  const buildAndStreamReel = async () => {
    try {
      const res = await fetch("/api/announcements/build", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAnnouncerStatus(data.status);
      }
    } catch {
      alert("Error initiating reel generation");
    }
  };

  const stopReel = async () => {
    try {
      const res = await fetch("/api/announcements/stop", { method: "POST" });
      if (res.ok) {
        fetchAnnouncementStatus();
      }
    } catch {
      alert("Error stopping stream");
    }
  };

  // --- Server Global Config Actions ---

  const handleSaveGlobalConfig = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setSaveStatus(null);

    try {
      const res = await fetch("/api/config/global", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(globalConfig)
      });

      if (res.ok) {
        setSaveStatus({ type: "success", msg: "Configuration successfully patched and saved live!" });
        setTimeout(() => setSaveStatus(null), 5000);
      } else {
        const err = await res.json();
        setSaveStatus({ type: "error", msg: err.error || "Failed to patch MediaMTX config" });
      }
    } catch {
      setSaveStatus({ type: "error", msg: "Failed to communicate with configuration backend" });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveUiSettings = async () => {
    try {
      const res = await fetch("/api/config/ui", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicHlsUrl: hlsBaseUrl })
      });
      if (res.ok) {
        alert("Preview settings saved!");
      }
    } catch {
      alert("Failed to save preview configuration");
    }
  };

  // --- Copy Clipboard Helpers ---

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Show Loading while checking initial auth status
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#08090d] bg-[radial-gradient(at_0%_0%,rgba(59,130,246,0.1)_0px,transparent_50%)] flex flex-col items-center justify-center p-6 text-slate-300">
        <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/30 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)] mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
        <span className="text-xs font-mono tracking-widest text-slate-400">INITIALIZING SYSTEM SHELL...</span>
      </div>
    );
  }

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#08090d] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-purple-500/5 blur-[120px] pointer-events-none" />
        
        {/* Decorative Grid Accent */}
        <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-950/20 mb-4 border border-white/10">
              <Tv className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">MediaMTX Studio</h1>
            <p className="text-xs text-slate-400 font-sans text-center">Broadcasting sidecar and stream controller</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">Admin Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold tracking-wider uppercase py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-150 shadow-lg shadow-blue-500/10 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <span className="text-[10px] font-mono text-slate-500 tracking-wider">PORT 3000 // CONTAINER ONLINE</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Combine Active configurations and dynamic metrics
  const pathNames = Array.from(new Set([
    ...Object.keys(pathConfigs),
    ...Object.keys(activePaths)
  ])).sort();

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row font-sans">
      
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="w-full md:w-64 bg-white/5 backdrop-blur-xl border-b md:border-b-0 md:border-r border-white/10 flex flex-col justify-between py-6 flex-shrink-0">
        <div>
          {/* Logo */}
          <div className="px-6 pb-6 border-b border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              <Radio className="w-4 h-4 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">MediaMTX</h2>
              <span className="text-[9px] font-mono text-slate-500 tracking-widest uppercase">CONTROL STUDIO</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-6 space-y-1.5">
            <button
              onClick={() => setActiveTab("streams")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 border ${
                activeTab === "streams"
                  ? "bg-white/10 text-white border-white/20 shadow-md"
                  : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Live Streams</span>
            </button>
            <button
              onClick={() => setActiveTab("announcements")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 border ${
                activeTab === "announcements"
                  ? "bg-white/10 text-white border-white/20 shadow-md"
                  : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Announcement Reel</span>
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 border ${
                activeTab === "config"
                  ? "bg-white/10 text-white border-white/20 shadow-md"
                  : "text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Server Config</span>
            </button>
            <button
              onClick={() => setShowAlertsPanel(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 border text-slate-400 border-transparent hover:bg-white/5 hover:text-white"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>System Alerts</span>
              </div>
              {alerts.filter((a) => !a.read).length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-[0_0_8px_#f43f5e] animate-pulse">
                  {alerts.filter((a) => !a.read).length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer with Service Health */}
        <div className="px-4 space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200">Service Healthy</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Uptime: 4d 12h 04m</p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-all text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>SIGN OUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN PANEL STAGE --- */}
      <main className="flex-1 overflow-y-auto px-6 md:px-10 py-8 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* ====== LIVE STREAMS TAB ====== */}
          {activeTab === "streams" && (
            <motion.div
              key="streams"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h1 className="text-xl font-bold text-white uppercase tracking-wider">Live Streams</h1>
                  <p className="text-xs text-slate-400 mt-1">Manage static routing paths, check reader counts, and view raw video metrics</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchStreamsData}
                    disabled={isLoadingStreams}
                    className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStreams ? "animate-spin" : ""}`} />
                    <span>REFRESH</span>
                  </button>
                  <button
                    onClick={openAddPath}
                    className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/15 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADD STREAM PATH</span>
                  </button>
                </div>
              </div>

              {streamsError && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{streamsError}</span>
                </div>
              )}

              {/* Streams Grid */}
              {pathNames.length === 0 ? (
                <div className="border border-dashed border-white/10 rounded-2xl p-16 text-center text-slate-400 space-y-3 bg-white/2">
                  <Video className="w-10 h-10 mx-auto text-slate-500" />
                  <p className="text-sm">No streaming paths have been defined yet.</p>
                  <button
                    onClick={openAddPath}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Configure your first live stream path →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {pathNames.map((name) => {
                    const active = activePaths[name];
                    const cfg = pathConfigs[name];
                    const isLive = !!(active && active.sourceReady);
                    const isConfigOnly = !!cfg && !isLive;

                    // Stream details
                    const srcUrl = cfg?.source || active?.sourceType || "Push Stream";
                    const readerCount = active?.readers?.length || 0;

                    return (
                      <div
                        key={name}
                        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all duration-300 hover:bg-white/[0.08] hover:border-white/25 hover:shadow-2xl"
                      >
                        {/* Header status */}
                        <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              isLive ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" : isConfigOnly ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : "bg-slate-500"
                            }`} />
                            <span className="font-bold text-white text-xs tracking-wide overflow-hidden text-overflow-ellipsis white-space-nowrap">
                              /{name}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-slate-950/40 border border-white/5 text-slate-400 uppercase">
                            {isLive ? "Active Stream" : isConfigOnly ? "Configured" : "Inactive"}
                          </span>
                        </div>

                        {/* Stream parameters */}
                        <div className="p-4 flex-1 space-y-3.5">
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Source:</span>
                              <span className="text-slate-300 font-mono text-[11px] truncate max-w-[160px]">{srcUrl}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">On-demand:</span>
                              <span className="text-slate-300 font-semibold">{cfg?.sourceOnDemand ? "Enabled" : "Disabled"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Active Viewers:</span>
                              <span className="text-slate-100 font-mono font-bold">{readerCount}</span>
                            </div>
                            {active?.tracks && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">Tracks:</span>
                                <span className="text-slate-300 font-mono text-[10px]">{active.tracks.join(", ")}</span>
                              </div>
                            )}
                          </div>

                          {/* Action URLs */}
                          <div className="border-t border-white/10 pt-3 space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">STREAM CHANNELS</span>
                            <div className="space-y-1.5 text-[10px] font-mono">
                              <div
                                onClick={() => copyToClipboard(`${hlsBaseUrl}/${name}`)}
                                className="flex justify-between items-center bg-slate-950/40 hover:bg-slate-950/60 border border-white/5 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                              >
                                <span className="text-slate-500">HLS preview:</span>
                                <span className="text-blue-400 truncate ml-2 max-w-[140px] hover:underline">/{name}</span>
                              </div>
                              <div
                                onClick={() => copyToClipboard(`rtsp://localhost:8554/${name}`)}
                                className="flex justify-between items-center bg-slate-950/40 hover:bg-slate-950/60 border border-white/5 px-3 py-2 rounded-xl cursor-pointer transition-colors"
                              >
                                <span className="text-slate-500">RTSP port:</span>
                                <span className="text-slate-400 truncate ml-2 max-w-[140px]">8554/{name}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="bg-white/2 px-4 py-3 border-t border-white/10 flex items-center justify-between">
                          <button
                            onClick={() => {
                              // preview logic: set HLS url
                              setPreviewStream(`${hlsBaseUrl}/${name}`);
                            }}
                            className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>PREVIEW</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {cfg && (
                              <button
                                onClick={() => openEditPath(name, cfg)}
                                className="p-1.5 text-slate-400 hover:text-white border border-transparent hover:border-white/10 hover:bg-white/5 rounded-lg transition-all"
                              >
                                <Settings className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => deletePath(name)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 border border-transparent hover:border-white/10 hover:bg-rose-500/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ====== ANNOUNCEMENTS TAB ====== */}
          {activeTab === "announcements" && (
            <motion.div
              key="announcements"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h1 className="text-xl font-bold text-white uppercase tracking-wider">Announcement Reel</h1>
                  <p className="text-xs text-slate-400 mt-1">Compile high-quality picture loops with custom transitions, running as a constant RTSP loop</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 border ${
                    announcerStatus.status === "streaming"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : announcerStatus.status === "rendering"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
                      : announcerStatus.status === "error"
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      : "bg-white/5 border-white/10 text-slate-400"
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      announcerStatus.status === "streaming" ? "bg-emerald-400 animate-pulse" : announcerStatus.status === "rendering" ? "bg-amber-400 animate-spin" : "bg-slate-500"
                    }`} />
                    <span>STATUS: {announcerStatus.status}</span>
                  </div>

                  <button
                    onClick={stopReel}
                    className="py-1.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-rose-400 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1 transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>STOP STREAM</span>
                  </button>
                  <button
                    onClick={buildAndStreamReel}
                    disabled={announcerStatus.status === "rendering"}
                    className="py-1.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/15 transition-all disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>BUILD &amp; LOOP</span>
                  </button>
                </div>
              </div>

              {/* Status Message Logs */}
              {announcerStatus.message && (
                <div className={`text-xs px-4 py-3 rounded-2xl border flex items-start gap-2.5 font-mono overflow-auto backdrop-blur-md ${
                  announcerStatus.status === "error"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : "bg-emerald-500/5 border border-emerald-500/15 text-emerald-400"
                }`}>
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <pre className="whitespace-pre-wrap">{announcerStatus.message}</pre>
                </div>
              )}

              {/* Layout controls */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Slideshow Settings</h2>
                <form onSubmit={handleSettingsUpdate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Transition Type</label>
                    <select
                      value={announcementSettings.transitionType}
                      onChange={(e) => setAnnouncementSettings((prev) => ({ ...prev, transitionType: e.target.value }))}
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-300 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                    >
                      <option value="none" className="bg-slate-900">None (hard cut)</option>
                      <option value="fade" className="bg-slate-900">Fade</option>
                      <option value="dissolve" className="bg-slate-900">Dissolve</option>
                      <option value="wipeleft" className="bg-slate-900">Wipe left</option>
                      <option value="wiperight" className="bg-slate-900">Wipe right</option>
                      <option value="wipeup" className="bg-slate-900">Wipe up</option>
                      <option value="wipedown" className="bg-slate-900">Wipe down</option>
                      <option value="slideleft" className="bg-slate-900">Slide left</option>
                      <option value="slideright" className="bg-slate-900">Slide right</option>
                      <option value="circleopen" className="bg-slate-900">Circle open</option>
                      <option value="circleclose" className="bg-slate-900">Circle close</option>
                      <option value="pixelize" className="bg-slate-900">Pixelize</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Transition Sec</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={announcementSettings.transitionDuration}
                      onChange={(e) => setAnnouncementSettings((prev) => ({ ...prev, transitionDuration: Number(e.target.value) }))}
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-300 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Width (Pixels)</label>
                    <input
                      type="number"
                      value={announcementSettings.width}
                      onChange={(e) => setAnnouncementSettings((prev) => ({ ...prev, width: Number(e.target.value) }))}
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-300 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Height (Pixels)</label>
                    <input
                      type="number"
                      value={announcementSettings.height}
                      onChange={(e) => setAnnouncementSettings((prev) => ({ ...prev, height: Number(e.target.value) }))}
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-300 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      {isSavingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sliders className="w-3.5 h-3.5" />}
                      <span>SAVE DETAILS</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Image upload drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
                  dragOver ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "border-white/10 bg-white/2 hover:bg-white/5"
                }`}
              >
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-1">
                  <UploadCloud className="w-6 h-6 text-slate-300" />
                </div>
                <div className="space-y-1 text-xs">
                  <p className="text-slate-300">Drag &amp; drop slide imagery here, or <label className="text-blue-400 font-bold hover:text-blue-300 hover:underline cursor-pointer" htmlFor="img-uploader">browse files</label></p>
                  <p className="text-slate-500">Supports JPG, PNG, GIF, WebP (up to 50MB each)</p>
                </div>
                <input
                  type="file"
                  id="img-uploader"
                  multiple
                  accept="image/*"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                {isUploading && (
                  <div className="text-xs font-mono text-blue-400 flex items-center gap-1.5 mt-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{uploadProgress}</span>
                  </div>
                )}
              </div>

              {/* Slides inventory */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-white/10">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reel Sequence</h2>
                  <span className="text-[10px] font-mono text-slate-500">{announcementSettings.images.length} images configured</span>
                </div>

                {announcementSettings.images.length === 0 ? (
                  <div className="p-10 border border-dashed border-white/10 rounded-2xl text-center text-slate-400 bg-white/2">
                    No images uploaded. Add some using the upload zone above.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {announcementSettings.images.map((slide, index) => (
                      <div
                        key={slide.filename}
                        className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 transition-all hover:bg-white/[0.08]"
                      >
                        <div className="flex items-center gap-3.5 overflow-hidden">
                          {/* Position Index */}
                          <span className="font-mono text-xs font-bold text-slate-300 bg-slate-950/40 px-2.5 py-1 rounded-lg border border-white/5">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          {/* Image Thumbnail */}
                          <img
                            src={`/api/announcements/images/${encodeURIComponent(slide.filename)}`}
                            alt="Announcement Slide"
                            referrerPolicy="no-referrer"
                            className="w-14 h-10 object-cover rounded-lg border border-white/10 flex-shrink-0 shadow-sm"
                          />

                          {/* Details */}
                          <div className="overflow-hidden">
                            <span className="text-xs font-semibold text-white block truncate">
                              {slide.filename.substring(slide.filename.indexOf("_") + 1)}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duration:</span>
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={slide.duration}
                                onChange={(e) => updateSlideDuration(index, Number(e.target.value))}
                                className="w-14 bg-slate-950/40 border border-white/10 text-[10px] font-mono rounded-lg px-1.5 py-0.5 text-center text-slate-200 focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-[10px] text-slate-400 font-mono">sec</span>
                            </div>
                          </div>
                        </div>

                        {/* Reorder and Delete controls */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => moveSlide(index, "up")}
                            disabled={index === 0}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg disabled:opacity-20 transition-all"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveSlide(index, "down")}
                            disabled={index === announcementSettings.images.length - 1}
                            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg disabled:opacity-20 transition-all"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteSlide(slide.filename)}
                            className="p-1.5 bg-white/5 hover:bg-rose-500/10 border border-white/10 text-slate-400 hover:text-rose-400 rounded-lg transition-all ml-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ====== CONFIG TAB ====== */}
          {activeTab === "config" && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                <div>
                  <h1 className="text-xl font-bold text-white uppercase tracking-wider">Server Config</h1>
                  <p className="text-xs text-slate-400 mt-1">Live-patch MediaMTX global parameters and configure public browser routing</p>
                </div>
              </div>

              {/* UI configuration */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2">Control Panel Settings</h2>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">MediaMTX Public HLS Base URL</label>
                    <p className="text-[11px] text-slate-500">Normally your LAN IP address where HLS is reachable. Do not use local container alias.</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hlsBaseUrl}
                        onChange={(e) => setHlsBaseUrl(e.target.value)}
                        placeholder="http://192.168.1.100:8888"
                        className="flex-1 bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={handleSaveUiSettings}
                        className="py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold rounded-xl transition-all"
                      >
                        SAVE LINKING
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* MediaMTX Live configuration */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">MediaMTX API Config</h2>
                  <button
                    onClick={fetchGlobalConfig}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {configError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{configError}</span>
                  </div>
                )}

                {isLoadingConfig ? (
                  <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <span className="text-xs font-mono text-slate-400">PULLING LIVE PARAMETERS...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveGlobalConfig} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {/* Logging */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Server Log Level</span>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 block">Level</label>
                          <select
                            value={globalConfig.logLevel || "info"}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, logLevel: e.target.value }))}
                            className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-300 text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value="debug" className="bg-slate-900">debug</option>
                            <option value="info" className="bg-slate-900">info</option>
                            <option value="warn" className="bg-slate-900">warn</option>
                            <option value="error" className="bg-slate-900">error</option>
                          </select>
                        </div>
                      </div>

                      {/* RTSP */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">RTSP Config</span>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 block">Listen Address</label>
                          <input
                            type="text"
                            value={globalConfig.rtspAddress || ""}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, rtspAddress: e.target.value }))}
                            className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* RTMP */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">RTMP Config</span>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-400 font-bold">Enable RTMP</label>
                          <input
                            type="checkbox"
                            checked={!!globalConfig.rtmpEnable}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, rtmpEnable: e.target.checked }))}
                            className="w-4 h-4 accent-blue-600 rounded border-white/25 bg-white/5 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 block">Listen Address</label>
                          <input
                            type="text"
                            value={globalConfig.rtmpAddress || ""}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, rtmpAddress: e.target.value }))}
                            className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* HLS */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">HLS Config</span>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-400 font-bold">Enable HLS</label>
                          <input
                            type="checkbox"
                            checked={!!globalConfig.hlsEnable}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, hlsEnable: e.target.checked }))}
                            className="w-4 h-4 accent-blue-600 rounded border-white/25 bg-white/5 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 block">Listen Address</label>
                          <input
                            type="text"
                            value={globalConfig.hlsAddress || ""}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, hlsAddress: e.target.value }))}
                            className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* WebRTC */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">WebRTC Config</span>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] text-slate-400 font-bold">Enable WebRTC</label>
                          <input
                            type="checkbox"
                            checked={!!globalConfig.webrtcEnable}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, webrtcEnable: e.target.checked }))}
                            className="w-4 h-4 accent-blue-600 rounded border-white/25 bg-white/5 cursor-pointer"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 block">Listen Address</label>
                          <input
                            type="text"
                            value={globalConfig.webrtcAddress || ""}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, webrtcAddress: e.target.value }))}
                            className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Control API */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider block uppercase">Control API</span>
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-slate-400 block">API Listen Address</label>
                          <input
                            type="text"
                            value={globalConfig.apiAddress || ""}
                            onChange={(e) => setGlobalConfig((prev) => ({ ...prev, apiAddress: e.target.value }))}
                            className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-1.5 px-2.5 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {saveStatus && (
                      <div className={`text-xs px-4 py-3 rounded-2xl flex items-center gap-2 border backdrop-blur-md ${
                        saveStatus.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                      }`}>
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{saveStatus.msg}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/10 flex items-center gap-2.5 justify-end">
                      <button
                        type="button"
                        onClick={fetchGlobalConfig}
                        className="py-2 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
                      >
                        RELOAD DETAILS
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingConfig}
                        className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/15 transition-all"
                      >
                        {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                        <span>APPLY CHANGES</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Autopilot Stream Switcher settings */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-2">
                  <Cable className="w-4 h-4 text-blue-500" />
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Autopilot Stream Switcher</h2>
                </div>
                <form onSubmit={handleSaveRouterSettings} className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Automatically route an output stream path to an announcement reel sequence or an active OBS publisher stream.
                    When your primary live source goes online (e.g. sharing from OBS), Autopilot will automatically hot-swap the destination stream path to it.
                    When the live stream stops, Autopilot gracefully routes back to the announcement reel sequence loop.
                  </p>

                  <div className="flex items-center gap-2 pt-1 pb-2">
                    <input
                      type="checkbox"
                      id="router-enabled"
                      checked={routerSettings.enabled}
                      onChange={(e) => setRouterSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600 rounded border-white/25 bg-white/5 cursor-pointer"
                    />
                    <label htmlFor="router-enabled" className="text-xs font-semibold text-slate-300 select-none cursor-pointer">
                      Enable Autopilot Stream Routing
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Primary Source Path (e.g., OBS)</label>
                      <input
                        type="text"
                        value={routerSettings.primaryPath}
                        onChange={(e) => setRouterSettings((prev) => ({ ...prev, primaryPath: e.target.value }))}
                        placeholder="live"
                        required
                        className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Fallback Path (e.g., Reel)</label>
                      <input
                        type="text"
                        value={routerSettings.fallbackPath}
                        onChange={(e) => setRouterSettings((prev) => ({ ...prev, fallbackPath: e.target.value }))}
                        placeholder="announcements"
                        required
                        className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Destination Path (Output)</label>
                      <input
                        type="text"
                        value={routerSettings.destinationPath}
                        onChange={(e) => setRouterSettings((prev) => ({ ...prev, destinationPath: e.target.value }))}
                        placeholder="main"
                        required
                        className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/15 transition-all"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>APPLY AUTOPILOT</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Administrator Security: Change Password */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-2">
                  <Key className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Control Studio Security</h2>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Modify the administrator credential keys. Avoid standard passwords. Make sure to keep the new key saved.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Current Admin Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">New Admin Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {passwordStatus && (
                    <div className={`text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 border ${
                      passwordStatus.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}>
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{passwordStatus.msg}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/15 transition-all disabled:opacity-50"
                    >
                      {isSavingPassword ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>SAVING...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>CHANGE PASSWORD</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* --- ADD/EDIT PATH CONFIG MODAL --- */}
      {isPathModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setIsPathModalOpen(false)} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative z-10 space-y-5"
          >
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-widest block">
                {editingPathName ? `Edit Path: /${editingPathName}` : "Add Live Stream Path"}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Wire physical IP feeds, RTMP publishing lines, or transcoding commands</p>
            </div>

            {modalError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-3 py-2 rounded-xl">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Path Route Name</label>
                <input
                  type="text"
                  value={modalPathName}
                  onChange={(e) => setModalPathName(e.target.value)}
                  disabled={!!editingPathName}
                  placeholder="e.g. hallway_camera"
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500 disabled:opacity-30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Source Address URL</label>
                <p className="text-[10px] text-slate-500">Leave empty if you plan to push a stream from OBS/FFmpeg to this container</p>
                <input
                  type="text"
                  value={modalSource}
                  onChange={(e) => setModalSource(e.target.value)}
                  placeholder="rtsp://192.168.1.155:554/live"
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="modal-on-demand"
                  checked={modalOnDemand}
                  onChange={(e) => setModalOnDemand(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 rounded border-white/25 bg-white/5 cursor-pointer"
                />
                <label htmlFor="modal-on-demand" className="text-xs text-slate-300 select-none cursor-pointer">
                  On-demand connection (Only connect when a client opens the stream)
                </label>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Run on stream ready (Shell command)</label>
                <p className="text-[10px] text-slate-500">Custom scripting to invoke automatically when the publisher gets active</p>
                <input
                  type="text"
                  value={modalRunOnReady}
                  onChange={(e) => setModalRunOnReady(e.target.value)}
                  placeholder="ffmpeg -i rtsp://localhost:$RTSP_PORT/$MTX_PATH ..."
                  className="w-full bg-slate-950/40 border border-white/10 rounded-xl text-slate-200 text-xs py-2 px-3 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPathModalOpen(false)}
                className="py-2 px-4 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={savePath}
                disabled={isSavingPath}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-lg shadow-blue-500/15 transition-all"
              >
                {isSavingPath && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>SAVE PORT</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- STREAM LIVE PREVIEW MODAL --- */}
      {previewStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setPreviewStream(null)} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl relative z-10 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xs font-bold text-white uppercase tracking-widest block">Live Stream Preview</h2>
              </div>
              <button
                onClick={() => setPreviewStream(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Embedded video element or helpful instructions if blocked / unplayable */}
            <div className="aspect-video bg-black/60 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-white/10 p-6 text-center space-y-4">
              <Tv className="w-10 h-10 text-slate-500 animate-pulse" />
              <div className="space-y-1.5">
                <p className="text-xs text-slate-300 font-semibold">Broadcasting Stream URL:</p>
                <code className="text-xs font-mono text-blue-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-white/5 select-all max-w-md block break-all">
                  {previewStream}
                </code>
              </div>
              <div className="max-w-md text-[11px] text-slate-500 space-y-2">
                <p>Native HLS decoding requires a compatible browser or VLC player.</p>
                <p>You can copy the HLS link above directly into VLC, Safari, or click below to launch the streaming source in a new window:</p>
              </div>
              <a
                href={previewStream}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-4 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>OPEN LIVE CHANNEL LINK</span>
              </a>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setPreviewStream(null)}
                className="py-1.5 px-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
              >
                CLOSE
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* --- COPY TO CLIPBOARD CONFIRMATION TOAST --- */}
      <AnimatePresence>
        {copiedText && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-xl border border-emerald-500/20 text-emerald-400 text-xs py-2.5 px-4 rounded-full flex items-center gap-2 shadow-2xl font-semibold"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Copied stream channel address!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FLOATING TOAST NOTIFICATION FOR REAL-TIME DISCONNECTION --- */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            onClick={() => {
              setShowAlertsPanel(true);
              setActiveToast(null);
            }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 backdrop-blur-xl py-3.5 px-5 rounded-2xl flex items-center gap-3 shadow-2xl cursor-pointer transition-all font-semibold max-w-md w-full border ${
              activeToast.type === "disconnect"
                ? "bg-rose-950/90 border-rose-500/30 text-rose-200 hover:bg-rose-900"
                : activeToast.type === "connect"
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200 hover:bg-emerald-900"
                : "bg-blue-950/90 border-blue-500/30 text-blue-200 hover:bg-blue-900"
            }`}
          >
            {activeToast.type === "disconnect" ? (
              <ShieldAlert className="w-5 h-5 text-rose-500 animate-bounce flex-shrink-0" />
            ) : activeToast.type === "connect" ? (
              <Check className="w-5 h-5 text-emerald-500 animate-pulse flex-shrink-0" />
            ) : (
              <Cable className="w-5 h-5 text-blue-500 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-0.5">
                {activeToast.type === "disconnect" ? "Stream Offline Alert" : activeToast.type === "connect" ? "Stream Online Notification" : "Routing Autopilot Notification"}
              </p>
              <p className="text-slate-300 text-[11px] leading-tight truncate">{activeToast.message}</p>
            </div>
            <X
              className="w-4 h-4 text-slate-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setActiveToast(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ALERTS DRAWER SIDEBAR PANEL --- */}
      <AnimatePresence>
        {showAlertsPanel && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAlertsPanel(false)}
              className="absolute inset-0 bg-slate-950"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-white/10 h-full shadow-2xl flex flex-col justify-between z-10 text-white"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm font-bold uppercase tracking-widest">Real-time Stream Alerts</h2>
                </div>
                <button
                  onClick={() => setShowAlertsPanel(false)}
                  className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recent Activity Logs</span>
                  {alerts.length > 0 && (
                    <button
                      onClick={handleClearAlerts}
                      className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline font-bold"
                    >
                      CLEAR ALL
                    </button>
                  )}
                </div>

                {alerts.length === 0 ? (
                  <div className="border border-dashed border-white/10 rounded-2xl p-10 text-center text-slate-500 space-y-2 bg-white/2">
                    <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs">No active alerts. All streams are behaving normally.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                          alert.read
                            ? "bg-white/2 border-white/5 opacity-60"
                            : "bg-white/5 border-white/10 shadow-lg shadow-black/20"
                        }`}
                      >
                        <div className="flex gap-2.5 items-start">
                          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            alert.type === "disconnect"
                              ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
                              : alert.type === "connect"
                              ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                              : "bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                          }`} />
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-medium text-slate-200">{alert.message}</p>
                            <span className="text-[9px] font-mono text-slate-500">
                              {new Date(alert.timestamp).toLocaleTimeString()} — {new Date(alert.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {!alert.read && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleMarkAlertRead(alert.id)}
                              className="text-[9px] text-blue-400 hover:text-blue-300 font-bold tracking-wider uppercase bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded-md"
                            >
                              MARK READ
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-white/10 bg-slate-950/40 text-center">
                <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                  AUTOPILOT CONTROLLER ACTIVE
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
