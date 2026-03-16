import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return {
      name: "clone-zap-api",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  });
}