import { defaultSessionUser, type SessionUser } from "@/components/auth/mock-session";
import { crmPageData, inboxPageData, reportsPageData } from "@/lib/mocks/app-data";
import { settingsPageData } from "@/lib/mocks/app-data";
import type { CrmData, InboxData, ReportsData, SettingsData } from "@/lib/types";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  authenticated: boolean;
  user: SessionUser;
}

interface SessionResponse {
  authenticated: boolean;
  user?: SessionUser;
}

function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/session/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Login mock indisponivel");
    }

    return (await response.json()) as LoginResponse;
  } catch {
    return {
      authenticated: true,
      user: {
        ...defaultSessionUser,
        email: payload.email
      }
    };
  }
}

export async function fetchSessionRequest(): Promise<SessionResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/session/me`, {
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Sessao indisponivel");
  }

  return (await response.json()) as SessionResponse;
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${apiBaseUrl()}/api/session/logout`, {
    method: "POST",
    credentials: "include"
  });
}

function cloneInboxFallback(): InboxData {
  return {
    metrics: inboxPageData.metrics.map((item) => ({ ...item })),
    conversations: inboxPageData.conversations.map((conversation) => ({
      ...conversation,
      crmDealIds: [...conversation.crmDealIds],
      crmTaskIds: [...conversation.crmTaskIds],
      messages: conversation.messages.map((message) => ({ ...message })),
      notes: conversation.notes.map((note) => ({ ...note })),
      detailGroups: conversation.detailGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({ ...item }))
      }))
    })),
    contactActions: [...inboxPageData.contactActions],
    cannedResponses: [...inboxPageData.cannedResponses],
    quickActions: [...inboxPageData.quickActions]
  };
}

function cloneCrmFallback(): CrmData {
  return {
    summary: crmPageData.summary.map((item) => ({ ...item })),
    lanes: crmPageData.lanes.map((lane) => ({
      ...lane,
      cards: lane.cards.map((card) => ({
        ...card,
        movementHistory: card.movementHistory ? [...card.movementHistory] : [],
        activityHistory: card.activityHistory ? [...card.activityHistory] : []
      }))
    })),
    tasks: crmPageData.tasks.map((task) => ({ ...task })),
    contacts: crmPageData.contacts.map((contact) => ({ ...contact })),
    campaigns: crmPageData.campaigns.map((campaign) => ({ ...campaign })),
    goals: crmPageData.goals.map((goal) => ({ ...goal }))
  };
}

function cloneReportsFallback(): ReportsData {
  return {
    sections: [...reportsPageData.sections],
    kpis: reportsPageData.kpis.map((item) => ({ ...item })),
    chartBars: [...reportsPageData.chartBars],
    dashboards: reportsPageData.dashboards.map((dashboard) => ({ ...dashboard })),
    teamPerformance: reportsPageData.teamPerformance.map((row) => ({ ...row })),
    channels: reportsPageData.channels.map((channel) => ({ ...channel }))
  };
}

function cloneSettingsFallback(): SettingsData {
  return {
    profile: { ...settingsPageData.profile },
    general: { ...settingsPageData.general },
    sections: [...settingsPageData.sections],
    cards: settingsPageData.cards.map((item) => ({ ...item })),
    members: settingsPageData.members.map((member) => ({ ...member })),
    permissions: settingsPageData.permissions.map((permission) => ({ ...permission })),
    groups: [...settingsPageData.groups],
    customFields: settingsPageData.customFields.map((field) => ({ ...field, options: [...field.options] })),
    cannedResponses: settingsPageData.cannedResponses.map((response) => ({ ...response })),
    automations: settingsPageData.automations.map((automation) => ({ ...automation })),
    channels: settingsPageData.channels.map((channel) => ({ ...channel })),
    bots: settingsPageData.bots.map((bot) => ({
      ...bot,
      nodes: bot.nodes.map((node) => ({ ...node })),
      edges: bot.edges.map((edge) => ({ ...edge }))
    }))
  };
}

