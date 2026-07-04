# MediaMTX Control Studio

A fully featured, responsive, and modern control center for **MediaMTX** (formerly rtsp-simple-server) live stream orchestration, configuration management, and announcement delivery.

This control studio provides stream administrators with a high-fidelity visual dashboard to monitor ingress/egress health, manage static routing configs, customize dynamic announcement loops, and oversee backend container resources.

---

## 🚀 Key Features

- **Real-Time Stream Monitoring**: Live dashboard showing computed ingestion bitrates, latency, viewer counts, and active reader/writer connections.
- **Visual Connection LED Indicator**: Header-mounted status LED that continuously checks health against the MediaMTX API (`/v3/config`), keeping you instantly notified of connectivity changes.
- **Dynamic Stream Autopilot & Routing**: Smart controls to route source feeds to dynamic destination channels or configure hands-off autopilot streams.
- **Announcement Billboard Engine**: Upload, order, and preview dynamic slide/image loops built dynamically for video overlay or fallback feeds.
- **Interactive Metrics Charts**: Rich time-series data visualization showing reader concurrency, bandwidth histories, and network throughput using D3 & Recharts.
- **Direct Configuration Editor**: Modify global server preferences, UI preferences, and routing configurations directly from the secure control panel.
- **Light & Dark Themes**: Fully responsive UI built with Tailwind CSS, custom display typography, and smooth page transition animations.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, and `motion` (framer-motion) for high-performance responsive styling and micro-interactions.
- **Backend Service**: Express sidecar API running on Node.js to bridge administrative tasks, authentication states, local file system actions, and direct MediaMTX REST communications.
- **Deployment**: Production-ready, multi-stage **Docker** pipeline utilizing a optimized Alpine Node workspace.

---

## 📦 Getting Started

### Prerequisites

- **Node.js** (v20+ recommended)
- **npm** (v10+)
- **Docker** (optional, for containerized deployments)

### 1. Local Development

First, clone the project and install the dependencies:

```bash
# Install package dependencies
npm install
```

Start the development server (which spins up both Vite and the sidecar Express server):

```bash
# Start development environment
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### 2. Manual Production Build

To test production build processes locally:

```bash
# Compile client assets and bundle Express backend
npm run build

# Run the production bundle
npm run start
```

---

## 🐳 Docker Deployment

The project is equipped with a highly optimized, dual-stage `Dockerfile` supporting lightweight deployments. It compiles the React client into compressed static assets and bundles the backend server into a single CommonJS file.

To build and run the container:

```bash
# Build the Docker image
docker build -t mediamtx-control-studio .

# Run the container exposing the web port
docker run -d -p 3000:3000 --name control-studio mediamtx-control-studio
```

### Docker Multi-Stage Overview

1. **Build Stage (`node:20-alpine`)**:
   - Installs development dependencies using `npm install`.
   - Copies Vite entry files (`index.html`, `vite.config.ts`, `tsconfig.json`) along with source folders.
   - Compiles client-side bundles and compiles/bundles the Express TypeScript backend to `dist/server.cjs` using `esbuild`.
2. **Production Stage (`node:20-alpine`)**:
   - Installs production-only dependencies using `npm install --omit=dev`.
   - Copies over only compiled outputs (`/app/dist`), keeping final image size minimal and secured.
   - Binds directly to container port `3000`.

---

## 🔒 Security & Environment Configuration

Copy `.env.example` to `.env` to customize your system settings, backend port mappings, and security parameters:

```env
# Server variables
PORT=3000
NODE_ENV=production
```

---

## 📄 License

This project is licensed under the MIT License - see your local repository for details. Built to enhance **MediaMTX** stream monitoring experiences worldwide.
