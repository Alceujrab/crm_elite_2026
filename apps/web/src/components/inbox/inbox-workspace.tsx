"use client";

import {
  Archive,
  FolderClosed,
  Info,
  Mic,
  MoreHorizontal,
  Paperclip,
  Plane,
  Smile,
  Sparkles,
  SquarePen,
  UserRoundPlus,
  Zap
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, Input, Textarea } from "@clone-zap/ui";

import { createInboxMessageRequest, createInboxNoteRequest, fetchInboxData, markConversationReadRequest, updateConversationRequest } from "@/lib/api";
import { buildCrmContactHref, buildCrmDealHref, buildCrmTaskHref } from "@/lib/context-hrefs";
import { inboxPageData } from "@/lib/mocks/app-data";
import type { InboxData, InboxDetailItem } from "@/lib/types";

type DraftMode = "reply" | "internal";
type InboxFilter = "entrada" | "meus" | "seguindo" | "arquivados";
type InboxDetailKey = "contato" | "negociacoes" | "tarefas" | "notas";

const assignees = ["Alana Costa", "Ricardo Mota", "Tania Alves", "Gabriel Lima"] as const;
const INBOX_STORAGE_KEY = "clone-zap.inbox-state";

const inboxDetailMap: Record<InboxDetailKey, string> = {
  contato: "Contato",
  negociacoes: "Negociacoes",
  tarefas: "Tarefas",
  notas: "Notas"
};

function normalizeDetailTitle(title: string): InboxDetailKey {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized === "negociacoes") {
    return "negociacoes";
  }

  if (normalized === "tarefas") {
    return "tarefas";
  }

  if (normalized === "notas") {
    return "notas";
  }

  return "contato";
}

function detailCardId(detailKey: InboxDetailKey) {
  return `inbox-detail-${detailKey}`;
}

