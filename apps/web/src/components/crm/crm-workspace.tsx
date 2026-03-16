"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from "react";

import { Badge, Button, Card, Input, Textarea } from "@clone-zap/ui";

import {
  createCrmCampaignRequest,
  createCrmDealRequest,
  createCrmLaneRequest,
  createCrmTaskRequest,
  createCrmContactRequest,
  deleteCrmCampaignRequest,
  deleteCrmDealRequest,
  deleteCrmContactRequest,
  deleteCrmLaneRequest,
  deleteCrmTaskRequest,
  fetchCrmData,
  updateCrmCampaignRequest,
  updateCrmDealRequest,
  updateCrmLaneRequest,
  updateCrmTaskRequest,
  updateCrmContactRequest
} from "@/lib/api";
import { useSession } from "@/components/auth/session-provider";
import { emitCrmTasksUpdated } from "@/lib/crm-task-sync";
import { crmPageData } from "@/lib/mocks/app-data";
import type { CrmCampaign, CrmContact, CrmData, CrmDealActivity, CrmDealMovement, CrmLane, CrmLaneCard, CrmTask } from "@/lib/types";

const campaignSteps = ["Inicio", "Audiencia", "Mensagem", "Resumo"] as const;
const taskStatusOptions = ["Todos", "Aberta", "Em andamento", "Concluida"] as const;
const taskPriorityOptions = ["Todas", "Alta", "Media", "Baixa"] as const;
const taskGroupOrder = ["Em atraso", "Hoje", "Amanha", "Proximas", "Sem prazo", "Concluidas"] as const;
const taskSortOptions = ["Prazo", "Prioridade", "Responsavel"] as const;
const calendarWeekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"] as const;

const crmPanelVisualMap = {
  negociacoes: {
    id: "crm-panel-negociacoes",
    label: "Negociacoes",
    description: "Kanban principal do funil com deals arrastaveis e painel lateral de contexto."
  },
  tasks: {
    id: "crm-panel-tasks",
    label: "Tarefas",
    description: "Pendencias operacionais, prazos e relacionamentos com deals em foco."
  },
  campaigns: {
    id: "crm-panel-campaigns",
    label: "Campanhas",
    description: "Disparos e historico recente do outbound criado no wizard."
  },
  goals: {
    id: "crm-panel-goals",
    label: "Metas",
    description: "Indicadores de performance comercial por responsavel."
  },
  contacts: {
    id: "crm-panel-contacts",
    label: "Contatos",
    description: "Base operacional de relacionamento com cadastro e manutencao da carteira."
  }
} as const;

function activePanelCardClass(isActive: boolean) {
  return isActive
    ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)] bg-[linear-gradient(180deg,rgba(59,130,246,0.08),var(--panel))] shadow-soft"
    : "";
}

type CrmWorkspacePreferences = {
  crmSection: "pipeline" | "tasks";
  taskFilters: {
    search: string;
    status: string;
    priority: string;
    assignee: string;
    sortBy: (typeof taskSortOptions)[number];
  };
  agendaView: "month" | "week" | "day";
  agendaFilters: {
    assignee: string;
    laneId: string;
  };
};

function crmPreferencesStorageKey(userKey: string) {
  return `clone-zap:crm-preferences:${userKey}`;
}

function sanitizeCrmPreferences(value: unknown): CrmWorkspacePreferences | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<CrmWorkspacePreferences>;
  const crmSection = record.crmSection === "tasks" ? "tasks" : record.crmSection === "pipeline" ? "pipeline" : null;
  const agendaView = record.agendaView === "week" || record.agendaView === "day" || record.agendaView === "month" ? record.agendaView : null;
  const taskFilters = record.taskFilters;
  const agendaFilters = record.agendaFilters;

  if (!crmSection || !agendaView || !taskFilters || !agendaFilters) {
    return null;
  }

  const sortBy = taskSortOptions.includes(taskFilters.sortBy as (typeof taskSortOptions)[number])
    ? (taskFilters.sortBy as (typeof taskSortOptions)[number])
    : "Prazo";

  return {
    crmSection,
    taskFilters: {
      search: typeof taskFilters.search === "string" ? taskFilters.search : "",
      status: typeof taskFilters.status === "string" ? taskFilters.status : "Todos",
      priority: typeof taskFilters.priority === "string" ? taskFilters.priority : "Todas",
      assignee: typeof taskFilters.assignee === "string" ? taskFilters.assignee : "Todos",
      sortBy
    },
    agendaView,
    agendaFilters: {
      assignee: typeof agendaFilters.assignee === "string" ? agendaFilters.assignee : "Todos",
      laneId: typeof agendaFilters.laneId === "string" ? agendaFilters.laneId : "Todas"
    }
  };
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
  return formatCompactCurrency(parseCurrencyLikeValue(forecast) * (probability / 100));
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

function classifyTaskGroup(task: CrmTask) {
  if (task.status === "Concluida") {
    return "Concluidas";
  }

  const normalizedDue = task.due.toLowerCase();

  if (normalizedDue.includes("atras") || normalizedDue.startsWith("ontem")) {
    return "Em atraso";
  }

  if (normalizedDue.startsWith("hoje")) {
    return "Hoje";
  }

  if (normalizedDue.startsWith("amanha")) {
    return "Amanha";
  }

  if (normalizedDue.includes("sem prazo")) {
    return "Sem prazo";
  }

  return "Proximas";
}

function cloneLanes(lanes: CrmLane[]) {
  return lanes.map((lane) => ({
    ...lane,
    cards: lane.cards.map((card) => ({
      ...card,
      movementHistory: card.movementHistory ? [...card.movementHistory] : ([] as CrmDealMovement[]),
      activityHistory: card.activityHistory ? [...card.activityHistory] : ([] as CrmDealActivity[])
    }))
  }));
}

function createMovementEntry(input: {
  fromLane: CrmLane;
  toLane: CrmLane;
  movedBy: string;
}): CrmDealMovement {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fromLaneId: input.fromLane.id,
    fromLaneTitle: input.fromLane.title,
    toLaneId: input.toLane.id,
    toLaneTitle: input.toLane.title,
    movedAt: currentDateTimeLabel(),
    movedBy: input.movedBy
  };
}

function createActivityEntry(input: {
  type: "created" | "updated" | "moved";
  label: string;
  description: string;
  actor: string;
}): CrmDealActivity {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    label: input.label,
    description: input.description,
    occurredAt: currentDateTimeLabel(),
    actor: input.actor
  };
}

function initialCrmData(): CrmData {
  return {
    summary: crmPageData.summary.map((item) => ({ ...item })),
    lanes: crmPageData.lanes.map((lane) => ({
      ...lane,
      cards: lane.cards.map((card) => ({ ...card, movementHistory: card.movementHistory ? [...card.movementHistory] : ([] as CrmDealMovement[]), activityHistory: card.activityHistory ? [...card.activityHistory] : ([] as CrmDealActivity[]) }))
    })),
    tasks: crmPageData.tasks.map((task) => ({ ...task })),
    contacts: crmPageData.contacts.map((contact) => ({ ...contact })),
    campaigns: crmPageData.campaigns.map((campaign) => ({ ...campaign })),
    goals: crmPageData.goals.map((goal) => ({ ...goal }))
  };
}

