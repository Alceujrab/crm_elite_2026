"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, Input } from "@clone-zap/ui";

import { useSession } from "@/components/auth/session-provider";
import { createCrmTaskRequest, fetchCrmData, updateCrmTaskRequest } from "@/lib/api";
import { buildCrmDealHref, buildCrmTaskHref } from "@/lib/context-hrefs";
import { emitCrmTasksUpdated, subscribeCrmTasksUpdated } from "@/lib/crm-task-sync";
import { crmPageData } from "@/lib/mocks/app-data";
import type { CrmData, CrmTask } from "@/lib/types";

type AgendaView = "month" | "week";
type AgendaSlot = { key: string; date?: Date; tasks: CrmTask[]; empty?: boolean };
type GlobalCalendarPreferences = {
  view: AgendaView;
  monthOffset: number;
  selectedDayKey: string | null;
  assigneeFilter: string;
};

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"] as const;
const quickTaskPriorityOptions = ["Baixa", "Media", "Alta"] as const;
const quickTaskStatusOptions = ["Aberta", "Em andamento", "Concluida"] as const;

function globalCalendarStorageKey(userKey: string) {
  return `clone-zap:global-calendar:${userKey}`;
}

function sanitizeGlobalCalendarPreferences(value: unknown): GlobalCalendarPreferences | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<GlobalCalendarPreferences>;
  const view = record.view === "month" || record.view === "week" ? record.view : null;
  const monthOffset = typeof record.monthOffset === "number" && Number.isFinite(record.monthOffset) ? record.monthOffset : 0;
  const selectedDayKey = typeof record.selectedDayKey === "string" ? record.selectedDayKey : null;
  const assigneeFilter = typeof record.assigneeFilter === "string" ? record.assigneeFilter : "Todos";

  if (!view) {
    return null;
  }

  return {
    view,
    monthOffset,
    selectedDayKey,
    assigneeFilter
  };
}

function parseTaskDate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function taskState(task: CrmTask) {
  const date = parseTaskDate(task.dueAt);
  const now = new Date();

  if (task.status === "Concluida") {
    return "Concluida";
  }

  if (date && date.getTime() < now.getTime()) {
    return "Vencida";
  }

  if (date) {
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startTarget.getTime() - startToday.getTime()) / 86400000);
    if (diffDays === 0) {
      return "Vence hoje";
    }
  }

  return task.status;
}

