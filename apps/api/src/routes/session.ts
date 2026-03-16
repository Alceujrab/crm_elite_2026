import type { FastifyInstance } from "fastify";

import { user } from "../data/mock-database.js";
import { SESSION_MAX_AGE_SECONDS, createSession, deleteSession, getSession } from "../data/session-store.js";

const SESSION_COOKIE = "clone_zap_session";

export async function sessionRoutes(app: FastifyInstance) {
  app.get("/me", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];

    if (!token) {
      reply.status(401);

      return {
        authenticated: false
      };
    }

    const session = await getSession(token);

    if (!session) {
      reply.status(401);

      return {
        authenticated: false
      };
    }

    return {
      authenticated: true,
      user: session.user
    };
  });

  app.post("/login", async (request, reply) => {
    const body = request.body as { email?: string } | undefined;
    const sessionUser = {
      ...user,
      email: body?.email ?? user.email
    };
    const session = await createSession(sessionUser);

    reply.setCookie(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: false,
      maxAge: SESSION_MAX_AGE_SECONDS
    });

    return {
      authenticated: true,
      user: sessionUser
    };
  });

  app.post("/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];

    if (token) {
      await deleteSession(token);
    }

    reply.clearCookie(SESSION_COOKIE, {
      path: "/"
    });

    return {
      authenticated: false
    };
  });
}