export async function fetchInboxData(): Promise<InboxData> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/inbox`, { cache: "no-store", credentials: "include" });
    if (!response.ok) {
      throw new Error("Inbox indisponivel");
    }

    return (await response.json()) as InboxData;
  } catch {
    return cloneInboxFallback();
  }
}

export async function fetchCrmData(): Promise<CrmData> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/crm`, { cache: "no-store", credentials: "include" });
    if (!response.ok) {
      throw new Error("CRM indisponivel");
    }

    return (await response.json()) as CrmData;
  } catch {
    return cloneCrmFallback();
  }
}

export async function fetchReportsData(): Promise<ReportsData> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/reports`, { cache: "no-store", credentials: "include" });
    if (!response.ok) {
      throw new Error("Relatorios indisponiveis");
    }

    return (await response.json()) as ReportsData;
  } catch {
    return cloneReportsFallback();
  }
}

export async function createReportsDashboardRequest(payload: {
  name: string;
  description?: string;
  period?: string;
  visibility?: string;
}): Promise<ReportsData> {
  const response = await fetch(`${apiBaseUrl()}/api/reports/dashboards`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar o dashboard");
  }

  return (await response.json()) as ReportsData;
}

export async function updateReportsDashboardRequest(
  dashboardId: string,
  payload: {
    name?: string;
    description?: string;
    period?: string;
    visibility?: string;
  }
): Promise<ReportsData> {
  const response = await fetch(`${apiBaseUrl()}/api/reports/dashboards/${dashboardId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o dashboard");
  }

  return (await response.json()) as ReportsData;
}

export async function deleteReportsDashboardRequest(dashboardId: string): Promise<ReportsData> {
  const response = await fetch(`${apiBaseUrl()}/api/reports/dashboards/${dashboardId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o dashboard");
  }

  return (await response.json()) as ReportsData;
}

export async function fetchSettingsData(): Promise<SettingsData> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/settings`, { cache: "no-store", credentials: "include" });
    if (!response.ok) {
      throw new Error("Settings indisponivel");
    }

    return (await response.json()) as SettingsData;
  } catch {
    return cloneSettingsFallback();
  }
}

export async function updateSettingsProfileRequest(payload: {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  bio?: string;
  theme?: string;
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/profile`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel salvar o perfil");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsGeneralRequest(payload: {
  workspaceName?: string;
  legalName?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  dateFormat?: string;
  businessHours?: string;
  status?: string;
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/general`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel salvar a configuracao geral");
  }

  return (await response.json()) as SettingsData;
}

