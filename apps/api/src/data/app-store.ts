import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { crmData, inboxData, reportsData, settingsData } from "./mock-database.js";

type InboxState = typeof inboxData;
type CrmState = typeof crmData;
type ReportsState = typeof reportsData;
type SettingsState = typeof settingsData;
type InboxConversation = InboxState["conversations"][number];
type InboxMessage = InboxConversation["messages"][number];
type InboxDetailItemState = {
  id?: string;
  label: string;
  value: string;
  crmContactId?: string;
  crmDealId?: string;
  crmTaskId?: string;
  noteId?: string;
};
type InboxNote = {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  crmContactId: string;
  crmDealId: string;
  crmTaskId: string;
};

interface CrmDealMovementRecord {
  id: string;
  fromLaneId: string;
  fromLaneTitle: string;
  toLaneId: string;
  toLaneTitle: string;
  movedAt: string;
  movedBy: string;
}

interface CrmDealActivityRecord {
  id: string;
  type: "created" | "updated" | "moved";
  label: string;
  description: string;
  occurredAt: string;
  actor: string;
}

interface AppState {
  inboxData: InboxState;
  crmData: CrmState;
  reportsData: ReportsState;
  settingsData: SettingsState;
}

interface CreateContactInput {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  private?: boolean;
}

interface CreateCampaignInput {
  name?: string;
  channel?: string;
  audience?: string;
  message?: string;
  visibility?: string;
}

interface UpdateContactInput {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  private?: boolean;
}

interface UpdateCampaignInput {
  name?: string;
  channel?: string;
  audience?: string;
  message?: string;
  visibility?: string;
  status?: string;
}

interface CreateDashboardInput {
  name?: string;
  description?: string;
  period?: string;
  visibility?: string;
}

interface UpdateDashboardInput {
  name?: string;
  description?: string;
  period?: string;
  visibility?: string;
}

interface UpdateSettingsProfileInput {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  bio?: string;
  theme?: string;
}

interface UpdateSettingsGeneralInput {
  workspaceName?: string;
  legalName?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  dateFormat?: string;
  businessHours?: string;
  status?: string;
}

interface InviteSettingsMemberInput {
  email: string;
  role?: string;
}

interface UpdateSettingsMemberInput {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
}

interface CreateSettingsGroupInput {
  name: string;
}

interface UpdateSettingsGroupInput {
  name: string;
}

interface CreateSettingsCannedResponseInput {
  shortcut: string;
  text: string;
}

interface UpdateSettingsCannedResponseInput {
  shortcut?: string;
  text?: string;
}

interface CreateSettingsCustomFieldInput {
  name: string;
  entity?: string;
  type?: string;
  required?: boolean;
  visibility?: string;
  placeholder?: string;
  options?: string[];
}

interface UpdateSettingsCustomFieldInput {
  name?: string;
  entity?: string;
  type?: string;
  required?: boolean;
  visibility?: string;
  placeholder?: string;
  options?: string[];
}

interface CreateSettingsPermissionInput {
  category: string;
  name: string;
  description?: string;
  admin?: boolean;
  manager?: boolean;
  agent?: boolean;
}

interface UpdateSettingsPermissionInput {
  category?: string;
  name?: string;
  description?: string;
  admin?: boolean;
  manager?: boolean;
  agent?: boolean;
}

interface CreateSettingsAutomationInput {
  name: string;
  trigger?: string;
  condition?: string;
  result?: string;
  status?: string;
}

interface UpdateSettingsAutomationInput {
  name?: string;
  trigger?: string;
  condition?: string;
  result?: string;
  status?: string;
}

interface CreateSettingsChannelInput {
  name: string;
  type?: string;
  status?: string;
  credentialLabel?: string;
  lastSync?: string;
}

interface UpdateSettingsChannelInput {
  name?: string;
  type?: string;
  status?: string;
  credentialLabel?: string;
  lastSync?: string;
}

interface CreateSettingsBotInput {
  name: string;
  status?: string;
  entryChannel?: string;
}

interface UpdateSettingsBotInput {
  name?: string;
  status?: string;
  entryChannel?: string;
}

interface CreateSettingsBotNodeInput {
  kind?: string;
  label: string;
  content?: string;
  x?: number;
  y?: number;
}

interface UpdateSettingsBotNodeInput {
  kind?: string;
  label?: string;
  content?: string;
  x?: number;
  y?: number;
}

interface CreateSettingsBotEdgeInput {
  from: string;
  to: string;
  condition?: string;
}

interface UpdateSettingsBotEdgeInput {
  from?: string;
  to?: string;
  condition?: string;
}

interface CreateCrmLaneInput {
  title: string;
  value?: string;
  probability?: number;
}

interface UpdateCrmLaneInput {
  title?: string;
  value?: string;
  probability?: number;
}

interface CreateCrmTaskInput {
  title: string;
  contact?: string;
  due?: string;
  dueAt?: string;
  priority?: string;
  status?: string;
  assignee?: string;
  dealId?: string;
  dealLabel?: string;
}

