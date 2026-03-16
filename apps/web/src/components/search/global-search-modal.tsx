"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge, Card, Input } from "@clone-zap/ui";

import { useSession } from "@/components/auth/session-provider";
import { fetchCrmData, fetchInboxData, fetchReportsData, fetchSettingsData } from "@/lib/api";
import {
  buildCrmCampaignHref,
  buildCrmContactHref,
  buildCrmDealHref,
  buildCrmGoalHref,
  buildCrmTaskHref,
  buildInboxConversationHref,
  buildReportsDashboardHref,
  buildReportsPanelHref,
  buildSettingsAutomationHref,
  buildSettingsBotHref,
  buildSettingsChannelHref
} from "@/lib/context-hrefs";
import { globalSearchItems } from "@/lib/mocks/app-data";
import type { CrmData, InboxData, ReportsData, SettingsData } from "@/lib/types";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SearchResultItem = {
  section: string;
  label: string;
  description: string;
  href: string;
  keywords: readonly string[];
};

type SearchView = "all" | "mine";

function globalSearchRecentStorageKey(userKey: string) {
  return `clone-zap:global-search:recent:${userKey}`;
}

function globalSearchViewStorageKey(userKey: string) {
  return `clone-zap:global-search:view:${userKey}`;
}

function sanitizeRecentSearchItems(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as SearchResultItem[];
  }

  return value
    .filter((item): item is SearchResultItem => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as Partial<SearchResultItem>;
      return typeof candidate.section === "string"
        && typeof candidate.label === "string"
        && typeof candidate.description === "string"
        && typeof candidate.href === "string"
        && Array.isArray(candidate.keywords)
        && candidate.keywords.every((keyword) => typeof keyword === "string");
    })
    .slice(0, 6);
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const router = useRouter();
  const { session } = useSession();
  const recentItemsUserKey = `${session?.email ?? session?.initials ?? "guest"}:${session?.workspace ?? "default"}`;
  const [query, setQuery] = useState("");
  const [crmData, setCrmData] = useState<CrmData | null>(null);
  const [inboxData, setInboxData] = useState<InboxData | null>(null);
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [settingsData, setSettingsData] = useState<SettingsData | null>(null);
  const [recentItems, setRecentItems] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchView, setSearchView] = useState<SearchView>("all");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(globalSearchRecentStorageKey(recentItemsUserKey));
      setRecentItems(rawValue ? sanitizeRecentSearchItems(JSON.parse(rawValue)) : []);
    } catch {
      setRecentItems([]);
    }
  }, [recentItemsUserKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(globalSearchViewStorageKey(recentItemsUserKey));
      if (rawValue === "mine" || rawValue === "all") {
        setSearchView(rawValue);
      }
    } catch {
      setSearchView("all");
    }
  }, [recentItemsUserKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(globalSearchRecentStorageKey(recentItemsUserKey), JSON.stringify(recentItems.slice(0, 6)));
  }, [recentItems, recentItemsUserKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(globalSearchViewStorageKey(recentItemsUserKey), searchView);
  }, [recentItemsUserKey, searchView]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;

    Promise.all([fetchCrmData(), fetchInboxData(), fetchReportsData(), fetchSettingsData()])
      .then(([nextCrmData, nextInboxData, nextReportsData, nextSettingsData]) => {
        if (!active) {
          return;
        }

        setCrmData(nextCrmData);
        setInboxData(nextInboxData);
        setReportsData(nextReportsData);
        setSettingsData(nextSettingsData);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setCrmData(null);
        setInboxData(null);
        setReportsData(null);
        setSettingsData(null);
      });

    return () => {
      active = false;
    };
  }, [open]);

  const liveItems = useMemo<SearchResultItem[]>(() => {
    const items: SearchResultItem[] = [];
    const assigneeKey = session?.initials ?? "AC";

    if (crmData) {
      const deals = crmData.lanes.flatMap((lane) => lane.cards.map((deal) => ({ deal, lane })));

      for (const task of crmData.tasks.slice(0, 8)) {
        items.push({
          section: "Tarefas",
          label: task.title,
          description: `${task.contact} • ${task.due} • ${task.assignee}`,
          href: buildCrmTaskHref(task.id),
          keywords: [task.contact, task.assignee, task.dealLabel ?? "", task.priority, task.status]
        });
      }

      for (const entry of deals.slice(0, 8)) {
        items.push({
          section: "Deals",
          label: entry.deal.name,
          description: `${entry.deal.company} • ${entry.lane.title} • ${entry.deal.nextTask ?? "Sem proxima tarefa"}`,
          href: buildCrmDealHref(entry.deal.id),
          keywords: [entry.deal.company, entry.deal.owner, entry.lane.title, entry.deal.forecast, entry.deal.nextTask ?? ""]
        });
      }

      for (const campaign of crmData.campaigns.slice(0, 6)) {
        items.push({
          section: "Campanhas",
          label: campaign.name,
          description: `${campaign.channel} • ${campaign.status} • ${campaign.audience}`,
          href: buildCrmCampaignHref(campaign.id),
          keywords: [campaign.channel, campaign.status, campaign.audience, campaign.visibility, campaign.message]
        });
      }

      for (const contact of crmData.contacts.slice(0, 6)) {
        items.push({
          section: "Contatos",
          label: contact.name,
          description: `${contact.phone} • ${contact.email}`,
          href: buildCrmContactHref(contact.id),
          keywords: [contact.phone, contact.email, contact.notes ?? ""]
        });
      }

      for (const goal of crmData.goals.slice(0, 6)) {
        items.push({
          section: "Metas",
          label: goal.rep,
          description: `${goal.current}% concluido • ${goal.target}`,
          href: buildCrmGoalHref(goal.id),
          keywords: [goal.rep, goal.target, `${goal.current}`, "meta", "performance", "comercial"]
        });
      }
    }

    if (inboxData) {
      for (const conversation of inboxData.conversations.slice(0, 8)) {
        items.push({
          section: "Inbox",
          label: conversation.name,
          description: `${conversation.channel} • ${conversation.status} • ${conversation.snippet}`,
          href: buildInboxConversationHref({
            conversationId: conversation.id,
            filter: conversation.isArchived ? "arquivados" : conversation.isMine ? "meus" : "entrada"
          }),
          keywords: [conversation.channel, conversation.status, conversation.snippet, conversation.assignee]
        });
      }

      for (const conversation of inboxData.conversations.slice(0, 6)) {
        for (const note of conversation.notes.slice(0, 2)) {
          items.push({
            section: "Notas da Inbox",
            label: conversation.name,
            description: `${note.author} • ${note.text}`,
            href: buildInboxConversationHref({
              conversationId: conversation.id,
              filter: conversation.isArchived ? "arquivados" : conversation.isMine ? "meus" : "entrada",
              panel: "info",
              detail: "notas",
              noteId: note.id
            }),
            keywords: [note.author, note.text, conversation.channel, conversation.status]
          });
        }
      }
    }

    if (settingsData) {
      for (const automation of settingsData.automations.slice(0, 6)) {
        items.push({
          section: "Automacoes",
          label: automation.name,
          description: `${automation.trigger} • ${automation.status} • ${automation.result}`,
          href: buildSettingsAutomationHref(automation.id),
          keywords: [automation.trigger, automation.condition, automation.result, automation.status]
        });
      }

      for (const channel of settingsData.channels.slice(0, 6)) {
        items.push({
          section: "Canais",
          label: channel.name,
          description: `${channel.type} • ${channel.status} • ${channel.credentialLabel}`,
          href: buildSettingsChannelHref(channel.id),
          keywords: [channel.type, channel.status, channel.credentialLabel, channel.lastSync]
        });
      }

      for (const bot of settingsData.bots.slice(0, 6)) {
        items.push({
          section: "Bots",
          label: bot.name,
          description: `${bot.entryChannel} • ${bot.status} • ${bot.updatedAt}`,
          href: buildSettingsBotHref(bot.id),
          keywords: [bot.entryChannel, bot.status, bot.updatedAt, ...bot.nodes.map((node) => node.label)]
        });
      }
    }

    if (reportsData) {
      for (const dashboard of reportsData.dashboards.slice(0, 6)) {
        items.push({
          section: "Dashboards",
          label: dashboard.name,
          description: `${dashboard.period} • ${dashboard.visibility} • ${dashboard.description}`,
          href: buildReportsDashboardHref(dashboard.id),
          keywords: [dashboard.period, dashboard.visibility, dashboard.description, dashboard.createdAt]
        });
      }

      const reportPanels = [
        { panel: "overview" as const, label: "Visao Geral", description: "Volume, tendencia e leitura macro da operacao." },
        { panel: "productivity" as const, label: "Produtividade", description: "Rendimento, SLA e score do time." },
        { panel: "assignment" as const, label: "Atribuicao", description: "Distribuicao de carga e balanceamento entre agentes." },
        { panel: "interaction" as const, label: "Interacao", description: "Comparativo por canal, volume e conversao." },
        { panel: "presence" as const, label: "Presenca", description: "Aderencia operacional e disponibilidade." },
        { panel: "evaluation" as const, label: "Avaliacao", description: "Qualidade, auditoria e score do atendimento." },
        { panel: "calls" as const, label: "Ligacoes", description: "Performance do canal de chamadas." }
      ];

      for (const item of reportPanels) {
        items.push({
          section: "Relatorios",
          label: item.label,
          description: item.description,
          href: buildReportsPanelHref(item.panel),
          keywords: [item.label, item.description, "relatorios", "analytics"]
        });
      }
    }

    return items;
  }, [crmData, inboxData, reportsData, session?.initials, settingsData]);

  const myWorkItems = useMemo<SearchResultItem[]>(() => {
    const assigneeKey = session?.initials ?? "AC";
    const items: SearchResultItem[] = [];

    if (crmData) {
      const deals = crmData.lanes.flatMap((lane) => lane.cards.map((deal) => ({ deal, lane })));

      for (const task of crmData.tasks.filter((entry) => entry.assignee === assigneeKey).slice(0, 6)) {
        items.push({
          section: "Minhas tarefas",
          label: task.title,
          description: `${task.contact} • ${task.due} • ${task.priority}`,
          href: buildCrmTaskHref(task.id),
          keywords: [task.contact, task.assignee, task.dealLabel ?? "", task.priority, task.status, "meu trabalho"]
        });
      }

      for (const entry of deals.filter(({ deal }) => deal.owner === assigneeKey).slice(0, 4)) {
        items.push({
          section: "Meus deals",
          label: entry.deal.name,
          description: `${entry.deal.company} • ${entry.lane.title} • ${entry.deal.nextTask ?? "Sem proxima tarefa"}`,
          href: buildCrmDealHref(entry.deal.id),
          keywords: [entry.deal.company, entry.deal.owner, entry.lane.title, entry.deal.forecast, entry.deal.nextTask ?? "", "meu trabalho"]
        });
      }
    }

    if (inboxData) {
      for (const conversation of inboxData.conversations.filter((entry) => entry.assignee === assigneeKey || entry.isMine).slice(0, 4)) {
        items.push({
          section: "Meu inbox",
          label: conversation.name,
          description: `${conversation.channel} • ${conversation.status} • ${conversation.snippet}`,
          href: buildInboxConversationHref({
            conversationId: conversation.id,
            filter: conversation.isArchived ? "arquivados" : "meus"
          }),
          keywords: [conversation.channel, conversation.status, conversation.snippet, conversation.assignee, "meu trabalho"]
        });
      }
    }

    return items;
  }, [crmData, inboxData, session?.initials]);

  const searchItems = useMemo<SearchResultItem[]>(() => [...liveItems, ...globalSearchItems], [liveItems]);
  const baseItems = useMemo(() => searchView === "mine" ? myWorkItems : searchItems, [myWorkItems, searchItems, searchView]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return baseItems;
    }

    return baseItems.filter((item) => {
      const searchIndex = `${item.section} ${item.label} ${item.description} ${item.keywords.join(" ")}`.toLowerCase();
      return searchIndex.includes(normalizedQuery);
    });
  }, [baseItems, query]);

  const displayedItems = useMemo(() => {
    if (query.trim()) {
      return filteredItems;
    }

    if (searchView === "mine") {
      const seen = new Set<string>();
      const items: SearchResultItem[] = [];

      for (const item of recentItems) {
        if (!myWorkItems.some((entry) => entry.href === item.href) || seen.has(item.href)) {
          continue;
        }

        seen.add(item.href);
        items.push(item);
      }

      for (const item of myWorkItems) {
        if (seen.has(item.href)) {
          continue;
        }

        seen.add(item.href);
        items.push(item);
      }

      return items;
    }

    const seen = new Set<string>();
    const items: SearchResultItem[] = [];

    for (const item of recentItems) {
      if (seen.has(item.href)) {
        continue;
      }

      seen.add(item.href);
      items.push(item);
    }

    for (const item of searchItems) {
      if (seen.has(item.href)) {
        continue;
      }

      seen.add(item.href);
      items.push(item);

      if (items.length >= 12) {
        break;
      }
    }

    return items;
  }, [filteredItems, myWorkItems, query, recentItems, searchItems, searchView]);

  useEffect(() => {
    setSelectedIndex((current) => {
      if (!displayedItems.length) {
        return 0;
      }

      return Math.min(current, displayedItems.length - 1);
    });
  }, [displayedItems]);

  function registerRecentItem(item: SearchResultItem) {
    setRecentItems((current) => {
      const next = [item, ...current.filter((entry) => entry.href !== item.href)];
      return next.slice(0, 6);
    });
  }

  function openItem(item: SearchResultItem) {
    registerRecentItem(item);
    onOpenChange(false);
    router.push(item.href);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#091316]/30 px-4 pt-20 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <Card className="glass-ring w-full max-w-3xl overflow-hidden shadow-soft" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[var(--border)] p-4">
          <div className="mb-3 flex rounded-full bg-[var(--panel-strong)] p-1">
            <button className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${searchView === "all" ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`} onClick={() => setSearchView("all")} type="button">
              Tudo
            </button>
            <button className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${searchView === "mine" ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`} onClick={() => setSearchView("mine")} type="button">
              Meu trabalho
            </button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              autoFocus
              className="pl-11"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setSelectedIndex((current) => displayedItems.length ? (current + 1) % displayedItems.length : 0);
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setSelectedIndex((current) => displayedItems.length ? (current - 1 + displayedItems.length) % displayedItems.length : 0);
                }

                if (event.key === "Enter" && displayedItems[selectedIndex]) {
                  event.preventDefault();
                  openItem(displayedItems[selectedIndex]);
                }
              }}
              placeholder="Pesquisar contatos, mensagens, acoes e modulos"
              value={query}
            />
          </div>
        </div>
        <div className="grid gap-2 p-4">
          {!query.trim() && searchView === "all" && recentItems.length ? <p className="px-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Recentes</p> : null}
          {!query.trim() && searchView === "mine" ? <p className="px-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Meu trabalho</p> : null}
          {query.trim() && searchView === "all" && liveItems.length ? <p className="px-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Resultados vivos de CRM e Inbox</p> : null}
          {query.trim() && searchView === "mine" ? <p className="px-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Resultados do seu contexto</p> : null}
          {displayedItems.length ? displayedItems.map((item, index) => (
            <button
              className={`flex items-center justify-between rounded-[22px] px-4 py-3 text-left transition ${selectedIndex === index ? "bg-[var(--panel-stronger)] ring-2 ring-[var(--accent-soft)]" : "bg-[var(--panel-strong)] hover:bg-[var(--panel-stronger)]"}`}
              key={`${item.section}-${item.label}`}
              onClick={() => openItem(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              type="button"
            >
              <div>
                <p className="font-semibold text-[var(--foreground)]">{item.label}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{item.section}</Badge>
                <CornerDownLeft className="size-4 text-[var(--muted-foreground)]" />
              </div>
            </button>
          )) : (
            <div className="rounded-[22px] border border-dashed border-[var(--border)] px-4 py-8 text-center">
              <p className="font-semibold text-[var(--foreground)]">Nenhum resultado encontrado</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{searchView === "mine" ? "Nenhum item do seu contexto foi encontrado. Tente por tarefa, deal ou conversa atribuida a voce." : "Tente buscar por contato, modulo, tarefa, inbox ou dashboard."}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}