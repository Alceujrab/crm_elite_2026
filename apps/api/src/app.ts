import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";

import { crmRoutes } from "./routes/crm.js";
import { healthRoutes } from "./routes/health.js";
import { inboxRoutes } from "./routes/inbox.js";
import { reportsRoutes } from "./routes/reports.js";
import { settingsRoutes } from "./routes/settings.js";
import { sessionRoutes } from "./routes/session.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cookie, {
    parseOptions: {}
  });

  await app.register(cors, {
    origin: true,
    credentials: true
  });

  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(sessionRoutes, { prefix: "/api/session" });
  await app.register(inboxRoutes, { prefix: "/api/inbox" });
  await app.register(crmRoutes, { prefix: "/api/crm" });
  await app.register(reportsRoutes, { prefix: "/api/reports" });
  await app.register(settingsRoutes, { prefix: "/api/settings" });

  return app;
}