import type { FastifyInstance } from "fastify";

import { appendConversationMessage, appendConversationNote, getInboxData, markConversationAsRead, updateConversation } from "../data/app-store.js";

export async function inboxRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    return getInboxData();
  });

  app.patch("/:conversationId/read", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const data = await markConversationAsRead(conversationId);

    if (!data) {
      reply.status(404);

      return {
        message: "Conversa nao encontrada"
      };
    }

    return data;
  });

  app.patch("/:conversationId", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const body = request.body as Partial<{
      status: string;
      assignee: string;
      isMine: boolean;
      isArchived: boolean;
      unread: boolean;
    }>;

    const data = await updateConversation(conversationId, (conversation) => ({
      ...conversation,
      ...(typeof body.status === "string" ? { status: body.status } : {}),
      ...(typeof body.assignee === "string" ? { assignee: body.assignee } : {}),
      ...(typeof body.isMine === "boolean" ? { isMine: body.isMine } : {}),
      ...(typeof body.isArchived === "boolean" ? { isArchived: body.isArchived } : {}),
      ...(typeof body.unread === "boolean" ? { unread: body.unread } : {})
    }));

    if (!data) {
      reply.status(404);

      return {
        message: "Conversa nao encontrada"
      };
    }

    return data;
  });

  app.post("/:conversationId/messages", async (request, reply) => {
    const { conversationId } = request.params as { conversationId: string };
    const body = request.body as { text?: string; type?: "message" | "internal" } | undefined;
    const text = body?.text?.trim();

    if (!text) {
      reply.status(400);

      return {
        message: "Texto da mensagem e obrigatorio"
      };
    }

    const data = await appendConversationMessage(conversationId, {
      text,
      type: body?.type === "internal" ? "internal" : "message"
    });

    if (!data) {
      reply.status(404);

      return {
        message: "Conversa nao encontrada"
      };
    }

    return data;
  });

    app.post("/:conversationId/notes", async (request, reply) => {
      const { conversationId } = request.params as { conversationId: string };
      const body = request.body as { text?: string; author?: string } | undefined;
      const text = body?.text?.trim();

      if (!text) {
        reply.status(400);

        return {
          message: "Texto da nota e obrigatorio"
        };
      }

      const data = await appendConversationNote(conversationId, {
        text,
        author: body?.author
      });

      if (!data) {
        reply.status(404);

        return {
          message: "Conversa nao encontrada"
        };
      }

      return data;
    });
}