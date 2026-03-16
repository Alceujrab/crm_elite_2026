"use client";

import {
  AtSign,
  Bell,
  CalendarDays,
  ChartColumnBig,
  ChevronDown,
  Inbox,
  LayoutGrid,
  LogOut,
  Search,
  Settings,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card } from "@clone-zap/ui";

import { useSession } from "@/components/auth/session-provider";
import { GlobalCalendarPopover } from "@/components/shell/global-calendar-popover";
import { GlobalSearchModal } from "@/components/search/global-search-modal";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { fetchCrmData, fetchInboxData, fetchSettingsData } from "@/lib/api";
import { buildCrmDealHref, buildCrmTaskHref, buildInboxConversationHref, buildSettingsAutomationHref, buildSettingsChannelHref } from "@/lib/context-hrefs";
import { subscribeCrmTasksUpdated } from "@/lib/crm-task-sync";
import { crmPageData, inboxPageData, shellData } from "@/lib/mocks/app-data";
import type { CrmData, CrmTask, InboxData, SettingsData } from "@/lib/types";

const modules = [
  { label: "Inbox", href: "/inbox/all", icon: Inbox, key: "inbox" },
  { label: "CRM", href: "/crm", icon: LayoutGrid, key: "crm" },
  { label: "Reports", href: "/reports", icon: ChartColumnBig, key: "reports" },
  { label: "Settings", href: "/settings", icon: Settings, key: "settings" }
] as const;

const profileMenu = [
  { label: "Minha conta", icon: ShieldCheck },
  { label: "Configuracoes", icon: Settings },
  { label: "Sair", icon: LogOut }
] as const;

type HeaderActionItem = {
  id: string;
  title: string;
  description: string;
  kind: "task" | "deal" | "fallback";
  badgeLabel: string;
  badgeClassName: string;
  taskId?: string;
  dealId?: string;
  href?: string;
};

type NotificationView = "all" | "mine";
type ContextualView = "all" | "mine";

type DerivedContextualMenuItem = {
  label: string;
  count?: string;
  description?: string;
  active?: boolean;
  href?: string;
};

function notificationViewStorageKey(userKey: string) {
  return `clone-zap:header-notifications:${userKey}`;
}