export function CrmWorkspace() {
  const { session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const crmPanelParam = searchParams.get("panel");
  const crmModalParam = searchParams.get("modal");
  const crmEditParam = searchParams.get("edit");
  const crmCampaignStepParam = searchParams.get("step");
  const crmModalLaneIdParam = searchParams.get("laneId");
  const crmRelatedDealIdParam = searchParams.get("relatedDealId");
  const crmGoalIdParam = searchParams.get("goalId");
  const preferencesUserKey = `${session?.email ?? session?.initials ?? "guest"}:${session?.workspace ?? "default"}`;
  const [crmData, setCrmData] = useState<CrmData>(initialCrmData);
  const [crmSection, setCrmSection] = useState<"pipeline" | "tasks">("pipeline");
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [laneModalOpen, setLaneModalOpen] = useState(false);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [campaignStep, setCampaignStep] = useState(0);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editingLaneId, setEditingLaneId] = useState<string | null>(null);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    private: false
  });
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    channel: "WhatsApp",
    audience: "Tags: Enterprise + etapa Proposta",
    message: "Ola {{contato.nome}}, seguimos com a condicao especial ativa ate sexta.",
    visibility: "Publico"
  });
  const [laneForm, setLaneForm] = useState({ title: "", value: "", probability: 25 });
  const [dealForm, setDealForm] = useState({ laneId: "", name: "", company: "", owner: "AC", forecast: "R$ 0", nextTask: "", lossReason: "" });
  const [taskForm, setTaskForm] = useState({ title: "", contact: "", dueAt: "", priority: "Media", status: "Aberta", assignee: "AC", dealId: "", dealLabel: "" });
  const [taskDealSearch, setTaskDealSearch] = useState("");
  const [taskFilters, setTaskFilters] = useState({ search: "", status: "Todos", priority: "Todas", assignee: "Todos", sortBy: "Prazo" as (typeof taskSortOptions)[number] });
  const [agendaView, setAgendaView] = useState<"month" | "week" | "day">("month");
  const [agendaMonthOffset, setAgendaMonthOffset] = useState(0);
  const [agendaFilters, setAgendaFilters] = useState({ assignee: "Todos", laneId: "Todas" });
  const [selectedAgendaDayKey, setSelectedAgendaDayKey] = useState<string | null>(null);
  const [overflowAgendaSlotKey, setOverflowAgendaSlotKey] = useState<string | null>(null);
  const [draggedAgendaTaskId, setDraggedAgendaTaskId] = useState<string | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<{ dealId: string; laneId: string } | null>(null);
  const [dragOverLaneId, setDragOverLaneId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ laneId: string; dealId: string | null; position: "before" | "after" | "inside" } | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);

  function clearCrmModalParams(params: URLSearchParams) {
    params.delete("modal");
    params.delete("edit");
    params.delete("step");
    params.delete("laneId");
    params.delete("relatedDealId");
  }

  function replaceCrmQuery(mutator: (params: URLSearchParams) => void) {
    const nextParams = new URLSearchParams(searchParamsKey);
    mutator(nextParams);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  function closeCrmWorkflowModal() {
    replaceCrmQuery((params) => {
      clearCrmModalParams(params);
    });
  }

  function openContactModal(contactId?: string) {
    replaceCrmQuery((params) => {
      params.set("section", "pipeline");
      params.set("panel", "contacts");
      params.delete("taskId");
      params.delete("dealId");
      params.delete("goalId");
      params.set("modal", "contact");
      if (contactId) {
        params.set("edit", contactId);
      } else {
        params.delete("edit");
      }
      params.delete("step");
      params.delete("laneId");
      params.delete("relatedDealId");
    });
  }

  function openCampaignModal(campaignId?: string) {
    replaceCrmQuery((params) => {
      params.set("section", "pipeline");
      params.set("panel", "campaigns");
      params.delete("taskId");
      params.delete("dealId");
      params.delete("goalId");
      params.set("modal", "campaign");
      params.set("step", "0");
      if (campaignId) {
        params.set("edit", campaignId);
      } else {
        params.delete("edit");
      }
      params.delete("laneId");
      params.delete("relatedDealId");
    });
  }

  function openLaneModal(laneId?: string) {
    replaceCrmQuery((params) => {
      params.set("section", "pipeline");
      params.delete("taskId");
      params.delete("dealId");
      params.delete("goalId");
      params.set("modal", "lane");
      if (laneId) {
        params.set("edit", laneId);
      } else {
        params.delete("edit");
      }
      params.delete("step");
      params.delete("laneId");
      params.delete("relatedDealId");
    });
  }

  function setCampaignModalStep(step: number) {
    const normalizedStep = Math.max(0, Math.min(campaignSteps.length - 1, step));
    replaceCrmQuery((params) => {
      params.set("modal", "campaign");
      params.set("step", String(normalizedStep));
    });
  }

  function openDealModal(options?: { editId?: string; laneId?: string }) {
    replaceCrmQuery((params) => {
      params.set("section", "pipeline");
      params.delete("taskId");
      params.delete("goalId");
      params.set("modal", "deal");
      params.delete("step");
      params.delete("relatedDealId");
      if (options?.editId) {
        params.set("edit", options.editId);
      } else {
        params.delete("edit");
      }
      if (options?.laneId) {
        params.set("laneId", options.laneId);
      } else {
        params.delete("laneId");
      }
    });
  }

  function openTaskModal(options?: { editId?: string; relatedDealId?: string }) {
    replaceCrmQuery((params) => {
      params.set("section", "tasks");
      params.delete("taskId");
      params.delete("goalId");
      params.set("modal", "task");
      params.delete("step");
      params.delete("laneId");
      if (options?.editId) {
        params.set("edit", options.editId);
      } else {
        params.delete("edit");
      }
      if (options?.relatedDealId) {
        params.set("relatedDealId", options.relatedDealId);
      } else {
        params.delete("relatedDealId");
      }
    });
  }

  function resetContactForm() {
    setEditingContactId(null);
    setContactForm({ name: "", email: "", phone: "", notes: "", private: false });
  }

  function resetCampaignForm() {
    setEditingCampaignId(null);
    setCampaignStep(0);
    setCampaignForm({
      name: "",
      channel: "WhatsApp",
      audience: "Tags: Enterprise + etapa Proposta",
      message: "Ola {{contato.nome}}, seguimos com a condicao especial ativa ate sexta.",
      visibility: "Publico"
    });
  }

  function resetLaneForm() {
    setEditingLaneId(null);
    setLaneForm({ title: "", value: "", probability: 25 });
  }

  function resetDealForm() {
    setEditingDealId(null);
    setDealForm({ laneId: crmData.lanes[0]?.id ?? "", name: "", company: "", owner: "AC", forecast: "R$ 0", nextTask: "", lossReason: "" });
  }

  function resetTaskForm() {
    setEditingTaskId(null);
    setTaskDealSearch("");
    setTaskForm({ title: "", contact: "", dueAt: "", priority: "Media", status: "Aberta", assignee: "AC", dealId: "", dealLabel: "" });
  }

  function applyTaskSummary(current: CrmData, nextTasks: CrmData["tasks"]) {
    const openTasks = nextTasks.filter((task) => task.status !== "Concluida").length;
    const highPriorityTasks = nextTasks.filter((task) => task.priority === "Alta" && task.status !== "Concluida").length;

    return {
      ...current,
      tasks: nextTasks,
      summary: current.summary.map((item, index) =>
        index === 1
          ? {
              ...item,
              value: new Intl.NumberFormat("pt-BR").format(openTasks),
              helper: `${highPriorityTasks} com prioridade alta`
            }
          : item
      )
    };
  }

  function applyLocalTask(taskPayload: typeof taskForm) {
    const linkedDeal = taskPayload.dealId
      ? crmData.lanes.flatMap((lane) => lane.cards).find((deal) => deal.id === taskPayload.dealId)
      : undefined;
    const nextTask = {
      id: `${Date.now()}`,
      title: taskPayload.title.trim(),
      contact: taskPayload.contact.trim() || linkedDeal?.company || "Contato principal",
      dueAt: taskPayload.dueAt || undefined,
      due: formatTaskDueLabel(taskPayload.dueAt, taskPayload.status),
      priority: taskPayload.priority,
      status: taskPayload.status,
      assignee: taskPayload.assignee || linkedDeal?.owner || "AC",
      dealId: taskPayload.dealId || undefined,
      dealLabel: taskPayload.dealLabel || linkedDeal?.name || undefined
    };

    const nextTasks = [nextTask, ...crmData.tasks];
    emitCrmTasksUpdated(nextTasks);
    setCrmData((current) => applyTaskSummary(current, nextTasks));
  }

  function applyLocalTaskUpdate(taskId: string, taskPayload: typeof taskForm) {
    const nextTasks = crmData.tasks.map((task) =>
      task.id === taskId
        ? (() => {
            const linkedDeal = taskPayload.dealId
              ? crmData.lanes.flatMap((lane) => lane.cards).find((deal) => deal.id === taskPayload.dealId)
              : undefined;

            return {
              ...task,
              title: taskPayload.title.trim() || task.title,
              contact: taskPayload.contact.trim() || linkedDeal?.company || task.contact,
              dueAt: taskPayload.dueAt || undefined,
              due: formatTaskDueLabel(taskPayload.dueAt, taskPayload.status),
              priority: taskPayload.priority,
              status: taskPayload.status,
              assignee: taskPayload.assignee || linkedDeal?.owner || task.assignee,
              dealId: taskPayload.dealId || undefined,
              dealLabel: taskPayload.dealLabel || linkedDeal?.name || undefined
            };
          })()
        : task
    );

    emitCrmTasksUpdated(nextTasks);
    setCrmData((current) => applyTaskSummary(current, nextTasks));
  }

  function applyLocalTaskDelete(taskId: string) {
    const nextTasks = crmData.tasks.filter((task) => task.id !== taskId);
    emitCrmTasksUpdated(nextTasks);
    setCrmData((current) => applyTaskSummary(current, nextTasks));
  }

  function applyLocalContact(nextContact: CrmContact) {
    setCrmData((current) => ({
      ...current,
      contacts: [nextContact, ...current.contacts],
      summary: current.summary.map((item, index) =>
        index === 2
          ? {
              ...item,
              value: new Intl.NumberFormat("pt-BR").format(current.contacts.length + 1),
              helper: `${[nextContact, ...current.contacts].filter((contact) => contact.private).length} contatos privados`
            }
          : item
      )
    }));
  }

  function applyLocalCampaign() {
    const nextCampaign = {
      id: `${Date.now()}`,
      name: campaignForm.name || "Campanha sem nome",
      channel: campaignForm.channel,
      audience: campaignForm.audience,
      message: campaignForm.message,
      visibility: campaignForm.visibility,
      status: "Pronta",
      createdAt: new Date().toLocaleDateString("pt-BR")
    };

    setCrmData((current) => ({
      ...current,
      campaigns: [nextCampaign, ...current.campaigns],
      summary: current.summary.map((item, index) =>
        index === 3
          ? {
              ...item,
              value: String(current.campaigns.length + 1).padStart(2, "0"),
              helper: `${current.campaigns.length + 1} campanhas prontas ou ativas`
            }
          : item
      )
    }));
  }

  function applyLocalContactUpdate(contactId: string, payload: typeof contactForm) {
    setCrmData((current) => ({
      ...current,
      contacts: current.contacts.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              name: payload.name.trim() || contact.name,
              email: payload.email.trim() || contact.email,
              phone: payload.phone.trim() || contact.phone,
              notes: payload.notes,
              private: payload.private
            }
          : contact
      )
    }));
  }

  function applyLocalContactDelete(contactId: string) {
    setCrmData((current) => ({
      ...current,
      contacts: current.contacts.filter((contact) => contact.id !== contactId),
      summary: current.summary.map((item, index) =>
        index === 2
          ? {
              ...item,
              value: new Intl.NumberFormat("pt-BR").format(Math.max(0, current.contacts.length - 1)),
              helper: `${current.contacts.filter((contact) => contact.id !== contactId && contact.private).length} contatos privados`
            }
          : item
      )
    }));
  }

  function applyLocalCampaignUpdate(campaignId: string, payload: typeof campaignForm) {
    setCrmData((current) => ({
      ...current,
      campaigns: current.campaigns.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              name: payload.name.trim() || campaign.name,
              channel: payload.channel.trim() || campaign.channel,
              audience: payload.audience.trim() || campaign.audience,
              message: payload.message.trim() || campaign.message,
              visibility: payload.visibility.trim() || campaign.visibility
            }
          : campaign
      )
    }));
  }

  function applyLocalCampaignDelete(campaignId: string) {
    setCrmData((current) => ({
      ...current,
      campaigns: current.campaigns.filter((campaign) => campaign.id !== campaignId),
      summary: current.summary.map((item, index) =>
        index === 3
          ? {
              ...item,
              value: String(Math.max(0, current.campaigns.length - 1)).padStart(2, "0"),
              helper: `${Math.max(0, current.campaigns.filter((campaign) => campaign.id !== campaignId && campaign.status !== "Arquivada").length)} campanhas prontas ou ativas`
            }
          : item
      )
    }));
  }

  function applyLocalLaneUpdate(laneId: string, payload: typeof laneForm) {
    setCrmData((current) => ({
      ...current,
      lanes: current.lanes.map((lane) =>
        lane.id === laneId
          ? {
              ...lane,
              title: payload.title.trim() || lane.title,
              value: payload.value.trim() || lane.value,
              probability: payload.probability,
              cards: lane.cards.map((card) => ({
                ...card,
                weightedValue: calculateWeightedValue(card.forecast, payload.probability)
              }))
            }
          : lane
      )
    }));
  }

  function applyLocalLaneDelete(laneId: string) {
    setCrmData((current) => ({
      ...current,
      lanes: current.lanes.filter((lane) => lane.id !== laneId)
    }));
  }

  function reorderOrMoveDealLocally(current: CrmData, input: {
    dealId: string;
    targetLaneId: string;
    targetPosition?: number;
    movedBy: string;
  }) {
    const nextLanes = cloneLanes(current.lanes);
    const sourceLaneIndex = nextLanes.findIndex((lane) => lane.cards.some((card) => card.id === input.dealId));

    if (sourceLaneIndex === -1) {
      return current;
    }

    const sourceLane = nextLanes[sourceLaneIndex];
    const sourceDealIndex = sourceLane.cards.findIndex((card) => card.id === input.dealId);
    const [movingDeal] = sourceLane.cards.splice(sourceDealIndex, 1);

    if (!movingDeal) {
      return current;
    }

    const targetLaneIndex = nextLanes.findIndex((lane) => lane.id === input.targetLaneId);

    if (targetLaneIndex === -1) {
      return current;
    }

    const targetLane = nextLanes[targetLaneIndex];
    const sameLane = sourceLane.id === targetLane.id;
    const rawPosition = typeof input.targetPosition === "number" ? Math.trunc(input.targetPosition) : sameLane ? sourceDealIndex : 0;
    const boundedPosition = Math.max(0, Math.min(rawPosition, targetLane.cards.length));
    const insertAt = sameLane && sourceDealIndex < boundedPosition ? boundedPosition - 1 : boundedPosition;
    const nextDeal: CrmLaneCard = {
      ...movingDeal,
      weightedValue: calculateWeightedValue(movingDeal.forecast, targetLane.probability),
      movementHistory: sameLane
        ? (movingDeal.movementHistory ?? ([] as CrmDealMovement[]))
        : [createMovementEntry({ fromLane: sourceLane, toLane: targetLane, movedBy: input.movedBy }), ...(movingDeal.movementHistory ?? ([] as CrmDealMovement[]))],
      activityHistory: sameLane
        ? (movingDeal.activityHistory ?? ([] as CrmDealActivity[]))
        : [createActivityEntry({ type: "moved", label: "Etapa alterada", description: `${sourceLane.title} → ${targetLane.title}`, actor: input.movedBy }), ...(movingDeal.activityHistory ?? ([] as CrmDealActivity[]))],
    };

    targetLane.cards.splice(insertAt, 0, nextDeal);

    return {
      ...current,
      lanes: nextLanes.map((lane) => ({ ...lane, count: lane.cards.length }))
    };
  }

  function applyLocalDealUpdate(dealId: string, payload: typeof dealForm) {
    setCrmData((current) => {
      const nextLanes = cloneLanes(current.lanes);
      let extractedDeal: CrmLaneCard | null = null;
      let sourceLaneId: string | null = null;
      const actor = session?.name ?? "Alana Costa";

      for (const lane of nextLanes) {
        const cardIndex = lane.cards.findIndex((card) => card.id === dealId);
        if (cardIndex !== -1) {
          const currentDeal = lane.cards[cardIndex];
          sourceLaneId = lane.id;
          const changes: string[] = [];
          if (payload.name.trim() && payload.name.trim() !== currentDeal.name) changes.push(`nome para ${payload.name.trim()}`);
          if (payload.company.trim() && payload.company.trim() !== currentDeal.company) changes.push(`empresa/contato para ${payload.company.trim()}`);
          if (payload.owner.trim() && payload.owner.trim() !== currentDeal.owner) changes.push(`responsavel para ${payload.owner.trim()}`);
          if (payload.forecast.trim() && payload.forecast.trim() !== currentDeal.forecast) changes.push(`forecast para ${payload.forecast.trim()}`);
          if (payload.nextTask.trim() !== (currentDeal.nextTask ?? "")) changes.push(`proxima tarefa para ${payload.nextTask.trim() || "Sem proxima tarefa"}`);
          if (payload.lossReason.trim() !== (currentDeal.lossReason ?? "")) changes.push(`motivo de perda ${payload.lossReason.trim() ? `definido como ${payload.lossReason.trim()}` : "limpo"}`);
          extractedDeal = {
            ...currentDeal,
            name: payload.name.trim() || currentDeal.name,
            company: payload.company.trim() || currentDeal.company,
            owner: payload.owner.trim() || currentDeal.owner,
            forecast: payload.forecast.trim() || currentDeal.forecast,
            weightedValue: currentDeal.weightedValue,
            nextTask: payload.nextTask.trim() || currentDeal.nextTask,
            lossReason: payload.lossReason.trim() || currentDeal.lossReason,
            movementHistory: currentDeal.movementHistory ?? ([] as CrmDealMovement[]),
            activityHistory: changes.length > 0
              ? [createActivityEntry({ type: "updated", label: "Deal atualizado", description: changes.join("; "), actor }), ...(currentDeal.activityHistory ?? ([] as CrmDealActivity[]))]
              : (currentDeal.activityHistory ?? ([] as CrmDealActivity[]))
          };

          if (payload.laneId && payload.laneId !== lane.id) {
            lane.cards.splice(cardIndex, 1);
          } else {
            lane.cards[cardIndex] = extractedDeal;
          }

          break;
        }
      }

      if (extractedDeal && payload.laneId) {
        const targetLane = nextLanes.find((lane) => lane.id === payload.laneId);
        if (targetLane && !targetLane.cards.some((card) => card.id === extractedDeal?.id)) {
          const sourceLane = nextLanes.find((lane) => lane.id === sourceLaneId) ?? targetLane;
          targetLane.cards.unshift({
            ...extractedDeal,
            weightedValue: calculateWeightedValue(extractedDeal.forecast, targetLane.probability),
            movementHistory: [createMovementEntry({ fromLane: sourceLane, toLane: targetLane, movedBy: actor }), ...(extractedDeal.movementHistory ?? [])],
            activityHistory: [createActivityEntry({ type: "moved", label: "Etapa alterada", description: `${sourceLane.title} → ${targetLane.title}`, actor }), ...(extractedDeal.activityHistory ?? [])]
          });
        } else if (targetLane && sourceLaneId === targetLane.id) {
          targetLane.cards = targetLane.cards.map((card) =>
            card.id === extractedDeal?.id
              ? {
                  ...card,
                  weightedValue: calculateWeightedValue(card.forecast, targetLane.probability)
                }
              : card
          );
        }
      }

      return {
        ...current,
        lanes: nextLanes.map((lane) => ({ ...lane, count: lane.cards.length }))
      };
    });
  }

  function applyLocalDealDelete(dealId: string) {
    setCrmData((current) => ({
      ...current,
      lanes: current.lanes.map((lane) => {
        const nextCards = lane.cards.filter((card) => card.id !== dealId);
        return { ...lane, cards: nextCards, count: nextCards.length };
      })
    }));
  }

  function selectedDeal() {
    if (!editingDealId) {
      return null;
    }

    for (const lane of crmData.lanes) {
      const deal = lane.cards.find((card) => card.id === editingDealId);
      if (deal) {
        return deal;
      }
    }

    return null;
  }

  function selectedDealContext() {
    if (!selectedDealId) {
      return null;
    }

    for (const lane of crmData.lanes) {
      const deal = lane.cards.find((card) => card.id === selectedDealId);
      if (deal) {
        return { lane, deal };
      }
    }

    return null;
  }

  function latestActivity(deal: CrmLaneCard) {
    return deal.activityHistory[0] ?? null;
  }

  useEffect(() => {
    let active = true;

    fetchCrmData().then((data) => {
      if (active) {
        setCrmData(data);
        emitCrmTasksUpdated(data.tasks);
        setSelectedDealId((current) => {
          if (!current) {
            return data.lanes[0]?.cards[0]?.id ?? null;
          }

          return data.lanes.some((lane) => lane.cards.some((card) => card.id === current)) ? current : data.lanes[0]?.cards[0]?.id ?? null;
        });
        setDealForm((current) => ({
          ...current,
          laneId: current.laneId || data.lanes[0]?.id || ""
        }));
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const campaignSummary = useMemo(
    () => [
      ["Nome", campaignForm.name || "Campanha sem nome"],
      ["Canal", campaignForm.channel],
      ["Audiencia", campaignForm.audience],
      ["Mensagem", campaignForm.message],
      ["Visibilidade", campaignForm.visibility]
    ],
    [campaignForm]
  );

  const allDeals = useMemo(
    () => crmData.lanes.flatMap((lane) => lane.cards.map((deal) => ({ ...deal, laneId: lane.id, laneTitle: lane.title }))),
    [crmData.lanes]
  );

  const filteredDealOptions = useMemo(() => {
    const normalizedSearch = taskDealSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return allDeals.slice(0, 8);
    }

    return allDeals.filter((deal) => `${deal.name} ${deal.company} ${deal.owner} ${deal.laneTitle}`.toLowerCase().includes(normalizedSearch)).slice(0, 8);
  }, [allDeals, taskDealSearch]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setPreferencesReady(false);

    try {
      const rawValue = window.localStorage.getItem(crmPreferencesStorageKey(preferencesUserKey));
      const parsed = rawValue ? sanitizeCrmPreferences(JSON.parse(rawValue)) : null;
      const query = new URLSearchParams(searchParamsKey);
      const hasDirectContext = query.has("taskId") || query.has("dealId") || query.has("section");

      if (parsed) {
        setTaskFilters(parsed.taskFilters);
        setAgendaView(parsed.agendaView);
        setAgendaFilters(parsed.agendaFilters);

        if (!hasDirectContext) {
          setCrmSection(parsed.crmSection);
        }
      }
    } catch {
      // Ignore invalid local preferences and continue with defaults.
    } finally {
      setPreferencesReady(true);
    }
  }, [preferencesUserKey, searchParamsKey]);

  useEffect(() => {
    if (!preferencesReady || typeof window === "undefined") {
      return;
    }

    const payload: CrmWorkspacePreferences = {
      crmSection,
      taskFilters,
      agendaView,
      agendaFilters
    };

    window.localStorage.setItem(crmPreferencesStorageKey(preferencesUserKey), JSON.stringify(payload));
  }, [agendaFilters, agendaView, crmSection, preferencesReady, preferencesUserKey, taskFilters]);

  useEffect(() => {
    const query = new URLSearchParams(searchParamsKey);
    const requestedSection = query.get("section");
    const requestedTaskId = query.get("taskId");
    const requestedDealId = query.get("dealId");
    const requestedGoalId = query.get("goalId");

    if (!requestedSection && !requestedTaskId && !requestedDealId && !requestedGoalId) {
      return;
    }

    if (requestedSection === "tasks" || requestedSection === "pipeline") {
      setCrmSection(requestedSection);
    }

    let resolvedSection = requestedSection === "tasks" || requestedSection === "pipeline" ? requestedSection : null;
    let shouldReplace = false;

    if (requestedDealId) {
      shouldReplace = true;
      if (allDeals.some((deal) => deal.id === requestedDealId)) {
        setCrmSection("pipeline");
        setSelectedDealId(requestedDealId);
        resolvedSection = "pipeline";
      }
    }

    if (requestedTaskId) {
      shouldReplace = true;
      const task = crmData.tasks.find((item) => item.id === requestedTaskId);

      if (task) {
        const dueDate = parseTaskDate(task.dueAt);

        setCrmSection("tasks");
        if (task.dealId) {
          setSelectedDealId(task.dealId);
        }

        if (dueDate) {
          const taskDayKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
          const now = new Date();
          const monthOffset = (dueDate.getFullYear() - now.getFullYear()) * 12 + (dueDate.getMonth() - now.getMonth());

          setAgendaView("month");
          setAgendaMonthOffset(monthOffset);
          setSelectedAgendaDayKey(taskDayKey);
        }

        resolvedSection = "tasks";
      }
    }

    if (requestedGoalId) {
      const goal = crmData.goals.find((item) => item.id === requestedGoalId);
      if (goal) {
        setCrmSection("pipeline");
        setSelectedGoalId(goal.id);
        resolvedSection = "pipeline";
      }
    }

    if (!shouldReplace) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.delete("taskId");
    nextParams.delete("dealId");
    if (resolvedSection) {
      nextParams.set("section", resolvedSection);
    } else {
      nextParams.delete("section");
    }
    if (requestedTaskId) {
      const task = crmData.tasks.find((item) => item.id === requestedTaskId);
      if (task) {
        nextParams.set("modal", "task");
        nextParams.set("edit", task.id);
        nextParams.delete("step");
        nextParams.delete("laneId");
        nextParams.delete("relatedDealId");
      }
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [allDeals, crmData.tasks, pathname, router, searchParamsKey]);

  useEffect(() => {
    if (!crmGoalIdParam) {
      setSelectedGoalId(null);
      return;
    }

    const goal = crmData.goals.find((item) => item.id === crmGoalIdParam);

    if (goal) {
      setSelectedGoalId(goal.id);
      return;
    }

    setSelectedGoalId(null);
  }, [crmData.goals, crmGoalIdParam]);

  useEffect(() => {
    if (crmModalParam !== "lane") {
      setLaneModalOpen(false);
      resetLaneForm();
      return;
    }

    const lane = crmEditParam ? crmData.lanes.find((item) => item.id === crmEditParam) : null;

    if (lane) {
      setEditingLaneId(lane.id);
      setLaneForm({ title: lane.title, value: lane.value, probability: lane.probability });
    } else {
      resetLaneForm();
    }

    setLaneModalOpen(true);
  }, [crmData.lanes, crmEditParam, crmModalParam]);

  useEffect(() => {
    if (crmModalParam !== "contact") {
      setContactModalOpen(false);
      resetContactForm();
      return;
    }

    const contact = crmEditParam ? crmData.contacts.find((item) => item.id === crmEditParam) : null;

    if (contact) {
      setEditingContactId(contact.id);
      setContactForm({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        notes: contact.notes ?? "",
        private: Boolean(contact.private)
      });
    } else {
      resetContactForm();
    }

    setContactModalOpen(true);
  }, [crmData.contacts, crmEditParam, crmModalParam]);

  useEffect(() => {
    if (crmModalParam !== "campaign") {
      setCampaignModalOpen(false);
      resetCampaignForm();
      return;
    }

    const campaign = crmEditParam ? crmData.campaigns.find((item) => item.id === crmEditParam) : null;

    if (campaign) {
      setEditingCampaignId(campaign.id);
      setCampaignForm({
        name: campaign.name,
        channel: campaign.channel,
        audience: campaign.audience,
        message: campaign.message,
        visibility: campaign.visibility
      });
    } else {
      resetCampaignForm();
    }

    setCampaignModalOpen(true);
  }, [crmData.campaigns, crmEditParam, crmModalParam]);

  useEffect(() => {
    if (crmModalParam !== "campaign") {
      return;
    }

    const parsedStep = Number.parseInt(crmCampaignStepParam ?? "0", 10);
    const nextStep = Number.isNaN(parsedStep) ? 0 : Math.max(0, Math.min(campaignSteps.length - 1, parsedStep));
    setCampaignStep(nextStep);
  }, [crmCampaignStepParam, crmModalParam]);

  useEffect(() => {
    if (crmModalParam !== "deal") {
      setDealModalOpen(false);
      resetDealForm();
      return;
    }

    const editableDeal = crmEditParam
      ? allDeals.find((item) => item.id === crmEditParam)
      : null;

    if (editableDeal) {
      setEditingDealId(editableDeal.id);
      setDealForm({
        laneId: editableDeal.laneId,
        name: editableDeal.name,
        company: editableDeal.company,
        owner: editableDeal.owner,
        forecast: editableDeal.forecast,
        nextTask: editableDeal.nextTask ?? "",
        lossReason: editableDeal.lossReason ?? ""
      });
      setSelectedDealId(editableDeal.id);
    } else {
      resetDealForm();
      setDealForm((current) => ({
        ...current,
        laneId: crmModalLaneIdParam && crmData.lanes.some((lane) => lane.id === crmModalLaneIdParam)
          ? crmModalLaneIdParam
          : crmData.lanes[0]?.id ?? ""
      }));
    }

    setDealModalOpen(true);
  }, [allDeals, crmData.lanes, crmEditParam, crmModalLaneIdParam, crmModalParam]);

  useEffect(() => {
    if (crmModalParam !== "task") {
      setTaskModalOpen(false);
      resetTaskForm();
      return;
    }

    const task = crmEditParam ? crmData.tasks.find((item) => item.id === crmEditParam) : null;
    const relatedDeal = crmRelatedDealIdParam ? allDeals.find((deal) => deal.id === crmRelatedDealIdParam) : null;

    if (task) {
      setEditingTaskId(task.id);
      setTaskDealSearch(task.dealLabel ?? "");
      setTaskForm({
        title: task.title,
        contact: task.contact,
        dueAt: toDateTimeLocalValue(task.dueAt),
        priority: task.priority,
        status: task.status,
        assignee: task.assignee,
        dealId: task.dealId ?? "",
        dealLabel: task.dealLabel ?? ""
      });
      if (task.dealId) {
        setSelectedDealId(task.dealId);
      }
    } else {
      setEditingTaskId(null);
      setTaskDealSearch(relatedDeal?.name ?? "");
      setTaskForm({
        title: relatedDeal ? `Follow-up ${relatedDeal.name}` : "",
        contact: relatedDeal?.company ?? "",
        dueAt: "",
        priority: "Media",
        status: "Aberta",
        assignee: relatedDeal?.owner ?? "AC",
        dealId: relatedDeal?.id ?? "",
        dealLabel: relatedDeal?.name ?? ""
      });
    }

    setTaskModalOpen(true);
  }, [allDeals, crmData.tasks, crmEditParam, crmModalParam, crmRelatedDealIdParam]);

  useEffect(() => {
    const query = new URLSearchParams(searchParamsKey);

    if (query.has("taskId") || query.has("dealId")) {
      return;
    }

    const requestedSection = query.get("section");
    if (requestedSection === crmSection) {
      return;
    }

    if (crmSection === "pipeline" || crmSection === "tasks") {
      query.set("section", crmSection);
      const nextQuery = query.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [crmSection, pathname, router, searchParamsKey]);

  useEffect(() => {
    const query = new URLSearchParams(searchParamsKey);
    const requestedPanel = query.get("panel");

    if (!requestedPanel || crmSection !== "pipeline") {
      return;
    }

    const allowedPanels = new Set(["tasks", "campaigns", "goals", "contacts"]);
    if (!allowedPanels.has(requestedPanel)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`crm-panel-${requestedPanel}`);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [crmSection, searchParamsKey]);

  useEffect(() => {
    if (crmSection !== "pipeline" || crmPanelParam !== "goals" || !selectedGoalId) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(`crm-goal-${selectedGoalId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [crmPanelParam, crmSection, selectedGoalId]);

  function navigateCrmSection(section: "pipeline" | "tasks") {
    setCrmSection(section);

    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.set("section", section);
    nextParams.delete("panel");
    nextParams.delete("taskId");
    nextParams.delete("dealId");
    nextParams.delete("goalId");
    clearCrmModalParams(nextParams);

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  function openDealContext(dealId?: string) {
    if (!dealId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.set("section", "pipeline");
    nextParams.set("dealId", dealId);
    nextParams.delete("panel");
    nextParams.delete("taskId");
    nextParams.delete("goalId");
    clearCrmModalParams(nextParams);
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  function openGoalContext(goalId: string) {
    const nextParams = new URLSearchParams(searchParamsKey);
    nextParams.set("section", "pipeline");
    nextParams.set("panel", "goals");
    nextParams.set("goalId", goalId);
    nextParams.delete("taskId");
    nextParams.delete("dealId");
    clearCrmModalParams(nextParams);
    router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  const taskAssigneeOptions = useMemo(() => {
    const values = new Set<string>(["Todos", "AC"]);

    for (const task of crmData.tasks) {
      values.add(task.assignee);
    }

    for (const deal of allDeals) {
      values.add(deal.owner);
    }

    return Array.from(values);
  }, [allDeals, crmData.tasks]);

  const agendaLaneOptions = useMemo(
    () => ["Todas", ...crmData.lanes.map((lane) => lane.id)] as const,
    [crmData.lanes]
  );

  const agendaTasks = useMemo(() => {
    return crmData.tasks.filter((task) => {
      const matchesAssignee = agendaFilters.assignee === "Todos" || task.assignee === agendaFilters.assignee;
      const linkedDeal = task.dealId ? allDeals.find((deal) => deal.id === task.dealId) : undefined;
      const matchesLane = agendaFilters.laneId === "Todas" || linkedDeal?.laneId === agendaFilters.laneId;

      return matchesAssignee && matchesLane;
    });
  }, [agendaFilters, allDeals, crmData.tasks]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = taskFilters.search.trim().toLowerCase();

    return crmData.tasks.filter((task) => {
      const matchesSearch = !normalizedSearch || `${task.title} ${task.contact} ${task.dealLabel ?? ""} ${task.assignee}`.toLowerCase().includes(normalizedSearch);
      const matchesStatus = taskFilters.status === "Todos" || task.status === taskFilters.status;
      const matchesPriority = taskFilters.priority === "Todas" || task.priority === taskFilters.priority;
      const matchesAssignee = taskFilters.assignee === "Todos" || task.assignee === taskFilters.assignee;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [crmData.tasks, taskFilters]);

  const selectedDealTasks = useMemo(() => {
    const context = selectedDealContext();
    if (!context) {
      return [] as CrmTask[];
    }

    return crmData.tasks.filter((task) => task.dealId === context.deal.id);
  }, [crmData.tasks, selectedDealId, crmData.lanes]);

  const activeCrmPanel = useMemo(() => {
    if (crmSection === "tasks") {
      return crmPanelVisualMap.tasks;
    }

    if (crmPanelParam === "tasks" || crmPanelParam === "campaigns" || crmPanelParam === "goals" || crmPanelParam === "contacts") {
      return crmPanelVisualMap[crmPanelParam];
    }

    return crmPanelVisualMap.negociacoes;
  }, [crmPanelParam, crmSection]);

  const agendaDays = useMemo(() => {
    const reference = new Date();
    reference.setMonth(reference.getMonth() + agendaMonthOffset);
    const year = reference.getFullYear();
    const month = reference.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingSlots = (firstDay.getDay() + 6) % 7;
    const tasksByDay = new Map<string, CrmTask[]>();

    for (const task of agendaTasks) {
      const date = parseTaskDate(task.dueAt);
      if (!date) {
        continue;
      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const bucket = tasksByDay.get(key) ?? [];
      bucket.push(task);
      tasksByDay.set(key, bucket);
    }

    const slots: Array<{ key: string; dayNumber?: number; date?: Date; hourLabel?: string; tasks: CrmTask[]; isCurrentMonth: boolean; isToday: boolean }> = [];

    if (agendaView === "day") {
      const now = new Date();
      const selectedDate = new Date(now);
      selectedDate.setDate(now.getDate() + agendaMonthOffset);
      selectedDate.setHours(0, 0, 0, 0);

      for (let hour = 8; hour <= 19; hour += 1) {
        const slotDate = new Date(selectedDate);
        slotDate.setHours(hour, 0, 0, 0);
        const key = `${slotDate.getFullYear()}-${String(slotDate.getMonth() + 1).padStart(2, "0")}-${String(slotDate.getDate()).padStart(2, "0")}-${String(hour).padStart(2, "0")}`;
        const tasks = agendaTasks
          .filter((task) => {
            const taskDate = parseTaskDate(task.dueAt);
            return taskDate
              ? taskDate.getFullYear() === slotDate.getFullYear() && taskDate.getMonth() === slotDate.getMonth() && taskDate.getDate() === slotDate.getDate() && taskDate.getHours() === hour
              : false;
          })
          .sort((left, right) => Number(taskSortWeight(left, "Prazo")) - Number(taskSortWeight(right, "Prazo")));
        const isToday = slotDate.toDateString() === now.toDateString();
        slots.push({ key, dayNumber: slotDate.getDate(), date: slotDate, hourLabel: `${String(hour).padStart(2, "0")}:00`, tasks, isCurrentMonth: true, isToday });
      }

      return {
        label: selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }),
        slots
      };
    }

    if (agendaView === "week") {
      const now = new Date();
      const startOfWeek = new Date(now);
      const currentDay = (startOfWeek.getDay() + 6) % 7;
      startOfWeek.setDate(startOfWeek.getDate() - currentDay + agendaMonthOffset * 7);
      startOfWeek.setHours(0, 0, 0, 0);

      for (let offset = 0; offset < 7; offset += 1) {
        const cellDate = new Date(startOfWeek);
        cellDate.setDate(startOfWeek.getDate() + offset);
        const key = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;
        const tasks = (tasksByDay.get(key) ?? []).slice().sort((left, right) => Number(taskSortWeight(left, "Prazo")) - Number(taskSortWeight(right, "Prazo")));
        const isToday = cellDate.getFullYear() === now.getFullYear() && cellDate.getMonth() === now.getMonth() && cellDate.getDate() === now.getDate();
        slots.push({ key, dayNumber: cellDate.getDate(), date: cellDate, tasks, isCurrentMonth: true, isToday });
      }

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return {
        label: `${startOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} - ${endOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`,
        slots
      };
    }

    for (let index = 0; index < leadingSlots; index += 1) {
      slots.push({ key: `empty-${index}`, tasks: [], isCurrentMonth: false, isToday: false });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(year, month, day);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const tasks = (tasksByDay.get(key) ?? []).slice().sort((left, right) => Number(taskSortWeight(left, "Prazo")) - Number(taskSortWeight(right, "Prazo")));
      const now = new Date();
      const isToday = cellDate.getFullYear() === now.getFullYear() && cellDate.getMonth() === now.getMonth() && cellDate.getDate() === now.getDate();
      slots.push({ key, dayNumber: day, date: cellDate, tasks, isCurrentMonth: true, isToday });
    }

    return {
      label: firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      slots
    };
  }, [agendaMonthOffset, agendaTasks, agendaView]);

  const agendaHighlights = useMemo(
    () => agendaTasks
      .filter((task) => task.status !== "Concluida" && parseTaskDate(task.dueAt))
      .slice()
      .sort((left, right) => Number(taskSortWeight(left, "Prazo")) - Number(taskSortWeight(right, "Prazo")))
      .slice(0, 8),
    [agendaTasks]
  );

  const selectedAgendaSlot = useMemo(
    () => agendaDays.slots.find((slot) => slot.key === selectedAgendaDayKey && slot.isCurrentMonth) ?? null,
    [agendaDays.slots, selectedAgendaDayKey]
  );

  const overflowAgendaSlot = useMemo(
    () => agendaDays.slots.find((slot) => slot.key === overflowAgendaSlotKey && slot.isCurrentMonth) ?? null,
    [agendaDays.slots, overflowAgendaSlotKey]
  );

  const groupedTasks = useMemo(
    () => taskGroupOrder
      .map((group) => ({
        group,
        tasks: filteredTasks
          .filter((task) => classifyTaskGroup(task) === group)
          .sort((left, right) => {
            const leftValue = taskSortWeight(left, taskFilters.sortBy);
            const rightValue = taskSortWeight(right, taskFilters.sortBy);

            if (typeof leftValue === "number" && typeof rightValue === "number") {
              return leftValue - rightValue;
            }

            return String(leftValue).localeCompare(String(rightValue), "pt-BR");
          })
      }))
      .filter((entry) => entry.tasks.length > 0),
    [filteredTasks, taskFilters.sortBy]
  );

  async function createContact() {
    if (!contactForm.name.trim()) {
      return;
    }

    const nextContact: CrmContact = {
      id: `${Date.now()}`,
      name: contactForm.name.trim(),
      createdAt: new Date().toLocaleDateString("pt-BR"),
      phone: contactForm.phone || "Nao informado",
      email: contactForm.email || "Nao informado",
      notes: contactForm.notes,
      private: contactForm.private
    };

    try {
      const data = editingContactId
        ? await updateCrmContactRequest(editingContactId, contactForm)
        : await createCrmContactRequest(contactForm);
      setCrmData(data);
    } catch {
      if (editingContactId) {
        applyLocalContactUpdate(editingContactId, contactForm);
      } else {
        applyLocalContact(nextContact);
      }
    }

    closeCrmWorkflowModal();
  }

  async function nextCampaignStep() {
    if (campaignStep < campaignSteps.length - 1) {
      setCampaignModalStep(campaignStep + 1);
      return;
    }

    try {
      const data = editingCampaignId
        ? await updateCrmCampaignRequest(editingCampaignId, campaignForm)
        : await createCrmCampaignRequest(campaignForm);
      setCrmData(data);
    } catch {
      if (editingCampaignId) {
        applyLocalCampaignUpdate(editingCampaignId, campaignForm);
      } else {
        applyLocalCampaign();
      }
    }

    closeCrmWorkflowModal();
  }

  async function saveLane() {
    if (!laneForm.title.trim()) {
      return;
    }

    try {
      const data = editingLaneId
        ? await updateCrmLaneRequest(editingLaneId, laneForm)
        : await createCrmLaneRequest(laneForm);
      setCrmData(data);
    } catch {
      if (editingLaneId) {
        applyLocalLaneUpdate(editingLaneId, laneForm);
      } else {
        setCrmData((current) => ({
          ...current,
          lanes: [...current.lanes, { id: `${Date.now()}`, title: laneForm.title.trim(), value: laneForm.value.trim() || "Nova etapa comercial", probability: laneForm.probability, count: 0, cards: [] }]
        }));
      }
    }

    closeCrmWorkflowModal();
  }

  async function saveDeal() {
    if (!dealForm.laneId || !dealForm.name.trim()) {
      return;
    }

    try {
      const data = editingDealId
        ? await updateCrmDealRequest(editingDealId, { ...dealForm, actor: session?.name ?? "Alana Costa" })
        : await createCrmDealRequest({ ...(dealForm as { laneId: string; name: string; company?: string; owner?: string; forecast?: string; nextTask?: string; lossReason?: string }), actor: session?.name ?? "Alana Costa" });
      setCrmData(data);
    } catch {
      if (editingDealId) {
        applyLocalDealUpdate(editingDealId, dealForm);
      } else {
        const actor = session?.name ?? "Alana Costa";
        const nextDeal = {
          id: `${Date.now()}`,
          name: dealForm.name.trim(),
          company: dealForm.company.trim() || "Contato principal",
          owner: dealForm.owner.trim() || "AC",
          forecast: dealForm.forecast.trim() || "R$ 0",
          movementHistory: [] as CrmDealMovement[],
          activityHistory: [createActivityEntry({ type: "created", label: "Deal criado", description: `Oportunidade criada na etapa ${crmData.lanes.find((lane) => lane.id === dealForm.laneId)?.title ?? "selecionada"}.`, actor })] as CrmDealActivity[]
        };
        setCrmData((current) => ({
          ...current,
          lanes: current.lanes.map((lane) =>
            lane.id === dealForm.laneId
              ? { ...lane, cards: [{ ...nextDeal, weightedValue: calculateWeightedValue(nextDeal.forecast, lane.probability), nextTask: dealForm.nextTask.trim() || "Sem proxima tarefa", lossReason: dealForm.lossReason.trim() }, ...lane.cards], count: lane.cards.length + 1 }
              : lane
          )
        }));
        setSelectedDealId(nextDeal.id);
      }
    }

    closeCrmWorkflowModal();
  }

  async function saveTask() {
    if (!taskForm.title.trim()) {
      return;
    }

    try {
      const data = editingTaskId
        ? await updateCrmTaskRequest(editingTaskId, taskForm)
        : await createCrmTaskRequest(taskForm);
      setCrmData(data);
      emitCrmTasksUpdated(data.tasks);
    } catch {
      if (editingTaskId) {
        applyLocalTaskUpdate(editingTaskId, taskForm);
      } else {
        applyLocalTask(taskForm);
      }
    }

    closeCrmWorkflowModal();
  }

  function startEditContact(contact: CrmContact) {
    openContactModal(contact.id);
  }

  function startEditLane(lane: CrmLane) {
    openLaneModal(lane.id);
  }

  async function removeLane(laneId: string) {
    try {
      const data = await deleteCrmLaneRequest(laneId);
      setCrmData(data);
    } catch {
      applyLocalLaneDelete(laneId);
    }

    if (editingLaneId === laneId) {
      closeCrmWorkflowModal();
    }
  }

  async function removeContact(contactId: string) {
    try {
      const data = await deleteCrmContactRequest(contactId);
      setCrmData(data);
    } catch {
      applyLocalContactDelete(contactId);
    }
  }

  function startEditCampaign(campaign: CrmCampaign) {
    openCampaignModal(campaign.id);
  }

  function startEditDeal(laneId: string, deal: CrmLaneCard) {
    void laneId;
    openDealModal({ editId: deal.id });
  }

  function startEditTask(task: CrmData["tasks"][number]) {
    openTaskModal({ editId: task.id });
  }

  function openTaskForSelectedDeal() {
    const context = selectedDealContext();
    openTaskModal({ relatedDealId: context?.deal.id });
  }

  function selectTaskDeal(dealId: string) {
    const linkedDeal = allDeals.find((deal) => deal.id === dealId);

    if (!linkedDeal) {
      return;
    }

    setTaskDealSearch(linkedDeal.name);
    setTaskForm((current) => ({
      ...current,
      dealId: linkedDeal.id,
      dealLabel: linkedDeal.name,
      contact: current.contact || linkedDeal.company,
      assignee: linkedDeal.owner
    }));
  }

  function clearTaskDeal() {
    setTaskDealSearch("");
    setTaskForm((current) => ({ ...current, dealId: "", dealLabel: "" }));
  }

  async function removeCampaign(campaignId: string) {
    try {
      const data = await deleteCrmCampaignRequest(campaignId);
      setCrmData(data);
    } catch {
      applyLocalCampaignDelete(campaignId);
    }
  }

  async function removeDeal(dealId: string) {
    try {
      const data = await deleteCrmDealRequest(dealId);
      setCrmData(data);
      if (selectedDealId === dealId) {
        setSelectedDealId(data.lanes[0]?.cards[0]?.id ?? null);
      }
    } catch {
      applyLocalDealDelete(dealId);
      if (selectedDealId === dealId) {
        setSelectedDealId(null);
      }
    }
  }

  async function removeTask(taskId: string) {
    try {
      const data = await deleteCrmTaskRequest(taskId);
      setCrmData(data);
      emitCrmTasksUpdated(data.tasks);
    } catch {
      applyLocalTaskDelete(taskId);
    }

    if (editingTaskId === taskId) {
      closeCrmWorkflowModal();
    }
  }

  async function markTaskCompleted(task: CrmTask) {
    const payload = {
      title: task.title,
      contact: task.contact,
      dueAt: task.dueAt ?? "",
      priority: task.priority,
      status: "Concluida",
      assignee: task.assignee,
      dealId: task.dealId ?? "",
      dealLabel: task.dealLabel ?? ""
    };

    try {
      const data = await updateCrmTaskRequest(task.id, payload);
      setCrmData(data);
      emitCrmTasksUpdated(data.tasks);
    } catch {
      applyLocalTaskUpdate(task.id, payload);
    }
  }

  async function rescheduleTask(task: CrmTask, mode: "today-17" | "plus-1-day" | "plus-1-week") {
    const currentDue = parseTaskDate(task.dueAt) ?? new Date();
    const nextDue = new Date(currentDue);

    if (mode === "today-17") {
      const now = new Date();
      nextDue.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      nextDue.setHours(17, 0, 0, 0);
    }

    if (mode === "plus-1-day") {
      nextDue.setDate(nextDue.getDate() + 1);
      nextDue.setHours(9, 0, 0, 0);
    }

    if (mode === "plus-1-week") {
      nextDue.setDate(nextDue.getDate() + 7);
      nextDue.setHours(9, 0, 0, 0);
    }

    const payload = {
      title: task.title,
      contact: task.contact,
      dueAt: formatDateTimeLocal(nextDue),
      priority: task.priority,
      status: task.status,
      assignee: task.assignee,
      dealId: task.dealId ?? "",
      dealLabel: task.dealLabel ?? ""
    };

    try {
      const data = await updateCrmTaskRequest(task.id, payload);
      setCrmData(data);
      emitCrmTasksUpdated(data.tasks);
    } catch {
      applyLocalTaskUpdate(task.id, payload);
    }
  }

  async function moveTaskToDate(task: CrmTask, targetDate: Date) {
    const currentDue = parseTaskDate(task.dueAt) ?? new Date();
    const nextDue = new Date(targetDate);
    const targetHasTime = targetDate.getHours() !== 0 || targetDate.getMinutes() !== 0;
    nextDue.setHours(targetHasTime ? targetDate.getHours() : (currentDue.getHours() || 9), targetHasTime ? targetDate.getMinutes() : (currentDue.getMinutes() || 0), 0, 0);

    const payload = {
      title: task.title,
      contact: task.contact,
      dueAt: formatDateTimeLocal(nextDue),
      priority: task.priority,
      status: task.status,
      assignee: task.assignee,
      dealId: task.dealId ?? "",
      dealLabel: task.dealLabel ?? ""
    };

    try {
      const data = await updateCrmTaskRequest(task.id, payload);
      setCrmData(data);
      emitCrmTasksUpdated(data.tasks);
    } catch {
      applyLocalTaskUpdate(task.id, payload);
    }
  }

  function handleAgendaTaskDragStart(taskId: string) {
    setDraggedAgendaTaskId(taskId);
  }

  async function handleAgendaSlotDrop(slotDate?: Date) {
    if (!slotDate || !draggedAgendaTaskId) {
      setDraggedAgendaTaskId(null);
      return;
    }

    const task = crmData.tasks.find((item) => item.id === draggedAgendaTaskId);
    setDraggedAgendaTaskId(null);

    if (!task) {
      return;
    }

    await moveTaskToDate(task, slotDate);
  }

  async function moveDeal(dealId: string, nextLaneId: string, targetPosition?: number) {
    const movedBy = session?.name ?? "Alana Costa";
    try {
      const data = await updateCrmDealRequest(dealId, { laneId: nextLaneId, position: targetPosition, movedBy });
      setCrmData(data);
    } catch {
      setCrmData((current) => reorderOrMoveDealLocally(current, { dealId, targetLaneId: nextLaneId, targetPosition, movedBy }));
    }
  }

  function handleDealDragStart(dealId: string, laneId: string) {
    setDraggedDeal({ dealId, laneId });
  }

  function handleLaneDragOver(event: ReactDragEvent<HTMLDivElement>, laneId: string) {
    event.preventDefault();
    if (dragOverLaneId !== laneId) {
      setDragOverLaneId(laneId);
    }
    setDropTarget((current) => (current?.laneId === laneId && current.dealId === null ? current : { laneId, dealId: null, position: "inside" }));
  }

  function handleLaneDragLeave(laneId: string) {
    if (dragOverLaneId === laneId) {
      setDragOverLaneId(null);
    }
  }

  function handleDealDragOver(event: ReactDragEvent<HTMLDivElement>, laneId: string, dealId: string) {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";

    setDragOverLaneId(laneId);
    setDropTarget({ laneId, dealId, position });
  }

  async function handleLaneDrop(event: ReactDragEvent<HTMLDivElement>, laneId: string) {
    event.preventDefault();

    if (!draggedDeal) {
      return;
    }

    const lane = crmData.lanes.find((item) => item.id === laneId);
    const targetPosition = lane?.cards.length ?? 0;

    setDragOverLaneId(null);
    setDropTarget(null);
    const dealId = draggedDeal.dealId;
    setDraggedDeal(null);
    await moveDeal(dealId, laneId, targetPosition);
  }

  async function handleDealDrop(event: ReactDragEvent<HTMLDivElement>, laneId: string, targetDealId: string) {
    event.preventDefault();
    event.stopPropagation();

    if (!draggedDeal) {
      return;
    }

    const lane = crmData.lanes.find((item) => item.id === laneId);
    const targetIndex = lane?.cards.findIndex((card) => card.id === targetDealId) ?? -1;

    if (targetIndex === -1) {
      return;
    }

    const position = dropTarget?.dealId === targetDealId && dropTarget.position === "after" ? targetIndex + 1 : targetIndex;

    setDragOverLaneId(null);
    setDropTarget(null);
    const dealId = draggedDeal.dealId;
    setDraggedDeal(null);
    await moveDeal(dealId, laneId, position);
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-foreground)]">CRM</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              {crmSection === "pipeline" ? "Negociacoes em andamento" : "Central de tarefas"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-[20px] bg-[var(--panel-strong)] p-1">
              <Button className="rounded-2xl px-4 py-3" onClick={() => navigateCrmSection("pipeline")} variant={crmSection === "pipeline" ? "primary" : "ghost"}>Negociacoes</Button>
              <Button className="rounded-2xl px-4 py-3" onClick={() => navigateCrmSection("tasks")} variant={crmSection === "tasks" ? "primary" : "ghost"}>Tarefas</Button>
            </div>
            <Button className="rounded-2xl px-4 py-3" onClick={() => openCampaignModal()} variant="secondary">
              <Plus className="size-4" />
              Nova campanha
            </Button>
            <Button className="rounded-2xl px-4 py-3" onClick={() => openLaneModal()}>
              <Plus className="size-4" />
              Criar etapa
            </Button>
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {crmData.summary.map((item) => (
            <Card className="p-5" key={item.label}>
              <p className="text-sm text-[var(--muted-foreground)]">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{item.value}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.helper}</p>
            </Card>
          ))}
        </div>
        <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Painel em foco</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{activeCrmPanel.label}</p>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">{activeCrmPanel.description}</p>
          </div>
          <Badge className="rounded-full px-3 py-1.5">Contexto ativo</Badge>
        </Card>
        {crmSection === "tasks" ? (
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px] xl:items-start">
            <Card className="p-5 xl:sticky xl:top-24">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Filtros de tarefas</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Status, prioridade, responsável e busca livre.</p>
                </div>
                <Badge>{filteredTasks.length} resultados</Badge>
              </div>
              <div className="mt-4 space-y-4">
                <Input placeholder="Buscar por titulo, contato ou deal" value={taskFilters.search} onChange={(event) => setTaskFilters((current) => ({ ...current, search: event.target.value }))} />
                <div>
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">Ordenar por</p>
                  <div className="flex flex-wrap gap-2">
                    {taskSortOptions.map((sortBy) => (
                      <Button className="rounded-full px-3 py-1.5" key={sortBy} onClick={() => setTaskFilters((current) => ({ ...current, sortBy }))} variant={taskFilters.sortBy === sortBy ? "primary" : "secondary"}>
                        {sortBy}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {taskStatusOptions.map((status) => (
                      <Button className="rounded-full px-3 py-1.5" key={status} onClick={() => setTaskFilters((current) => ({ ...current, status }))} variant={taskFilters.status === status ? "primary" : "secondary"}>
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">Prioridade</p>
                  <div className="flex flex-wrap gap-2">
                    {taskPriorityOptions.map((priority) => (
                      <Button className="rounded-full px-3 py-1.5" key={priority} onClick={() => setTaskFilters((current) => ({ ...current, priority }))} variant={taskFilters.priority === priority ? "primary" : "secondary"}>
                        {priority}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">Responsavel</p>
                  <div className="flex flex-wrap gap-2">
                    {taskAssigneeOptions.map((assignee) => (
                      <Button className="rounded-full px-3 py-1.5" key={assignee} onClick={() => setTaskFilters((current) => ({ ...current, assignee }))} variant={taskFilters.assignee === assignee ? "primary" : "secondary"}>
                        {assignee}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] bg-[var(--panel-strong)] p-4 text-sm text-[var(--muted-foreground)]">
                  <p className="font-semibold text-[var(--foreground)]">Resumo</p>
                  <p className="mt-2">Abertas: {filteredTasks.filter((task) => task.status !== "Concluida").length}</p>
                  <p className="mt-1">Concluidas: {filteredTasks.filter((task) => task.status === "Concluida").length}</p>
                  <p className="mt-1">Alta prioridade: {filteredTasks.filter((task) => task.priority === "Alta" && task.status !== "Concluida").length}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-5 ${activePanelCardClass(activeCrmPanel.id === "crm-panel-tasks")}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Visao exclusiva de tarefas</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Agrupadas por prazo, com concluidas separadas do operacional.</p>
                </div>
                <Button className="rounded-2xl px-4 py-2" onClick={() => openTaskModal()}>
                  <Plus className="size-4" />
                  Nova tarefa
                </Button>
              </div>
              <div className="space-y-5">
                {groupedTasks.length ? groupedTasks.map((entry) => (
                  <div key={entry.group}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{entry.group}</p>
                      <Badge>{entry.tasks.length}</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {entry.tasks.map((task) => (
                        <div className={`rounded-[24px] border p-4 ${taskVisualState(task).containerClass}`} key={task.id}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[var(--foreground)]">{task.title}</p>
                              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{task.contact}</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Badge className={taskVisualState(task).badgeClass}>{taskVisualState(task).label}</Badge>
                              <Badge>{task.priority}</Badge>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-[var(--muted-foreground)]">
                            <div className="flex items-center justify-between gap-3">
                              <span>Prazo</span>
                              <span className={`font-medium ${taskVisualState(task).accentClass}`}>{task.due}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Status</span>
                              <span className={`font-medium ${taskVisualState(task).accentClass}`}>{task.status}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Responsavel</span>
                              <span className="font-medium text-[var(--foreground)]">{task.assignee}</span>
                            </div>
                          </div>
                          {task.dealLabel ? <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Deal vinculado: {task.dealLabel}</p> : null}
                          <div className="mt-4 flex items-center justify-end gap-2">
                            {task.dealId ? (
                              <Button className="rounded-2xl px-3 py-2" onClick={() => openDealContext(task.dealId)} variant="secondary">
                                Abrir deal
                              </Button>
                            ) : null}
                            <Button className="rounded-2xl px-3 py-2" onClick={() => startEditTask(task)} variant="ghost">
                              <Pencil className="size-4" />
                            </Button>
                            <Button className="rounded-2xl px-3 py-2" onClick={() => void removeTask(task.id)} variant="ghost">
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[24px] border border-dashed border-[var(--border)] px-6 py-10 text-center">
                    <p className="font-semibold text-[var(--foreground)]">Nenhuma tarefa encontrada</p>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">Ajuste os filtros ou cadastre uma nova tarefa.</p>
                  </div>
                )}
              </div>
            </Card>
            <Card className="p-5 xl:sticky xl:top-24">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Agenda consolidada</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Calendario operacional unificado por dueAt.</p>
                </div>
                <Badge>{agendaTasks.filter((task) => task.dueAt).length} com prazo</Badge>
              </div>
              <div className="mt-4 space-y-3 rounded-[24px] bg-[var(--panel-strong)] p-4">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Responsavel</p>
                  <div className="flex flex-wrap gap-2">
                    {taskAssigneeOptions.map((assignee) => (
                      <Button className="rounded-full px-3 py-1.5" key={assignee} onClick={() => setAgendaFilters((current) => ({ ...current, assignee }))} variant={agendaFilters.assignee === assignee ? "primary" : "secondary"}>
                        {assignee}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Etapa</p>
                  <div className="flex flex-wrap gap-2">
                    {agendaLaneOptions.map((laneId) => {
                      const lane = crmData.lanes.find((item) => item.id === laneId);
                      const label = laneId === "Todas" ? "Todas" : lane?.title ?? laneId;

                      return (
                        <Button className="rounded-full px-3 py-1.5" key={laneId} onClick={() => setAgendaFilters((current) => ({ ...current, laneId }))} variant={agendaFilters.laneId === laneId ? "primary" : "secondary"}>
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{agendaDays.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">Operacao inteira • {agendaView === "month" ? "Visao mensal" : agendaView === "week" ? "Visao semanal" : "Visao diaria"}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="flex rounded-full bg-[var(--surface)] p-1">
                      <Button className="rounded-full px-3 py-1.5" onClick={() => setAgendaView("month")} variant={agendaView === "month" ? "primary" : "ghost"}>
                        Mes
                      </Button>
                      <Button className="rounded-full px-3 py-1.5" onClick={() => setAgendaView("week")} variant={agendaView === "week" ? "primary" : "ghost"}>
                        Semana
                      </Button>
                      <Button className="rounded-full px-3 py-1.5" onClick={() => setAgendaView("day")} variant={agendaView === "day" ? "primary" : "ghost"}>
                        Dia
                      </Button>
                    </div>
                    <Button className="rounded-full px-3 py-1.5" onClick={() => setAgendaMonthOffset((current) => current - 1)} variant="secondary">
                      Anterior
                    </Button>
                    <Button className="rounded-full px-3 py-1.5" onClick={() => setAgendaMonthOffset(0)} variant={agendaMonthOffset === 0 ? "primary" : "secondary"}>
                      Atual
                    </Button>
                    <Button className="rounded-full px-3 py-1.5" onClick={() => setAgendaMonthOffset((current) => current + 1)} variant="secondary">
                      Proximo
                    </Button>
                  </div>
                </div>
                {agendaView === "day" ? (
                  <div className="mt-3 space-y-2">
                    {agendaDays.slots.map((slot) => (
                      <div className={`rounded-[20px] border p-3 ${slot.isToday ? "border-sky-300 bg-sky-50" : "border-[var(--border)] bg-[var(--surface)]"}`} key={slot.key} onDragOver={(event) => event.preventDefault()} onDrop={() => void handleAgendaSlotDrop(slot.date)}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--foreground)]">{slot.hourLabel}</p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{slot.tasks.length ? `${slot.tasks.length} tarefas` : "Horario livre"}</p>
                          </div>
                          {slot.tasks.length ? <Badge>{slot.tasks.length}</Badge> : null}
                        </div>
                        <div className="mt-3 space-y-2">
                          {slot.tasks.slice(0, 3).map((task) => (
                            <button className={`w-full truncate rounded-full px-3 py-2 text-left text-xs font-medium ${taskVisualState(task).badgeClass}`} draggable key={task.id} onClick={() => startEditTask(task)} onDragEnd={() => setDraggedAgendaTaskId(null)} onDragStart={() => handleAgendaTaskDragStart(task.id)} type="button">
                              {task.title} • {task.assignee}
                            </button>
                          ))}
                          {slot.tasks.length > 3 ? (
                            <button className="text-xs font-semibold text-[var(--accent-strong)]" onClick={() => setOverflowAgendaSlotKey(slot.key)} type="button">
                              +{slot.tasks.length - 3} adicionais
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                      {calendarWeekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-2">
                      {agendaDays.slots.map((slot) => {
                    const slotHasOverdue = slot.tasks.some((task) => taskVisualState(task).label === "Vencida");
                    const slotHasToday = slot.tasks.some((task) => taskVisualState(task).label === "Vence hoje");
                    const isSelected = selectedAgendaDayKey === slot.key;

                    return (
                      <button
                        className={`${agendaView === "week" ? "min-h-[128px]" : "min-h-[68px]"} rounded-[18px] border p-2 text-left ${!slot.isCurrentMonth ? "border-transparent bg-transparent" : isSelected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : slotHasOverdue ? "border-rose-200 bg-rose-50/80" : slotHasToday ? "border-amber-200 bg-amber-50/90" : slot.isToday ? "border-sky-300 bg-sky-50" : "border-[var(--border)] bg-[var(--surface)]"}`}
                        key={slot.key}
                        onClick={() => slot.isCurrentMonth ? setSelectedAgendaDayKey((current) => current === slot.key ? null : slot.key) : undefined}
                        onDragOver={(event) => {
                          if (!slot.date) {
                            return;
                          }

                          event.preventDefault();
                        }}
                        onDrop={() => void handleAgendaSlotDrop(slot.date)}
                        type="button"
                      >
                        {slot.dayNumber ? (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm font-semibold ${slot.isToday ? "text-sky-700" : "text-[var(--foreground)]"}`}>{slot.dayNumber}</span>
                              {slot.tasks.length ? <span className="text-[10px] text-[var(--muted-foreground)]">{slot.tasks.length}</span> : null}
                            </div>
                            <div className="mt-2 space-y-1">
                              {slot.tasks.slice(0, agendaView === "week" ? 4 : 2).map((task) => (
                                <button className={`w-full truncate rounded-full px-2 py-1 text-left text-[10px] font-medium ${taskVisualState(task).badgeClass}`} draggable key={task.id} onClick={() => startEditTask(task)} onDragEnd={() => setDraggedAgendaTaskId(null)} onDragStart={() => handleAgendaTaskDragStart(task.id)} type="button">
                                  {task.assignee} • {task.title}
                                </button>
                              ))}
                              {slot.tasks.length > (agendaView === "week" ? 4 : 2) ? <button className="text-[10px] font-semibold text-[var(--accent-strong)]" onClick={(event) => { event.stopPropagation(); setOverflowAgendaSlotKey(slot.key); }} type="button">+{slot.tasks.length - (agendaView === "week" ? 4 : 2)} adicionais</button> : null}
                            </div>
                          </>
                        ) : null}
                      </button>
                    );
                      })}
                    </div>
                  </>
                )}
              </div>
              {selectedAgendaSlot?.tasks.length ? (
                <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Dia {selectedAgendaSlot.dayNumber}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{selectedAgendaSlot.tasks.length} tarefas planejadas</p>
                    </div>
                    <Button className="rounded-full px-3 py-1.5" onClick={() => setSelectedAgendaDayKey(null)} variant="ghost">
                      Fechar
                    </Button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {selectedAgendaSlot.tasks.map((task) => (
                      <div className={`rounded-[20px] border px-4 py-3 ${taskVisualState(task).containerClass}`} draggable key={task.id} onDragEnd={() => setDraggedAgendaTaskId(null)} onDragStart={() => handleAgendaTaskDragStart(task.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <button className="min-w-0 flex-1 text-left" onClick={() => startEditTask(task)} type="button">
                            <p className="truncate text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                            <p className={`mt-1 text-sm ${taskVisualState(task).accentClass}`}>{task.due}</p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{task.contact} • {task.assignee}</p>
                          </button>
                          <Badge className={taskVisualState(task).badgeClass}>{taskVisualState(task).label}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {task.dealId ? (
                            <Button className="rounded-full px-3 py-1.5" onClick={() => openDealContext(task.dealId)} variant="secondary">
                              Abrir deal
                            </Button>
                          ) : null}
                          <Button className="rounded-full px-3 py-1.5" onClick={() => void rescheduleTask(task, "today-17")} variant="secondary">
                            Hoje 17h
                          </Button>
                          <Button className="rounded-full px-3 py-1.5" onClick={() => void rescheduleTask(task, "plus-1-day")} variant="secondary">
                            +1 dia
                          </Button>
                          <Button className="rounded-full px-3 py-1.5" onClick={() => void rescheduleTask(task, "plus-1-week")} variant="secondary">
                            +1 semana
                          </Button>
                          {task.status !== "Concluida" ? (
                            <Button className="rounded-full px-3 py-1.5" onClick={() => void markTaskCompleted(task)} variant="secondary">
                              Concluir
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Proximos compromissos</p>
                  <Badge>{agendaHighlights.length}</Badge>
                </div>
                {agendaHighlights.length ? agendaHighlights.map((task) => (
                  <button className={`w-full rounded-[20px] border px-4 py-3 text-left ${taskVisualState(task).containerClass}`} key={task.id} onClick={() => startEditTask(task)} type="button">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{task.contact} • {task.assignee}</p>
                      </div>
                      <Badge className={taskVisualState(task).badgeClass}>{taskVisualState(task).label}</Badge>
                    </div>
                    <p className={`mt-2 text-sm font-medium ${taskVisualState(task).accentClass}`}>{task.due}</p>
                    {task.dealLabel ? <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{task.dealLabel}</p> : null}
                  </button>
                )) : <p className="rounded-[20px] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--muted-foreground)]">Nenhuma tarefa com prazo definida no momento.</p>}
              </div>
            </Card>
          </div>
        ) : null}
        {overflowAgendaSlot?.tasks.length ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-[#081120]/30 backdrop-blur-sm">
            <div className="h-full w-full max-w-md border-l border-[var(--border)] bg-[var(--background)] p-5 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Todas as tarefas do slot</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{overflowAgendaSlot.hourLabel ? `${overflowAgendaSlot.hourLabel} • ` : ""}{overflowAgendaSlot.date?.toLocaleDateString("pt-BR")}</p>
                </div>
                <Button className="rounded-full px-3 py-1.5" onClick={() => setOverflowAgendaSlotKey(null)} variant="ghost">
                  <X className="size-4" />
                </Button>
              </div>
              <div className="mt-4 space-y-3 overflow-y-auto pb-6">
                {overflowAgendaSlot.tasks.map((task) => (
                  <div className={`rounded-[20px] border px-4 py-3 ${taskVisualState(task).containerClass}`} key={task.id}>
                    <button className="w-full text-left" onClick={() => startEditTask(task)} type="button">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                        <Badge className={taskVisualState(task).badgeClass}>{taskVisualState(task).label}</Badge>
                      </div>
                      <p className={`mt-1 text-sm ${taskVisualState(task).accentClass}`}>{task.due}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{task.contact} • {task.assignee}</p>
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.dealId ? <Button className="rounded-full px-3 py-1.5" onClick={() => openDealContext(task.dealId)} variant="secondary">Abrir deal</Button> : null}
                      <Button className="rounded-full px-3 py-1.5" onClick={() => void rescheduleTask(task, "plus-1-day")} variant="secondary">+1 dia</Button>
                      <Button className="rounded-full px-3 py-1.5" onClick={() => void rescheduleTask(task, "plus-1-week")} variant="secondary">+1 semana</Button>
                      {task.status !== "Concluida" ? <Button className="rounded-full px-3 py-1.5" onClick={() => void markTaskCompleted(task)} variant="secondary">Concluir</Button> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <div className={`${crmSection === "pipeline" ? "grid" : "hidden"} gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start`}>
          <div className={`grid gap-4 rounded-[32px] border p-3 xl:grid-cols-4 ${activePanelCardClass(activeCrmPanel.id === "crm-panel-negociacoes")}`} id="crm-panel-negociacoes">
            {crmData.lanes.map((lane) => (
              <Card className="p-4" key={lane.id}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{lane.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">{lane.value}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Probabilidade: {lane.probability}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{lane.count} deals</Badge>
                  <Button className="rounded-2xl px-3 py-2" onClick={() => startEditLane(lane)} variant="ghost">
                    <Pencil className="size-4" />
                  </Button>
                  <Button className="rounded-2xl px-3 py-2" onClick={() => void removeLane(lane.id)} variant="ghost">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <Button className="mb-3 w-full rounded-2xl px-4 py-2" onClick={() => openDealModal({ laneId: lane.id })} variant="secondary">Novo deal</Button>
              <div className={`space-y-3 rounded-[24px] p-2 transition ${dragOverLaneId === lane.id ? "bg-[var(--accent-soft)]/60" : "bg-transparent"}`} onDragLeave={() => handleLaneDragLeave(lane.id)} onDragOver={(event) => handleLaneDragOver(event, lane.id)} onDrop={(event) => void handleLaneDrop(event, lane.id)}>
                {lane.cards.map((deal) => (
                  <div className={`rounded-[24px] border bg-[var(--panel-strong)] p-4 transition ${draggedDeal?.dealId === deal.id ? "opacity-60" : "opacity-100"} ${selectedDealId === deal.id ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]" : ""} ${dropTarget?.laneId === lane.id && dropTarget.dealId === deal.id ? dropTarget.position === "before" ? "border-t-[3px] border-t-[var(--accent)] border-x-[var(--border)] border-b-[var(--border)]" : "border-b-[3px] border-b-[var(--accent)] border-x-[var(--border)] border-t-[var(--border)]" : "border-[var(--border)]"}`} draggable key={deal.id} onClick={() => setSelectedDealId(deal.id)} onDragEnd={() => { setDraggedDeal(null); setDragOverLaneId(null); setDropTarget(null); }} onDragOver={(event) => handleDealDragOver(event, lane.id, deal.id)} onDragStart={() => handleDealDragStart(deal.id, lane.id)} onDrop={(event) => void handleDealDrop(event, lane.id, deal.id)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{deal.name}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{deal.company}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{deal.owner}</Badge>
                        <Button className="rounded-2xl px-2 py-2" onClick={() => startEditDeal(lane.id, deal)} variant="ghost">
                          <Pencil className="size-4" />
                        </Button>
                        <Button className="rounded-2xl px-2 py-2" onClick={() => void removeDeal(deal.id)} variant="ghost">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">Forecast</span>
                      <span className="font-semibold text-[var(--foreground)]">{deal.forecast}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-[var(--muted-foreground)]">Valor ponderado</span>
                      <span className="font-semibold text-[var(--foreground)]">{deal.weightedValue ?? deal.forecast}</span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-[var(--muted-foreground)]">Proxima tarefa: {deal.nextTask ?? "Sem proxima tarefa"}</p>
                    {deal.lossReason ? <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Motivo de perda: {deal.lossReason}</p> : null}
                    {latestActivity(deal) ? <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{latestActivity(deal)?.label}: {latestActivity(deal)?.occurredAt} por {latestActivity(deal)?.actor}</p> : null}
                    {deal.movementHistory[0] ? <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Fluxo recente: {deal.movementHistory[0].fromLaneTitle} → {deal.movementHistory[0].toLaneTitle}</p> : null}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Arraste para mover ou reordenar</span>
                      <Badge>{lane.probability}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
              </Card>
            ))}
          </div>
          <Card className="p-5 xl:sticky xl:top-24">
            {selectedDealContext() ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Deal selecionado</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{selectedDealContext()?.deal.name}</h2>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{selectedDealContext()?.deal.company}</p>
                  </div>
                  <Button className="rounded-2xl px-3 py-2" onClick={() => setSelectedDealId(null)} variant="ghost">
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>{selectedDealContext()?.lane.title}</Badge>
                  <Badge>{selectedDealContext()?.deal.owner}</Badge>
                  <Badge>{selectedDealContext()?.lane.probability}%</Badge>
                </div>
                <div className="mt-5 grid gap-3 rounded-[24px] bg-[var(--panel-strong)] p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted-foreground)]">Forecast</span>
                    <span className="font-semibold text-[var(--foreground)]">{selectedDealContext()?.deal.forecast}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted-foreground)]">Valor ponderado</span>
                    <span className="font-semibold text-[var(--foreground)]">{selectedDealContext()?.deal.weightedValue}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[var(--muted-foreground)]">Proxima tarefa</span>
                    <span className="max-w-[210px] text-right font-medium text-[var(--foreground)]">{selectedDealContext()?.deal.nextTask ?? "Sem proxima tarefa"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[var(--muted-foreground)]">Motivo de perda</span>
                    <span className="max-w-[210px] text-right font-medium text-[var(--foreground)]">{selectedDealContext()?.deal.lossReason || "Nao definido"}</span>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button className="flex-1 rounded-2xl px-4 py-2" onClick={() => selectedDealContext() ? startEditDeal(selectedDealContext()!.lane.id, selectedDealContext()!.deal) : undefined}>
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                  <Button className="rounded-2xl px-4 py-2" onClick={() => openTaskForSelectedDeal()} variant="secondary">
                    <Plus className="size-4" />
                    Tarefa
                  </Button>
                  <Button className="rounded-2xl px-4 py-2" onClick={() => selectedDealContext() ? void removeDeal(selectedDealContext()!.deal.id) : undefined} variant="ghost">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="mt-6 space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Tarefas relacionadas</p>
                      <Badge>{selectedDealTasks.length}</Badge>
                    </div>
                    <div className="mt-3 space-y-3">
                      {selectedDealTasks.length ? selectedDealTasks.map((task) => (
                        <div className={`rounded-[20px] border px-4 py-3 transition ${taskVisualState(task).containerClass}`} key={task.id}>
                          <div className="flex items-center justify-between gap-3">
                            <button className="min-w-0 flex-1 text-left" onClick={() => startEditTask(task)} type="button">
                              <p className="truncate text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                            </button>
                            <div className="flex items-center gap-2">
                              <Badge className={taskVisualState(task).badgeClass}>{taskVisualState(task).label}</Badge>
                              <Badge>{task.priority}</Badge>
                            </div>
                          </div>
                          <button className="mt-1 w-full text-left" onClick={() => startEditTask(task)} type="button">
                            <p className={`text-sm ${taskVisualState(task).accentClass}`}>{task.due}</p>
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{task.status} • {task.assignee}</p>
                          </button>
                          {task.status !== "Concluida" ? (
                            <div className="mt-3 flex justify-end">
                              <Button className="rounded-full px-3 py-1.5" onClick={() => void markTaskCompleted(task)} variant="secondary">
                                Marcar concluida
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      )) : <p className="rounded-[20px] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--muted-foreground)]">Nenhuma tarefa vinculada a este deal.</p>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Ultima atividade</p>
                    {latestActivity(selectedDealContext()!.deal) ? (
                      <div className="mt-3 rounded-[20px] bg-[var(--panel-strong)] p-4">
                        <p className="text-sm font-medium text-[var(--foreground)]">{latestActivity(selectedDealContext()!.deal)?.label}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{latestActivity(selectedDealContext()!.deal)?.description}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{latestActivity(selectedDealContext()!.deal)?.occurredAt} por {latestActivity(selectedDealContext()!.deal)?.actor}</p>
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Timeline</p>
                    <div className="mt-3 space-y-3">
                      {selectedDealContext()?.deal.activityHistory.slice(0, 6).map((activity) => (
                        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3" key={activity.id}>
                          <p className="text-sm font-medium text-[var(--foreground)]">{activity.label}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{activity.description}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{activity.occurredAt} por {activity.actor}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <p className="text-sm font-semibold text-[var(--foreground)]">Nenhum deal selecionado</p>
                <p className="mt-2 max-w-[240px] text-sm leading-6 text-[var(--muted-foreground)]">Clique em um card do kanban para abrir o painel lateral com resumo, timeline e acoes rapidas.</p>
              </div>
            )}
          </Card>
        </div>
        <div className={`${crmSection === "pipeline" ? "grid" : "hidden"} gap-4 xl:grid-cols-[1.05fr_0.95fr]`}>
          <Card className={`p-5 ${activePanelCardClass(activeCrmPanel.id === "crm-panel-tasks")}`} id="crm-panel-tasks">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Tarefas</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Pendencias por prazo e contato vinculado.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{crmData.tasks.filter((task) => task.status !== "Concluida").length} abertas</Badge>
                <Button className="rounded-2xl px-4 py-2" onClick={() => openTaskModal()} variant="secondary">
                  <Plus className="size-4" />
                  Nova tarefa
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {crmData.tasks.map((task) => (
                <div className={`grid gap-3 rounded-[24px] border p-4 md:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_auto] ${taskVisualState(task).containerClass}`} key={task.id}>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{task.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{task.contact}</p>
                    {task.dealLabel ? <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Deal: {task.dealLabel}</p> : null}
                  </div>
                  <div className="text-sm text-[var(--muted-foreground)]">Prazo<br /><span className={`font-semibold ${taskVisualState(task).accentClass}`}>{task.due}</span></div>
                  <div className="text-sm text-[var(--muted-foreground)]">Prioridade<br /><span className="font-semibold text-[var(--foreground)]">{task.priority}</span></div>
                  <div className="text-sm text-[var(--muted-foreground)]">Status<br /><span className={`font-semibold ${taskVisualState(task).accentClass}`}>{task.status}</span><br /><span className="text-xs">{task.assignee}</span></div>
                  <div className="flex items-center justify-start gap-2 md:justify-end">
                    <Badge className={taskVisualState(task).badgeClass}>{taskVisualState(task).label}</Badge>
                    <Badge>{task.priority}</Badge>
                    {task.dealId ? <Button className="rounded-2xl px-3 py-2" onClick={() => openDealContext(task.dealId)} variant="secondary">Deal</Button> : null}
                    <Button className="rounded-2xl px-3 py-2" onClick={() => startEditTask(task)} variant="ghost">
                      <Pencil className="size-4" />
                    </Button>
                    <Button className="rounded-2xl px-3 py-2" onClick={() => void removeTask(task.id)} variant="ghost">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card className={`p-5 ${activePanelCardClass(activeCrmPanel.id === "crm-panel-campaigns")}`} id="crm-panel-campaigns">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">Campanhas</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">Historico recente com campanhas criadas pelo wizard.</p>
                </div>
                <Badge>{crmData.campaigns.length} registros</Badge>
              </div>
              <div className="space-y-3">
                {crmData.campaigns.map((campaign) => (
                  <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={campaign.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{campaign.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge>{campaign.status}</Badge>
                        <Button className="rounded-2xl px-3 py-2" onClick={() => startEditCampaign(campaign)} variant="ghost">
                          <Pencil className="size-4" />
                        </Button>
                        <Button className="rounded-2xl px-3 py-2" onClick={() => void removeCampaign(campaign.id)} variant="ghost">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{campaign.channel} • {campaign.visibility} • {campaign.createdAt}</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{campaign.audience}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className={`p-5 ${activePanelCardClass(activeCrmPanel.id === "crm-panel-goals")}`} id="crm-panel-goals">
              <p className="font-semibold text-[var(--foreground)]">Metas</p>
              <div className="mt-4 space-y-4">
                {crmData.goals.map((goal) => (
                  <button
                    className={`block w-full rounded-[24px] border p-4 text-left transition ${selectedGoalId === goal.id ? "border-[var(--accent)] bg-[linear-gradient(180deg,rgba(59,130,246,0.12),var(--panel-strong))] ring-2 ring-[var(--accent-soft)] ring-offset-2 ring-offset-[var(--background)]" : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-soft)] hover:bg-[var(--panel-strong)]"}`}
                    id={`crm-goal-${goal.id}`}
                    key={goal.id}
                    onClick={() => openGoalContext(goal.id)}
                    type="button"
                  >
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-[var(--foreground)]">{goal.rep}</span>
                      <span className="text-[var(--muted-foreground)]">{goal.target}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-[var(--panel-strong)]">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-strong),#7dd3fc)]" style={{ width: `${goal.current}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">{goal.current}% da meta mensal</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
        <Card className={`${crmSection === "pipeline" ? "block" : "hidden"} p-5 ${activePanelCardClass(activeCrmPanel.id === "crm-panel-contacts")}`} id="crm-panel-contacts">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--foreground)]">Contatos</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Datatable inicial com modal de cadastro.</p>
            </div>
            <Button className="rounded-2xl px-4 py-2" onClick={() => openContactModal()} variant="secondary">Novo contato</Button>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-[var(--border)]">
            <div className="grid bg-[var(--panel-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)] md:grid-cols-[1.1fr_0.9fr_1fr_1.1fr_0.8fr]">
              <span>Nome</span><span>Criado em</span><span>Celular</span><span>E-mail</span><span>Acoes</span>
            </div>
            {crmData.contacts.map((contact) => (
              <div className="grid border-t border-[var(--border)] px-4 py-4 text-sm text-[var(--foreground)] md:grid-cols-[1.1fr_0.9fr_1fr_1.1fr_0.8fr]" key={contact.id}>
                <div>
                  <span className="font-semibold">{contact.name}</span>
                  {contact.private ? <Badge className="ml-2">Privado</Badge> : null}
                </div>
                <span className="text-[var(--muted-foreground)]">{contact.createdAt}</span>
                <span className="text-[var(--muted-foreground)]">{contact.phone}</span>
                <span className="text-[var(--muted-foreground)]">{contact.email}</span>
                <div className="flex items-center gap-2 md:justify-end">
                  <Button className="rounded-2xl px-3 py-2" onClick={() => startEditContact(contact)} variant="ghost">
                    <Pencil className="size-4" />
                  </Button>
                  <Button className="rounded-2xl px-3 py-2" onClick={() => void removeContact(contact.id)} variant="ghost">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {laneModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Funil</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingLaneId ? "Editar etapa" : "Nova etapa"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4">
              <Input placeholder="Titulo da etapa" value={laneForm.title} onChange={(event) => setLaneForm((current) => ({ ...current, title: event.target.value }))} />
              <Textarea placeholder="Descricao curta da etapa" value={laneForm.value} onChange={(event) => setLaneForm((current) => ({ ...current, value: event.target.value }))} />
              <Input placeholder="Probabilidade da etapa (%)" value={String(laneForm.probability)} onChange={(event) => setLaneForm((current) => ({ ...current, probability: Number(event.target.value) || 0 }))} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void saveLane()}>{editingLaneId ? "Salvar etapa" : "Criar etapa"}</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {dealModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-2xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Deal</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingDealId ? "Editar deal" : "Novo deal"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome da oportunidade" value={dealForm.name} onChange={(event) => setDealForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Contato / empresa" value={dealForm.company} onChange={(event) => setDealForm((current) => ({ ...current, company: event.target.value }))} />
              <Input placeholder="Responsavel" value={dealForm.owner} onChange={(event) => setDealForm((current) => ({ ...current, owner: event.target.value }))} />
              <Input placeholder="Forecast" value={dealForm.forecast} onChange={(event) => setDealForm((current) => ({ ...current, forecast: event.target.value }))} />
              <Input placeholder="Proxima tarefa" value={dealForm.nextTask} onChange={(event) => setDealForm((current) => ({ ...current, nextTask: event.target.value }))} />
              <div className="md:col-span-2">
                <Textarea placeholder="Motivo de perda, se houver" value={dealForm.lossReason} onChange={(event) => setDealForm((current) => ({ ...current, lossReason: event.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <p className="mb-2 text-sm text-[var(--muted-foreground)]">Etapa</p>
                <div className="flex flex-wrap gap-2">
                  {crmData.lanes.map((lane) => (
                    <Button className="rounded-full px-3 py-1.5" key={lane.id} onClick={() => setDealForm((current) => ({ ...current, laneId: lane.id }))} variant={dealForm.laneId === lane.id ? "primary" : "secondary"}>
                      {lane.title}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 rounded-[20px] bg-[var(--panel-strong)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                Valor ponderado calculado automaticamente: {calculateWeightedValue(dealForm.forecast, crmData.lanes.find((lane) => lane.id === dealForm.laneId)?.probability ?? 0)}
              </div>
              {selectedDeal()?.activityHistory?.length ? (
                <div className="md:col-span-2 rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Timeline do deal</p>
                  <div className="mt-3 space-y-3">
                    {selectedDeal()?.activityHistory?.map((activity) => (
                      <div className="rounded-[18px] bg-[var(--surface)] px-4 py-3" key={activity.id}>
                        <p className="text-sm font-medium text-[var(--foreground)]">{activity.label}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{activity.description}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{activity.occurredAt} por {activity.actor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void saveDeal()}>{editingDealId ? "Salvar deal" : "Criar deal"}</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {taskModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Tarefa</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingTaskId ? "Editar tarefa" : "Nova tarefa"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4">
              <Input placeholder="Titulo da tarefa" value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} />
              <Input placeholder="Contato ou empresa" value={taskForm.contact} onChange={(event) => setTaskForm((current) => ({ ...current, contact: event.target.value }))} />
              <div>
                <p className="mb-2 text-sm text-[var(--muted-foreground)]">Prazo</p>
                <input className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]" type="datetime-local" value={taskForm.dueAt} onChange={(event) => setTaskForm((current) => ({ ...current, dueAt: event.target.value }))} />
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Preview: {formatTaskDueLabel(taskForm.dueAt, taskForm.status)}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">Prioridade</p>
                  <div className="flex flex-wrap gap-2">
                    {["Baixa", "Media", "Alta"].map((priority) => (
                      <Button className="rounded-full px-3 py-1.5" key={priority} onClick={() => setTaskForm((current) => ({ ...current, priority }))} variant={taskForm.priority === priority ? "primary" : "secondary"}>
                        {priority}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">Responsavel</p>
                  <div className="flex flex-wrap gap-2">
                    {taskAssigneeOptions.filter((value) => value !== "Todos").map((assignee) => (
                      <Button className="rounded-full px-3 py-1.5" key={assignee} onClick={() => setTaskForm((current) => ({ ...current, assignee }))} variant={taskForm.assignee === assignee ? "primary" : "secondary"}>
                        {assignee}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">Status</p>
                  <div className="flex flex-wrap gap-2">
                    {["Aberta", "Em andamento", "Concluida"].map((status) => (
                      <Button className="rounded-full px-3 py-1.5" key={status} onClick={() => setTaskForm((current) => ({ ...current, status }))} variant={taskForm.status === status ? "primary" : "secondary"}>
                        {status}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Deal vinculado</p>
                  {taskForm.dealId ? (
                    <Button className="rounded-2xl px-3 py-2" onClick={() => clearTaskDeal()} variant="ghost">
                      Limpar
                    </Button>
                  ) : null}
                </div>
                <Input placeholder="Buscar deals existentes" value={taskDealSearch} onChange={(event) => setTaskDealSearch(event.target.value)} />
                {taskForm.dealId ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-[var(--foreground)]">Selecionado: {taskForm.dealLabel}</p>
                    <Button className="rounded-full px-3 py-1.5" onClick={() => openDealContext(taskForm.dealId)} variant="secondary">
                      Abrir deal
                    </Button>
                  </div>
                ) : <p className="mt-3 text-sm text-[var(--muted-foreground)]">Selecione um deal real para herdar contexto comercial e responsavel.</p>}
                <div className="mt-3 space-y-2">
                  {filteredDealOptions.map((deal) => (
                    <button
                      className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${taskForm.dealId === deal.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
                      key={deal.id}
                      onClick={() => selectTaskDeal(deal.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{deal.name}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{deal.company} • {deal.laneTitle}</p>
                        </div>
                        <Badge>{deal.owner}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void saveTask()}>{editingTaskId ? "Salvar tarefa" : "Criar tarefa"}</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {contactModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-2xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Contato</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingContactId ? "Editar contato" : "Novo contato"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome" value={contactForm.name} onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Email" value={contactForm.email} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} />
              <Input placeholder="Celular" value={contactForm.phone} onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))} />
              <button
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${contactForm.private ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border-[var(--border)] bg-[var(--panel-strong)] text-[var(--muted-foreground)]"}`}
                onClick={() => setContactForm((current) => ({ ...current, private: !current.private }))}
                type="button"
              >
                Contato privado: {contactForm.private ? "Sim" : "Nao"}
              </button>
            </div>
            <div className="mt-4">
              <Textarea placeholder="Notas" value={contactForm.notes} onChange={(event) => setContactForm((current) => ({ ...current, notes: event.target.value }))} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void createContact()}>{editingContactId ? "Salvar alteracoes" : "Salvar contato"}</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {campaignModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-3xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Campanha</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingCampaignId ? "Editar campanha" : "Nova campanha"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={() => closeCrmWorkflowModal()} variant="ghost">
                <X className="size-4" />
              </Button>
            </div>
            <div className="mb-6 flex flex-wrap gap-2">
              {campaignSteps.map((step, index) => (
                <Badge className={`rounded-full px-3 py-1.5 ${index === campaignStep ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : ""}`} key={step}>{step}</Badge>
              ))}
            </div>
            {campaignStep === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Nome da campanha" value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
                <Input placeholder="Canal de disparo" value={campaignForm.channel} onChange={(event) => setCampaignForm((current) => ({ ...current, channel: event.target.value }))} />
              </div>
            ) : null}
            {campaignStep === 1 ? (
              <Textarea className="min-h-[180px]" placeholder="Defina tags, grupos e condicoes de funil" value={campaignForm.audience} onChange={(event) => setCampaignForm((current) => ({ ...current, audience: event.target.value }))} />
            ) : null}
            {campaignStep === 2 ? (
              <Textarea className="min-h-[220px]" placeholder="Mensagem com placeholders" value={campaignForm.message} onChange={(event) => setCampaignForm((current) => ({ ...current, message: event.target.value }))} />
            ) : null}
            {campaignStep === 3 ? (
              <div className="space-y-3">
                {campaignSummary.map(([label, value]) => (
                  <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={label}>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-6 flex justify-between gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={() => setCampaignModalStep(campaignStep - 1)} variant="ghost">Voltar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void nextCampaignStep()}>{campaignStep === campaignSteps.length - 1 ? (editingCampaignId ? "Salvar campanha" : "Disparar") : "Proximo"}</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function parseTaskDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTaskDueLabel(dueAt?: string, status?: string) {
  const target = parseTaskDate(dueAt);

  if (!target) {
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

function toDateTimeLocalValue(value?: string) {
  const date = parseTaskDate(value);
  if (!date) {
    return "";
  }

  return formatDateTimeLocal(date);
}

function formatDateTimeLocal(date: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function taskVisualState(task: CrmTask) {
  const date = parseTaskDate(task.dueAt);
  const now = new Date();

  if (task.status === "Concluida") {
    return {
      label: "Concluida",
      containerClass: "border-emerald-200 bg-emerald-50/80",
      badgeClass: "bg-emerald-100 text-emerald-700",
      accentClass: "text-emerald-700"
    };
  }

  if (date && date.getTime() < now.getTime()) {
    return {
      label: "Vencida",
      containerClass: "border-rose-200 bg-rose-50/80",
      badgeClass: "bg-rose-100 text-rose-700",
      accentClass: "text-rose-700"
    };
  }

  if (date) {
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startTarget.getTime() - startToday.getTime()) / 86400000);

    if (diffDays === 0) {
      return {
        label: "Vence hoje",
        containerClass: "border-amber-200 bg-amber-50/90",
        badgeClass: "bg-amber-100 text-amber-700",
        accentClass: "text-amber-700"
      };
    }
  }

  return {
    label: task.status,
    containerClass: "border-[var(--border)] bg-[var(--panel-strong)]",
    badgeClass: "bg-sky-100 text-sky-700",
    accentClass: "text-[var(--foreground)]"
  };
}

function taskSortWeight(task: CrmTask, sortBy: (typeof taskSortOptions)[number]) {
  if (sortBy === "Prioridade") {
    return { Alta: 0, Media: 1, Baixa: 2 }[task.priority] ?? 99;
  }

  if (sortBy === "Responsavel") {
    return task.assignee.toLowerCase();
  }

  const date = parseTaskDate(task.dueAt);
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}