interface UpdateCrmTaskInput {
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

interface CreateCrmDealInput {
  laneId: string;
  actor?: string;
  name: string;
  company?: string;
  owner?: string;
  forecast?: string;
  lossReason?: string;
  nextTask?: string;
}

interface UpdateCrmDealInput {
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

interface CreateConversationNoteInput {
  text: string;
  author?: string;
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const stateFilePath = resolve(currentDirectory, "../../.data/app-state.json");
const stateDirectoryPath = dirname(stateFilePath);

let appState: AppState | null = null;
let persistQueue = Promise.resolve();

function cloneData<T>(data: T): T {
  return structuredClone(data);
}

function createInitialState(): AppState {
  return {
    inboxData: cloneData(inboxData),
    crmData: cloneData(crmData),
    reportsData: cloneData(reportsData),
    settingsData: cloneData(settingsData)
  };
}

function mergeById<T extends { id: string }>(currentItems: T[] | undefined, seedItems: T[]) {
  const currentMap = new Map((currentItems ?? []).map((item) => [item.id, item]));

  return seedItems.map((seedItem) => {
    const currentItem = currentMap.get(seedItem.id);

    if (!currentItem) {
      return cloneData(seedItem);
    }

    return {
      ...cloneData(seedItem),
      ...currentItem
    };
  });
}

function ensureSeedState(state: AppState) {
  const initialState = createInitialState();

  state.inboxData.metrics = Array.isArray(state.inboxData.metrics) && state.inboxData.metrics.length
    ? state.inboxData.metrics
    : cloneData(initialState.inboxData.metrics);
  state.inboxData.conversations = mergeById(state.inboxData.conversations, initialState.inboxData.conversations).map(
    (conversation) => ({
      ...conversation,
      crmDealIds: Array.isArray(conversation.crmDealIds) ? conversation.crmDealIds : [],
      crmTaskIds: Array.isArray(conversation.crmTaskIds) ? conversation.crmTaskIds : [],
      notes: Array.isArray(conversation.notes) ? conversation.notes : [],
      detailGroups: conversation.detailGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({ ...item }))
      })),
      messages: conversation.messages.map((message) => ({ ...message }))
    })
  );

  state.crmData.summary = Array.isArray(state.crmData.summary) && state.crmData.summary.length
    ? state.crmData.summary
    : cloneData(initialState.crmData.summary);
  state.crmData.lanes = mergeById(state.crmData.lanes, initialState.crmData.lanes).map((lane) => ({
    ...lane,
    cards: Array.isArray(lane.cards) ? lane.cards.map((card) => ({ ...card })) : []
  }));
  state.crmData.tasks = mergeById(state.crmData.tasks, initialState.crmData.tasks);
  state.crmData.contacts = mergeById(state.crmData.contacts, initialState.crmData.contacts);
  state.crmData.campaigns = mergeById(state.crmData.campaigns, initialState.crmData.campaigns);
  state.crmData.goals = initialState.crmData.goals.map((seedGoal) => {
    const currentGoal = Array.isArray(state.crmData.goals)
      ? state.crmData.goals.find((goal) => ("id" in goal && goal.id === seedGoal.id) || goal.rep === seedGoal.rep)
      : undefined;

    return {
      ...cloneData(seedGoal),
      ...currentGoal
    };
  });

  state.reportsData.sections = Array.isArray(state.reportsData.sections) && state.reportsData.sections.length
    ? state.reportsData.sections
    : cloneData(initialState.reportsData.sections);
  state.reportsData.kpis = Array.isArray(state.reportsData.kpis) && state.reportsData.kpis.length
    ? state.reportsData.kpis
    : cloneData(initialState.reportsData.kpis);
  state.reportsData.chartBars = Array.isArray(state.reportsData.chartBars) && state.reportsData.chartBars.length
    ? state.reportsData.chartBars
    : cloneData(initialState.reportsData.chartBars);
  state.reportsData.dashboards = mergeById(state.reportsData.dashboards, initialState.reportsData.dashboards);
  state.reportsData.teamPerformance = Array.isArray(state.reportsData.teamPerformance) && state.reportsData.teamPerformance.length
    ? state.reportsData.teamPerformance
    : cloneData(initialState.reportsData.teamPerformance);
  state.reportsData.channels = Array.isArray(state.reportsData.channels) && state.reportsData.channels.length
    ? state.reportsData.channels
    : cloneData(initialState.reportsData.channels);

  state.settingsData.sections = Array.isArray(state.settingsData.sections) && state.settingsData.sections.length
    ? state.settingsData.sections
    : cloneData(initialState.settingsData.sections);
  state.settingsData.cards = Array.isArray(state.settingsData.cards) && state.settingsData.cards.length
    ? state.settingsData.cards
    : cloneData(initialState.settingsData.cards);
  state.settingsData.members = mergeById(state.settingsData.members, initialState.settingsData.members);
  state.settingsData.permissions = mergeById(state.settingsData.permissions, initialState.settingsData.permissions);
  state.settingsData.groups = Array.isArray(state.settingsData.groups) && state.settingsData.groups.length
    ? state.settingsData.groups
    : cloneData(initialState.settingsData.groups);
  state.settingsData.customFields = mergeById(state.settingsData.customFields, initialState.settingsData.customFields).map(
    (field) => ({
      ...field,
      options: Array.isArray(field.options) ? [...field.options] : []
    })
  );
  state.settingsData.cannedResponses = mergeById(
    state.settingsData.cannedResponses,
    initialState.settingsData.cannedResponses
  );
  state.settingsData.automations = mergeById(state.settingsData.automations, initialState.settingsData.automations);
  state.settingsData.channels = mergeById(state.settingsData.channels, initialState.settingsData.channels);
  state.settingsData.bots = mergeById(state.settingsData.bots, initialState.settingsData.bots).map((bot) => ({
    ...bot,
    nodes: Array.isArray(bot.nodes) ? bot.nodes.map((node) => ({ ...node })) : [],
    edges: Array.isArray(bot.edges) ? bot.edges.map((edge) => ({ ...edge })) : []
  }));
}

function hydrateState(state: Partial<AppState>) {
  const initialState = createInitialState();

  const hydratedState = {
    inboxData: state.inboxData ? { ...initialState.inboxData, ...state.inboxData } : initialState.inboxData,
    crmData: state.crmData ? { ...initialState.crmData, ...state.crmData } : initialState.crmData,
    reportsData: state.reportsData ? { ...initialState.reportsData, ...state.reportsData } : initialState.reportsData,
    settingsData: state.settingsData ? { ...initialState.settingsData, ...state.settingsData } : initialState.settingsData
  } satisfies AppState;

  ensureSeedState(hydratedState);

  return hydratedState;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function currentDateLabel() {
  return new Date().toLocaleDateString("pt-BR");
}

function currentDateTimeLabel() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function currentTimeLabel() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatTaskDueLabel(dueAt?: string, status?: string) {
  if (!dueAt) {
    return "Sem prazo definido";
  }

  const target = new Date(dueAt);
  if (Number.isNaN(target.getTime())) {
    return "Sem prazo definido";
  }

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.round((startTarget.getTime() - startToday.getTime()) / 86400000);
  const time = target.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (status !== "Concluida" && target.getTime() < now.getTime()) {
    return `Em atraso ${time}`;
  }

  if (diffDays === 0) {
    return `Hoje ${time}`;
  }

  if (diffDays === 1) {
    return `Amanha ${time}`;
  }

  if (diffDays === -1) {
    return `Ontem ${time}`;
  }

  return `${target.toLocaleDateString("pt-BR")} ${time}`;
}

function parseLegacyDueLabel(due?: string) {
  if (!due) {
    return undefined;
  }

  const normalized = due.trim().toLowerCase();
  const now = new Date();
  const match = normalized.match(/(\d{1,2}):(\d{2})/);
  const hours = match ? Number(match[1]) : 9;
  const minutes = match ? Number(match[2]) : 0;
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

  if (normalized.startsWith("amanha")) {
    base.setDate(base.getDate() + 1);
  } else if (normalized.startsWith("ontem") || normalized.includes("atras")) {
    base.setDate(base.getDate() - 1);
  }

  return base.toISOString();
}

function parseCurrencyLikeValue(value: string) {
  const normalized = value.toLowerCase().replace(/r\$/g, "").trim();
  const numberMatch = normalized.match(/[\d.,]+/);

  if (!numberMatch) {
    return 0;
  }

  const numericBase = Number(numberMatch[0].replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(numericBase)) {
    return 0;
  }

  if (normalized.includes("mi")) {
    return numericBase * 1_000_000;
  }

  if (normalized.includes("mil")) {
    return numericBase * 1_000;
  }

  return numericBase;
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value).replace(/\u00a0/g, " ");
}

function calculateWeightedValue(forecast: string, probability: number) {
  const numericForecast = parseCurrencyLikeValue(forecast);
  return formatCompactCurrency(numericForecast * (probability / 100));
}

function clampPosition(position: number, max: number) {
  return Math.max(0, Math.min(max, Math.trunc(position)));
}

function createCrmMovementEntry(input: {
  fromLaneId: string;
  fromLaneTitle: string;
  toLaneId: string;
  toLaneTitle: string;
  movedBy?: string;
}): CrmDealMovementRecord {
  return {
    id: randomUUID(),
    fromLaneId: input.fromLaneId,
    fromLaneTitle: input.fromLaneTitle,
    toLaneId: input.toLaneId,
    toLaneTitle: input.toLaneTitle,
    movedAt: currentDateTimeLabel(),
    movedBy: input.movedBy?.trim() || "Sistema"
  };
}

function createCrmActivityEntry(input: {
  type: "created" | "updated" | "moved";
  label: string;
  description: string;
  actor?: string;
}): CrmDealActivityRecord {
  return {
    id: randomUUID(),
    type: input.type,
    label: input.label,
    description: input.description,
    occurredAt: currentDateTimeLabel(),
    actor: input.actor?.trim() || "Sistema"
  };
}