export async function inviteSettingsMemberRequest(payload: {
  email: string;
  role?: string;
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/members`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel convidar o membro");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsMemberRequest(
  memberId: string,
  payload: {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/members/${memberId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o membro");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsMemberRequest(memberId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/members/${memberId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o membro");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsGroupRequest(payload: { name: string }): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/groups`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar o grupo");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsGroupRequest(groupName: string, payload: { name: string }): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/groups/${encodeURIComponent(groupName)}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o grupo");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsGroupRequest(groupName: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/groups/${encodeURIComponent(groupName)}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o grupo");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsCannedResponseRequest(payload: {
  shortcut: string;
  text: string;
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/canned-responses`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar a frase rapida");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsCustomFieldRequest(payload: {
  name: string;
  entity?: string;
  type?: string;
  required?: boolean;
  visibility?: string;
  placeholder?: string;
  options?: string[];
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/custom-fields`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar o campo personalizado");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsCustomFieldRequest(
  fieldId: string,
  payload: {
    name?: string;
    entity?: string;
    type?: string;
    required?: boolean;
    visibility?: string;
    placeholder?: string;
    options?: string[];
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/custom-fields/${fieldId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o campo personalizado");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsCustomFieldRequest(fieldId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/custom-fields/${fieldId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o campo personalizado");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsCannedResponseRequest(
  responseId: string,
  payload: {
    shortcut?: string;
    text?: string;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/canned-responses/${responseId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a frase rapida");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsCannedResponseRequest(responseId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/canned-responses/${responseId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir a frase rapida");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsPermissionRequest(payload: {
  category: string;
  name: string;
  description?: string;
  admin?: boolean;
  manager?: boolean;
  agent?: boolean;
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/permissions`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar a permissao");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsPermissionRequest(
  permissionId: string,
  payload: {
    category?: string;
    name?: string;
    description?: string;
    admin?: boolean;
    manager?: boolean;
    agent?: boolean;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/permissions/${permissionId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a permissao");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsPermissionRequest(permissionId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/permissions/${permissionId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir a permissao");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsAutomationRequest(payload: {
  name: string;
  trigger?: string;
  condition?: string;
  result?: string;
  status?: string;
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/automations`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar a automacao");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsAutomationRequest(
  automationId: string,
  payload: {
    name?: string;
    trigger?: string;
    condition?: string;
    result?: string;
    status?: string;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/automations/${automationId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a automacao");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsAutomationRequest(automationId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/automations/${automationId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir a automacao");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsChannelRequest(payload: {
  name: string;
  type?: string;
  status?: string;
  credentialLabel?: string;
  lastSync?: string;
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/channels`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar o canal");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsChannelRequest(
  channelId: string,
  payload: {
    name?: string;
    type?: string;
    status?: string;
    credentialLabel?: string;
    lastSync?: string;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/channels/${channelId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o canal");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsChannelRequest(channelId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/channels/${channelId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o canal");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsBotRequest(payload: {
  name: string;
  status?: string;
  entryChannel?: string;
}): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar o bot");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsBotRequest(
  botId: string,
  payload: {
    name?: string;
    status?: string;
    entryChannel?: string;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots/${botId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o bot");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsBotRequest(botId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots/${botId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o bot");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsBotNodeRequest(
  botId: string,
  payload: {
    label: string;
    kind?: string;
    content?: string;
    x?: number;
    y?: number;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots/${botId}/nodes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar o no do bot");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsBotNodeRequest(
  botId: string,
  nodeId: string,
  payload: {
    label?: string;
    kind?: string;
    content?: string;
    x?: number;
    y?: number;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots/${botId}/nodes/${nodeId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o no do bot");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsBotNodeRequest(botId: string, nodeId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots/${botId}/nodes/${nodeId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o no do bot");
  }

  return (await response.json()) as SettingsData;
}

export async function createSettingsBotEdgeRequest(
  botId: string,
  payload: {
    from: string;
    to: string;
    condition?: string;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots/${botId}/edges`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar a conexao do bot");
  }

  return (await response.json()) as SettingsData;
}

export async function updateSettingsBotEdgeRequest(
  botId: string,
  edgeId: string,
  payload: {
    from?: string;
    to?: string;
    condition?: string;
  }
): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots/${botId}/edges/${edgeId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a conexao do bot");
  }

  return (await response.json()) as SettingsData;
}

export async function deleteSettingsBotEdgeRequest(botId: string, edgeId: string): Promise<SettingsData> {
  const response = await fetch(`${apiBaseUrl()}/api/settings/bots/${botId}/edges/${edgeId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir a conexao do bot");
  }

  return (await response.json()) as SettingsData;
}

export async function markConversationReadRequest(conversationId: string): Promise<InboxData> {
  const response = await fetch(`${apiBaseUrl()}/api/inbox/${conversationId}/read`, {
    method: "PATCH",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a conversa");
  }

  return (await response.json()) as InboxData;
}

export async function updateConversationRequest(
  conversationId: string,
  payload: Partial<{
    status: string;
    assignee: string;
    isMine: boolean;
    isArchived: boolean;
    unread: boolean;
  }>
): Promise<InboxData> {
  const response = await fetch(`${apiBaseUrl()}/api/inbox/${conversationId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a conversa");
  }

  return (await response.json()) as InboxData;
}

export async function createInboxMessageRequest(
  conversationId: string,
  payload: {
    text: string;
    type: "message" | "internal";
  }
): Promise<InboxData> {
  const response = await fetch(`${apiBaseUrl()}/api/inbox/${conversationId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel enviar a mensagem");
  }

  return (await response.json()) as InboxData;
}

export async function createInboxNoteRequest(
  conversationId: string,
  payload: {
    text: string;
    author?: string;
  }
): Promise<InboxData> {
  const response = await fetch(`${apiBaseUrl()}/api/inbox/${conversationId}/notes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel salvar a nota");
  }

  return (await response.json()) as InboxData;
}

export async function createCrmContactRequest(payload: {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  private?: boolean;
}): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/contacts`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar o contato");
  }

  return (await response.json()) as CrmData;
}

export async function createCrmCampaignRequest(payload: {
  name?: string;
  channel?: string;
  audience?: string;
  message?: string;
  visibility?: string;
}): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/campaigns`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar a campanha");
  }

  return (await response.json()) as CrmData;
}

export async function updateCrmContactRequest(
  contactId: string,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    private?: boolean;
  }
): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/contacts/${contactId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o contato");
  }

  return (await response.json()) as CrmData;
}

export async function deleteCrmContactRequest(contactId: string): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/contacts/${contactId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o contato");
  }

  return (await response.json()) as CrmData;
}

export async function updateCrmCampaignRequest(
  campaignId: string,
  payload: {
    name?: string;
    channel?: string;
    audience?: string;
    message?: string;
    visibility?: string;
    status?: string;
  }
): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/campaigns/${campaignId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a campanha");
  }

  return (await response.json()) as CrmData;
}

export async function deleteCrmCampaignRequest(campaignId: string): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/campaigns/${campaignId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir a campanha");
  }

  return (await response.json()) as CrmData;
}

export async function createCrmLaneRequest(payload: {
  title: string;
  value?: string;
  probability?: number;
}): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/lanes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar a etapa");
  }

  return (await response.json()) as CrmData;
}

