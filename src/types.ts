export interface ActivePath {
  name: string;
  sourceType?: string;
  sourceReady?: boolean;
  readers?: any[];
  tracks?: string[];
  bytesReceived?: number;
  bytesSent?: number;
}

export interface PathConfig {
  name?: string;
  source?: string;
  sourceOnDemand?: boolean;
  runOnReady?: string;
  runOnReadyRestart?: boolean;
}

export interface AnnouncementImage {
  filename: string;
  duration: number;
}

export interface AnnouncementSettings {
  transitionType: string;
  transitionDuration: number;
  width: number;
  height: number;
  fps: number;
  images: AnnouncementImage[];
}

export interface AnnouncerStatus {
  status: "idle" | "rendering" | "streaming" | "error";
  message: string;
}

export interface GlobalConfig {
  logLevel?: string;
  rtspAddress?: string;
  rtspProtocols?: string[];
  rtmpAddress?: string;
  rtmpEnable?: boolean;
  hlsAddress?: string;
  hlsEnable?: boolean;
  hlsAlwaysRemux?: boolean;
  webrtcAddress?: string;
  webrtcEnable?: boolean;
  srtAddress?: string;
  srtEnable?: boolean;
  apiAddress?: string;
}

export interface StreamAlert {
  id: string;
  streamName: string;
  type: "disconnect" | "connect" | "routing" | "system";
  message: string;
  timestamp: string;
  read: boolean;
}

export interface RouterSettings {
  enabled: boolean;
  primaryPath: string;
  fallbackPath: string;
  destinationPath: string;
}
