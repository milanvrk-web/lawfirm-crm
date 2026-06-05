import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import cron from "node-cron";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
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

  // ── Nightly heartbeat endpoint (called by scheduled task) ──────────────
  app.post("/api/heartbeat/nightly", async (_req, res) => {
    try {
      console.log("[Heartbeat] Nightly AI Chief of Staff analysis started");
      // Create a minimal context for the server-side caller (no real req/res needed for public procedures)
      const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
      // Step 1: Re-analyze all active leads
      const analysisResult = await caller.intelligence.analyzeAll();
      console.log(`[Heartbeat] Analysis complete: ${analysisResult.total} leads processed`);
      // Step 2: Generate the daily briefing
      const briefingResult = await caller.intelligence.generateBriefing();
      console.log(`[Heartbeat] Briefing generated for ${briefingResult.briefingDate}`);
      res.json({ ok: true, analysisTotal: analysisResult.total, briefingDate: briefingResult.briefingDate });
    } catch (err) {
      console.error("[Heartbeat] Nightly job failed:", err);
      res.status(500).json({ ok: false, error: String(err) });
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

  // ── AI Chief of Staff nightly cron (midnight PST = 08:00 UTC) ─────────
  // Runs every day: re-analyzes all active leads, then generates the daily briefing.
  cron.schedule("0 8 * * *", async () => {
    console.log("[Cron] AI Chief of Staff nightly analysis starting...");
    try {
      const caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
      const analysisResult = await caller.intelligence.analyzeAll();
      console.log(`[Cron] Analysis complete: ${analysisResult.total} leads processed`);
      const briefingResult = await caller.intelligence.generateBriefing();
      console.log(`[Cron] Daily briefing generated for ${briefingResult.briefingDate}`);
    } catch (err) {
      console.error("[Cron] Nightly AI Chief of Staff job failed:", err);
    }
  }, { timezone: "UTC" });

  console.log("[Cron] AI Chief of Staff nightly job scheduled at 08:00 UTC (midnight PST)");
}

startServer().catch(console.error);