function formatDateTimeLocal(date: Date) {
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTaskDueLabel(date: Date) {
  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function extractTaskTimeValue(task: CrmTask) {
  const date = parseTaskDate(task.dueAt);
  if (!date) {
    return "09:00";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function GlobalCalendarPopover({ open }: Readonly<{ open: boolean }>) {
  const { session } = useSession();
  const calendarPreferencesUserKey = `${session?.email ?? session?.initials ?? "guest"}:${session?.workspace ?? "default"}`;
  const [view, setView] = useState<AgendaView>("week");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [overflowSlotKey, setOverflowSlotKey] = useState<string | null>(null);
  const [crmData, setCrmData] = useState<CrmData | null>(null);
  const [tasks, setTasks] = useState<CrmTask[]>(crmPageData.tasks.map((task) => ({ ...task })));
  const [quickTaskTitle, setQuickTaskTitle] = useState("");
  const [quickTaskTime, setQuickTaskTime] = useState("09:00");
  const [quickTaskAssignee, setQuickTaskAssignee] = useState("AC");
  const [quickTaskPriority, setQuickTaskPriority] = useState<(typeof quickTaskPriorityOptions)[number]>("Media");
  const [quickTaskDealId, setQuickTaskDealId] = useState("");
  const [quickTaskDealLabel, setQuickTaskDealLabel] = useState("");
  const [quickTaskDealSearch, setQuickTaskDealSearch] = useState("");
  const [quickTaskPending, setQuickTaskPending] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskTime, setEditingTaskTime] = useState("09:00");
  const [editingTaskAssignee, setEditingTaskAssignee] = useState("AC");
  const [editingTaskPriority, setEditingTaskPriority] = useState<(typeof quickTaskPriorityOptions)[number]>("Media");
  const [editingTaskStatus, setEditingTaskStatus] = useState<(typeof quickTaskStatusOptions)[number]>("Aberta");
  const [editingTaskPending, setEditingTaskPending] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState("Todos");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(globalCalendarStorageKey(calendarPreferencesUserKey));
      const parsed = rawValue ? sanitizeGlobalCalendarPreferences(JSON.parse(rawValue)) : null;

      if (parsed) {
        setView(parsed.view);
        setMonthOffset(parsed.monthOffset);
        setSelectedDayKey(parsed.selectedDayKey);
        setAssigneeFilter(parsed.assigneeFilter);
      }
    } catch {
      // Ignore invalid local state and keep defaults.
    }
  }, [calendarPreferencesUserKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      globalCalendarStorageKey(calendarPreferencesUserKey),
      JSON.stringify({ view, monthOffset, selectedDayKey, assigneeFilter })
    );
  }, [assigneeFilter, calendarPreferencesUserKey, monthOffset, selectedDayKey, view]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    fetchCrmData().then((data) => {
      if (active) {
        setCrmData(data);
        setTasks(data.tasks);
      }
    });

    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => subscribeCrmTasksUpdated((nextTasks) => setTasks(nextTasks)), []);

  useEffect(() => {
    setQuickTaskTitle("");
    setQuickTaskTime("09:00");
    setQuickTaskPriority("Media");
    setQuickTaskDealId("");
    setQuickTaskDealLabel("");
    setQuickTaskDealSearch("");
    setEditingTaskId(null);
  }, [selectedDayKey]);

  useEffect(() => {
    if (!overflowSlotKey) {
      setEditingTaskId(null);
    }
  }, [overflowSlotKey]);

  const assigneeOptions = useMemo(() => {
    const values = new Set<string>([session?.initials ?? "AC"]);

    for (const task of tasks) {
      if (task.assignee) {
        values.add(task.assignee);
      }
    }

    return Array.from(values);
  }, [session?.initials, tasks]);

  const filteredTasks = useMemo(
    () => (assigneeFilter === "Todos" ? tasks : tasks.filter((task) => task.assignee === assigneeFilter)),
    [assigneeFilter, tasks]
  );

  const allDeals = useMemo(
    () => (crmData?.lanes ?? crmPageData.lanes).flatMap((lane) => lane.cards.map((deal) => ({ ...deal, laneId: lane.id, laneTitle: lane.title }))),
    [crmData?.lanes]
  );

  const filteredDealOptions = useMemo(() => {
    const normalizedSearch = quickTaskDealSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return allDeals.slice(0, 5);
    }

    return allDeals
      .filter((deal) => `${deal.name} ${deal.company} ${deal.owner} ${deal.laneTitle}`.toLowerCase().includes(normalizedSearch))
      .slice(0, 5);
  }, [allDeals, quickTaskDealSearch]);

  function selectQuickTaskDeal(dealId: string) {
    const linkedDeal = allDeals.find((deal) => deal.id === dealId);

    if (!linkedDeal) {
      return;
    }

    setQuickTaskDealId(linkedDeal.id);
    setQuickTaskDealLabel(linkedDeal.name);
    setQuickTaskDealSearch(linkedDeal.name);
    setQuickTaskAssignee(linkedDeal.owner);
  }

  function clearQuickTaskDeal() {
    setQuickTaskDealId("");
    setQuickTaskDealLabel("");
    setQuickTaskDealSearch("");
  }

  const calendar = useMemo(() => {
    const map = new Map<string, CrmTask[]>();
    for (const task of filteredTasks) {
      const date = parseTaskDate(task.dueAt);
      if (!date) {
        continue;
      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const bucket = map.get(key) ?? [];
      bucket.push(task);
      map.set(key, bucket);
    }

    const reference = new Date();
    reference.setMonth(reference.getMonth() + monthOffset);

    if (view === "week") {
      const startOfWeek = new Date();
      const currentDay = (startOfWeek.getDay() + 6) % 7;
      startOfWeek.setDate(startOfWeek.getDate() - currentDay + monthOffset * 7);
      startOfWeek.setHours(0, 0, 0, 0);
      const slots: AgendaSlot[] = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + index);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return { key, date, tasks: map.get(key) ?? [] };
      });

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return {
        label: `${startOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} - ${endOfWeek.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`,
        slots
      };
    }

    const year = reference.getFullYear();
    const month = reference.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingSlots = (firstDay.getDay() + 6) % 7;
    const slots: AgendaSlot[] = [];
    for (let index = 0; index < leadingSlots; index += 1) {
      slots.push({ key: `empty-${index}`, tasks: [], empty: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      slots.push({ key, date, tasks: map.get(key) ?? [] });
    }

    return {
      label: firstDay.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      slots
    };
  }, [filteredTasks, monthOffset, view]);

  const highlights = useMemo(
    () => filteredTasks
      .filter((task) => task.status !== "Concluida" && parseTaskDate(task.dueAt))
      .slice()
      .sort((left, right) => Number(parseTaskDate(left.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) - Number(parseTaskDate(right.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 5),
    [filteredTasks]
  );

  const selectedDaySlot = useMemo(
    () => calendar.slots.find((slot) => slot.key === selectedDayKey && slot.date) ?? null,
    [calendar.slots, selectedDayKey]
  );

  const overflowSlot = useMemo(
    () => calendar.slots.find((slot) => slot.key === overflowSlotKey && slot.date) ?? null,
    [calendar.slots, overflowSlotKey]
  );

  function syncTasks(nextTasks: CrmTask[], nextCrmData?: CrmData | null) {
    if (nextCrmData) {
      setCrmData(nextCrmData);
    }

    setTasks(nextTasks);
    emitCrmTasksUpdated(nextTasks);
  }

  function applyLocalTaskUpdate(taskId: string, updater: (task: CrmTask) => CrmTask) {
    setTasks((current) => {
      const nextTasks = current.map((task) => (task.id === taskId ? updater(task) : task));
      emitCrmTasksUpdated(nextTasks);
      return nextTasks;
    });
  }

  function applyLocalTaskCreate(task: CrmTask) {
    setTasks((current) => {
      const nextTasks = [task, ...current];
      emitCrmTasksUpdated(nextTasks);
      return nextTasks;
    });
  }

  async function completeTask(task: CrmTask) {
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
      syncTasks(data.tasks, data);
    } catch {
      applyLocalTaskUpdate(task.id, (current) => ({ ...current, status: "Concluida" }));
    }
  }

  async function postponeTask(task: CrmTask, days: number) {
    const base = parseTaskDate(task.dueAt) ?? new Date();
    const nextDue = new Date(base);
    nextDue.setDate(nextDue.getDate() + days);
    nextDue.setHours(days === 0 ? 17 : 9, 0, 0, 0);
    const nextDueAt = formatDateTimeLocal(nextDue);
    const nextDueLabel = nextDue.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const payload = {
      title: task.title,
      contact: task.contact,
      dueAt: nextDueAt,
      priority: task.priority,
      status: task.status,
      assignee: task.assignee,
      dealId: task.dealId ?? "",
      dealLabel: task.dealLabel ?? ""
    };

    try {
      const data = await updateCrmTaskRequest(task.id, payload);
      syncTasks(data.tasks, data);
    } catch {
      applyLocalTaskUpdate(task.id, (current) => ({ ...current, dueAt: nextDueAt, due: days === 0 ? "Hoje 17:00" : `${nextDueLabel} 09:00` }));
    }
  }

  function startTaskEdit(task: CrmTask) {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
    setEditingTaskTime(extractTaskTimeValue(task));
    setEditingTaskAssignee(task.assignee || "AC");
    setEditingTaskPriority(quickTaskPriorityOptions.includes(task.priority as (typeof quickTaskPriorityOptions)[number]) ? (task.priority as (typeof quickTaskPriorityOptions)[number]) : "Media");
    setEditingTaskStatus(quickTaskStatusOptions.includes(task.status as (typeof quickTaskStatusOptions)[number]) ? (task.status as (typeof quickTaskStatusOptions)[number]) : "Aberta");
  }

  function cancelTaskEdit() {
    setEditingTaskId(null);
    setEditingTaskPending(false);
  }

  async function saveTaskEdit(task: CrmTask) {
    if (!editingTaskId || editingTaskPending || !editingTaskTitle.trim()) {
      return;
    }

    const scheduledAt = parseTaskDate(task.dueAt) ?? new Date();
    const [hours, minutes] = editingTaskTime.split(":").map((value) => Number(value));
    scheduledAt.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
    const nextDueAt = formatDateTimeLocal(scheduledAt);
    const payload = {
      title: editingTaskTitle.trim(),
      contact: task.contact,
      dueAt: nextDueAt,
      priority: editingTaskPriority,
      status: editingTaskStatus,
      assignee: editingTaskAssignee,
      dealId: task.dealId ?? "",
      dealLabel: task.dealLabel ?? ""
    };

    setEditingTaskPending(true);

    try {
      const data = await updateCrmTaskRequest(task.id, payload);
      syncTasks(data.tasks, data);
      setEditingTaskId(null);
    } catch {
      applyLocalTaskUpdate(task.id, (current) => ({
        ...current,
        title: payload.title,
        dueAt: nextDueAt,
        due: formatTaskDueLabel(scheduledAt),
        priority: payload.priority,
        status: payload.status,
        assignee: payload.assignee
      }));
      setEditingTaskId(null);
    } finally {
      setEditingTaskPending(false);
    }
  }

  async function createQuickTask() {
    if (!selectedDaySlot?.date || !quickTaskTitle.trim() || quickTaskPending) {
      return;
    }

    const scheduledAt = new Date(selectedDaySlot.date);
    const [hours, minutes] = quickTaskTime.split(":").map((value) => Number(value));
    scheduledAt.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
    const dueAt = formatDateTimeLocal(scheduledAt);
    const dueLabel = scheduledAt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });
    const linkedDeal = quickTaskDealId ? allDeals.find((deal) => deal.id === quickTaskDealId) : undefined;

    const payload = {
      title: quickTaskTitle.trim(),
      contact: linkedDeal?.company ?? "Contato principal",
      dueAt,
      priority: quickTaskPriority,
      status: "Aberta",
      assignee: quickTaskAssignee,
      dealId: linkedDeal?.id,
      dealLabel: linkedDeal?.name
    };

    setQuickTaskPending(true);

    try {
      const data = await createCrmTaskRequest(payload);
      syncTasks(data.tasks, data);
      setQuickTaskTitle("");
      setQuickTaskPriority("Media");
    } catch {
      applyLocalTaskCreate({
        id: `${Date.now()}`,
        title: payload.title,
        contact: payload.contact,
        dueAt,
        due: `${dueLabel} ${quickTaskTime}`,
        priority: payload.priority,
        status: payload.status,
        assignee: payload.assignee,
        dealId: payload.dealId,
        dealLabel: payload.dealLabel
      });
      setQuickTaskTitle("");
      setQuickTaskPriority("Media");
    } finally {
      setQuickTaskPending(false);
    }
  }

  function renderTaskCard(task: CrmTask, compact = false) {
    const isEditing = editingTaskId === task.id;

    return (
      <div className={`rounded-[18px] border border-[var(--border)] bg-[var(--surface)] ${compact ? "px-3 py-2" : "px-3 py-3"}`} key={task.id}>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Edicao rapida</p>
              <Badge>{taskState(task)}</Badge>
            </div>
            <Input value={editingTaskTitle} onChange={(event) => setEditingTaskTitle(event.target.value)} />
            <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Horario</p>
                <input className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]" type="time" value={editingTaskTime} onChange={(event) => setEditingTaskTime(event.target.value)} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Responsavel</p>
                <div className="flex flex-wrap gap-2">
                  {assigneeOptions.map((assignee) => (
                    <Button className="rounded-full px-3 py-1.5" key={`${task.id}-${assignee}`} onClick={() => setEditingTaskAssignee(assignee)} variant={editingTaskAssignee === assignee ? "primary" : "secondary"}>
                      {assignee}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Prioridade</p>
              <div className="flex flex-wrap gap-2">
                {quickTaskPriorityOptions.map((priority) => (
                  <Button className="rounded-full px-3 py-1.5" key={`${task.id}-${priority}`} onClick={() => setEditingTaskPriority(priority)} variant={editingTaskPriority === priority ? "primary" : "secondary"}>
                    {priority}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Status</p>
              <div className="flex flex-wrap gap-2">
                {quickTaskStatusOptions.map((status) => (
                  <Button className="rounded-full px-3 py-1.5" key={`${task.id}-${status}`} onClick={() => setEditingTaskStatus(status)} variant={editingTaskStatus === status ? "primary" : "secondary"}>
                    {status}
                  </Button>
                ))}
              </div>
            </div>
            <div className="rounded-[16px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
              {task.contact}
              {task.dealLabel ? ` • Deal: ${task.dealLabel}` : ""}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-full px-3 py-1.5" disabled={!editingTaskTitle.trim() || editingTaskPending} onClick={() => void saveTaskEdit(task)}>
                {editingTaskPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button className="rounded-full px-3 py-1.5" onClick={() => cancelTaskEdit()} variant="ghost">Cancelar</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">{task.title}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{task.contact} • {task.assignee}</p>
              </div>
              <Badge>{taskState(task)}</Badge>
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">{task.due}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {task.status !== "Concluida" ? (
                <Button className="rounded-full px-3 py-1.5" onClick={() => void completeTask(task)} variant="secondary">Concluir</Button>
              ) : null}
              <Button className="rounded-full px-3 py-1.5" onClick={() => startTaskEdit(task)} variant="secondary">Editar</Button>
              <Button className="rounded-full px-3 py-1.5" onClick={() => void postponeTask(task, 0)} variant="secondary">Hoje 17h</Button>
              <Button className="rounded-full px-3 py-1.5" onClick={() => void postponeTask(task, 1)} variant="secondary">+1 dia</Button>
              {task.dealId ? (
                <Link className="inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-strong)]" href={buildCrmDealHref(task.dealId)}>
                  Abrir deal
                </Link>
              ) : null}
              <Link className="inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--panel-strong)]" href={buildCrmTaskHref(task.id)}>
                Abrir no CRM
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className="absolute right-0 top-14 z-20 w-[380px] p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--foreground)]">Agenda global</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{assigneeFilter === "Todos" ? "Tarefas operacionais da equipe" : `Tarefas operacionais de ${assigneeFilter}`}</p>
        </div>
        <Badge>{filteredTasks.filter((task) => task.dueAt).length} prazos</Badge>
      </div>
      <div className="mt-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Responsavel</p>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-full px-3 py-1.5" onClick={() => setAssigneeFilter("Todos")} variant={assigneeFilter === "Todos" ? "primary" : "secondary"}>Todos</Button>
          {assigneeOptions.map((assignee) => (
            <Button className="rounded-full px-3 py-1.5" key={`filter-${assignee}`} onClick={() => setAssigneeFilter(assignee)} variant={assigneeFilter === assignee ? "primary" : "secondary"}>
              {assignee}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex rounded-full bg-[var(--panel-strong)] p-1">
          <Button className="rounded-full px-3 py-1.5" onClick={() => setView("week")} variant={view === "week" ? "primary" : "ghost"}>Semana</Button>
          <Button className="rounded-full px-3 py-1.5" onClick={() => setView("month")} variant={view === "month" ? "primary" : "ghost"}>Mes</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button className="rounded-full px-3 py-1.5" onClick={() => setMonthOffset((current) => current - 1)} variant="secondary">Anterior</Button>
          <Button className="rounded-full px-3 py-1.5" onClick={() => setMonthOffset(0)} variant="secondary">Atual</Button>
          <Button className="rounded-full px-3 py-1.5" onClick={() => setMonthOffset((current) => current + 1)} variant="secondary">Proximo</Button>
        </div>
      </div>
      <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{calendar.label}</p>
          <CalendarRange className="size-4 text-[var(--muted-foreground)]" />
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
          {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {calendar.slots.map((slot) => (
            <button className={`${view === "week" ? "min-h-[96px]" : "min-h-[56px]"} rounded-[16px] border p-2 text-left ${slot.empty ? "border-transparent bg-transparent" : selectedDayKey === slot.key ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)]"}`} key={slot.key} onClick={() => slot.date ? setSelectedDayKey((current) => current === slot.key ? null : slot.key) : undefined} type="button">
              {slot.date ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--foreground)]">{slot.date.getDate()}</span>
                    {slot.tasks.length ? <span className="text-[10px] text-[var(--muted-foreground)]">{slot.tasks.length}</span> : null}
                  </div>
                  <div className="mt-1 space-y-1">
                    {slot.tasks.slice(0, view === "week" ? 3 : 1).map((task) => (
                      <div className="truncate rounded-full bg-sky-100 px-2 py-1 text-[10px] font-medium text-sky-700" key={task.id}>{task.assignee} • {task.title}</div>
                    ))}
                    {slot.tasks.length > (view === "week" ? 3 : 1) ? (
                      <button className="text-[10px] font-semibold text-[var(--accent-strong)]" onClick={(event) => { event.stopPropagation(); setOverflowSlotKey(slot.key); }} type="button">
                        +{slot.tasks.length - (view === "week" ? 3 : 1)} adicionais
                      </button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </button>
          ))}
        </div>
      </div>
      {selectedDaySlot?.date ? (
        <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Dia {selectedDaySlot.date?.toLocaleDateString("pt-BR")}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{selectedDaySlot.tasks.length} tarefas no calendario</p>
            </div>
            <Button className="rounded-full px-3 py-1.5" onClick={() => setSelectedDayKey(null)} variant="ghost">Fechar</Button>
          </div>
          <div className="mt-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Criacao rapida</p>
            <div className="mt-2 flex items-center gap-2">
              <Input placeholder="Nova tarefa para este dia" value={quickTaskTitle} onChange={(event) => setQuickTaskTitle(event.target.value)} />
              <Button className="shrink-0 rounded-full px-3 py-1.5" disabled={!quickTaskTitle.trim() || quickTaskPending} onClick={() => void createQuickTask()}>
                {quickTaskPending ? "Criando..." : "Criar"}
              </Button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Horario</p>
                <input className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]" type="time" value={quickTaskTime} onChange={(event) => setQuickTaskTime(event.target.value)} />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Responsavel</p>
                <div className="flex flex-wrap gap-2">
                  {assigneeOptions.map((assignee) => (
                    <Button className="rounded-full px-3 py-1.5" key={assignee} onClick={() => setQuickTaskAssignee(assignee)} variant={quickTaskAssignee === assignee ? "primary" : "secondary"}>
                      {assignee}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Prioridade</p>
              <div className="flex flex-wrap gap-2">
                {quickTaskPriorityOptions.map((priority) => (
                  <Button className="rounded-full px-3 py-1.5" key={priority} onClick={() => setQuickTaskPriority(priority)} variant={quickTaskPriority === priority ? "primary" : "secondary"}>
                    {priority}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Deal vinculado</p>
                {quickTaskDealId ? <Button className="rounded-full px-3 py-1.5" onClick={() => clearQuickTaskDeal()} variant="ghost">Limpar</Button> : null}
              </div>
              <div className="mt-2">
                <Input placeholder="Buscar deal para herdar contexto" value={quickTaskDealSearch} onChange={(event) => setQuickTaskDealSearch(event.target.value)} />
                {quickTaskDealId ? <p className="mt-2 text-sm text-[var(--foreground)]">Selecionado: {quickTaskDealLabel}</p> : <p className="mt-2 text-xs text-[var(--muted-foreground)]">Opcional: ao vincular um deal, o contato e o responsavel podem seguir o contexto comercial.</p>}
              </div>
              <div className="mt-3 space-y-2">
                {filteredDealOptions.map((deal) => (
                  <button
                    className={`w-full rounded-[16px] border px-3 py-3 text-left transition ${quickTaskDealId === deal.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
                    key={deal.id}
                    onClick={() => selectQuickTaskDeal(deal.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{deal.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{deal.company} • {deal.laneTitle}</p>
                      </div>
                      <Badge>{deal.owner}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">Criacao direta na agenda com horario e responsavel definidos antes de abrir o CRM.</p>
          </div>
          <div className="mt-3 space-y-2">
            {selectedDaySlot.tasks.length ? selectedDaySlot.tasks.map((task) => renderTaskCard(task)) : (
              <p className="rounded-[18px] border border-dashed border-[var(--border)] px-3 py-4 text-sm text-[var(--muted-foreground)]">Nenhuma tarefa neste dia ainda. Use a criacao rapida acima para preencher a agenda.</p>
            )}
          </div>
        </div>
      ) : null}
      {overflowSlot?.tasks.length ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#081120]/30 backdrop-blur-sm">
          <div className="h-full w-full max-w-md border-l border-[var(--border)] bg-[var(--background)] p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Todas as tarefas do dia</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{overflowSlot.date?.toLocaleDateString("pt-BR")}</p>
              </div>
              <Button className="rounded-full px-3 py-1.5" onClick={() => setOverflowSlotKey(null)} variant="ghost">Fechar</Button>
            </div>
            <div className="mt-4 space-y-3 overflow-y-auto pb-6">
              {overflowSlot.tasks.map((task) => renderTaskCard(task))}
            </div>
          </div>
        </div>
      ) : null}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">Proximas entregas</p>
          <Link className="text-xs font-semibold text-[var(--accent-strong)]" href="/crm?section=tasks">
            Abrir CRM
          </Link>
        </div>
        {highlights.map((task) => (
          renderTaskCard(task, true)
        ))}
      </div>
    </Card>
  );
}