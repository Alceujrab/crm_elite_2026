import type { FastifyInstance } from "fastify";

import { createReportsDashboard, deleteReportsDashboard, getReportsData, updateReportsDashboard } from "../data/app-store.js";

export async function reportsRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return getReportsData();
  });

  app.post("/dashboards", async (request, reply) => {
    const body = request.body as {
      name?: string;
      description?: string;
      period?: string;
      visibility?: string;
    } | undefined;

    if (!body?.name?.trim()) {
      reply.status(400);

      return {
        message: "Nome do dashboard e obrigatorio"
      };
    }

    return createReportsDashboard({
      ...body,
      name: body.name.trim()
    });
  });

  app.patch("/dashboards/:dashboardId", async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      period?: string;
      visibility?: string;
    } | undefined;
    const data = await updateReportsDashboard(dashboardId, body ?? {});

    if (!data) {
      reply.status(404);

      return {
        message: "Dashboard nao encontrado"
      };
    }

    return data;
  });

  app.delete("/dashboards/:dashboardId", async (request, reply) => {
    const { dashboardId } = request.params as { dashboardId: string };
    const data = await deleteReportsDashboard(dashboardId);

    if (!data) {
      reply.status(404);

      return {
        message: "Dashboard nao encontrado"
      };
    }

    return data;
  });
}