function contextualViewStorageKey(userKey: string, moduleKey: "inbox" | "crm") {
  return `clone-zap:contextual-view:${moduleKey}:${userKey}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function resolveModule(pathname: string) {
  return modules.find((item) => pathname.startsWith(item.href.replace("/all", ""))) ?? modules[0];
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mentionsOpen, setMentionsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [notificationView, setNotificationView] = useState<NotificationView>("all");
  const [contextualView, setContextualView] = useState<ContextualView>("all");
  const [tasks, setTasks] = useState<CrmTask[]>(crmPageData.tasks.map((task) => ({ ...task })));
  const [crmSnapshot, setCrmSnapshot] = useState<CrmData | null>(null);
  const [inboxSnapshot, setInboxSnapshot] = useState<InboxData | null>(null);
  const [settingsSnapshot, setSettingsSnapshot] = useState<SettingsData | null>(null);
  const { clearSession, session } = useSession();
  const notificationUserKey = `${session?.email ?? session?.initials ?? "guest"}:${session?.workspace ?? "default"}`;
  const inboxFilterParam = searchParams.get("filter");
  const inboxConversationParam = searchParams.get("conversationId");
  const inboxPanelParam = searchParams.get("panel");
  const inboxDetailParam = searchParams.get("detail");
  const crmSectionParam = searchParams.get("section");
  const crmPanelParam = searchParams.get("panel");
  const reportsPanelParam = searchParams.get("panel");
  const settingsPanelParam = searchParams.get("panel");
  const settingsBotParam = searchParams.get("botId");
  const settingsEdgeParam = searchParams.get("edgeId");

  const activeModule = resolveModule(pathname);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(notificationViewStorageKey(notificationUserKey));
      if (rawValue === "mine" || rawValue === "all") {
        setNotificationView(rawValue);
      }
    } catch {
      setNotificationView("all");
    }
  }, [notificationUserKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(notificationViewStorageKey(notificationUserKey), notificationView);
  }, [notificationUserKey, notificationView]);

  useEffect(() => {
    if ((activeModule.key !== "inbox" && activeModule.key !== "crm") || typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(contextualViewStorageKey(notificationUserKey, activeModule.key));
      if (rawValue === "mine" || rawValue === "all") {
        setContextualView(rawValue);
        return;
      }
    } catch {
      // Ignore and keep default.
    }

    setContextualView("all");
  }, [activeModule.key, notificationUserKey]);

  useEffect(() => {
    if ((activeModule.key !== "inbox" && activeModule.key !== "crm") || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(contextualViewStorageKey(notificationUserKey, activeModule.key), contextualView);
  }, [activeModule.key, contextualView, notificationUserKey]);

  const headerNotifications = useMemo<HeaderActionItem[]>(() => {
    const now = new Date();
    const assigneeKey = session?.initials ?? "AC";
    const allDeals = (crmSnapshot?.lanes ?? crmPageData.lanes).flatMap((lane) => lane.cards.map((deal) => ({ ...deal, laneId: lane.id, laneTitle: lane.title, probability: lane.probability })));
    const filteredTasks = notificationView === "mine"
      ? tasks.filter((task) => task.assignee === assigneeKey)
      : tasks;
    const overdue = filteredTasks.filter((task) => task.status !== "Concluida" && task.dueAt && new Date(task.dueAt).getTime() < now.getTime());
    const today = filteredTasks.filter((task) => {
      if (task.status === "Concluida" || !task.dueAt) {
        return false;
      }

      const date = new Date(task.dueAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    });
    const highPriority = filteredTasks.filter((task) => task.status !== "Concluida" && task.priority === "Alta");
    const filteredDeals = notificationView === "mine"
      ? allDeals.filter((deal) => deal.owner === assigneeKey)
      : allDeals;
    const dealAlerts = filteredDeals
      .filter((deal) => deal.probability >= 60 || (deal.nextTask && deal.nextTask !== "Sem proxima tarefa"))
      .slice(0, 3);

    const items: HeaderActionItem[] = [];
    const seen = new Set<string>();

    function appendTasks(prefix: string, taskList: CrmTask[]) {
      for (const task of taskList) {
        if (seen.has(task.id)) {
          continue;
        }

        items.push({
          id: `${prefix}-${task.id}`,
          title: `${prefix}: ${task.title}`,
          description: `${task.contact} • ${task.assignee} • ${task.due}`,
          kind: "task",
          badgeLabel: prefix,
          badgeClassName: prefix === "Vencida" ? "bg-rose-100 text-rose-700" : prefix === "Hoje" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700",
          taskId: task.id,
          href: buildCrmTaskHref(task.id)
        });
        seen.add(task.id);

        if (items.length >= 6) {
          break;
        }
      }
    }

    function appendDeals() {
      for (const deal of dealAlerts) {
        if (seen.has(deal.id) || items.length >= 6) {
          continue;
        }

        items.push({
          id: `deal-${deal.id}`,
          title: `Deal em foco: ${deal.name}`,
          description: `${deal.company} • ${deal.laneTitle} • ${deal.nextTask ?? "Sem proxima tarefa"}`,
          kind: "deal",
          badgeLabel: `${deal.probability}%`,
          badgeClassName: "bg-emerald-100 text-emerald-700",
          dealId: deal.id,
          href: buildCrmDealHref(deal.id)
        });
        seen.add(deal.id);
      }
    }

    appendTasks("Vencida", overdue);
    if (items.length < 6) {
      appendTasks("Hoje", today);
    }
    if (items.length < 6) {
      appendTasks("Alta prioridade", highPriority);
    }
    if (items.length < 6) {
      appendDeals();
    }

    return items.length
      ? items
      : notificationView === "mine"
        ? [{ id: "fallback-mine", title: "Nada pendente para voce", description: "Quando tarefas ou deals exigirem sua acao, eles aparecerao aqui.", kind: "fallback", badgeLabel: "Pessoal", badgeClassName: "bg-slate-100 text-slate-700" }]
        : shellData.notifications.map((item, index) => ({ id: `fallback-${index}`, title: item.title, description: item.description, kind: "fallback", badgeLabel: "Info", badgeClassName: "bg-slate-100 text-slate-700" }));
  }, [crmSnapshot?.lanes, notificationView, session?.initials, tasks]);

  const headerMentions = useMemo<HeaderActionItem[]>(() => {
    const assigneeKey = session?.initials ?? "AC";
    const assignedTasks = tasks.filter((task) => task.status !== "Concluida" && task.assignee === assigneeKey);

    if (!assignedTasks.length) {
      return [
        { id: "no-mentions", title: "Nenhuma mencao operacional", description: "Quando tarefas forem roteadas para voce, elas aparecerao aqui.", kind: "fallback", badgeLabel: "@", badgeClassName: "bg-slate-100 text-slate-700" }
      ];
    }

    return assignedTasks.slice(0, 6).map((task) => ({
      id: `mention-${task.id}`,
      title: task.title,
      description: `${task.contact} • ${task.due}`,
      kind: "task",
      badgeLabel: "Mencao",
      badgeClassName: "bg-sky-100 text-sky-700",
      taskId: task.id,
      href: buildCrmTaskHref(task.id)
    }));
  }, [session?.initials, tasks]);

  const inboxNotificationItems = useMemo<HeaderActionItem[]>(() => {
    const conversations = inboxSnapshot?.conversations ?? inboxPageData.conversations;

    return conversations
      .filter((conversation) => conversation.unread && !conversation.isArchived)
      .slice(0, 3)
      .map((conversation) => ({
        id: `inbox-${conversation.id}`,
        title: `Inbox: ${conversation.name}`,
        description: `${conversation.channel} • ${conversation.status} • ${conversation.snippet}`,
        kind: "fallback" as const,
        badgeLabel: "Inbox",
        badgeClassName: "bg-violet-100 text-violet-700",
        href: buildInboxConversationHref({
          conversationId: conversation.id,
          filter: conversation.isMine ? "meus" : "entrada"
        })
      }));
  }, [inboxSnapshot?.conversations]);

  const settingsNotificationItems = useMemo<HeaderActionItem[]>(() => {
    if (!settingsSnapshot) {
      return [];
    }

    const channelAlerts = settingsSnapshot.channels
      .filter((channel) => channel.status === "Erro" || channel.status === "Pendente")
      .slice(0, 2)
      .map((channel) => ({
        id: `channel-${channel.id}`,
        title: `Canal ${channel.status.toLowerCase()}: ${channel.name}`,
        description: `${channel.type} • ${channel.credentialLabel}`,
        kind: "fallback" as const,
        badgeLabel: channel.status,
        badgeClassName: channel.status === "Erro" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700",
        href: buildSettingsChannelHref(channel.id)
      }));

    const automationAlerts = settingsSnapshot.automations
      .filter((automation) => automation.status === "Rascunho")
      .slice(0, 2)
      .map((automation) => ({
        id: `automation-${automation.id}`,
        title: `Automacao em rascunho: ${automation.name}`,
        description: `${automation.trigger} • ${automation.result}`,
        kind: "fallback" as const,
        badgeLabel: automation.status,
        badgeClassName: "bg-slate-100 text-slate-700",
        href: buildSettingsAutomationHref(automation.id)
      }));

    return [...channelAlerts, ...automationAlerts].slice(0, 3);
  }, [settingsSnapshot]);

  const headerMentionsCount = useMemo(() => {
    const assigneeKey = session?.initials ?? "AC";
    return tasks.filter((task) => task.status !== "Concluida" && task.assignee === assigneeKey).length;
  }, [session?.initials, tasks]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }

      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setMentionsOpen(false);
        setCalendarOpen(false);
        setProfileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCrmData(), fetchInboxData(), fetchSettingsData()]).then(([crmData, inboxData, settingsData]) => {
      if (active) {
        setCrmSnapshot(crmData);
        setTasks(crmData.tasks);
        setInboxSnapshot(inboxData);
        setSettingsSnapshot(settingsData);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => subscribeCrmTasksUpdated((nextTasks) => setTasks(nextTasks)), []);

  const contextualItems = useMemo<DerivedContextualMenuItem[]>(() => {
    if (activeModule.key === "inbox") {
      const conversations = inboxSnapshot?.conversations ?? inboxPageData.conversations;
      const mineConversations = conversations.filter((conversation) => conversation.isMine || conversation.assignee === (session?.name ?? "Alana Costa"));
      const followingConversations = conversations.filter((conversation) => conversation.isFollowing);
      const archivedConversations = conversations.filter((conversation) => conversation.isArchived);
      const entryConversations = conversations.filter((conversation) => !conversation.isArchived);
      const inboxHref = (filter: "entrada" | "meus" | "seguindo" | "arquivados") => {
        const nextParams = new URLSearchParams();
        nextParams.set("filter", filter);
        if (inboxConversationParam) {
          nextParams.set("conversationId", inboxConversationParam);
        }
        if (inboxPanelParam) {
          nextParams.set("panel", inboxPanelParam);
        }
        if (inboxDetailParam) {
          nextParams.set("detail", inboxDetailParam);
        }
        return `/inbox/all?${nextParams.toString()}`;
      };

      return [
        {
          label: "+ Add Filtro",
          description: contextualView === "mine" ? "Criar uma visualizacao focada no seu atendimento." : "Nova visualizacao para a operacao.",
          active: true
        },
        {
          label: "Entrada",
          count: formatCount(contextualView === "mine" ? mineConversations.length : entryConversations.length),
          active: (inboxFilterParam ?? "entrada") === "entrada",
          href: inboxHref("entrada")
        },
        {
          label: "Meus",
          count: formatCount(mineConversations.length),
          active: inboxFilterParam === "meus",
          href: inboxHref("meus")
        },
        {
          label: "Seguindo",
          count: formatCount(contextualView === "mine" ? followingConversations.filter((conversation) => conversation.isMine || conversation.assignee === (session?.name ?? "Alana Costa")).length : followingConversations.length),
          active: inboxFilterParam === "seguindo",
          href: inboxHref("seguindo")
        },
        {
          label: "Arquivados",
          count: formatCount(contextualView === "mine" ? archivedConversations.filter((conversation) => conversation.isMine || conversation.assignee === (session?.name ?? "Alana Costa")).length : archivedConversations.length),
          active: inboxFilterParam === "arquivados",
          href: inboxHref("arquivados")
        }
      ];
    }

    if (activeModule.key === "crm") {
      const lanes = crmSnapshot?.lanes ?? crmPageData.lanes;
      const allDeals = lanes.flatMap((lane) => lane.cards.map((deal) => ({
        ...deal,
        movementHistory: [...deal.movementHistory],
        activityHistory: [...deal.activityHistory]
      })));
      const assigneeKey = session?.initials ?? "AC";
      const personalDeals = allDeals.filter((deal) => deal.owner === assigneeKey);
      const personalTasks = tasks.filter((task) => task.assignee === assigneeKey && task.status !== "Concluida");
      const totalTasks = tasks.filter((task) => task.status !== "Concluida");

      return [
        {
          label: "Negociacoes",
          description: contextualView === "mine" ? "Pipeline sob sua responsabilidade." : "Kanban principal do funil.",
          count: formatCount(contextualView === "mine" ? personalDeals.length : allDeals.length),
          active: (crmSectionParam ?? "pipeline") !== "tasks" && !crmPanelParam,
          href: "/crm?section=pipeline"
        },
        {
          label: "Tarefas",
          count: formatCount(contextualView === "mine" ? personalTasks.length : totalTasks.length),
          description: crmSectionParam === "pipeline" ? "Foco no bloco operacional dentro do pipeline." : undefined,
          active: crmSectionParam === "tasks" || (crmSectionParam === "pipeline" && crmPanelParam === "tasks"),
          href: crmSectionParam === "pipeline" ? "/crm?section=pipeline&panel=tasks" : "/crm?section=tasks"
        },
        {
          label: "Contatos",
          count: formatCount((crmSnapshot?.contacts ?? crmPageData.contacts).length),
          description: contextualView === "mine" ? "Base compartilhada do workspace." : undefined,
          active: crmSectionParam === "pipeline" && crmPanelParam === "contacts",
          href: "/crm?section=pipeline&panel=contacts"
        },
        {
          label: "Campanhas",
          count: formatCount((crmSnapshot?.campaigns ?? crmPageData.campaigns).length),
          active: crmSectionParam === "pipeline" && crmPanelParam === "campaigns",
          href: "/crm?section=pipeline&panel=campaigns"
        },
        {
          label: "Metas",
          count: formatCount((crmSnapshot?.goals ?? crmPageData.goals).length),
          active: crmSectionParam === "pipeline" && crmPanelParam === "goals",
          href: "/crm?section=pipeline&panel=goals"
        }
      ];
    }

    if (activeModule.key === "reports") {
      return [
        { label: "Dashboards", active: !reportsPanelParam || reportsPanelParam === "dashboards", href: "/reports?panel=dashboards" },
        { label: "Visao Geral", active: reportsPanelParam === "overview", href: "/reports?panel=overview" },
        { label: "Produtividade", active: reportsPanelParam === "productivity", href: "/reports?panel=productivity" },
        { label: "Atribuicao", active: reportsPanelParam === "assignment", href: "/reports?panel=assignment" },
        { label: "Interacao", active: reportsPanelParam === "interaction", href: "/reports?panel=interaction" },
        { label: "Presenca", active: reportsPanelParam === "presence", href: "/reports?panel=presence" },
        { label: "Avaliacao", active: reportsPanelParam === "evaluation", href: "/reports?panel=evaluation" },
        { label: "Ligacoes", active: reportsPanelParam === "calls", href: "/reports?panel=calls" }
      ];
    }

    if (activeModule.key === "settings") {
      const settingsBotsHref = (() => {
        const nextParams = new URLSearchParams();
        nextParams.set("panel", "bots");
        if (settingsBotParam) {
          nextParams.set("botId", settingsBotParam);
        }
        if (settingsEdgeParam) {
          nextParams.set("edgeId", settingsEdgeParam);
        }
        return `/settings?${nextParams.toString()}`;
      })();

      return [
        { label: "Perfil", active: !settingsPanelParam || settingsPanelParam === "profile", href: "/settings?panel=profile" },
        { label: "Geral", active: settingsPanelParam === "general", href: "/settings?panel=general" },
        { label: "Membros", active: settingsPanelParam === "members", href: "/settings?panel=members" },
        { label: "Permissoes", active: settingsPanelParam === "permissions", href: "/settings?panel=permissions" },
        { label: "Grupos", active: settingsPanelParam === "groups", href: "/settings?panel=groups" },
        { label: "Campos Personalizados", active: settingsPanelParam === "custom-fields", href: "/settings?panel=custom-fields" },
        { label: "Frases Rapidas", active: settingsPanelParam === "responses", href: "/settings?panel=responses" },
        { label: "Automacoes", active: settingsPanelParam === "automations", href: "/settings?panel=automations" },
        { label: "Bots", active: settingsPanelParam === "bots", href: settingsBotsHref },
        { label: "Canais", active: settingsPanelParam === "channels", href: "/settings?panel=channels" }
      ];
    }

    return [];
  }, [activeModule.key, contextualView, crmPanelParam, crmSectionParam, crmSnapshot?.campaigns, crmSnapshot?.contacts, crmSnapshot?.goals, crmSnapshot?.lanes, inboxConversationParam, inboxDetailParam, inboxFilterParam, inboxPanelParam, inboxSnapshot?.conversations, reportsPanelParam, session?.initials, session?.name, settingsBotParam, settingsEdgeParam, settingsPanelParam, tasks]);

  const allHeaderNotifications = useMemo(
    () => [...settingsNotificationItems, ...inboxNotificationItems, ...headerNotifications].slice(0, 6),
    [headerNotifications, inboxNotificationItems, settingsNotificationItems]
  );

  function openHeaderHref(href?: string) {
    setNotificationsOpen(false);
    setMentionsOpen(false);
    setCalendarOpen(false);

    if (href) {
      router.push(href);
    }
  }

  return (
    <div className="min-h-screen px-3 pb-4 pt-3 lg:px-4">
      <GlobalSearchModal onOpenChange={setSearchOpen} open={searchOpen} />
      <div className="glass-ring relative min-h-[calc(100vh-24px)] rounded-[32px] border border-[var(--border)] bg-[var(--panel)]/70 shadow-soft backdrop-blur-xl">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-4 border-b border-[var(--border)] bg-[var(--panel)]/80 px-4 py-4 backdrop-blur-xl lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent-strong),#7dd3fc)] text-lg font-bold text-white">
              E
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Workspace</p>
              <p className="font-semibold text-[var(--foreground)]">{session?.workspace ?? "Elite Veiculos CRM Atendimento"}</p>
            </div>
          </div>
          <button
            className="flex min-w-[240px] flex-1 items-center gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--panel-strong)] px-4 py-3 text-left text-sm text-[var(--muted-foreground)] transition hover:border-[var(--accent-soft)]"
            onClick={() => setSearchOpen(true)}
            type="button"
          >
            <Search className="size-4" />
            <span className="flex-1">Pesquisar</span>
            <Badge>Ctrl K</Badge>
          </button>
          <nav className="flex flex-1 items-center justify-center gap-2 overflow-x-auto">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule.key === module.key;

              return (
                <Link
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)] shadow-[0_18px_36px_rgba(37,99,235,0.24)]"
                      : "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
                  }`}
                  href={module.href}
                  key={module.key}
                >
                  <Icon className="size-4" />
                  {module.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button className="rounded-2xl px-3 py-2" onClick={() => setNotificationsOpen((value) => !value)} variant="ghost">
                <Bell className="size-4" />
                {allHeaderNotifications.length ? <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#db5f57] px-1 text-[10px] font-semibold text-white">{allHeaderNotifications.length}</span> : null}
              </Button>
              {notificationsOpen ? (
                <Card className="absolute right-0 top-14 z-20 w-80 p-3 shadow-soft">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{notificationView === "mine" ? "Alertas pessoais" : "Alertas recentes"}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
                      <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-sky-500" />Tarefas</span>
                      <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" />Deals</span>
                    </div>
                  </div>
                  <div className="mb-3 flex rounded-full bg-[var(--panel-strong)] p-1">
                    <Button className="rounded-full px-3 py-1.5" onClick={() => setNotificationView("all")} variant={notificationView === "all" ? "primary" : "ghost"}>Geral</Button>
                    <Button className="rounded-full px-3 py-1.5" onClick={() => setNotificationView("mine")} variant={notificationView === "mine" ? "primary" : "ghost"}>Minhas</Button>
                  </div>
                  {allHeaderNotifications.map((notification) => (
                    <button className="w-full rounded-[22px] p-3 text-left hover:bg-[var(--panel-strong)]" key={notification.id} onClick={() => openHeaderHref(notification.href)} type="button">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">{notification.title}</p>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${notification.badgeClassName}`}>{notification.badgeLabel}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{notification.description}</p>
                    </button>
                  ))}
                </Card>
              ) : null}
            </div>
            <div className="relative">
              <Button className="rounded-2xl px-3 py-2" onClick={() => setCalendarOpen((value) => !value)} variant="ghost">
                <CalendarDays className="size-4" />
              </Button>
              {calendarOpen ? <GlobalCalendarPopover open={calendarOpen} /> : null}
            </div>
            <div className="relative">
              <Button className="rounded-2xl px-3 py-2" onClick={() => setMentionsOpen((value) => !value)} variant="ghost">
                <AtSign className="size-4" />
                {headerMentionsCount ? <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-strong)] px-1 text-[10px] font-semibold text-white">{headerMentionsCount}</span> : null}
              </Button>
              {mentionsOpen ? (
                <Card className="absolute right-0 top-14 z-20 w-80 p-3 shadow-soft">
                  {headerMentions.map((mention) => (
                    <button className="w-full rounded-[22px] p-3 text-left hover:bg-[var(--panel-strong)]" key={mention.id} onClick={() => openHeaderHref(mention.href)} type="button">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-[var(--foreground)]">{mention.title}</p>
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${mention.badgeClassName}`}>{mention.badgeLabel}</span>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{mention.description}</p>
                    </button>
                  ))}
                </Card>
              ) : null}
            </div>
            <ThemeToggle />
            <button
              className="flex items-center gap-3 rounded-2xl bg-[var(--panel-strong)] px-3 py-2 text-left"
              onClick={() => setProfileOpen((value) => !value)}
              type="button"
            >
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]">
                {session?.initials ?? "AC"}
              </div>
              <div className="hidden text-sm md:block">
                <p className="font-semibold text-[var(--foreground)]">{session?.name ?? "Alana Costa"}</p>
                <p className="text-[var(--muted-foreground)]">{session?.role ?? "Admin"}</p>
              </div>
              <ChevronDown className="size-4 text-[var(--muted-foreground)]" />
            </button>
            {profileOpen ? (
              <Card className="absolute right-6 top-20 z-20 w-72 p-3 shadow-soft">
                {profileMenu.map(({ label, icon: Icon }) => (
                  <button
                    className="flex w-full items-center gap-3 rounded-[20px] px-3 py-3 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--panel-strong)]"
                    key={label}
                    onClick={async () => {
                      if (label === "Sair") {
                        await clearSession();
                        router.push("/login");
                      }

                      setProfileOpen(false);
                    }}
                    type="button"
                  >
                    <Icon className="size-4 text-[var(--muted-foreground)]" />
                    {label}
                  </button>
                ))}
              </Card>
            ) : null}
          </div>
        </header>
        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[92px_280px_minmax(0,1fr)] lg:px-6">
          <Card className="order-2 flex flex-row gap-2 p-2 lg:order-1 lg:h-[calc(100vh-152px)] lg:flex-col lg:justify-start">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive = activeModule.key === module.key;

              return (
                <Link
                  className={`flex min-h-16 flex-1 items-center justify-center rounded-[24px] transition lg:flex-none ${
                    isActive ? "bg-[var(--panel-strong)] text-[var(--accent-strong)]" : "text-[var(--muted-foreground)] hover:bg-[var(--panel-strong)]"
                  }`}
                  href={module.href}
                  key={`sidebar-${module.key}`}
                  title={module.label}
                >
                  <Icon className="size-5" />
                </Link>
              );
            })}
          </Card>
          <Card className="order-1 p-4 lg:order-2 lg:h-[calc(100vh-152px)] lg:overflow-y-auto">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Modulo atual</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                {activeModule.label}
              </h2>
            </div>
            {activeModule.key === "inbox" || activeModule.key === "crm" ? (
              <div className="mb-4 flex rounded-full bg-[var(--panel-strong)] p-1">
                <Button className="rounded-full px-3 py-1.5" onClick={() => setContextualView("all")} variant={contextualView === "all" ? "primary" : "ghost"}>Geral</Button>
                <Button className="rounded-full px-3 py-1.5" onClick={() => setContextualView("mine")} variant={contextualView === "mine" ? "primary" : "ghost"}>Minha operacao</Button>
              </div>
            ) : null}
            <div className="space-y-2">
              {contextualItems.map((item) => (
                item.href ? (
                  <Link
                    className={`flex w-full items-center justify-between rounded-[22px] px-4 py-3 text-left transition ${
                      item.active
                        ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "bg-[var(--panel-strong)] text-[var(--foreground)] hover:bg-[var(--panel-stronger)]"
                    }`}
                    href={item.href}
                    key={item.label}
                  >
                    <div>
                      <p className="font-medium">{item.label}</p>
                      {item.description ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.description}</p> : null}
                    </div>
                    {item.count ? <Badge>{item.count}</Badge> : null}
                  </Link>
                ) : (
                  <button
                    className={`flex w-full items-center justify-between rounded-[22px] px-4 py-3 text-left transition ${
                      item.active
                        ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "bg-[var(--panel-strong)] text-[var(--foreground)] hover:bg-[var(--panel-stronger)]"
                    }`}
                    key={item.label}
                    type="button"
                  >
                    <div>
                      <p className="font-medium">{item.label}</p>
                      {item.description ? <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.description}</p> : null}
                    </div>
                    {item.count ? <Badge>{item.count}</Badge> : null}
                  </button>
                )
              ))}
            </div>
          </Card>
          <main className="order-3 min-w-0 pb-1">{children}</main>
        </div>
      </div>
    </div>
  );
}