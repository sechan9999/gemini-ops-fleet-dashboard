import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { getNotificationStreamMetrics, heartbeatNotificationStreams, openNotificationStream } from "../notifications";
import { getFleetEventBridgeMetrics, ingestFleetEvents, isFleetEventTokenValid } from "../fleet-event-bridge";
import { renderPrometheusMetrics } from "../prometheus";
import { getOpenApiDocument } from "../openapi";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get("/healthz", (_req, res) => res.json({ status: "ok", service: "gemini-ops-fleet-dashboard" }));
  app.get("/openapi.json", (_req, res) => res.json(getOpenApiDocument()));
  const heartbeat = setInterval(() => heartbeatNotificationStreams(), 25_000);
  heartbeat.unref?.();
  app.get("/api/notifications/stream", async (req, res) => {
    const user = await sdk.authenticateRequest(req).catch(() => null);
    if (!user) { res.status(401).end(); return; }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const cleanup = openNotificationStream(user.id, res);
    req.on("close", cleanup);
  });
  app.get("/metrics", async (req, res) => {
    const prometheusToken = process.env.PROMETHEUS_METRICS_TOKEN;
    const tokenAuthorized = Boolean(prometheusToken && req.header("X-Prometheus-Token") === prometheusToken);
    const user = tokenAuthorized ? null : await sdk.authenticateRequest(req).catch(() => null);
    if (!tokenAuthorized && user?.role !== "admin") { res.status(401).end(); return; }
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(renderPrometheusMetrics());
  });
  app.get("/api/notifications/metrics", async (req, res) => {
    const user = await sdk.authenticateRequest(req).catch(() => null);
    if (!user) { res.status(401).end(); return; }
    if (user.role !== "admin") { res.status(403).end(); return; }
    res.json({ stream: getNotificationStreamMetrics(), fleetBridge: getFleetEventBridgeMetrics() });
  });
  app.post("/api/notifications/fleet-events", async (req, res) => {
    if (!isFleetEventTokenValid(req.header("X-Fleet-Event-Token"))) { res.status(401).end(); return; }
    try {
      const results = await ingestFleetEvents(req.body);
      res.status(202).json({ accepted: results.length, results });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid fleet event" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
