import type { FastifyInstance } from "fastify";

import {
  createCrmCampaign,
  createCrmDeal,
  createCrmLane,
  createCrmTask,
  createCrmContact,
  deleteCrmCampaign,
  deleteCrmDeal,
  deleteCrmContact,
  deleteCrmLane,
  deleteCrmTask,
  getCrmData,
  updateCrmCampaign,
  updateCrmDeal,
  updateCrmLane,
  updateCrmTask,
  updateCrmContact
} from "../data/app-store.js";

export async function crmRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return getCrmData();
  });

  app.post("/contacts", async (request, reply) => {
    const body = request.body as {
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
      private?: boolean;
    } | undefined;

    if (!body?.name?.trim()) {
      reply.status(400);

      return {
        message: "Nome do contato e obrigatorio"
      };
    }

    return createCrmContact({
      ...body,
      name: body.name.trim()
    });
  });

  app.patch("/contacts/:contactId", async (request, reply) => {
    const { contactId } = request.params as { contactId: string };
    const body = request.body as {
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
      private?: boolean;
    } | undefined;
    const data = await updateCrmContact(contactId, body ?? {});

    if (!data) {
      reply.status(404);

      return {
        message: "Contato nao encontrado"
      };
    }

    return data;
  });

  app.delete("/contacts/:contactId", async (request, reply) => {
    const { contactId } = request.params as { contactId: string };
    const data = await deleteCrmContact(contactId);

    if (!data) {
      reply.status(404);

      return {
        message: "Contato nao encontrado"
      };
    }

    return data;
  });

  app.post("/campaigns", async (request) => {
    const body = request.body as {
      name?: string;
      channel?: string;
      audience?: string;
      message?: string;
      visibility?: string;
    } | undefined;

    return createCrmCampaign(body ?? {});
  });

  app.patch("/campaigns/:campaignId", async (request, reply) => {
    const { campaignId } = request.params as { campaignId: string };
    const body = request.body as {
      name?: string;
      channel?: string;
      audience?: string;
      message?: string;
      visibility?: string;
      status?: string;
    } | undefined;
    const data = await updateCrmCampaign(campaignId, body ?? {});

    if (!data) {
      reply.status(404);

      return {
        message: "Campanha nao encontrada"
      };
    }

    return data;
  });

  app.delete("/campaigns/:campaignId", async (request, reply) => {
    const { campaignId } = request.params as { campaignId: string };
    const data = await deleteCrmCampaign(campaignId);

    if (!data) {
      reply.status(404);

      return {
        message: "Campanha nao encontrada"
      };
    }

    return data;
  });

  app.post("/lanes", async (request, reply) => {
    const body = request.body as { title?: string; value?: string; probability?: number } | undefined;

    if (!body?.title?.trim()) {
      reply.status(400);
      return { message: "Titulo da etapa e obrigatorio" };
    }

    return createCrmLane(body as { title: string; value?: string; probability?: number });
  });

  app.patch("/lanes/:laneId", async (request, reply) => {
    const { laneId } = request.params as { laneId: string };
    const data = await updateCrmLane(laneId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Etapa nao encontrada" };
    }

    return data;
  });

  app.delete("/lanes/:laneId", async (request, reply) => {
    const { laneId } = request.params as { laneId: string };
    const data = await deleteCrmLane(laneId);

    if (!data) {
      reply.status(404);
      return { message: "Etapa nao encontrada" };
    }

    return data;
  });

  app.post("/tasks", async (request, reply) => {
    const body = request.body as { title?: string; contact?: string; due?: string; dueAt?: string; priority?: string; status?: string; assignee?: string; dealId?: string; dealLabel?: string } | undefined;

    if (!body?.title?.trim()) {
      reply.status(400);
      return { message: "Titulo da tarefa e obrigatorio" };
    }

    return createCrmTask(body as { title: string; contact?: string; due?: string; dueAt?: string; priority?: string; status?: string; assignee?: string; dealId?: string; dealLabel?: string });
  });

  app.patch("/tasks/:taskId", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const data = await updateCrmTask(taskId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Tarefa nao encontrada" };
    }

    return data;
  });

  app.delete("/tasks/:taskId", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const data = await deleteCrmTask(taskId);

    if (!data) {
      reply.status(404);
      return { message: "Tarefa nao encontrada" };
    }

    return data;
  });

  app.post("/deals", async (request, reply) => {
    const body = request.body as { laneId?: string; name?: string; company?: string; owner?: string; forecast?: string; lossReason?: string; nextTask?: string } | undefined;

    if (!body?.laneId?.trim() || !body?.name?.trim()) {
      reply.status(400);
      return { message: "Etapa e nome do deal sao obrigatorios" };
    }

    const data = await createCrmDeal(body as { laneId: string; name: string; company?: string; owner?: string; forecast?: string; lossReason?: string; nextTask?: string });

    if (!data) {
      reply.status(404);
      return { message: "Etapa nao encontrada" };
    }

    return data;
  });

  app.patch("/deals/:dealId", async (request, reply) => {
    const { dealId } = request.params as { dealId: string };
    const data = await updateCrmDeal(dealId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Deal ou etapa nao encontrados" };
    }

    return data;
  });

  app.delete("/deals/:dealId", async (request, reply) => {
    const { dealId } = request.params as { dealId: string };
    const data = await deleteCrmDeal(dealId);

    if (!data) {
      reply.status(404);
      return { message: "Deal nao encontrado" };
    }

    return data;
  });
}