function refreshCrmWeightedValues(data: CrmState) {
  data.lanes = data.lanes.map((lane) => ({
    ...lane,
    probability: typeof lane.probability === "number" ? lane.probability : 25,
    cards: lane.cards.map((card) => ({
      ...card,
      movementHistory: Array.isArray(card.movementHistory) ? [...card.movementHistory] : ([] as CrmDealMovementRecord[]),
      activityHistory: Array.isArray(card.activityHistory) ? [...card.activityHistory] : ([] as CrmDealActivityRecord[]),
      weightedValue: calculateWeightedValue(card.forecast, typeof lane.probability === "number" ? lane.probability : 25)
    }))
  }));
}

function refreshInboxMetrics(data: InboxState) {
  const openConversations = data.conversations.filter((conversation) => !conversation.isArchived);
  const mineConversations = openConversations.filter((conversation) => conversation.isMine);
  const criticalCount = openConversations.filter((conversation) => conversation.unread).length;
  const waitingMineCount = mineConversations.filter((conversation) => conversation.status !== "Resolvido").length;

  if (data.metrics[0]) {
    data.metrics[0].value = formatCount(openConversations.length);
    data.metrics[0].helper = `${criticalCount} com SLA critico`;
  }

  if (data.metrics[1]) {
    data.metrics[1].value = formatCount(mineConversations.length);
    data.metrics[1].helper = `${waitingMineCount} aguardando retorno`;
  }
}

function refreshCrmSummary(data: CrmState) {
  data.tasks = data.tasks.map((task) => {
    const linkedDeal = findDealById(data, task.dealId);
    const dueAt = task.dueAt || parseLegacyDueLabel(task.due);

    return {
      ...task,
      contact: task.contact || linkedDeal?.company || "Contato principal",
      dueAt,
      due: formatTaskDueLabel(dueAt, task.status),
      assignee: task.assignee || linkedDeal?.owner || "AC",
      dealLabel: task.dealLabel || linkedDeal?.name || undefined
    };
  });

  const privateContacts = data.contacts.filter((contact) => contact.private).length;
  const activeCampaigns = data.campaigns.filter((campaign) => campaign.status !== "Arquivada").length;
  const openDeals = data.lanes.reduce((total, lane) => total + lane.cards.length, 0);
  const openTasks = data.tasks.filter((task) => task.status !== "Concluida").length;
  const highPriorityTasks = data.tasks.filter((task) => task.priority === "Alta" && task.status !== "Concluida").length;

  refreshCrmWeightedValues(data);

  data.lanes = data.lanes.map((lane) => ({
    ...lane,
    count: lane.cards.length
  }));

  if (data.summary[1]) {
    data.summary[1].value = formatCount(openTasks);
    data.summary[1].helper = `${highPriorityTasks} com prioridade alta`;
  }

  if (data.summary[0]) {
    data.summary[0].helper = `${openDeals} oportunidades abertas`;
  }

  if (data.summary[2]) {
    data.summary[2].value = formatCount(data.contacts.length);
    data.summary[2].helper = `${privateContacts} contatos privados`;
  }

  if (data.summary[3]) {
    data.summary[3].value = String(activeCampaigns).padStart(2, "0");
    data.summary[3].helper = `${activeCampaigns} campanhas prontas ou ativas`;
  }
}

function findDealById(data: CrmState, dealId?: string) {
  if (!dealId) {
    return null;
  }

  for (const lane of data.lanes) {
    const deal = lane.cards.find((card) => card.id === dealId);
    if (deal) {
      return deal;
    }
  }

  return null;
}

function findContactById(data: CrmState, contactId?: string) {
  if (!contactId) {
    return null;
  }

  return data.contacts.find((contact) => contact.id === contactId) ?? null;
}

function findTaskById(data: CrmState, taskId?: string) {
  if (!taskId) {
    return null;
  }

  return data.tasks.find((task) => task.id === taskId) ?? null;
}

function refreshInboxConversations(inbox: InboxState, crm: CrmState) {
  inbox.conversations = inbox.conversations.map((conversation) => {
    const contact = findContactById(crm, conversation.crmContactId);
    const deals = (conversation.crmDealIds ?? [])
      .map((dealId) => findDealById(crm, dealId))
      .filter((deal): deal is NonNullable<ReturnType<typeof findDealById>> => Boolean(deal));
    const tasks = (conversation.crmTaskIds ?? [])
      .map((taskId) => findTaskById(crm, taskId))
      .filter((task): task is NonNullable<ReturnType<typeof findTaskById>> => Boolean(task));

    return {
      ...conversation,
      crmDealIds: Array.isArray(conversation.crmDealIds) ? conversation.crmDealIds : [],
      crmTaskIds: Array.isArray(conversation.crmTaskIds) ? conversation.crmTaskIds : [],
      notes: Array.isArray(conversation.notes) ? conversation.notes : [],
      detailGroups: conversation.detailGroups.map((group) => {
        if (group.title === "Contato") {
          return {
            ...group,
            items: group.items.map((item) => {
              const currentItem = item as InboxDetailItemState;

              if (currentItem.crmContactId !== conversation.crmContactId && currentItem.label !== "ID CRM") {
                return item;
              }

              if (currentItem.label === "Nome") {
                return { ...currentItem, value: contact?.name ?? currentItem.value, crmContactId: conversation.crmContactId };
              }

              if (currentItem.label === "Telefone" || currentItem.label === "Celular") {
                return { ...currentItem, value: contact?.phone ?? currentItem.value, crmContactId: conversation.crmContactId };
              }

              if (currentItem.label === "Email" || currentItem.label === "E-mail") {
                return { ...currentItem, value: contact?.email ?? currentItem.value, crmContactId: conversation.crmContactId };
              }

              if (currentItem.label === "ID CRM") {
                return { ...currentItem, value: conversation.crmContactId ?? currentItem.value, crmContactId: conversation.crmContactId };
              }

              return currentItem;
            })
          };
        }

        if (group.title === "Negociacoes") {
          const fallbackItems = group.items.filter((item) => !(item as InboxDetailItemState).crmDealId);
          const linkedItems = deals.map((deal) => ({
            id: `deal-${deal.id}`,
            label: deal.name,
            value: `${deal.company} • ${deal.forecast}`,
            crmDealId: deal.id
          }));

          return {
            ...group,
            items: [...linkedItems, ...fallbackItems]
          };
        }

        if (group.title === "Tarefas") {
          const fallbackItems = group.items.filter((item) => !(item as InboxDetailItemState).crmTaskId);
          const linkedItems = tasks.map((task) => ({
            id: `task-${task.id}`,
            label: task.title,
            value: `${task.status} • ${task.due}`,
            crmTaskId: task.id,
            crmDealId: task.dealId
          }));

          return {
            ...group,
            items: [...linkedItems, ...fallbackItems]
          };
        }

        if (group.title === "Notas") {
          const fallbackItems = group.items.filter((item) => !(item as InboxDetailItemState).noteId);
          const noteItems = [...conversation.notes]
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .map((note) => ({
              id: `note-${note.id}`,
              label: note.author,
              value: note.text,
              noteId: note.id,
              crmContactId: conversation.crmContactId,
              crmDealId: conversation.crmDealIds?.[0],
              crmTaskId: conversation.crmTaskIds?.[0]
            }));

          return {
            ...group,
            items: [...noteItems, ...fallbackItems]
          };
        }

        return group;
      })
    };
  });
}

