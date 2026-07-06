import { useState, useEffect, useRef, FormEvent, DragEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
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
  Key,
  Sun,
  Moon,
  Monitor,
  ChevronUp,
  ChevronDown,
  Shuffle,
  Cpu,
  ArrowDownLeft,
  ArrowUpRight
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

// Custom Sub-components
import StreamMetricsCharts from "./components/StreamMetricsCharts.js";
import MediaStreamManager, { MediaStreamConfig } from "./components/MediaStreamManager.js";
import { MediaMtxLogo } from "./components/MediaMtxLogo.js";
import HomeTab from "./components/HomeTab.js";
import InputsTab from "./components/InputsTab.js";
import OutputsTab from "./components/OutputsTab.js";
import SettingsTab from "./components/SettingsTab.js";

export default function App() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const token = localStorage.getItem("admin_token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(input, {
      ...init,
      headers
    });
    if (res.status === 401) {
      const urlStr = typeof input === "string" ? input : input.toString();
      if (urlStr.includes("/api/auth/status") || urlStr.includes("/api/auth/login")) {
        setIsAuthenticated(false);
        localStorage.removeItem("admin_token");
      }
      throw new Error("Unauthorized");
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      throw new Error("Received HTML response instead of JSON. The backend might be starting up or offline.");
    }
    return res;
  };

  // App shell states
  const [activeTab, setActiveTab] = useState<"home" | "inputs" | "outputs" | "settings">("home");
  const [hlsBaseUrl, setHlsBaseUrl] = useState("");
  const [rtspBaseUrl, setRtspBaseUrl] = useState(() => {
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `rtsp://${host === "localhost" || host === "127.0.0.1" ? "mediamtx" : host}:8554`;
  });

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("theme") as any) || "dark";
  });

  // Media Streams Loop Registry
  const [mediaStreams, setMediaStreams] = useState<MediaStreamConfig[]>([]);
  const [localMediaFiles, setLocalMediaFiles] = useState<string[]>([]);

  // Real-time alerts & Autopilot states
  const [alerts, setAlerts] = useState<StreamAlert[]>([]);
  const [routerSettings, setRouterSettings] = useState<RouterSettings>({
    enabled: false,
    primaryPath: "live",
    fallbackPath: "announcements",
    destinationPath: "main",
  });
  const [expandedSettings, setExpandedSettings] = useState<Record<string, boolean>>({
    panel: true,
    mediamtx: false,
    autopilot: true,
    security: false,
  });
  const [expandedHomepage, setExpandedHomepage] = useState<Record<string, boolean>>({
    monitor: true,
    switcher: true,
    health: true,
    trends: true,
  });
  const [expandedStreams, setExpandedStreams] = useState<Record<string, boolean>>({
    ingestion: true,
    loops: true,
  });
  const [expandedPhotoLoop, setExpandedPhotoLoop] = useState<Record<string, boolean>>({
    parameters: true,
    reel: true,
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

  // Real-time Dashboard state
  const [selectedMonitorPath, setSelectedMonitorPath] = useState<string>("main");
  const [computedBitrates, setComputedBitrates] = useState<Record<string, number>>({});

  // System Stats and Connection Status
  const [systemStats, setSystemStats] = useState<{
    uptime: number;
    memoryRss: number;
    activePathsCount: number;
    configuredPathsCount: number;
    totalViewers: number;
    mediaMtxConnected: boolean;
    alertsCount: number;
    latestMetrics?: Record<string, any>;
  } | null>(null);
  const [isMtxConnected, setIsMtxConnected] = useState<boolean | null>(null);

  const formatUptime = (totalSeconds: number): string => {
    if (!totalSeconds || isNaN(totalSeconds)) return "0s";
    const d = Math.floor(totalSeconds / (3600 * 24));
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${String(m).padStart(2, '0')}m`);
    parts.push(`${String(s).padStart(2, '0')}s`);
    return parts.join(" ");
  };

  const fetchSystemStats = async () => {
    try {
      const res = await apiFetch("/api/streams/stats");
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data);
        setIsMtxConnected(data.mediaMtxConnected);
      } else {
        setIsMtxConnected(false);
        setSystemStats({
          uptime: 0,
          memoryRss: 0,
          activePathsCount: 0,
          configuredPathsCount: 0,
          totalViewers: 0,
          mediaMtxConnected: false,
          alertsCount: 0,
        });
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        console.warn("Error fetching system stats:", err.message || err);
      }
      setIsMtxConnected(false);
      setSystemStats({
        uptime: 0,
        memoryRss: 0,
        activePathsCount: 0,
        configuredPathsCount: 0,
        totalViewers: 0,
        mediaMtxConnected: false,
        alertsCount: 0,
      });
    }
  };
  const lastActivePathsRef = useRef<{ paths: Record<string, ActivePath>; time: number }>({ paths: {}, time: Date.now() });

  useEffect(() => {
    const now = Date.now();
    const dt = (now - lastActivePathsRef.current.time) / 1000;
    if (dt >= 1) {
      const newBitrates: Record<string, number> = {};
      Object.keys(activePaths).forEach((name) => {
        const currentBytes = activePaths[name]?.bytesReceived || 0;
        const previousBytes = lastActivePathsRef.current.paths[name]?.bytesReceived || 0;
        if (currentBytes > previousBytes && previousBytes > 0) {
          const deltaBytes = currentBytes - previousBytes;
          const bits = deltaBytes * 8;
          const kbps = bits / 1024 / dt;
          newBitrates[name] = Math.round(kbps);
        } else if (activePaths[name]?.sourceReady) {
          newBitrates[name] = computedBitrates[name] || 1500; // retain last calculated or use a realistic default
        } else {
          newBitrates[name] = 0;
        }
      });
      setComputedBitrates((prev) => ({ ...prev, ...newBitrates }));
      lastActivePathsRef.current = { paths: activePaths, time: now };
    }
  }, [activePaths]);

  // Apply active visual theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  const fetchMediaStreams = async () => {
    try {
      const res = await apiFetch("/api/media-streams");
      if (res.ok) {
        const data = await res.json();
        setMediaStreams(data.configs || []);
        setLocalMediaFiles(data.localFiles || []);
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        console.warn("Failed to load media loop configs", err.message || err);
      }
    }
  };

  // Check auth on load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Poll public MediaMTX status if not logged in
  useEffect(() => {
    if (isAuthenticated === false) {
      const checkPublicStatus = async () => {
        try {
          const res = await fetch("/api/auth/mediamtx-status");
          if (res.ok) {
            const data = await res.json();
            setIsMtxConnected(data.mediaMtxConnected);
          } else {
            setIsMtxConnected(false);
          }
        } catch {
          setIsMtxConnected(false);
        }
      };

      checkPublicStatus();
      const interval = setInterval(checkPublicStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Poll active streams and status in the background when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchStreamsData();
      fetchAnnouncementData();
      fetchUiSettings();
      fetchGlobalConfig();
      fetchMediaStreams();
      fetchSystemStats();

      const interval = setInterval(() => {
        fetchAnnouncementStatus();
        fetchMediaStreams();
      }, 5000);

      const statsInterval = setInterval(() => {
        fetchSystemStats();
      }, 12000);

      return () => {
        clearInterval(interval);
        clearInterval(statsInterval);
      };
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
          } catch (err: any) {
            console.warn("Error parsing WS message:", err.message || err);
          }
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed. Reconnecting in 3 seconds...");
          reconnectTimer = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn("WebSocket connection warning (this is normal during dev server restarts or initial loads)");
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
      const res = await apiFetch("/api/streams/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        console.warn("Failed to fetch alerts:", err.message || err);
      }
    }
  };

  const fetchRouterSettings = async () => {
    try {
      const res = await apiFetch("/api/streams/router-settings");
      if (res.ok) {
        const data = await res.json();
        setRouterSettings(data);
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        console.warn("Failed to fetch router settings:", err.message || err);
      }
    }
  };

  const handleClearAlerts = async () => {
    try {
      const res = await apiFetch("/api/streams/alerts/clear", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        console.warn("Failed to clear alerts:", err.message || err);
      }
    }
  };

  const handleMarkAlertRead = async (id: string) => {
    try {
      const res = await apiFetch(`/api/streams/alerts/read/${id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts);
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        console.warn("Failed to mark alert as read:", err.message || err);
      }
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

  const handleRouteToOutput = async (sourcePath: string) => {
    try {
      // 1. Turn off autopilot first if enabled
      if (routerSettings.enabled) {
        const updatedSettings = { ...routerSettings, enabled: false };
        const routerRes = await fetch("/api/streams/router-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedSettings),
        });
        if (routerRes.ok) {
          const data = await routerRes.json();
          setRouterSettings(data.settings);
        }
      }

      // 2. Patch the destination path's config to point to this source
      const destPath = routerSettings.destinationPath || "main";
      const rtspUrl = rtspBaseUrl;
      const newSource = `${rtspUrl}/${sourcePath}`;

      const configRes = await fetch(`/api/streams/config/${destPath}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: newSource }),
      });

      if (configRes.ok) {
        await fetchStreamsData();
        setActiveToast({
          id: `route-success-${Date.now()}`,
          message: `Successfully routed /${sourcePath} directly to /${destPath}!`,
          type: "routing",
        });
      } else {
        const postRes = await fetch(`/api/streams/config/${destPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: newSource }),
        });
        if (postRes.ok) {
          await fetchStreamsData();
          setActiveToast({
            id: `route-success-${Date.now()}`,
            message: `Successfully routed /${sourcePath} directly to /${destPath}!`,
            type: "routing",
          });
        } else {
          const err = await postRes.json().catch(() => ({}));
          alert(err.error || `Failed to update routing configuration for /${destPath}`);
        }
      }
    } catch (err) {
      console.error("Error manually routing output:", err);
      alert("Network error trying to route output stream manually");
    }
  };

  const handleToggleAutopilotOn = async (enable: boolean) => {
    try {
      const updatedSettings = { ...routerSettings, enabled: enable };
      const res = await fetch("/api/streams/router-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setRouterSettings(data.settings);
        setActiveToast({
          id: `autopilot-${enable ? "on" : "off"}-${Date.now()}`,
          message: enable 
            ? "Stream Autopilot re-enabled! It will now automatically route active streams." 
            : "Stream Autopilot has been manually bypassed.",
          type: "routing",
        });
        await fetchStreamsData();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update autopilot setting");
      }
    } catch (err) {
      console.error("Error setting Stream Autopilot:", err);
      alert("Network error trying to change Stream Autopilot state");
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
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }
    try {
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${token}`
      };
      const res = await fetch("/api/auth/status", { headers });
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
        if (!data.authenticated) {
          localStorage.removeItem("admin_token");
        }
      } else {
        // If server returned 500/502/etc., do not clear user session
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.warn("Failed to check auth status due to network error:", err);
      // Fallback: trust the local token during network downtime
      setIsAuthenticated(true);
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
        localStorage.setItem("admin_token", password);
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
      const token = localStorage.getItem("admin_token");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await fetch("/api/auth/logout", { method: "POST", headers });
    } finally {
      localStorage.removeItem("admin_token");
      setIsAuthenticated(false);
      setPassword("");
    }
  };

  // --- Fetchers ---

  const fetchUiSettings = async () => {
    try {
      const res = await apiFetch("/api/config/ui");
      if (res.ok) {
        const data = await res.json();
        setHlsBaseUrl(data.publicHlsUrl || window.location.origin.replace(":3000", ":8888"));
        if (data.rtspUrl) {
          setRtspBaseUrl(data.rtspUrl);
        }
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        console.warn("Failed to load UI settings", err.message || err);
      }
    }
  };

  const fetchStreamsData = async () => {
    fetchMediaStreams();
    try {
      const [activeRes, configRes] = await Promise.all([
        apiFetch("/api/streams/active").catch(() => null),
        apiFetch("/api/streams/config").catch(() => null)
      ]);

      if (activeRes && activeRes.ok) {
        try {
          const activeData = await activeRes.json();
          const list = activeData.items || [];
          const activeMap: Record<string, ActivePath> = {};
          list.forEach((item: any) => {
            activeMap[item.name] = item;
          });
          setActivePaths(activeMap);
        } catch (e) {
          console.warn("Failed to parse active streams json", e);
          setActivePaths({});
        }
      } else {
        setActivePaths({});
      }

      if (configRes && configRes.ok) {
        try {
          const configData = await configRes.json();
          const configList = configData.items || [];
          const configMap: Record<string, PathConfig> = {};
          configList.forEach((item: any) => {
            configMap[item.name] = item;
          });
          setPathConfigs(configMap);
          setStreamsError("");
        } catch (e) {
          console.warn("Failed to parse streams config json", e);
          setPathConfigs({});
        }
      } else {
        setPathConfigs({});
      }
    } catch (err: any) {
      setActivePaths({});
      setPathConfigs({});
      if (err.message !== "Unauthorized") {
        setStreamsError(err.message || "Failed to fetch stream configuration from MediaMTX");
      }
    }
  };

  const fetchAnnouncementData = async () => {
    try {
      const res = await apiFetch("/api/announcements/settings");
      if (res.ok) {
        const data = await res.json();
        setAnnouncementSettings(data);
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        setAnnouncementsError("Failed to fetch slideshow settings");
      }
    }
  };

  const fetchAnnouncementStatus = async () => {
    try {
      const res = await apiFetch("/api/announcements/status");
      if (res.ok) {
        const data = await res.json();
        setAnnouncerStatus(data);
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        console.warn("Failed to update slideshow state", err.message || err);
      }
    }
  };

  const fetchGlobalConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await apiFetch("/api/config/global");
      if (res.ok) {
        const data = await res.json();
        setGlobalConfig(data);
        setConfigError("");
      } else {
        throw new Error("Failed to load configuration");
      }
    } catch (err: any) {
      if (err.message !== "Unauthorized") {
        setConfigError(err.message || "Unreachable MediaMTX service. Configure the control API correctly.");
      }
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
          <div className="flex flex-col items-center mb-6">
            <img 
              src="/mediamtx-logo.png" 
              alt="MediaMTX Control Studio Logo" 
              style={{ height: "42.995px", marginRight: "0px", marginBottom: "7px" }} 
              className="w-auto" 
            />
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Control Studio</h1>
            <p className="text-xs text-slate-400 font-sans text-center">Broadcasting sidecar and stream controller</p>
            
            {/* LED Connection Indicator */}
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 select-none text-center">
              <span className="relative flex h-2 w-2">
                {isMtxConnected === true ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </>
                ) : isMtxConnected === false ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse"></span>
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </>
                )}
              </span>
              <span className={`text-[10px] font-bold font-mono tracking-wider ${isMtxConnected === true ? "text-emerald-400" : isMtxConnected === false ? "text-rose-400 animate-pulse" : "text-amber-400"} uppercase`}>
                {isMtxConnected === true ? "MediaMTX: Online" : isMtxConnected === false ? "MediaMTX: Offline" : "Checking MediaMTX connection..."}
              </span>
            </div>
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
        </motion.div>
      </div>
    );
  }

  const getCurrentlyRoutedSource = (): string | null => {
    const dest = routerSettings.destinationPath || "main";
    const destConfig = pathConfigs[dest];
    if (!destConfig || !destConfig.source) return null;
    const parts = destConfig.source.split("/");
    return parts[parts.length - 1] || null;
  };

  const getAvailableSourcesList = (): string[] => {
    const sources = new Set<string>();
    
    const dest = routerSettings.destinationPath || "main";
    
    Object.keys(pathConfigs).forEach(name => {
      if (name !== dest) {
        sources.add(name);
      }
    });

    Object.keys(activePaths).forEach(name => {
      if (name !== dest) {
        sources.add(name);
      }
    });

    mediaStreams.forEach(m => {
      if (m.name !== dest) {
        sources.add(m.name);
      }
    });

    return Array.from(sources).sort();
  };

  const onAddPath = async (name: string, config: any) => {
    const res = await fetch(`/api/streams/config/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create stream path");
    }
    fetchStreamsData();
  };

  const onEditPath = async (name: string, config: any) => {
    const res = await fetch(`/api/streams/config/${encodeURIComponent(name)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update stream path");
    }
    fetchStreamsData();
  };

  const onDeletePath = async (name: string) => {
    const res = await fetch(`/api/streams/config/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete stream path");
    }
    fetchStreamsData();
  };

  const onUpdateRouterSettings = async (settings: RouterSettings) => {
    const res = await fetch("/api/streams/router-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update autopilot router settings");
    }
    const data = await res.json();
    setRouterSettings(data.settings);
  };

  const onUpdatePathConfig = async (name: string, config: PathConfig) => {
    const res = await fetch(`/api/streams/config/${encodeURIComponent(name)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update path configuration");
    }
    fetchStreamsData();
  };

  // Combine Active configurations and dynamic metrics
  const pathNames = Array.from(new Set([
    ...Object.keys(pathConfigs),
    ...Object.keys(activePaths)
  ])).sort();

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      
      {/* --- TOP BAR HEADER --- */}
      <header className="w-full h-16 bg-white/5 dark:bg-slate-950/40 backdrop-blur-md border-b border-black/10 dark:border-white/10 flex items-center justify-between px-6 z-20 flex-shrink-0 transition-colors duration-300">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img 
            src="/mediamtx-logo.png" 
            alt="MediaMTX Control Studio Logo" 
            className="h-8 w-auto" 
            style={{ marginRight: "-10px" }} 
          />
          <div 
            className="border-l border-slate-300 dark:border-white/10 pl-3 hidden sm:block flex items-center" 
            style={{ marginLeft: "0px", height: "15.99px" }}
          >
            <h2 className="leading-none flex items-center">
              <span 
                className="text-slate-500 dark:text-slate-400 tracking-widest uppercase font-mono"
                style={{ fontSize: "15px", height: "15.99px", fontWeight: "bold" }}
              >
                CONTROL STUDIO
              </span>
            </h2>
          </div>
        </div>

        {/* Right side: Theme Toggle + Connection Status LED + Sign Out */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* LED Connection Indicator */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 select-none"
            title={isMtxConnected === true ? "MediaMTX Backend: Connected" : isMtxConnected === false ? "MediaMTX Backend: Connection Failed" : "MediaMTX Backend: Checking Status..."}
          >
            <span className="relative flex h-2 w-2">
              {isMtxConnected === true ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </>
              ) : isMtxConnected === false ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse"></span>
                </>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </>
              )}
            </span>
            <span className={`text-[9px] font-bold font-mono tracking-widest ${isMtxConnected === true ? "text-emerald-600 dark:text-emerald-400" : isMtxConnected === false ? "text-rose-500 dark:text-rose-400" : "text-amber-500"} uppercase hidden md:inline-block`}>
              {isMtxConnected === true ? "API CONNECTED" : isMtxConnected === false ? "API DISCONNECTED" : "API CHECKING"}
            </span>
          </div>

          {/* Theme Toggle Widget (extremely compact!) */}
          <div className="flex items-center p-0.5 rounded-md bg-slate-200/60 dark:bg-slate-950/60 border border-slate-300 dark:border-white/5">
            {(["light", "dark", "system"] as const).map((t) => {
              const active = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-1 rounded transition-all flex items-center justify-center ${
                    active
                      ? "bg-blue-600 dark:bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-white/5"
                  }`}
                  title={`${t.charAt(0).toUpperCase() + t.slice(1)} Mode`}
                >
                  {t === "light" ? (
                    <Sun className="w-3 h-3" />
                  ) : t === "dark" ? (
                    <Moon className="w-3 h-3" />
                  ) : (
                    <Monitor className="w-3 h-3" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Notification Badge Button */}
          <button
            onClick={() => setShowAlertsPanel(true)}
            className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all flex items-center justify-center"
            title="System Alerts"
          >
            <Bell className="w-4 h-4" />
            {alerts.filter((a) => !a.read).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-[0_0_8px_#f43f5e] animate-pulse">
                {alerts.filter((a) => !a.read).length}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/20 transition-all text-[11px] font-bold uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SIGN OUT</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* --- SIDEBAR NAVIGATION --- */}
        <aside className="w-full md:w-64 bg-white/5 dark:bg-slate-950/20 backdrop-blur-xl border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 flex flex-col justify-between py-6 flex-shrink-0 transition-colors duration-300">
          <div>
            {/* Navigation Links */}
            <nav className="px-3 space-y-1.5">
              <button
                onClick={() => setActiveTab("home")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 border ${
                  activeTab === "home"
                    ? "bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300 dark:border-white/20 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>
              <button
                onClick={() => setActiveTab("inputs")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 border ${
                  activeTab === "inputs"
                    ? "bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300 dark:border-white/20 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                <span>Input Streams</span>
              </button>
              <button
                onClick={() => setActiveTab("outputs")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 border ${
                  activeTab === "outputs"
                    ? "bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300 dark:border-white/20 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-sky-500" />
                <span>Output Streams</span>
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-150 border ${
                  activeTab === "settings"
                    ? "bg-slate-200/50 dark:bg-white/10 text-slate-900 dark:text-white border-slate-300 dark:border-white/20 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          {/* Sidebar Footer with Service Health */}
          <div className="px-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/5 to-purple-500/5 dark:from-blue-500/10 dark:to-purple-500/10 border border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${
                  isMtxConnected === true 
                    ? "bg-green-500 shadow-[0_0_8px_#10b981]" 
                    : isMtxConnected === false 
                    ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" 
                    : "bg-amber-500"
                } animate-pulse`}></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  {isMtxConnected === true ? "Service Healthy" : isMtxConnected === false ? "Service Offline" : "Checking Service..."}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                Uptime: {systemStats ? formatUptime(systemStats.uptime) : "Calculating..."}
              </p>
            </div>
          </div>
        </aside>

        {/* --- MAIN PANEL STAGE --- */}
        <main className="flex-1 overflow-y-auto px-6 md:px-10 py-8 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">

                    {/* ====== HOME TAB ====== */}
          {activeTab === "home" && (
            <HomeTab
              pathNames={pathNames}
              activePaths={activePaths}
              pathConfigs={pathConfigs}
              routerSettings={routerSettings}
              mediaStreams={mediaStreams}
              announcerStatus={announcerStatus}
              systemStats={systemStats}
              selectedMonitorPath={selectedMonitorPath}
              setSelectedMonitorPath={setSelectedMonitorPath}
              previewStream={previewStream}
              setPreviewStream={setPreviewStream}
              hlsBaseUrl={hlsBaseUrl}
              computedBitrates={computedBitrates}
              fetchStreamsData={fetchStreamsData}
              fetchAnnouncementStatus={fetchAnnouncementStatus}
              fetchMediaStreams={fetchMediaStreams}
              handleRouteToOutput={handleRouteToOutput}
              handleToggleAutopilotOn={handleToggleAutopilotOn}
              getAvailableSourcesList={getAvailableSourcesList}
              getCurrentlyRoutedSource={getCurrentlyRoutedSource}
              stopReel={stopReel}
              buildAndStreamReel={buildAndStreamReel}
            />
          )}

          {/* ====== INPUTS TAB ====== */}
          {activeTab === "inputs" && (
            <InputsTab
              pathNames={pathNames}
              activePaths={activePaths}
              pathConfigs={pathConfigs}
              mediaStreams={mediaStreams}
              localMediaFiles={localMediaFiles}
              announcerStatus={announcerStatus}
              announcementSettings={announcementSettings}
              setAnnouncementSettings={setAnnouncementSettings}
              hlsBaseUrl={hlsBaseUrl}
              rtspBaseUrl={rtspBaseUrl}
              fetchStreamsData={fetchStreamsData}
              fetchMediaStreams={fetchMediaStreams}
              fetchAnnouncementData={fetchAnnouncementData}
              setPreviewStream={setPreviewStream}
              handleFileUpload={handleFileUpload}
              updateSlideDuration={updateSlideDuration}
              moveSlide={moveSlide}
              deleteSlide={deleteSlide}
              handleSettingsUpdate={handleSettingsUpdate}
              isSavingSettings={isSavingSettings}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              onAddPath={onAddPath}
              onDeletePath={onDeletePath}
              onEditPath={onEditPath}
            />
          )}

          {/* ====== OUTPUTS TAB ====== */}
          {activeTab === "outputs" && (
            <OutputsTab
              pathNames={pathNames}
              pathConfigs={pathConfigs}
              routerSettings={routerSettings}
              activePaths={activePaths}
              fetchStreamsData={fetchStreamsData}
              onUpdateRouterSettings={onUpdateRouterSettings}
              onUpdatePathConfig={onUpdatePathConfig}
              onAddPath={onAddPath}
              onDeletePath={onDeletePath}
            />
          )}

          {/* ====== SETTINGS TAB ====== */}
          {activeTab === "settings" && (
            <SettingsTab
              hlsBaseUrl={hlsBaseUrl}
              setHlsBaseUrl={setHlsBaseUrl}
              globalConfig={globalConfig}
              setGlobalConfig={setGlobalConfig}
              isLoadingConfig={isLoadingConfig}
              configError={configError}
              saveStatus={saveStatus}
              fetchGlobalConfig={fetchGlobalConfig}
              handleSaveGlobalConfig={handleSaveGlobalConfig}
              handleSaveUiSettings={handleSaveUiSettings}
              currentPassword={currentPassword}
              setCurrentPassword={setCurrentPassword}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              handleChangePassword={handleChangePassword}
              passwordChangeStatus={passwordStatus}
              isChangingPassword={isSavingPassword}
            />
          )}

          </AnimatePresence>
      </main>
    </div>

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
