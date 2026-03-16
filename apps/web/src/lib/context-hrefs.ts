type InboxHrefInput = {
  conversationId: string;
  filter?: "entrada" | "meus" | "seguindo" | "arquivados";
  panel?: "chat" | "info";
  detail?: "contato" | "negociacoes" | "tarefas" | "notas";
  noteId?: string;
};

function toQuery(params: URLSearchParams) {
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildInboxConversationHref(input: InboxHrefInput) {
  const params = new URLSearchParams();
  params.set("conversationId", input.conversationId);
  params.set("filter", input.filter ?? "entrada");
  params.set("panel", input.panel ?? "chat");
  params.set("detail", input.detail ?? "contato");

  if (input.noteId) {
    params.set("noteId", input.noteId);
  }

  return `/inbox/all${toQuery(params)}`;
}

export function buildCrmTaskHref(taskId: string) {
  const params = new URLSearchParams();
  params.set("section", "tasks");
  params.set("modal", "task");
  params.set("edit", taskId);
  return `/crm${toQuery(params)}`;
}

export function buildCrmCampaignHref(campaignId?: string, step?: number) {
  const params = new URLSearchParams();
  params.set("section", "pipeline");
  params.set("panel", "campaigns");
  params.set("modal", "campaign");
  params.set("step", String(step ?? 0));

  if (campaignId) {
    params.set("edit", campaignId);
  }

  return `/crm${toQuery(params)}`;
}

export function buildCrmGoalHref(goalId?: string) {
  const params = new URLSearchParams();
  params.set("section", "pipeline");
  params.set("panel", "goals");

  if (goalId) {
    params.set("goalId", goalId);
  }

  return `/crm${toQuery(params)}`;
}

export function buildCrmDealHref(dealId: string) {
  const params = new URLSearchParams();
  params.set("section", "pipeline");
  params.set("dealId", dealId);
  return `/crm${toQuery(params)}`;
}

export function buildCrmContactHref(contactId: string) {
  const params = new URLSearchParams();
  params.set("section", "pipeline");
  params.set("panel", "contacts");
  params.set("modal", "contact");
  params.set("edit", contactId);
  return `/crm${toQuery(params)}`;
}

export function buildSettingsAutomationHref(automationId?: string) {
  const params = new URLSearchParams();
  params.set("panel", "automations");
  params.set("modal", "automation");

  if (automationId) {
    params.set("edit", automationId);
  }

  return `/settings${toQuery(params)}`;
}

export function buildSettingsChannelHref(channelId?: string) {
  const params = new URLSearchParams();
  params.set("panel", "channels");
  params.set("modal", "channel");

  if (channelId) {
    params.set("edit", channelId);
  }

  return `/settings${toQuery(params)}`;
}

export function buildSettingsBotHref(botId: string, options?: { edgeId?: string; edit?: boolean }) {
  const params = new URLSearchParams();
  params.set("panel", "bots");
  params.set("botId", botId);

  if (options?.edgeId) {
    params.set("edgeId", options.edgeId);
  }

  if (options?.edit) {
    params.set("modal", "bot");
    params.set("edit", botId);
  }

  return `/settings${toQuery(params)}`;
}

export function buildReportsPanelHref(panel: "dashboards" | "overview" | "productivity" | "assignment" | "interaction" | "presence" | "evaluation" | "calls") {
  const params = new URLSearchParams();
  params.set("panel", panel);
  return `/reports${toQuery(params)}`;
}

export function buildReportsDashboardHref(dashboardId?: string) {
  const params = new URLSearchParams();
  params.set("panel", "dashboards");

  if (dashboardId) {
    params.set("modal", "dashboard");
    params.set("dashboardId", dashboardId);
  }

  return `/reports${toQuery(params)}`;
}