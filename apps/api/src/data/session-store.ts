import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { user } from "./mock-database.js";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionUser = typeof user;

interface PersistedSession {
  token: string;
  user: SessionUser;
  expiresAt: number;
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const sessionsFilePath = resolve(currentDirectory, "../../.data/sessions.json");
const sessionsDirectoryPath = dirname(sessionsFilePath);

const sessionStore = new Map<string, PersistedSession>();

let hasLoaded = false;
let persistQueue = Promise.resolve();

function isExpired(session: PersistedSession) {
  return session.expiresAt <= Date.now();
}

async function persistSessions() {
  await mkdir(sessionsDirectoryPath, { recursive: true });

  const payload = JSON.stringify([...sessionStore.values()], null, 2);
  const tempFilePath = `${sessionsFilePath}.tmp`;

  await writeFile(tempFilePath, payload, "utf8");
  await rename(tempFilePath, sessionsFilePath);
}

async function queuePersist() {
  persistQueue = persistQueue.then(() => persistSessions());
  await persistQueue;
}

export async function loadSessions() {
  if (hasLoaded) {
    return;
  }

  hasLoaded = true;

  try {
    const content = await readFile(sessionsFilePath, "utf8");
    const sessions = JSON.parse(content) as PersistedSession[];
    let removedExpiredSession = false;

    for (const session of sessions) {
      if (isExpired(session)) {
        removedExpiredSession = true;
        continue;
      }

      sessionStore.set(session.token, session);
    }

    if (removedExpiredSession) {
      await queuePersist();
    }
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;

    if (fileError.code !== "ENOENT") {
      throw error;
    }
  }
}

export async function createSession(sessionUser: SessionUser) {
  await loadSessions();

  const token = crypto.randomUUID();
  const session = {
    token,
    user: sessionUser,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  } satisfies PersistedSession;

  sessionStore.set(token, session);
  await queuePersist();

  return session;
}

export async function getSession(token: string) {
  await loadSessions();

  const session = sessionStore.get(token);

  if (!session) {
    return null;
  }

  if (isExpired(session)) {
    sessionStore.delete(token);
    await queuePersist();
    return null;
  }

  return session;
}

export async function deleteSession(token: string) {
  await loadSessions();

  const didDelete = sessionStore.delete(token);

  if (didDelete) {
    await queuePersist();
  }
}