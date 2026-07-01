import express from "express";
import session from "express-session";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

import { PORT, SESSION_SECRET } from "./server/env.js";
import authRouter from "./server/routes/auth.js";
import streamsRouter from "./server/routes/streams.js";
import announcementsRouter from "./server/routes/announcements.js";
import configRouter from "./server/routes/config.js";
import { initWebSocketServer } from "./server/websocket.js";

async function startServer() {
  const app = express();

  // Parse JSON and form bodies
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Session configuration
  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      },
    })
  );

  // Mount API routes
  app.use("/api/auth", authRouter);
  app.use("/api/streams", streamsRouter);
  app.use("/api/announcements", announcementsRouter);
  app.use("/api/config", configRouter);

  // Basic API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve static attachments or images when needed if not served by router
  // Announcements routes already serves images, but let's make sure

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR integration...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static dist files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
    });
  });

  const numericPort = Number(PORT);
  const server = app.listen(numericPort, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${numericPort}`);
  });

  // Attach real-time WebSocket server
  initWebSocketServer(server);
}

startServer().catch((error) => {
  console.error("Fatal error starting server:", error);
});