export async function updateCrmLaneRequest(
  laneId: string,
  payload: {
    title?: string;
    value?: string;
    probability?: number;
  }
): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/lanes/${laneId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a etapa");
  }

  return (await response.json()) as CrmData;
}

export async function deleteCrmLaneRequest(laneId: string): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/lanes/${laneId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir a etapa");
  }

  return (await response.json()) as CrmData;
}

export async function createCrmTaskRequest(payload: {
  title: string;
  contact?: string;
  due?: string;
  dueAt?: string;
  priority?: string;
  status?: string;
  assignee?: string;
  dealId?: string;
  dealLabel?: string;
}): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/tasks`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar a tarefa");
  }

  return (await response.json()) as CrmData;
}

export async function updateCrmTaskRequest(
  taskId: string,
  payload: {
    title?: string;
    contact?: string;
    due?: string;
    dueAt?: string;
    priority?: string;
    status?: string;
    assignee?: string;
    dealId?: string;
    dealLabel?: string;
  }
): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/tasks/${taskId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar a tarefa");
  }

  return (await response.json()) as CrmData;
}

export async function deleteCrmTaskRequest(taskId: string): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/tasks/${taskId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir a tarefa");
  }

  return (await response.json()) as CrmData;
}

export async function createCrmDealRequest(payload: {
  laneId: string;
  actor?: string;
  name: string;
  company?: string;
  owner?: string;
  forecast?: string;
  lossReason?: string;
  nextTask?: string;
}): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/deals`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel criar o deal");
  }

  return (await response.json()) as CrmData;
}

export async function updateCrmDealRequest(
  dealId: string,
  payload: {
    laneId?: string;
    position?: number;
    movedBy?: string;
    actor?: string;
    name?: string;
    company?: string;
    owner?: string;
    forecast?: string;
    lossReason?: string;
    nextTask?: string;
  }
): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/deals/${dealId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar o deal");
  }

  return (await response.json()) as CrmData;
}

export async function deleteCrmDealRequest(dealId: string): Promise<CrmData> {
  const response = await fetch(`${apiBaseUrl()}/api/crm/deals/${dealId}`, {
    method: "DELETE",
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel excluir o deal");
  }

  return (await response.json()) as CrmData;
}