function initialInboxData(): InboxData {
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

function currentTimeLabel() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function InboxWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const panelParam = searchParams.get("panel");
  const detailParam = searchParams.get("detail");
  const noteParam = searchParams.get("noteId");
  const [inboxData, setInboxData] = useState<InboxData>(initialInboxData);
  const [selectedId, setSelectedId] = useState<string>(inboxPageData.conversations[0]?.id ?? "");
  const [panelOpen, setPanelOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [draftMode, setDraftMode] = useState<DraftMode>("reply");
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("entrada");
  const [activeDetail, setActiveDetail] = useState<InboxDetailKey>("contato");

  const conversations = inboxData.conversations;

  useEffect(() => {
    let active = true;

    fetchInboxData().then((data) => {
      if (active) {
        setInboxData(data);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const requestedFilter = searchParams.get("filter");

    if (requestedFilter === "entrada" || requestedFilter === "meus" || requestedFilter === "seguindo" || requestedFilter === "arquivados") {
      setActiveFilter(requestedFilter);
    }

    const conversationId = searchParams.get("conversationId");

    if (panelParam === "info") {
      setPanelOpen(true);
    } else if (panelParam === "chat") {
      setPanelOpen(false);
    }

    if (detailParam === "contato" || detailParam === "negociacoes" || detailParam === "tarefas" || detailParam === "notas") {
      setActiveDetail(detailParam);
    }

    if (noteParam) {
      setPanelOpen(true);
      setActiveDetail("notas");
    }

    if (!conversationId) {
      return;
    }

    const hasConversation = inboxData.conversations.some((conversation) => conversation.id === conversationId);
    if (hasConversation) {
      setSelectedId(conversationId);
    }
  }, [detailParam, inboxData.conversations, noteParam, panelParam, searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParamsKey);
    const currentFilter = nextParams.get("filter") ?? "entrada";
    const currentConversationId = nextParams.get("conversationId") ?? "";
    const currentPanel = nextParams.get("panel") ?? "chat";
    const currentDetail = nextParams.get("detail") ?? "contato";
    const currentNoteId = nextParams.get("noteId") ?? "";
    const selectedNoteId = noteParam ?? "";

    if (currentFilter === activeFilter && currentConversationId === selectedId && currentPanel === (panelOpen ? "info" : "chat") && currentDetail === activeDetail && currentNoteId === selectedNoteId) {
      return;
    }

    nextParams.set("filter", activeFilter);
    if (selectedId) {
      nextParams.set("conversationId", selectedId);
    }
    nextParams.set("panel", panelOpen ? "info" : "chat");
    nextParams.set("detail", activeDetail);
    if (activeDetail === "notas" && noteParam) {
      nextParams.set("noteId", noteParam);
    } else {
      nextParams.delete("noteId");
    }
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [activeDetail, activeFilter, noteParam, panelOpen, pathname, router, searchParamsKey, selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(INBOX_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        selectedId?: string;
        panelOpen?: boolean;
        query?: string;
        activeFilter?: InboxFilter;
        activeDetail?: InboxDetailKey;
      };

      const hasDirectContext = Boolean(searchParams.get("conversationId") || panelParam || detailParam);

      if (parsed.selectedId && !hasDirectContext) setSelectedId(parsed.selectedId);
      if (typeof parsed.panelOpen === "boolean" && !hasDirectContext) setPanelOpen(parsed.panelOpen);
      if (typeof parsed.query === "string") setQuery(parsed.query);
      if (parsed.activeFilter && !searchParams.get("filter")) setActiveFilter(parsed.activeFilter);
      if (parsed.activeDetail && !detailParam) setActiveDetail(parsed.activeDetail);
    } catch {
      window.localStorage.removeItem(INBOX_STORAGE_KEY);
    }
  }, [detailParam, panelParam, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      INBOX_STORAGE_KEY,
      JSON.stringify({ selectedId, panelOpen, query, activeFilter, activeDetail })
    );
  }, [activeDetail, activeFilter, panelOpen, query, selectedId]);

  const filteredConversations = useMemo(() => conversations.filter((conversation) => {
    if (activeFilter === "meus" && !conversation.isMine) {
      return false;
    }

    if (activeFilter === "seguindo" && !conversation.isFollowing) {
      return false;
    }

    if (activeFilter === "arquivados" && !conversation.isArchived) {
      return false;
    }

    if (activeFilter === "entrada" && conversation.isArchived) {
      return false;
    }

    const haystack = `${conversation.name} ${conversation.snippet} ${conversation.channel}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [activeFilter, conversations, query]);

  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];
  const selectedDetailGroups = useMemo(
    () => selectedConversation.detailGroups.map((group) => ({
      ...group,
      key: normalizeDetailTitle(group.title)
    })),
    [selectedConversation.detailGroups]
  );

  function navigateToCrm(href: string) {
    router.push(href, { scroll: false });
  }

  function detailGroupCrmHref(groupKey: InboxDetailKey) {
    if (groupKey === "contato") {
      return selectedConversation.crmContactId ? buildCrmContactHref(selectedConversation.crmContactId) : "/crm?section=pipeline&panel=contacts";
    }

    if (groupKey === "negociacoes") {
      return selectedConversation.crmDealIds?.[0]
        ? buildCrmDealHref(selectedConversation.crmDealIds[0])
        : "/crm?section=pipeline";
    }

    if (groupKey === "tarefas") {
      return selectedConversation.crmTaskIds?.[0]
        ? buildCrmTaskHref(selectedConversation.crmTaskIds[0])
        : "/crm?section=tasks";
    }

    if (groupKey === "notas") {
      if (selectedConversation.crmTaskIds?.[0]) {
        return buildCrmTaskHref(selectedConversation.crmTaskIds[0]);
      }

      if (selectedConversation.crmDealIds?.[0]) {
        return buildCrmDealHref(selectedConversation.crmDealIds[0]);
      }

      return selectedConversation.crmContactId ? buildCrmContactHref(selectedConversation.crmContactId) : null;
    }

    return null;
  }

  function detailItemCrmHref(_groupKey: InboxDetailKey, item: InboxDetailItem) {
    if (item.crmTaskId) {
      return buildCrmTaskHref(item.crmTaskId);
    }

    if (item.crmDealId) {
      return buildCrmDealHref(item.crmDealId);
    }

    if (item.crmContactId) {
      return buildCrmContactHref(item.crmContactId);
    }

    return null;
  }

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(detailCardId(activeDetail));
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeDetail, panelOpen, selectedConversation.id]);

  function applyLocalConversationRead(conversationId: string) {
    setInboxData((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unread: false } : conversation
      )
    }));
  }

  function applyLocalConversationUpdate(
    conversationId: string,
    updater: (conversation: InboxData["conversations"][number]) => InboxData["conversations"][number]
  ) {
    setInboxData((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId ? updater(conversation) : conversation
      )
    }));
  }

  async function selectConversation(conversationId: string) {
    setSelectedId(conversationId);

    try {
      const data = await markConversationReadRequest(conversationId);
      setInboxData(data);
    } catch {
      applyLocalConversationRead(conversationId);
    }
  }

  async function toggleResolved() {
    if (!selectedConversation) {
      return;
    }

    const nextStatus = selectedConversation.status === "Resolvido" ? "Reaberto" : "Resolvido";
    const nextArchived = selectedConversation.status === "Resolvido" ? false : selectedConversation.isArchived;

    try {
      const data = await updateConversationRequest(selectedConversation.id, {
        status: nextStatus,
        unread: false,
        isArchived: nextArchived
      });
      setInboxData(data);
    } catch {
      applyLocalConversationUpdate(selectedConversation.id, (conversation) => ({
        ...conversation,
        status: nextStatus,
        unread: false,
        isArchived: nextArchived
      }));
    }
  }

  async function rotateAssignee() {
    if (!selectedConversation) {
      return;
    }

    const currentIndex = assignees.indexOf(selectedConversation.assignee as (typeof assignees)[number]);
    const nextAssignee = assignees[(currentIndex + 1) % assignees.length];

    try {
      const data = await updateConversationRequest(selectedConversation.id, {
        assignee: nextAssignee,
        isMine: nextAssignee === "Alana Costa"
      });
      setInboxData(data);
    } catch {
      applyLocalConversationUpdate(selectedConversation.id, (conversation) => ({
        ...conversation,
        assignee: nextAssignee,
        isMine: nextAssignee === "Alana Costa"
      }));
    }
  }

  async function sendDraft() {
    if (!selectedConversation || !draft.trim()) {
      return;
    }

    const nextText = draft.trim();

    try {
      const data = await createInboxMessageRequest(selectedConversation.id, {
        text: nextText,
        type: draftMode === "internal" ? "internal" : "message"
      });
      setInboxData(data);
      setDraft("");
      setDraftMode("reply");
    } catch {
      const nextMessage = {
        id: `${selectedConversation.id}-${Date.now()}`,
        author: "agent" as const,
        type: draftMode === "internal" ? ("internal" as const) : ("message" as const),
        text: nextText,
        time: currentTimeLabel()
      };

      applyLocalConversationUpdate(selectedConversation.id, (conversation) => ({
        ...conversation,
        snippet: nextText,
        time: "agora",
        messages: [...conversation.messages, nextMessage]
      }));
      setDraft("");
      setDraftMode("reply");
    }
  }

  async function saveNote() {
    if (!selectedConversation || !noteDraft.trim()) {
      return;
    }

    const nextText = noteDraft.trim();

    try {
      const data = await createInboxNoteRequest(selectedConversation.id, {
        text: nextText,
        author: "AC"
      });
      setInboxData(data);
      setNoteDraft("");
      setActiveDetail("notas");
    } catch {
      const nextNoteId = `${selectedConversation.id}-note-${Date.now()}`;

      applyLocalConversationUpdate(selectedConversation.id, (conversation) => ({
        ...conversation,
        notes: [
          {
            id: nextNoteId,
            text: nextText,
            author: "AC",
            createdAt: new Date().toISOString()
          },
          ...conversation.notes
        ],
        detailGroups: conversation.detailGroups.map((group) => {
          if (normalizeDetailTitle(group.title) !== "notas") {
            return group;
          }

          return {
            ...group,
            items: [
              {
                id: `note-${nextNoteId}`,
                label: "AC",
                value: nextText,
                noteId: nextNoteId,
                crmContactId: conversation.crmContactId,
                crmDealId: conversation.crmDealIds?.[0],
                crmTaskId: conversation.crmTaskIds?.[0]
              },
              ...group.items
            ]
          };
        })
      }));
      setNoteDraft("");
      setActiveDetail("notas");
    }
  }

  if (!selectedConversation) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {inboxData.metrics.map((metric) => (
          <Card className="p-4" key={metric.label}>
            <p className="text-sm text-[var(--muted-foreground)]">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{metric.value}</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">{metric.helper}</p>
          </Card>
        ))}
      </div>
      <div className={`grid gap-5 ${panelOpen ? "xl:grid-cols-[320px_minmax(0,1fr)_340px]" : "xl:grid-cols-[320px_minmax(0,1fr)]"}`}>
        <Card className="overflow-hidden p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Caixa de Entrada</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Todas as conversas
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button className="rounded-2xl px-3 py-2" variant="ghost">
                <MoreHorizontal className="size-4" />
              </Button>
              <Button className="rounded-2xl px-3 py-2" variant="secondary">
                <SquarePen className="size-4" />
              </Button>
            </div>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              ["entrada", "Entrada"],
              ["meus", "Meus"],
              ["seguindo", "Seguindo"],
              ["arquivados", "Arquivados"]
            ].map(([value, label]) => (
              <Button
                className="rounded-full px-3 py-1.5"
                key={value}
                onClick={() => setActiveFilter(value as InboxFilter)}
                variant={activeFilter === value ? "primary" : "secondary"}
              >
                {label}
              </Button>
            ))}
          </div>
          <Input onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar conversa" value={query} />
          <div className="mt-4 space-y-3">
            {filteredConversations.length ? (
              filteredConversations.map((conversation) => {
                const isActive = conversation.id === selectedConversation.id;

                return (
                  <button
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                        : "border-[var(--border)] bg-[var(--panel-strong)] hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:bg-[var(--panel-stronger)]"
                    }`}
                    key={conversation.id}
                    onClick={() => void selectConversation(conversation.id)}
                    type="button"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]">
                        {conversation.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-[var(--foreground)]">{conversation.name}</p>
                          <span className="text-xs text-[var(--muted-foreground)]">{conversation.time}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">{conversation.snippet}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <Badge>{conversation.channel}</Badge>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--muted-foreground)]">{conversation.status}</span>
                            {conversation.unread ? <span className="size-2.5 rounded-full bg-[var(--accent)]" /> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="rounded-[24px] bg-[var(--panel-strong)] p-6 text-sm text-[var(--muted-foreground)]">
                Nenhuma conversa encontrada para este filtro.
              </div>
            )}
          </div>
        </Card>

        <Card className="flex min-h-[780px] flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">{selectedConversation.name}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {selectedConversation.channel} • {selectedConversation.status}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Responsavel: {selectedConversation.assignee}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button className="rounded-2xl" onClick={() => void toggleResolved()} variant="secondary">
                Resolver
              </Button>
              <Button className="rounded-2xl" onClick={() => void rotateAssignee()} variant="ghost">
                <UserRoundPlus className="size-4" />
                Atribuir
              </Button>
              <Button className="rounded-2xl" variant="ghost">
                <FolderClosed className="size-4" />
              </Button>
              <Button className="rounded-2xl" variant="ghost">
                <MoreHorizontal className="size-4" />
              </Button>
              <Button className="rounded-2xl" onClick={() => setPanelOpen((value) => !value)} variant="ghost">
                <Info className="size-4" />
                Info
              </Button>
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {selectedConversation.messages.map((message) => (
              <div className={`flex ${message.author === "agent" ? "justify-end" : "justify-start"}`} key={message.id}>
                <div
                  className={`max-w-[78%] rounded-[24px] px-4 py-3 text-sm leading-6 ${
                    message.type === "internal"
                      ? "bg-[#f6e8a5] text-[#554100]"
                      : message.author === "agent"
                        ? "bg-[var(--accent-strong)] text-[var(--accent-contrast)]"
                        : "bg-[var(--panel-strong)] text-[var(--foreground)]"
                  }`}
                >
                  <p>{message.text}</p>
                  <span className={`mt-2 block text-xs ${message.author === "agent" && message.type !== "internal" ? "text-white/72" : "text-[var(--muted-foreground)]"}`}>
                    {message.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--border)] p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button className="rounded-full px-3 py-1.5" onClick={() => setDraftMode("reply")} variant={draftMode === "reply" ? "primary" : "secondary"}>
                Resposta
              </Button>
              <Button className="rounded-full px-3 py-1.5" onClick={() => setDraftMode("internal")} variant={draftMode === "internal" ? "primary" : "secondary"}>
                Nota interna
              </Button>
              {inboxData.cannedResponses.map((shortcut) => (
                <Badge className="rounded-full px-3 py-1.5" key={shortcut}>{shortcut}</Badge>
              ))}
            </div>
            <Textarea
              className="min-h-[132px]"
              onChange={(event) => setDraft(event.target.value)}
              placeholder={draftMode === "internal" ? "Registre uma observacao privada para a equipe." : "Shift + Enter para nova linha. '/' para frase rapida."}
              value={draft}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {[Mic, Sparkles, Zap, Smile, Paperclip, Archive].map((Icon, index) => (
                  <Button className="rounded-2xl px-3 py-2" key={index} variant="ghost">
                    <Icon className="size-4" />
                  </Button>
                ))}
                {inboxData.quickActions.map((action) => (
                  <Badge key={action}>{action}</Badge>
                ))}
              </div>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void sendDraft()}>
                Enviar
                <Plane className="size-4" />
              </Button>
            </div>
          </div>
        </Card>

        {panelOpen ? (
          <Card className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              {inboxData.contactActions.map((action) => (
                <Button className="flex-1 rounded-2xl" key={action} variant="secondary">
                  {action}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedDetailGroups.map((group) => (
                <Button
                  className="rounded-full px-3 py-1.5"
                  key={group.key}
                  onClick={() => setActiveDetail(group.key)}
                  variant={activeDetail === group.key ? "primary" : "secondary"}
                >
                  {group.title}
                </Button>
              ))}
            </div>
            {selectedDetailGroups.map((group) => (
              <Card className={`p-4 ${activeDetail === group.key ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]" : ""}`} id={detailCardId(group.key)} key={group.title}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{group.title}</p>
                    <span className="text-xs text-[var(--muted-foreground)]">{group.meta}</span>
                  </div>
                  {detailGroupCrmHref(group.key) ? (
                    <Button className="rounded-full px-3 py-1.5" onClick={() => navigateToCrm(detailGroupCrmHref(group.key)!)} variant="secondary">
                      Abrir no CRM
                    </Button>
                  ) : null}
                </div>
                {group.key === "notas" ? (
                  <div className="mt-4 rounded-[24px] border border-[var(--border)] bg-[var(--panel)] p-3">
                    <Textarea
                      className="min-h-[96px]"
                      onChange={(event) => setNoteDraft(event.target.value)}
                      placeholder="Registrar contexto operacional desta conversa."
                      value={noteDraft}
                    />
                    <div className="mt-3 flex justify-end">
                      <Button className="rounded-full px-4 py-2" onClick={() => void saveNote()} variant="primary">
                        Salvar nota
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 space-y-3 text-sm text-[var(--muted-foreground)]">
                  {group.items.map((item) => (
                    <div className={`rounded-2xl p-3 ${noteParam && item.noteId === noteParam ? "bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]" : "bg-[var(--panel-strong)]"}`} key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{item.label}</p>
                          <p className="mt-1 text-sm text-[var(--foreground)]">{item.value}</p>
                        </div>
                        {detailItemCrmHref(group.key, item) ? (
                          <Button className="shrink-0 rounded-full px-3 py-1.5" onClick={() => navigateToCrm(detailItemCrmHref(group.key, item)!)} variant="ghost">
                            Ver no CRM
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </Card>
        ) : null}
      </div>
    </div>
  );
}