import type { FastifyInstance } from "fastify";

import {
  createSettingsAutomation,
  createSettingsBot,
  createSettingsBotEdge,
  createSettingsBotNode,
  createSettingsCannedResponse,
  createSettingsChannel,
  createSettingsCustomField,
  createSettingsGroup,
  createSettingsPermission,
  deleteSettingsAutomation,
  deleteSettingsBot,
  deleteSettingsBotEdge,
  deleteSettingsBotNode,
  deleteSettingsCannedResponse,
  deleteSettingsChannel,
  deleteSettingsCustomField,
  deleteSettingsGroup,
  deleteSettingsMember,
  deleteSettingsPermission,
  getSettingsData,
  inviteSettingsMember,
  updateSettingsAutomation,
  updateSettingsBot,
  updateSettingsBotEdge,
  updateSettingsBotNode,
  updateSettingsCannedResponse,
  updateSettingsChannel,
  updateSettingsCustomField,
  updateSettingsGeneral,
  updateSettingsGroup,
  updateSettingsMember,
  updateSettingsPermission,
  updateSettingsProfile
} from "../data/app-store.js";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return getSettingsData();
  });

  app.put("/profile", async (request) => {
    const body = request.body as {
      name?: string;
      email?: string;
      phone?: string;
      timezone?: string;
      bio?: string;
      theme?: string;
    } | undefined;

    return updateSettingsProfile(body ?? {});
  });

  app.put("/general", async (request) => {
    const body = request.body as {
      workspaceName?: string;
      legalName?: string;
      timezone?: string;
      currency?: string;
      language?: string;
      dateFormat?: string;
      businessHours?: string;
      status?: string;
    } | undefined;

    return updateSettingsGeneral(body ?? {});
  });

  app.post("/members", async (request, reply) => {
    const body = request.body as { email?: string; role?: string } | undefined;

    if (!body?.email?.trim()) {
      reply.status(400);

      return {
        message: "E-mail do membro e obrigatorio"
      };
    }

    return inviteSettingsMember({
      email: body.email,
      role: body.role
    });
  });

  app.patch("/members/:memberId", async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const body = request.body as {
      name?: string;
      email?: string;
      role?: string;
      status?: string;
    } | undefined;
    const data = await updateSettingsMember(memberId, body ?? {});

    if (!data) {
      reply.status(404);

      return {
        message: "Membro nao encontrado"
      };
    }

    return data;
  });

  app.delete("/members/:memberId", async (request, reply) => {
    const { memberId } = request.params as { memberId: string };
    const data = await deleteSettingsMember(memberId);

    if (!data) {
      reply.status(404);

      return {
        message: "Membro nao encontrado"
      };
    }

    return data;
  });

  app.post("/groups", async (request, reply) => {
    const body = request.body as { name?: string } | undefined;

    if (!body?.name?.trim()) {
      reply.status(400);

      return {
        message: "Nome do grupo e obrigatorio"
      };
    }

    return createSettingsGroup({ name: body.name });
  });

  app.patch("/groups/:groupName", async (request, reply) => {
    const { groupName } = request.params as { groupName: string };
    const body = request.body as { name?: string } | undefined;

    if (!body?.name?.trim()) {
      reply.status(400);

      return {
        message: "Nome do grupo e obrigatorio"
      };
    }

    const data = await updateSettingsGroup(groupName, { name: body.name });

    if (!data) {
      reply.status(404);

      return {
        message: "Grupo nao encontrado"
      };
    }

    return data;
  });

  app.delete("/groups/:groupName", async (request, reply) => {
    const { groupName } = request.params as { groupName: string };
    const data = await deleteSettingsGroup(groupName);

    if (!data) {
      reply.status(404);

      return {
        message: "Grupo nao encontrado"
      };
    }

    return data;
  });

  app.post("/canned-responses", async (request, reply) => {
    const body = request.body as { shortcut?: string; text?: string } | undefined;

    if (!body?.shortcut?.trim() || !body?.text?.trim()) {
      reply.status(400);

      return {
        message: "Atalho e texto da frase rapida sao obrigatorios"
      };
    }

    return createSettingsCannedResponse({
      shortcut: body.shortcut,
      text: body.text
    });
  });

  app.post("/custom-fields", async (request, reply) => {
    const body = request.body as {
      name?: string;
      entity?: string;
      type?: string;
      required?: boolean;
      visibility?: string;
      placeholder?: string;
      options?: string[];
    } | undefined;

    if (!body?.name?.trim()) {
      reply.status(400);
      return { message: "Nome do campo e obrigatorio" };
    }

    return createSettingsCustomField(body as { name: string; entity?: string; type?: string; required?: boolean; visibility?: string; placeholder?: string; options?: string[] });
  });

  app.patch("/custom-fields/:fieldId", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const data = await updateSettingsCustomField(fieldId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Campo personalizado nao encontrado" };
    }

    return data;
  });

  app.delete("/custom-fields/:fieldId", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const data = await deleteSettingsCustomField(fieldId);

    if (!data) {
      reply.status(404);
      return { message: "Campo personalizado nao encontrado" };
    }

    return data;
  });

  app.patch("/canned-responses/:responseId", async (request, reply) => {
    const { responseId } = request.params as { responseId: string };
    const body = request.body as { shortcut?: string; text?: string } | undefined;
    const data = await updateSettingsCannedResponse(responseId, body ?? {});

    if (!data) {
      reply.status(404);

      return {
        message: "Frase rapida nao encontrada"
      };
    }

    return data;
  });

  app.delete("/canned-responses/:responseId", async (request, reply) => {
    const { responseId } = request.params as { responseId: string };
    const data = await deleteSettingsCannedResponse(responseId);

    if (!data) {
      reply.status(404);

      return {
        message: "Frase rapida nao encontrada"
      };
    }

    return data;
  });

  app.post("/permissions", async (request, reply) => {
    const body = request.body as {
      category?: string;
      name?: string;
      description?: string;
      admin?: boolean;
      manager?: boolean;
      agent?: boolean;
    } | undefined;

    if (!body?.category?.trim() || !body?.name?.trim()) {
      reply.status(400);

      return {
        message: "Categoria e nome da permissao sao obrigatorios"
      };
    }

    return createSettingsPermission(body as { category: string; name: string; description?: string; admin?: boolean; manager?: boolean; agent?: boolean });
  });

  app.patch("/permissions/:permissionId", async (request, reply) => {
    const { permissionId } = request.params as { permissionId: string };
    const data = await updateSettingsPermission(permissionId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Permissao nao encontrada" };
    }

    return data;
  });

  app.delete("/permissions/:permissionId", async (request, reply) => {
    const { permissionId } = request.params as { permissionId: string };
    const data = await deleteSettingsPermission(permissionId);

    if (!data) {
      reply.status(404);
      return { message: "Permissao nao encontrada" };
    }

    return data;
  });

  app.post("/automations", async (request, reply) => {
    const body = request.body as { name?: string; trigger?: string; condition?: string; result?: string; status?: string } | undefined;

    if (!body?.name?.trim()) {
      reply.status(400);
      return { message: "Nome da automacao e obrigatorio" };
    }

    return createSettingsAutomation(body as { name: string; trigger?: string; condition?: string; result?: string; status?: string });
  });

  app.patch("/automations/:automationId", async (request, reply) => {
    const { automationId } = request.params as { automationId: string };
    const data = await updateSettingsAutomation(automationId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Automacao nao encontrada" };
    }

    return data;
  });

  app.delete("/automations/:automationId", async (request, reply) => {
    const { automationId } = request.params as { automationId: string };
    const data = await deleteSettingsAutomation(automationId);

    if (!data) {
      reply.status(404);
      return { message: "Automacao nao encontrada" };
    }

    return data;
  });

  app.post("/channels", async (request, reply) => {
    const body = request.body as { name?: string; type?: string; status?: string; credentialLabel?: string; lastSync?: string } | undefined;

    if (!body?.name?.trim()) {
      reply.status(400);
      return { message: "Nome do canal e obrigatorio" };
    }

    return createSettingsChannel(body as { name: string; type?: string; status?: string; credentialLabel?: string; lastSync?: string });
  });

  app.patch("/channels/:channelId", async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const data = await updateSettingsChannel(channelId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Canal nao encontrado" };
    }

    return data;
  });

  app.delete("/channels/:channelId", async (request, reply) => {
    const { channelId } = request.params as { channelId: string };
    const data = await deleteSettingsChannel(channelId);

    if (!data) {
      reply.status(404);
      return { message: "Canal nao encontrado" };
    }

    return data;
  });

  app.post("/bots", async (request, reply) => {
    const body = request.body as { name?: string; status?: string; entryChannel?: string } | undefined;

    if (!body?.name?.trim()) {
      reply.status(400);
      return { message: "Nome do bot e obrigatorio" };
    }

    return createSettingsBot(body as { name: string; status?: string; entryChannel?: string });
  });

  app.patch("/bots/:botId", async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const data = await updateSettingsBot(botId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Bot nao encontrado" };
    }

    return data;
  });

  app.delete("/bots/:botId", async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const data = await deleteSettingsBot(botId);

    if (!data) {
      reply.status(404);
      return { message: "Bot nao encontrado" };
    }

    return data;
  });

  app.post("/bots/:botId/nodes", async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const body = request.body as { label?: string; kind?: string; content?: string; x?: number; y?: number } | undefined;

    if (!body?.label?.trim()) {
      reply.status(400);
      return { message: "Label do no e obrigatorio" };
    }

    const data = await createSettingsBotNode(botId, body as { label: string; kind?: string; content?: string; x?: number; y?: number });

    if (!data) {
      reply.status(404);
      return { message: "Bot nao encontrado" };
    }

    return data;
  });

  app.patch("/bots/:botId/nodes/:nodeId", async (request, reply) => {
    const { botId, nodeId } = request.params as { botId: string; nodeId: string };
    const data = await updateSettingsBotNode(botId, nodeId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Bot ou no nao encontrado" };
    }

    return data;
  });

  app.delete("/bots/:botId/nodes/:nodeId", async (request, reply) => {
    const { botId, nodeId } = request.params as { botId: string; nodeId: string };
    const data = await deleteSettingsBotNode(botId, nodeId);

    if (!data) {
      reply.status(404);
      return { message: "Bot ou no nao encontrado" };
    }

    return data;
  });

  app.post("/bots/:botId/edges", async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const body = request.body as { from?: string; to?: string; condition?: string } | undefined;

    if (!body?.from?.trim() || !body?.to?.trim()) {
      reply.status(400);
      return { message: "Origem e destino da conexao sao obrigatorios" };
    }

    const data = await createSettingsBotEdge(botId, body as { from: string; to: string; condition?: string });

    if (!data) {
      reply.status(404);
      return { message: "Bot nao encontrado" };
    }

    return data;
  });

  app.patch("/bots/:botId/edges/:edgeId", async (request, reply) => {
    const { botId, edgeId } = request.params as { botId: string; edgeId: string };
    const data = await updateSettingsBotEdge(botId, edgeId, (request.body as Record<string, unknown> | undefined) ?? {});

    if (!data) {
      reply.status(404);
      return { message: "Bot ou conexao nao encontrados" };
    }

    return data;
  });

  app.delete("/bots/:botId/edges/:edgeId", async (request, reply) => {
    const { botId, edgeId } = request.params as { botId: string; edgeId: string };
    const data = await deleteSettingsBotEdge(botId, edgeId);

    if (!data) {
      reply.status(404);
      return { message: "Bot ou conexao nao encontrados" };
    }

    return data;
  });
}