export async function createCrmTask(input: CreateCrmTaskInput) {
  const state = await loadState();
  const linkedDeal = findDealById(state.crmData, input.dealId?.trim());
  const nextDueAt = input.dueAt?.trim() || parseLegacyDueLabel(input.due);

  state.crmData.tasks.unshift({
    id: randomUUID(),
    title: input.title.trim(),
    contact: input.contact?.trim() || linkedDeal?.company || "Contato principal",
    dueAt: nextDueAt,
    due: formatTaskDueLabel(nextDueAt, input.status?.trim() || "Aberta"),
    priority: input.priority?.trim() || "Media",
    status: input.status?.trim() || "Aberta",
    assignee: input.assignee?.trim() || linkedDeal?.owner || "AC",
    dealId: input.dealId?.trim() || undefined,
    dealLabel: input.dealLabel?.trim() || linkedDeal?.name || undefined
  });
  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function updateCrmTask(taskId: string, input: UpdateCrmTaskInput) {
  const state = await loadState();
  const taskIndex = state.crmData.tasks.findIndex((task) => task.id === taskId);

  if (taskIndex === -1) {
    return null;
  }

  const currentTask = state.crmData.tasks[taskIndex];
  const nextDealId = typeof input.dealId === "string" ? input.dealId.trim() || undefined : currentTask.dealId;
  const linkedDeal = findDealById(state.crmData, nextDealId);
  const nextStatus = typeof input.status === "string" ? input.status.trim() || currentTask.status : currentTask.status;
  const nextDueAt = typeof input.dueAt === "string"
    ? input.dueAt.trim() || undefined
    : typeof input.due === "string"
      ? parseLegacyDueLabel(input.due)
      : currentTask.dueAt;
  state.crmData.tasks[taskIndex] = {
    ...currentTask,
    ...(typeof input.title === "string" ? { title: input.title.trim() || currentTask.title } : {}),
    ...(typeof input.contact === "string" ? { contact: input.contact.trim() || linkedDeal?.company || currentTask.contact } : {}),
    dueAt: nextDueAt,
    due: formatTaskDueLabel(nextDueAt, nextStatus),
    ...(typeof input.priority === "string" ? { priority: input.priority.trim() || currentTask.priority } : {}),
    status: nextStatus,
    ...(typeof input.assignee === "string" ? { assignee: input.assignee.trim() || linkedDeal?.owner || currentTask.assignee } : {}),
    ...(typeof input.dealId === "string" ? { dealId: input.dealId.trim() || undefined } : {}),
    ...(typeof input.dealLabel === "string" ? { dealLabel: input.dealLabel.trim() || linkedDeal?.name || undefined } : {})
  };
  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function deleteCrmTask(taskId: string) {
  const state = await loadState();
  const nextTasks = state.crmData.tasks.filter((task) => task.id !== taskId);

  if (nextTasks.length === state.crmData.tasks.length) {
    return null;
  }

  state.crmData.tasks = nextTasks;
  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

async function persistState() {
  if (!appState) {
    return;
  }

  await mkdir(stateDirectoryPath, { recursive: true });

  const payload = JSON.stringify(appState, null, 2);
  const tempFilePath = `${stateFilePath}.tmp`;

  await writeFile(tempFilePath, payload, "utf8");
  await rename(tempFilePath, stateFilePath);
}

async function queuePersist() {
  persistQueue = persistQueue.then(() => persistState());
  await persistQueue;
}

async function loadState() {
  if (appState) {
    return appState;
  }

  try {
    const content = await readFile(stateFilePath, "utf8");
    appState = hydrateState(JSON.parse(content) as Partial<AppState>);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;

    if (fileError.code !== "ENOENT") {
      throw error;
    }

    appState = createInitialState();
    await queuePersist();
  }

  refreshInboxMetrics(appState.inboxData);
  refreshCrmSummary(appState.crmData);
  refreshInboxConversations(appState.inboxData, appState.crmData);

  return appState;
}

export async function getInboxData() {
  const state = await loadState();

  return cloneData(state.inboxData);
}

export async function getCrmData() {
  const state = await loadState();

  return cloneData(state.crmData);
}

export async function getReportsData() {
  const state = await loadState();

  return cloneData(state.reportsData);
}

export async function getSettingsData() {
  const state = await loadState();

  return cloneData(state.settingsData);
}

export async function markConversationAsRead(conversationId: string) {
  return updateConversation(conversationId, (conversation) => ({
    ...conversation,
    unread: false
  }));
}

export async function updateConversation(
  conversationId: string,
  updater: (conversation: InboxConversation) => InboxConversation
) {
  const state = await loadState();
  const conversationIndex = state.inboxData.conversations.findIndex((conversation) => conversation.id === conversationId);

  if (conversationIndex === -1) {
    return null;
  }

  const currentConversation = state.inboxData.conversations[conversationIndex];
  state.inboxData.conversations[conversationIndex] = updater(cloneData(currentConversation));
  refreshInboxMetrics(state.inboxData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.inboxData);
}

export async function appendConversationMessage(
  conversationId: string,
  input: { text: string; type: InboxMessage["type"] }
) {
  return updateConversation(conversationId, (conversation) => ({
    ...conversation,
    unread: false,
    snippet: input.text,
    time: "agora",
    messages: [
      ...conversation.messages,
      {
        id: `${conversation.id}-${Date.now()}`,
        author: "agent",
        type: input.type,
        text: input.text,
        time: currentTimeLabel()
      }
    ]
  }));
}

export async function appendConversationNote(conversationId: string, input: CreateConversationNoteInput) {
  return updateConversation(conversationId, (conversation) => {
    const nextNote: InboxNote = {
      id: randomUUID(),
      text: input.text.trim(),
      author: input.author?.trim() || "AC",
      createdAt: new Date().toISOString(),
      crmContactId: conversation.crmContactId ?? "",
      crmDealId: conversation.crmDealIds?.[0] ?? "",
      crmTaskId: conversation.crmTaskIds?.[0] ?? ""
    };

    return {
      ...conversation,
      notes: [nextNote, ...(conversation.notes ?? [])]
    };
  });
}

export async function createCrmContact(input: CreateContactInput) {
  const state = await loadState();
  const nextContact = {
    id: randomUUID(),
    name: input.name.trim(),
    createdAt: currentDateLabel(),
    phone: input.phone?.trim() || "Nao informado",
    email: input.email?.trim() || "Nao informado",
    notes: input.notes?.trim() || "",
    private: Boolean(input.private)
  };

  state.crmData.contacts.unshift(nextContact);
  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function updateCrmContact(contactId: string, input: UpdateContactInput) {
  const state = await loadState();
  const contactIndex = state.crmData.contacts.findIndex((contact) => contact.id === contactId);

  if (contactIndex === -1) {
    return null;
  }

  const currentContact = state.crmData.contacts[contactIndex];
  state.crmData.contacts[contactIndex] = {
    ...currentContact,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentContact.name } : {}),
    ...(typeof input.email === "string" ? { email: input.email.trim() || currentContact.email } : {}),
    ...(typeof input.phone === "string" ? { phone: input.phone.trim() || currentContact.phone } : {}),
    ...(typeof input.notes === "string" ? { notes: input.notes.trim() } : {}),
    ...(typeof input.private === "boolean" ? { private: input.private } : {})
  };

  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function deleteCrmContact(contactId: string) {
  const state = await loadState();
  const nextContacts = state.crmData.contacts.filter((contact) => contact.id !== contactId);

  if (nextContacts.length === state.crmData.contacts.length) {
    return null;
  }

  state.crmData.contacts = nextContacts;
  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function createCrmCampaign(input: CreateCampaignInput) {
  const state = await loadState();
  const nextCampaign = {
    id: randomUUID(),
    name: input.name?.trim() || "Campanha sem nome",
    channel: input.channel?.trim() || "WhatsApp",
    audience: input.audience?.trim() || "Audiencia ampla",
    message: input.message?.trim() || "Mensagem nao informada",
    visibility: input.visibility?.trim() || "Publico",
    status: "Pronta",
    createdAt: currentDateLabel()
  };

  state.crmData.campaigns.unshift(nextCampaign);
  refreshCrmSummary(state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function updateCrmCampaign(campaignId: string, input: UpdateCampaignInput) {
  const state = await loadState();
  const campaignIndex = state.crmData.campaigns.findIndex((campaign) => campaign.id === campaignId);

  if (campaignIndex === -1) {
    return null;
  }

  const currentCampaign = state.crmData.campaigns[campaignIndex];
  state.crmData.campaigns[campaignIndex] = {
    ...currentCampaign,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentCampaign.name } : {}),
    ...(typeof input.channel === "string" ? { channel: input.channel.trim() || currentCampaign.channel } : {}),
    ...(typeof input.audience === "string" ? { audience: input.audience.trim() || currentCampaign.audience } : {}),
    ...(typeof input.message === "string" ? { message: input.message.trim() || currentCampaign.message } : {}),
    ...(typeof input.visibility === "string" ? { visibility: input.visibility.trim() || currentCampaign.visibility } : {}),
    ...(typeof input.status === "string" ? { status: input.status.trim() || currentCampaign.status } : {})
  };

  refreshCrmSummary(state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function deleteCrmCampaign(campaignId: string) {
  const state = await loadState();
  const nextCampaigns = state.crmData.campaigns.filter((campaign) => campaign.id !== campaignId);

  if (nextCampaigns.length === state.crmData.campaigns.length) {
    return null;
  }

  state.crmData.campaigns = nextCampaigns;
  refreshCrmSummary(state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function createReportsDashboard(input: CreateDashboardInput) {
  const state = await loadState();
  const nextDashboard = {
    id: randomUUID(),
    name: input.name?.trim() || "Dashboard sem nome",
    description: input.description?.trim() || "Sem descricao adicional.",
    period: input.period?.trim() || "Ultimos 7 dias",
    visibility: input.visibility?.trim() || "Privado",
    createdAt: currentDateLabel()
  };

  state.reportsData.dashboards.unshift(nextDashboard);
  await queuePersist();

  return cloneData(state.reportsData);
}

export async function updateReportsDashboard(dashboardId: string, input: UpdateDashboardInput) {
  const state = await loadState();
  const dashboardIndex = state.reportsData.dashboards.findIndex((dashboard) => dashboard.id === dashboardId);

  if (dashboardIndex === -1) {
    return null;
  }

  const currentDashboard = state.reportsData.dashboards[dashboardIndex];
  state.reportsData.dashboards[dashboardIndex] = {
    ...currentDashboard,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentDashboard.name } : {}),
    ...(typeof input.description === "string" ? { description: input.description.trim() || currentDashboard.description } : {}),
    ...(typeof input.period === "string" ? { period: input.period.trim() || currentDashboard.period } : {}),
    ...(typeof input.visibility === "string" ? { visibility: input.visibility.trim() || currentDashboard.visibility } : {})
  };

  await queuePersist();

  return cloneData(state.reportsData);
}

export async function deleteReportsDashboard(dashboardId: string) {
  const state = await loadState();
  const nextDashboards = state.reportsData.dashboards.filter((dashboard) => dashboard.id !== dashboardId);

  if (nextDashboards.length === state.reportsData.dashboards.length) {
    return null;
  }

  state.reportsData.dashboards = nextDashboards;
  await queuePersist();

  return cloneData(state.reportsData);
}

export async function updateSettingsProfile(input: UpdateSettingsProfileInput) {
  const state = await loadState();

  state.settingsData.profile = {
    ...state.settingsData.profile,
    ...(typeof input.name === "string" ? { name: input.name.trim() || state.settingsData.profile.name } : {}),
    ...(typeof input.email === "string" ? { email: input.email.trim() || state.settingsData.profile.email } : {}),
    ...(typeof input.phone === "string" ? { phone: input.phone.trim() || state.settingsData.profile.phone } : {}),
    ...(typeof input.timezone === "string" ? { timezone: input.timezone.trim() || state.settingsData.profile.timezone } : {}),
    ...(typeof input.bio === "string" ? { bio: input.bio.trim() } : {}),
    ...(typeof input.theme === "string" ? { theme: input.theme.trim() || state.settingsData.profile.theme } : {})
  };

  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsGeneral(input: UpdateSettingsGeneralInput) {
  const state = await loadState();

  state.settingsData.general = {
    ...state.settingsData.general,
    ...(typeof input.workspaceName === "string" ? { workspaceName: input.workspaceName.trim() || state.settingsData.general.workspaceName } : {}),
    ...(typeof input.legalName === "string" ? { legalName: input.legalName.trim() || state.settingsData.general.legalName } : {}),
    ...(typeof input.timezone === "string" ? { timezone: input.timezone.trim() || state.settingsData.general.timezone } : {}),
    ...(typeof input.currency === "string" ? { currency: input.currency.trim() || state.settingsData.general.currency } : {}),
    ...(typeof input.language === "string" ? { language: input.language.trim() || state.settingsData.general.language } : {}),
    ...(typeof input.dateFormat === "string" ? { dateFormat: input.dateFormat.trim() || state.settingsData.general.dateFormat } : {}),
    ...(typeof input.businessHours === "string" ? { businessHours: input.businessHours.trim() || state.settingsData.general.businessHours } : {}),
    ...(typeof input.status === "string" ? { status: input.status.trim() || state.settingsData.general.status } : {})
  };

  await queuePersist();

  return cloneData(state.settingsData);
}

export async function inviteSettingsMember(input: InviteSettingsMemberInput) {
  const state = await loadState();
  const email = input.email.trim().toLowerCase();
  const localName = email.split("@")[0] ?? email;
  const nextMember = {
    id: randomUUID(),
    name: localName
      .split(/[._-]/g)
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(" "),
    role: input.role?.trim() || "Agent",
    status: "Convidado",
    email
  };

  state.settingsData.members.unshift(nextMember);
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsMember(memberId: string, input: UpdateSettingsMemberInput) {
  const state = await loadState();
  const memberIndex = state.settingsData.members.findIndex((member) => member.id === memberId);

  if (memberIndex === -1) {
    return null;
  }

  const currentMember = state.settingsData.members[memberIndex];
  state.settingsData.members[memberIndex] = {
    ...currentMember,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentMember.name } : {}),
    ...(typeof input.email === "string" ? { email: input.email.trim().toLowerCase() || currentMember.email } : {}),
    ...(typeof input.role === "string" ? { role: input.role.trim() || currentMember.role } : {}),
    ...(typeof input.status === "string" ? { status: input.status.trim() || currentMember.status } : {})
  };

  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsMember(memberId: string) {
  const state = await loadState();
  const nextMembers = state.settingsData.members.filter((member) => member.id !== memberId);

  if (nextMembers.length === state.settingsData.members.length) {
    return null;
  }

  state.settingsData.members = nextMembers;
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsGroup(input: CreateSettingsGroupInput) {
  const state = await loadState();
  const groupName = input.name.trim();

  if (!state.settingsData.groups.includes(groupName)) {
    state.settingsData.groups.push(groupName);
    await queuePersist();
  }

  return cloneData(state.settingsData);
}

export async function updateSettingsGroup(groupName: string, input: UpdateSettingsGroupInput) {
  const state = await loadState();
  const currentGroupName = decodeURIComponent(groupName).trim();
  const nextGroupName = input.name.trim();
  const groupIndex = state.settingsData.groups.findIndex((group) => group === currentGroupName);

  if (groupIndex === -1) {
    return null;
  }

  state.settingsData.groups[groupIndex] = nextGroupName || currentGroupName;
  state.settingsData.groups = Array.from(new Set(state.settingsData.groups.filter(Boolean)));
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsGroup(groupName: string) {
  const state = await loadState();
  const currentGroupName = decodeURIComponent(groupName).trim();
  const nextGroups = state.settingsData.groups.filter((group) => group !== currentGroupName);

  if (nextGroups.length === state.settingsData.groups.length) {
    return null;
  }

  state.settingsData.groups = nextGroups;
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsCannedResponse(input: CreateSettingsCannedResponseInput) {
  const state = await loadState();

  state.settingsData.cannedResponses.unshift({
    id: randomUUID(),
    shortcut: input.shortcut.trim(),
    text: input.text.trim()
  });
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsCustomField(input: CreateSettingsCustomFieldInput) {
  const state = await loadState();

  state.settingsData.customFields.unshift({
    id: randomUUID(),
    name: input.name.trim(),
    entity: input.entity?.trim() || "Contato",
    type: input.type?.trim() || "Texto",
    required: Boolean(input.required),
    visibility: input.visibility?.trim() || "Todos",
    placeholder: input.placeholder?.trim() || "",
    options: Array.isArray(input.options) ? input.options.map((option) => option.trim()).filter(Boolean) : []
  });
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsCustomField(fieldId: string, input: UpdateSettingsCustomFieldInput) {
  const state = await loadState();
  const fieldIndex = state.settingsData.customFields.findIndex((field) => field.id === fieldId);

  if (fieldIndex === -1) {
    return null;
  }

  const currentField = state.settingsData.customFields[fieldIndex];
  state.settingsData.customFields[fieldIndex] = {
    ...currentField,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentField.name } : {}),
    ...(typeof input.entity === "string" ? { entity: input.entity.trim() || currentField.entity } : {}),
    ...(typeof input.type === "string" ? { type: input.type.trim() || currentField.type } : {}),
    ...(typeof input.required === "boolean" ? { required: input.required } : {}),
    ...(typeof input.visibility === "string" ? { visibility: input.visibility.trim() || currentField.visibility } : {}),
    ...(typeof input.placeholder === "string" ? { placeholder: input.placeholder.trim() } : {}),
    ...(Array.isArray(input.options) ? { options: input.options.map((option) => option.trim()).filter(Boolean) } : {})
  };
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsCustomField(fieldId: string) {
  const state = await loadState();
  const nextFields = state.settingsData.customFields.filter((field) => field.id !== fieldId);

  if (nextFields.length === state.settingsData.customFields.length) {
    return null;
  }

  state.settingsData.customFields = nextFields;
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsCannedResponse(responseId: string, input: UpdateSettingsCannedResponseInput) {
  const state = await loadState();
  const responseIndex = state.settingsData.cannedResponses.findIndex((response) => response.id === responseId);

  if (responseIndex === -1) {
    return null;
  }

  const currentResponse = state.settingsData.cannedResponses[responseIndex];
  state.settingsData.cannedResponses[responseIndex] = {
    ...currentResponse,
    ...(typeof input.shortcut === "string" ? { shortcut: input.shortcut.trim() || currentResponse.shortcut } : {}),
    ...(typeof input.text === "string" ? { text: input.text.trim() || currentResponse.text } : {})
  };
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsCannedResponse(responseId: string) {
  const state = await loadState();
  const nextResponses = state.settingsData.cannedResponses.filter((response) => response.id !== responseId);

  if (nextResponses.length === state.settingsData.cannedResponses.length) {
    return null;
  }

  state.settingsData.cannedResponses = nextResponses;
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsPermission(input: CreateSettingsPermissionInput) {
  const state = await loadState();

  state.settingsData.permissions.unshift({
    id: randomUUID(),
    category: input.category.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || "Permissao operacional personalizada.",
    admin: Boolean(input.admin),
    manager: Boolean(input.manager),
    agent: Boolean(input.agent)
  });
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsPermission(permissionId: string, input: UpdateSettingsPermissionInput) {
  const state = await loadState();
  const permissionIndex = state.settingsData.permissions.findIndex((permission) => permission.id === permissionId);

  if (permissionIndex === -1) {
    return null;
  }

  const currentPermission = state.settingsData.permissions[permissionIndex];
  state.settingsData.permissions[permissionIndex] = {
    ...currentPermission,
    ...(typeof input.category === "string" ? { category: input.category.trim() || currentPermission.category } : {}),
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentPermission.name } : {}),
    ...(typeof input.description === "string" ? { description: input.description.trim() || currentPermission.description } : {}),
    ...(typeof input.admin === "boolean" ? { admin: input.admin } : {}),
    ...(typeof input.manager === "boolean" ? { manager: input.manager } : {}),
    ...(typeof input.agent === "boolean" ? { agent: input.agent } : {})
  };
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsPermission(permissionId: string) {
  const state = await loadState();
  const nextPermissions = state.settingsData.permissions.filter((permission) => permission.id !== permissionId);

  if (nextPermissions.length === state.settingsData.permissions.length) {
    return null;
  }

  state.settingsData.permissions = nextPermissions;
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsAutomation(input: CreateSettingsAutomationInput) {
  const state = await loadState();

  state.settingsData.automations.unshift({
    id: randomUUID(),
    name: input.name.trim(),
    trigger: input.trigger?.trim() || "Conversa iniciada",
    condition: input.condition?.trim() || "Sem condicao adicional",
    result: input.result?.trim() || "Nenhuma acao configurada",
    status: input.status?.trim() || "Rascunho"
  });
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsAutomation(automationId: string, input: UpdateSettingsAutomationInput) {
  const state = await loadState();
  const automationIndex = state.settingsData.automations.findIndex((automation) => automation.id === automationId);

  if (automationIndex === -1) {
    return null;
  }

  const currentAutomation = state.settingsData.automations[automationIndex];
  state.settingsData.automations[automationIndex] = {
    ...currentAutomation,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentAutomation.name } : {}),
    ...(typeof input.trigger === "string" ? { trigger: input.trigger.trim() || currentAutomation.trigger } : {}),
    ...(typeof input.condition === "string" ? { condition: input.condition.trim() || currentAutomation.condition } : {}),
    ...(typeof input.result === "string" ? { result: input.result.trim() || currentAutomation.result } : {}),
    ...(typeof input.status === "string" ? { status: input.status.trim() || currentAutomation.status } : {})
  };
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsAutomation(automationId: string) {
  const state = await loadState();
  const nextAutomations = state.settingsData.automations.filter((automation) => automation.id !== automationId);

  if (nextAutomations.length === state.settingsData.automations.length) {
    return null;
  }

  state.settingsData.automations = nextAutomations;
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsChannel(input: CreateSettingsChannelInput) {
  const state = await loadState();

  state.settingsData.channels.unshift({
    id: randomUUID(),
    name: input.name.trim(),
    type: input.type?.trim() || "Integracao personalizada",
    status: input.status?.trim() || "Pendente",
    credentialLabel: input.credentialLabel?.trim() || "Credencial nao configurada",
    lastSync: input.lastSync?.trim() || "Nunca"
  });
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsChannel(channelId: string, input: UpdateSettingsChannelInput) {
  const state = await loadState();
  const channelIndex = state.settingsData.channels.findIndex((channel) => channel.id === channelId);

  if (channelIndex === -1) {
    return null;
  }

  const currentChannel = state.settingsData.channels[channelIndex];
  state.settingsData.channels[channelIndex] = {
    ...currentChannel,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentChannel.name } : {}),
    ...(typeof input.type === "string" ? { type: input.type.trim() || currentChannel.type } : {}),
    ...(typeof input.status === "string" ? { status: input.status.trim() || currentChannel.status } : {}),
    ...(typeof input.credentialLabel === "string" ? { credentialLabel: input.credentialLabel.trim() || currentChannel.credentialLabel } : {}),
    ...(typeof input.lastSync === "string" ? { lastSync: input.lastSync.trim() || currentChannel.lastSync } : {})
  };
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsChannel(channelId: string) {
  const state = await loadState();
  const nextChannels = state.settingsData.channels.filter((channel) => channel.id !== channelId);

  if (nextChannels.length === state.settingsData.channels.length) {
    return null;
  }

  state.settingsData.channels = nextChannels;
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsBot(input: CreateSettingsBotInput) {
  const state = await loadState();

  state.settingsData.bots.unshift({
    id: randomUUID(),
    name: input.name.trim(),
    status: input.status?.trim() || "Rascunho",
    entryChannel: input.entryChannel?.trim() || "WhatsApp",
    updatedAt: currentDateTimeLabel(),
    nodes: [
      { id: randomUUID(), kind: "start", label: "Inicio", content: "Ponto de entrada do bot.", x: 40, y: 60 },
      { id: randomUUID(), kind: "end", label: "Fim", content: "Encerramento do fluxo.", x: 420, y: 220 }
    ],
    edges: []
  });
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsBot(botId: string, input: UpdateSettingsBotInput) {
  const state = await loadState();
  const botIndex = state.settingsData.bots.findIndex((bot) => bot.id === botId);

  if (botIndex === -1) {
    return null;
  }

  const currentBot = state.settingsData.bots[botIndex];
  state.settingsData.bots[botIndex] = {
    ...currentBot,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentBot.name } : {}),
    ...(typeof input.status === "string" ? { status: input.status.trim() || currentBot.status } : {}),
    ...(typeof input.entryChannel === "string" ? { entryChannel: input.entryChannel.trim() || currentBot.entryChannel } : {}),
    updatedAt: currentDateTimeLabel()
  };
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsBot(botId: string) {
  const state = await loadState();
  const nextBots = state.settingsData.bots.filter((bot) => bot.id !== botId);

  if (nextBots.length === state.settingsData.bots.length) {
    return null;
  }

  state.settingsData.bots = nextBots;
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsBotNode(botId: string, input: CreateSettingsBotNodeInput) {
  const state = await loadState();
  const botIndex = state.settingsData.bots.findIndex((bot) => bot.id === botId);

  if (botIndex === -1) {
    return null;
  }

  const bot = state.settingsData.bots[botIndex];
  const nextNodeId = randomUUID();
  bot.nodes.push({
    id: nextNodeId,
    kind: input.kind?.trim() || "message",
    label: input.label.trim(),
    content: input.content?.trim() || "",
    x: typeof input.x === "number" ? input.x : 180 + bot.nodes.length * 80,
    y: typeof input.y === "number" ? input.y : 100 + bot.nodes.length * 24
  });

  const previousNode = bot.nodes.at(-2);
  if (previousNode) {
    bot.edges.push({
      id: randomUUID(),
      from: previousNode.id,
      to: nextNodeId,
      condition: "Sequencia"
    });
  }

  bot.updatedAt = currentDateTimeLabel();
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function updateSettingsBotNode(botId: string, nodeId: string, input: UpdateSettingsBotNodeInput) {
  const state = await loadState();
  const botIndex = state.settingsData.bots.findIndex((bot) => bot.id === botId);

  if (botIndex === -1) {
    return null;
  }

  const nodeIndex = state.settingsData.bots[botIndex].nodes.findIndex((node) => node.id === nodeId);

  if (nodeIndex === -1) {
    return null;
  }

  const currentNode = state.settingsData.bots[botIndex].nodes[nodeIndex];
  state.settingsData.bots[botIndex].nodes[nodeIndex] = {
    ...currentNode,
    ...(typeof input.kind === "string" ? { kind: input.kind.trim() || currentNode.kind } : {}),
    ...(typeof input.label === "string" ? { label: input.label.trim() || currentNode.label } : {}),
    ...(typeof input.content === "string" ? { content: input.content.trim() || currentNode.content } : {}),
    ...(typeof input.x === "number" ? { x: input.x } : {}),
    ...(typeof input.y === "number" ? { y: input.y } : {})
  };
  state.settingsData.bots[botIndex].updatedAt = currentDateTimeLabel();
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createSettingsBotEdge(botId: string, input: CreateSettingsBotEdgeInput) {
  const state = await loadState();
  const botIndex = state.settingsData.bots.findIndex((bot) => bot.id === botId);

  if (botIndex === -1) {
    return null;
  }

  const bot = state.settingsData.bots[botIndex];
  const edgeExists = bot.edges.some((edge) => edge.from === input.from && edge.to === input.to);

  if (!edgeExists) {
    bot.edges.push({
      id: randomUUID(),
      from: input.from,
      to: input.to,
      condition: input.condition?.trim() || "Sequencia"
    });
    bot.updatedAt = currentDateTimeLabel();
    await queuePersist();
  }

  return cloneData(state.settingsData);
}

export async function updateSettingsBotEdge(botId: string, edgeId: string, input: UpdateSettingsBotEdgeInput) {
  const state = await loadState();
  const botIndex = state.settingsData.bots.findIndex((bot) => bot.id === botId);

  if (botIndex === -1) {
    return null;
  }

  const edgeIndex = state.settingsData.bots[botIndex].edges.findIndex((edge) => edge.id === edgeId);

  if (edgeIndex === -1) {
    return null;
  }

  const currentEdge = state.settingsData.bots[botIndex].edges[edgeIndex];
  state.settingsData.bots[botIndex].edges[edgeIndex] = {
    ...currentEdge,
    ...(typeof input.from === "string" ? { from: input.from } : {}),
    ...(typeof input.to === "string" ? { to: input.to } : {}),
    ...(typeof input.condition === "string" ? { condition: input.condition.trim() || currentEdge.condition } : {})
  };
  state.settingsData.bots[botIndex].updatedAt = currentDateTimeLabel();
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsBotEdge(botId: string, edgeId: string) {
  const state = await loadState();
  const botIndex = state.settingsData.bots.findIndex((bot) => bot.id === botId);

  if (botIndex === -1) {
    return null;
  }

  const nextEdges = state.settingsData.bots[botIndex].edges.filter((edge) => edge.id !== edgeId);

  if (nextEdges.length === state.settingsData.bots[botIndex].edges.length) {
    return null;
  }

  state.settingsData.bots[botIndex].edges = nextEdges;
  state.settingsData.bots[botIndex].updatedAt = currentDateTimeLabel();
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function deleteSettingsBotNode(botId: string, nodeId: string) {
  const state = await loadState();
  const botIndex = state.settingsData.bots.findIndex((bot) => bot.id === botId);

  if (botIndex === -1) {
    return null;
  }

  const bot = state.settingsData.bots[botIndex];
  const nextNodes = bot.nodes.filter((node) => node.id !== nodeId);

  if (nextNodes.length === bot.nodes.length) {
    return null;
  }

  bot.nodes = nextNodes;
  bot.edges = bot.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
  bot.updatedAt = currentDateTimeLabel();
  await queuePersist();

  return cloneData(state.settingsData);
}

export async function createCrmLane(input: CreateCrmLaneInput) {
  const state = await loadState();

  state.crmData.lanes.push({
    id: randomUUID(),
    title: input.title.trim(),
    value: input.value?.trim() || "Nova etapa comercial",
    probability: typeof input.probability === "number" ? Math.max(0, Math.min(100, input.probability)) : 25,
    count: 0,
    cards: []
  });
  refreshCrmSummary(state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function updateCrmLane(laneId: string, input: UpdateCrmLaneInput) {
  const state = await loadState();
  const laneIndex = state.crmData.lanes.findIndex((lane) => lane.id === laneId);

  if (laneIndex === -1) {
    return null;
  }

  const currentLane = state.crmData.lanes[laneIndex];
  state.crmData.lanes[laneIndex] = {
    ...currentLane,
    ...(typeof input.title === "string" ? { title: input.title.trim() || currentLane.title } : {}),
    ...(typeof input.value === "string" ? { value: input.value.trim() || currentLane.value } : {}),
    ...(typeof input.probability === "number" ? { probability: Math.max(0, Math.min(100, input.probability)) } : {})
  };
  refreshCrmSummary(state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function deleteCrmLane(laneId: string) {
  const state = await loadState();
  const nextLanes = state.crmData.lanes.filter((lane) => lane.id !== laneId);

  if (nextLanes.length === state.crmData.lanes.length) {
    return null;
  }

  state.crmData.lanes = nextLanes;
  refreshCrmSummary(state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function createCrmDeal(input: CreateCrmDealInput) {
  const state = await loadState();
  const laneIndex = state.crmData.lanes.findIndex((lane) => lane.id === input.laneId);

  if (laneIndex === -1) {
    return null;
  }

  state.crmData.lanes[laneIndex].cards.unshift({
    id: randomUUID(),
    name: input.name.trim(),
    company: input.company?.trim() || "Contato principal",
    owner: input.owner?.trim() || "AC",
    forecast: input.forecast?.trim() || "R$ 0",
    lossReason: input.lossReason?.trim() || "",
    nextTask: input.nextTask?.trim() || "Sem proxima tarefa",
    movementHistory: [] as CrmDealMovementRecord[],
    activityHistory: [
      createCrmActivityEntry({
        type: "created",
        label: "Deal criado",
        description: `Oportunidade criada na etapa ${state.crmData.lanes[laneIndex].title}.`,
        actor: input.actor
      })
    ],
    weightedValue: calculateWeightedValue(input.forecast?.trim() || "R$ 0", state.crmData.lanes[laneIndex].probability)
  });
  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function updateCrmDeal(dealId: string, input: UpdateCrmDealInput) {
  const state = await loadState();
  let sourceLaneIndex = -1;
  let sourceDealIndex = -1;

  state.crmData.lanes.some((lane, laneIndex) => {
    const dealIndex = lane.cards.findIndex((card) => card.id === dealId);
    if (dealIndex !== -1) {
      sourceLaneIndex = laneIndex;
      sourceDealIndex = dealIndex;
      return true;
    }

    return false;
  });

  if (sourceLaneIndex === -1 || sourceDealIndex === -1) {
    return null;
  }

  const sourceLane = state.crmData.lanes[sourceLaneIndex];
  const currentDeal = sourceLane.cards[sourceDealIndex];
  const targetLaneId = typeof input.laneId === "string" && input.laneId.trim() ? input.laneId : sourceLane.id;
  const targetLaneIndex = state.crmData.lanes.findIndex((lane) => lane.id === targetLaneId);

  if (targetLaneIndex === -1) {
    return null;
  }

  const targetLane = state.crmData.lanes[targetLaneIndex];
  const isLaneMove = targetLane.id !== sourceLane.id;
  const nextDeal: typeof currentDeal & { movementHistory: CrmDealMovementRecord[]; activityHistory: CrmDealActivityRecord[] } = {
    ...currentDeal,
    ...(typeof input.name === "string" ? { name: input.name.trim() || currentDeal.name } : {}),
    ...(typeof input.company === "string" ? { company: input.company.trim() || currentDeal.company } : {}),
    ...(typeof input.owner === "string" ? { owner: input.owner.trim() || currentDeal.owner } : {}),
    ...(typeof input.forecast === "string" ? { forecast: input.forecast.trim() || currentDeal.forecast } : {}),
    ...(typeof input.lossReason === "string" ? { lossReason: input.lossReason.trim() } : {}),
    ...(typeof input.nextTask === "string" ? { nextTask: input.nextTask.trim() || currentDeal.nextTask } : {}),
    movementHistory: Array.isArray(currentDeal.movementHistory) ? [...currentDeal.movementHistory] : ([] as CrmDealMovementRecord[]),
    activityHistory: Array.isArray(currentDeal.activityHistory) ? [...currentDeal.activityHistory] : ([] as CrmDealActivityRecord[])
  };

  const changes: string[] = [];
  if (typeof input.name === "string" && input.name.trim() && input.name.trim() !== currentDeal.name) {
    changes.push(`nome para ${input.name.trim()}`);
  }
  if (typeof input.company === "string" && input.company.trim() && input.company.trim() !== currentDeal.company) {
    changes.push(`empresa/contato para ${input.company.trim()}`);
  }
  if (typeof input.owner === "string" && input.owner.trim() && input.owner.trim() !== currentDeal.owner) {
    changes.push(`responsavel para ${input.owner.trim()}`);
  }
  if (typeof input.forecast === "string" && input.forecast.trim() && input.forecast.trim() !== currentDeal.forecast) {
    changes.push(`forecast para ${input.forecast.trim()}`);
  }
  if (typeof input.nextTask === "string" && input.nextTask.trim() !== (currentDeal.nextTask ?? "")) {
    changes.push(`proxima tarefa para ${input.nextTask.trim() || "Sem proxima tarefa"}`);
  }
  if (typeof input.lossReason === "string" && input.lossReason.trim() !== (currentDeal.lossReason ?? "")) {
    changes.push(`motivo de perda ${input.lossReason.trim() ? `definido como ${input.lossReason.trim()}` : "limpo"}`);
  }

  if (isLaneMove) {
    nextDeal.movementHistory.unshift(
      createCrmMovementEntry({
        fromLaneId: sourceLane.id,
        fromLaneTitle: sourceLane.title,
        toLaneId: targetLane.id,
        toLaneTitle: targetLane.title,
        movedBy: input.movedBy
      })
    );
    nextDeal.activityHistory.unshift(
      createCrmActivityEntry({
        type: "moved",
        label: "Etapa alterada",
        description: `${sourceLane.title} → ${targetLane.title}`,
        actor: input.movedBy ?? input.actor
      })
    );
  }

  if (changes.length > 0) {
    nextDeal.activityHistory.unshift(
      createCrmActivityEntry({
        type: "updated",
        label: "Deal atualizado",
        description: changes.join("; "),
        actor: input.actor
      })
    );
  }

  if (!isLaneMove && typeof input.position !== "number") {
    state.crmData.lanes[sourceLaneIndex].cards[sourceDealIndex] = nextDeal;
  } else {
    const sourceCards = state.crmData.lanes[sourceLaneIndex].cards;
    sourceCards.splice(sourceDealIndex, 1);

    const rawInsertAt = typeof input.position === "number"
      ? clampPosition(input.position, state.crmData.lanes[targetLaneIndex].cards.length)
      : 0;
    const insertAt = !isLaneMove && sourceDealIndex < rawInsertAt ? rawInsertAt - 1 : rawInsertAt;

    state.crmData.lanes[targetLaneIndex].cards.splice(insertAt, 0, nextDeal);
  }

  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}

export async function deleteCrmDeal(dealId: string) {
  const state = await loadState();
  let removed = false;

  state.crmData.lanes = state.crmData.lanes.map((lane) => {
    const nextCards = lane.cards.filter((card) => card.id !== dealId);
    if (nextCards.length !== lane.cards.length) {
      removed = true;
    }

    return {
      ...lane,
      cards: nextCards,
      count: nextCards.length
    };
  });

  if (!removed) {
    return null;
  }

  refreshCrmSummary(state.crmData);
  refreshInboxConversations(state.inboxData, state.crmData);
  await queuePersist();

  return cloneData(state.crmData);
}