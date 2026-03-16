"use client";

import { Link2, Pencil, Plus, Power, Trash2, Workflow, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";

import { Badge, Button, Card, Input, Textarea } from "@clone-zap/ui";

import {
  createSettingsAutomationRequest,
  createSettingsBotEdgeRequest,
  createSettingsBotNodeRequest,
  createSettingsBotRequest,
  createSettingsCannedResponseRequest,
  createSettingsChannelRequest,
  createSettingsCustomFieldRequest,
  createSettingsGroupRequest,
  createSettingsPermissionRequest,
  deleteSettingsAutomationRequest,
  deleteSettingsBotEdgeRequest,
  deleteSettingsBotNodeRequest,
  deleteSettingsBotRequest,
  deleteSettingsCannedResponseRequest,
  deleteSettingsChannelRequest,
  deleteSettingsCustomFieldRequest,
  deleteSettingsGroupRequest,
  deleteSettingsMemberRequest,
  deleteSettingsPermissionRequest,
  fetchSettingsData,
  inviteSettingsMemberRequest,
  updateSettingsAutomationRequest,
  updateSettingsBotEdgeRequest,
  updateSettingsBotNodeRequest,
  updateSettingsBotRequest,
  updateSettingsCannedResponseRequest,
  updateSettingsChannelRequest,
  updateSettingsCustomFieldRequest,
  updateSettingsGeneralRequest,
  updateSettingsGroupRequest,
  updateSettingsMemberRequest,
  updateSettingsPermissionRequest,
  updateSettingsProfileRequest
} from "@/lib/api";
import { settingsPageData } from "@/lib/mocks/app-data";
import type {
  SettingsAutomation,
  SettingsBot,
  SettingsBotNode,
  SettingsCannedResponse,
  SettingsCustomField,
  SettingsData,
  SettingsGeneral,
  SettingsIntegrationChannel,
  SettingsMember,
  SettingsPermission
} from "@/lib/types";

const settingsPanelMap = {
  profile: {
    id: "settings-panel-profile",
    label: "Perfil do usuario",
    description: "Conta pessoal, tema e configuracoes individuais do operador."
  },
  general: {
    id: "settings-panel-general",
    label: "Configuracoes gerais",
    description: "Parametros estruturais do workspace, idioma, moeda e operacao."
  },
  members: {
    id: "settings-panel-members",
    label: "Membros",
    description: "Convites, papeis e status da equipe em um unico ponto de gestao."
  },
  permissions: {
    id: "settings-panel-permissions",
    label: "Permissoes",
    description: "Matriz RBAC para controlar acessos e restricoes por perfil."
  },
  groups: {
    id: "settings-panel-groups",
    label: "Grupos",
    description: "Segmentacao da equipe para roteamento e operacao separada."
  },
  "custom-fields": {
    id: "settings-panel-custom-fields",
    label: "Campos personalizados",
    description: "Metadados operacionais para contatos e negociacoes."
  },
  responses: {
    id: "settings-panel-responses",
    label: "Frases rapidas",
    description: "Templates acionados por atalho para ganho de velocidade no atendimento."
  },
  automations: {
    id: "settings-panel-automations",
    label: "Automacoes",
    description: "Regras IF/THEN que reagem a eventos operacionais do workspace."
  },
  bots: {
    id: "settings-panel-bots",
    label: "Bots e fluxos",
    description: "Builder visual com nos, conexoes e estados do fluxo conversacional."
  },
  channels: {
    id: "settings-panel-channels",
    label: "Canais",
    description: "Hub de integracoes e conectores omnichannel da operacao."
  }
} as const;

function activeSettingsCardClass(isActive: boolean) {
  return isActive
    ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)] bg-[linear-gradient(180deg,rgba(59,130,246,0.08),var(--panel))] shadow-soft"
    : "";
}

function initialSettingsData(): SettingsData {
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

export function SettingsWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const settingsPanelParam = searchParams.get("panel") ?? "profile";
  const settingsBotParam = searchParams.get("botId");
  const settingsEdgeParam = searchParams.get("edgeId");
  const settingsModalParam = searchParams.get("modal");
  const settingsEditParam = searchParams.get("edit");
  const [settingsData, setSettingsData] = useState<SettingsData>(initialSettingsData);
  const [profileForm, setProfileForm] = useState(initialSettingsData().profile);
  const [generalForm, setGeneralForm] = useState(initialSettingsData().general);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [customFieldModalOpen, setCustomFieldModalOpen] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [automationModalOpen, setAutomationModalOpen] = useState(false);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [botModalOpen, setBotModalOpen] = useState(false);
  const [nodeModalOpen, setNodeModalOpen] = useState(false);
  const [editingPermissionId, setEditingPermissionId] = useState<string | null>(null);
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(initialSettingsData().bots[0]?.id ?? null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkingNodeId, setLinkingNodeId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState({ name: "", email: "", role: "Agent", status: "Convidado" });
  const [groupName, setGroupName] = useState("");
  const [responseForm, setResponseForm] = useState({ shortcut: "", text: "" });
  const [customFieldForm, setCustomFieldForm] = useState({ name: "", entity: "Contato", type: "Texto", required: false, visibility: "Todos", placeholder: "", options: "" });
  const [permissionForm, setPermissionForm] = useState({ category: "Conversas", name: "", description: "", admin: false, manager: false, agent: false });
  const [automationForm, setAutomationForm] = useState({ name: "", trigger: "Conversa iniciada", condition: "", result: "", status: "Rascunho" });
  const [channelForm, setChannelForm] = useState({ name: "", type: "Integracao personalizada", status: "Pendente", credentialLabel: "", lastSync: "Nunca" });
  const [botForm, setBotForm] = useState({ name: "", status: "Rascunho", entryChannel: "WhatsApp" });
  const [nodeForm, setNodeForm] = useState({ label: "", kind: "message", content: "", x: 220, y: 140 });
  const [edgeForm, setEdgeForm] = useState({ from: "", to: "", condition: "Sequencia" });
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);

  function replaceSettingsQuery(mutator: (params: URLSearchParams) => void) {
    const nextParams = new URLSearchParams(searchParamsKey);
    mutator(nextParams);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  useEffect(() => {
    let active = true;

    fetchSettingsData().then((data) => {
      if (active) {
        setSettingsData(data);
        setProfileForm(data.profile);
        setGeneralForm(data.general);
        const nextBotId = settingsBotParam && data.bots.some((bot) => bot.id === settingsBotParam)
          ? settingsBotParam
          : data.bots[0]?.id ?? null;
        setSelectedBotId(nextBotId);
      }
    });

    return () => {
      active = false;
    };
  }, [settingsBotParam]);

  useEffect(() => {
    const query = new URLSearchParams(searchParamsKey);
    const requestedPanel = query.get("panel") ?? "profile";
    const activePanel = settingsPanelMap[requestedPanel as keyof typeof settingsPanelMap] ?? settingsPanelMap.profile;

    if (!activePanel) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(activePanel.id);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchParamsKey]);

  const activeSettingsPanel = settingsPanelMap[settingsPanelParam as keyof typeof settingsPanelMap] ?? settingsPanelMap.profile;

  useEffect(() => {
    const nextSelectedBotId = settingsBotParam && settingsData.bots.some((bot) => bot.id === settingsBotParam)
      ? settingsBotParam
      : settingsData.bots.some((bot) => bot.id === (selectedBotId ?? ""))
        ? selectedBotId
        : settingsData.bots[0]?.id ?? null;

    if (nextSelectedBotId !== selectedBotId) {
      setSelectedBotId(nextSelectedBotId);
      return;
    }

    if (!nextSelectedBotId) {
      if (selectedEdgeId !== null) {
        setSelectedEdgeId(null);
      }
      return;
    }

    const activeBot = settingsData.bots.find((bot) => bot.id === nextSelectedBotId);
    const nextSelectedEdgeId = settingsEdgeParam && activeBot?.edges.some((edge) => edge.id === settingsEdgeParam)
      ? settingsEdgeParam
      : activeBot?.edges.some((edge) => edge.id === (selectedEdgeId ?? ""))
        ? selectedEdgeId
        : null;

    if (nextSelectedEdgeId !== selectedEdgeId) {
      setSelectedEdgeId(nextSelectedEdgeId);
    }
  }, [selectedBotId, selectedEdgeId, settingsBotParam, settingsData.bots, settingsEdgeParam]);

  useEffect(() => {
    if (settingsPanelParam !== "bots") {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsKey);

    if (selectedBotId && settingsData.bots.some((bot) => bot.id === selectedBotId)) {
      nextParams.set("botId", selectedBotId);
      const activeBot = settingsData.bots.find((bot) => bot.id === selectedBotId);

      if (selectedEdgeId && activeBot?.edges.some((edge) => edge.id === selectedEdgeId)) {
        nextParams.set("edgeId", selectedEdgeId);
      } else {
        nextParams.delete("edgeId");
      }
    } else {
      nextParams.delete("botId");
      nextParams.delete("edgeId");
    }

    const nextQuery = nextParams.toString();
    if (nextQuery !== searchParamsKey) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParamsKey, selectedBotId, selectedEdgeId, settingsData.bots, settingsPanelParam]);

  useEffect(() => {
    if (settingsModalParam === "automation") {
      const requestedAutomation = settingsEditParam
        ? settingsData.automations.find((automation) => automation.id === settingsEditParam)
        : null;

      if (requestedAutomation) {
        if (editingAutomationId !== requestedAutomation.id) {
          setEditingAutomationId(requestedAutomation.id);
          setAutomationForm({
            name: requestedAutomation.name,
            trigger: requestedAutomation.trigger,
            condition: requestedAutomation.condition,
            result: requestedAutomation.result,
            status: requestedAutomation.status
          });
        }
      } else if (editingAutomationId !== null || !automationModalOpen) {
        setEditingAutomationId(null);
        setAutomationForm({ name: "", trigger: "Conversa iniciada", condition: "", result: "", status: "Rascunho" });
      }

      if (!automationModalOpen) {
        setAutomationModalOpen(true);
      }
    } else if (automationModalOpen || editingAutomationId) {
      setAutomationModalOpen(false);
      setEditingAutomationId(null);
    }

    if (settingsModalParam === "channel") {
      const requestedChannel = settingsEditParam
        ? settingsData.channels.find((channel) => channel.id === settingsEditParam)
        : null;

      if (requestedChannel) {
        if (editingChannelId !== requestedChannel.id) {
          setEditingChannelId(requestedChannel.id);
          setChannelForm({
            name: requestedChannel.name,
            type: requestedChannel.type,
            status: requestedChannel.status,
            credentialLabel: requestedChannel.credentialLabel,
            lastSync: requestedChannel.lastSync
          });
        }
      } else if (editingChannelId !== null || !channelModalOpen) {
        setEditingChannelId(null);
        setChannelForm({ name: "", type: "Integracao personalizada", status: "Pendente", credentialLabel: "", lastSync: "Nunca" });
      }

      if (!channelModalOpen) {
        setChannelModalOpen(true);
      }
    } else if (channelModalOpen || editingChannelId) {
      setChannelModalOpen(false);
      setEditingChannelId(null);
    }

    if (settingsModalParam === "bot") {
      const requestedBot = settingsEditParam
        ? settingsData.bots.find((bot) => bot.id === settingsEditParam)
        : null;

      if (requestedBot) {
        if (editingBotId !== requestedBot.id) {
          setEditingBotId(requestedBot.id);
          setBotForm({ name: requestedBot.name, status: requestedBot.status, entryChannel: requestedBot.entryChannel });
        }
      } else if (editingBotId !== null || !botModalOpen) {
        setEditingBotId(null);
        setBotForm({ name: "", status: "Rascunho", entryChannel: "WhatsApp" });
      }

      if (!botModalOpen) {
        setBotModalOpen(true);
      }
    } else if (botModalOpen || editingBotId) {
      setBotModalOpen(false);
      setEditingBotId(null);
    }
  }, [automationModalOpen, botModalOpen, channelModalOpen, editingAutomationId, editingBotId, editingChannelId, settingsData.automations, settingsData.bots, settingsData.channels, settingsEditParam, settingsModalParam]);

  async function saveProfile() {
    try {
      const data = await updateSettingsProfileRequest(profileForm);
      setSettingsData(data);
      setProfileForm(data.profile);
      setGeneralForm(data.general);
    } catch {
      setSettingsData((current) => ({ ...current, profile: { ...profileForm } }));
    }
  }

  async function saveGeneral() {
    try {
      const data = await updateSettingsGeneralRequest(generalForm);
      setSettingsData(data);
      setGeneralForm(data.general);
    } catch {
      setSettingsData((current) => ({ ...current, general: { ...generalForm } }));
    }
  }

  function resetMemberModal() {
    setMemberModalOpen(false);
    setEditingMemberId(null);
    setMemberForm({ name: "", email: "", role: "Agent", status: "Convidado" });
  }

  function resetGroupModal() {
    setGroupModalOpen(false);
    setEditingGroupName(null);
    setGroupName("");
  }

  function resetResponseModal() {
    setResponseModalOpen(false);
    setEditingResponseId(null);
    setResponseForm({ shortcut: "", text: "" });
  }

  function resetCustomFieldModal() {
    setCustomFieldModalOpen(false);
    setEditingFieldId(null);
    setCustomFieldForm({ name: "", entity: "Contato", type: "Texto", required: false, visibility: "Todos", placeholder: "", options: "" });
  }

  function resetPermissionModal() {
    setPermissionModalOpen(false);
    setEditingPermissionId(null);
    setPermissionForm({ category: "Conversas", name: "", description: "", admin: false, manager: false, agent: false });
  }

  function resetAutomationModal() {
    replaceSettingsQuery((nextParams) => {
      nextParams.delete("modal");
      nextParams.delete("edit");
    });
  }

  function resetChannelModal() {
    replaceSettingsQuery((nextParams) => {
      nextParams.delete("modal");
      nextParams.delete("edit");
    });
  }

  function resetBotModal() {
    replaceSettingsQuery((nextParams) => {
      nextParams.delete("modal");
      nextParams.delete("edit");
    });
  }

  function resetNodeModal() {
    setNodeModalOpen(false);
    setEditingNodeId(null);
    setNodeForm({ label: "", kind: "message", content: "", x: 220, y: 140 });
  }

  function openNewMemberModal() {
    setEditingMemberId(null);
    setMemberForm({ name: "", email: "", role: "Agent", status: "Convidado" });
    setMemberModalOpen(true);
  }

  function openNewGroupModal() {
    setEditingGroupName(null);
    setGroupName("");
    setGroupModalOpen(true);
  }

  function openNewResponseModal() {
    setEditingResponseId(null);
    setResponseForm({ shortcut: "", text: "" });
    setResponseModalOpen(true);
  }

  function openNewCustomFieldModal() {
    setEditingFieldId(null);
    setCustomFieldForm({ name: "", entity: "Contato", type: "Texto", required: false, visibility: "Todos", placeholder: "", options: "" });
    setCustomFieldModalOpen(true);
  }

  function openNewPermissionModal() {
    setEditingPermissionId(null);
    setPermissionForm({ category: "Conversas", name: "", description: "", admin: false, manager: false, agent: false });
    setPermissionModalOpen(true);
  }

  function openNewAutomationModal() {
    replaceSettingsQuery((nextParams) => {
      nextParams.set("panel", "automations");
      nextParams.set("modal", "automation");
      nextParams.delete("edit");
    });
  }

  function openNewChannelModal() {
    replaceSettingsQuery((nextParams) => {
      nextParams.set("panel", "channels");
      nextParams.set("modal", "channel");
      nextParams.delete("edit");
    });
  }

  function openNewBotModal() {
    replaceSettingsQuery((nextParams) => {
      nextParams.set("panel", "bots");
      nextParams.set("modal", "bot");
      nextParams.delete("edit");
    });
  }

  function openNewNodeModal() {
    setEditingNodeId(null);
    setNodeForm({ label: "", kind: "message", content: "", x: 220, y: 140 });
    setNodeModalOpen(true);
  }

  function applyLocalMemberUpdate(memberId: string, payload: typeof memberForm) {
    setSettingsData((current) => ({
      ...current,
      members: current.members.map((member) =>
        member.id === memberId
          ? {
              ...member,
              name: payload.name.trim() || member.name,
              email: payload.email.trim().toLowerCase() || member.email,
              role: payload.role.trim() || member.role,
              status: payload.status.trim() || member.status
            }
          : member
      )
    }));
  }

  function applyLocalMemberDelete(memberId: string) {
    setSettingsData((current) => ({
      ...current,
      members: current.members.filter((member) => member.id !== memberId)
    }));
  }

  function applyLocalGroupUpdate(currentGroupName: string, nextGroupName: string) {
    setSettingsData((current) => ({
      ...current,
      groups: Array.from(new Set(current.groups.map((group) => (group === currentGroupName ? nextGroupName : group)).filter(Boolean)))
    }));
  }

  function applyLocalGroupDelete(groupToDelete: string) {
    setSettingsData((current) => ({
      ...current,
      groups: current.groups.filter((group) => group !== groupToDelete)
    }));
  }

  function applyLocalResponseUpdate(responseId: string, payload: typeof responseForm) {
    setSettingsData((current) => ({
      ...current,
      cannedResponses: current.cannedResponses.map((response) =>
        response.id === responseId
          ? {
              ...response,
              shortcut: payload.shortcut.trim() || response.shortcut,
              text: payload.text.trim() || response.text
            }
          : response
      )
    }));
  }

  function applyLocalResponseDelete(responseId: string) {
    setSettingsData((current) => ({
      ...current,
      cannedResponses: current.cannedResponses.filter((response) => response.id !== responseId)
    }));
  }

  function applyLocalCustomFieldUpdate(fieldId: string, payload: typeof customFieldForm) {
    const nextOptions = payload.options
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);

    setSettingsData((current) => ({
      ...current,
      customFields: current.customFields.map((field) =>
        field.id === fieldId
          ? {
              ...field,
              name: payload.name.trim() || field.name,
              entity: payload.entity.trim() || field.entity,
              type: payload.type.trim() || field.type,
              required: payload.required,
              visibility: payload.visibility.trim() || field.visibility,
              placeholder: payload.placeholder.trim(),
              options: nextOptions
            }
          : field
      )
    }));
  }

  function applyLocalCustomFieldDelete(fieldId: string) {
    setSettingsData((current) => ({
      ...current,
      customFields: current.customFields.filter((field) => field.id !== fieldId)
    }));
  }

  function applyLocalPermissionUpdate(permissionId: string, payload: typeof permissionForm) {
    setSettingsData((current) => ({
      ...current,
      permissions: current.permissions.map((permission) =>
        permission.id === permissionId
          ? {
              ...permission,
              category: payload.category.trim() || permission.category,
              name: payload.name.trim() || permission.name,
              description: payload.description.trim() || permission.description,
              admin: payload.admin,
              manager: payload.manager,
              agent: payload.agent
            }
          : permission
      )
    }));
  }

  function applyLocalPermissionDelete(permissionId: string) {
    setSettingsData((current) => ({
      ...current,
      permissions: current.permissions.filter((permission) => permission.id !== permissionId)
    }));
  }

  function applyLocalAutomationUpdate(automationId: string, payload: typeof automationForm) {
    setSettingsData((current) => ({
      ...current,
      automations: current.automations.map((automation) =>
        automation.id === automationId
          ? { ...automation, ...payload }
          : automation
      )
    }));
  }

  function applyLocalAutomationDelete(automationId: string) {
    setSettingsData((current) => ({
      ...current,
      automations: current.automations.filter((automation) => automation.id !== automationId)
    }));
  }

  function applyLocalChannelUpdate(channelId: string, payload: typeof channelForm) {
    setSettingsData((current) => ({
      ...current,
      channels: current.channels.map((channel) =>
        channel.id === channelId
          ? { ...channel, ...payload }
          : channel
      )
    }));
  }

  function applyLocalChannelDelete(channelId: string) {
    setSettingsData((current) => ({
      ...current,
      channels: current.channels.filter((channel) => channel.id !== channelId)
    }));
  }

  function applyLocalBotUpdate(botId: string, payload: typeof botForm) {
    setSettingsData((current) => ({
      ...current,
      bots: current.bots.map((bot) =>
        bot.id === botId
          ? { ...bot, ...payload, updatedAt: "Agora" }
          : bot
      )
    }));
  }

  function applyLocalBotDelete(botId: string) {
    setSettingsData((current) => ({
      ...current,
      bots: current.bots.filter((bot) => bot.id !== botId)
    }));
    setSelectedBotId((current) => (current === botId ? null : current));
  }

  function applyLocalNodeUpdate(botId: string, nodeId: string, payload: typeof nodeForm) {
    setSettingsData((current) => ({
      ...current,
      bots: current.bots.map((bot) =>
        bot.id === botId
          ? {
              ...bot,
              updatedAt: "Agora",
              nodes: bot.nodes.map((node) =>
                node.id === nodeId ? { ...node, ...payload } : node
              )
            }
          : bot
      )
    }));
  }

  function applyLocalNodeDelete(botId: string, nodeId: string) {
    setSettingsData((current) => ({
      ...current,
      bots: current.bots.map((bot) =>
        bot.id === botId
          ? {
              ...bot,
              updatedAt: "Agora",
              nodes: bot.nodes.filter((node) => node.id !== nodeId),
              edges: bot.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId)
            }
          : bot
      )
    }));
  }

  function applyLocalEdgeUpdate(botId: string, edgeId: string, payload: typeof edgeForm) {
    setSettingsData((current) => ({
      ...current,
      bots: current.bots.map((bot) =>
        bot.id === botId
          ? {
              ...bot,
              updatedAt: "Agora",
              edges: bot.edges.map((edge) =>
                edge.id === edgeId
                  ? {
                      ...edge,
                      from: payload.from || edge.from,
                      to: payload.to || edge.to,
                      condition: payload.condition.trim() || edge.condition
                    }
                  : edge
              )
            }
          : bot
      )
    }));
  }

  function applyLocalEdgeDelete(botId: string, edgeId: string) {
    setSettingsData((current) => ({
      ...current,
      bots: current.bots.map((bot) =>
        bot.id === botId
          ? {
              ...bot,
              updatedAt: "Agora",
              edges: bot.edges.filter((edge) => edge.id !== edgeId)
            }
          : bot
      )
    }));
  }

  const selectedBot = settingsData.bots.find((bot) => bot.id === selectedBotId) ?? null;
  const selectedEdge = selectedBot?.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  useEffect(() => {
    if (!selectedBot) {
      setSelectedEdgeId(null);
      setLinkingNodeId(null);
      return;
    }

    if (selectedEdge && selectedEdgeId) {
      setEdgeForm({ from: selectedEdge.from, to: selectedEdge.to, condition: selectedEdge.condition });
    } else {
      setEdgeForm((current) => ({ ...current, from: linkingNodeId ?? current.from, to: "", condition: current.condition || "Sequencia" }));
    }
  }, [linkingNodeId, selectedBot, selectedEdge, selectedEdgeId]);

  useEffect(() => {
    if (!draggingNodeId && !isPanningCanvas) {
      return;
    }

    function handlePointerMove(event: PointerEvent) {
      if (draggingNodeId && selectedBotId) {
        const deltaX = event.movementX / canvasScale;
        const deltaY = event.movementY / canvasScale;

        setSettingsData((current) => ({
          ...current,
          bots: current.bots.map((bot) =>
            bot.id === selectedBotId
              ? {
                  ...bot,
                  updatedAt: "Agora",
                  nodes: bot.nodes.map((node) =>
                    node.id === draggingNodeId
                      ? {
                          ...node,
                          x: Math.max(0, Math.round(node.x + deltaX)),
                          y: Math.max(0, Math.round(node.y + deltaY))
                        }
                      : node
                  )
                }
              : bot
          )
        }));
      } else if (isPanningCanvas) {
        setCanvasOffset((current) => ({ x: current.x + event.movementX, y: current.y + event.movementY }));
      }
    }

    async function handlePointerUp() {
      if (draggingNodeId && selectedBotId) {
        const bot = settingsData.bots.find((item) => item.id === selectedBotId);
        const node = bot?.nodes.find((item) => item.id === draggingNodeId);

        if (node) {
          try {
            const data = await updateSettingsBotNodeRequest(selectedBotId, draggingNodeId, { x: node.x, y: node.y });
            setSettingsData(data);
          } catch {
            applyLocalNodeUpdate(selectedBotId, draggingNodeId, { label: node.label, kind: node.kind, content: node.content, x: node.x, y: node.y });
          }
        }
      }

      setDraggingNodeId(null);
      setIsPanningCanvas(false);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [canvasScale, draggingNodeId, isPanningCanvas, selectedBotId, settingsData.bots]);

  function handleCanvasWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();

    setCanvasScale((current) => {
      const next = event.deltaY > 0 ? current - 0.08 : current + 0.08;
      return Math.min(1.8, Math.max(0.6, Number(next.toFixed(2))));
    });
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    setIsPanningCanvas(true);
    setSelectedEdgeId(null);
  }

  function handleNodePointerDown(event: ReactPointerEvent<HTMLDivElement>, nodeId: string) {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    event.stopPropagation();
    setDraggingNodeId(nodeId);
    setSelectedEdgeId(null);
  }

  async function inviteMember() {
    if (!memberForm.email.trim()) {
      return;
    }

    try {
      const data = editingMemberId
        ? await updateSettingsMemberRequest(editingMemberId, memberForm)
        : await inviteSettingsMemberRequest({ email: memberForm.email, role: memberForm.role });
      setSettingsData(data);
    } catch {
      const email = memberForm.email.trim().toLowerCase();
      const name = memberForm.name.trim() || (email.split("@")[0] ?? email)
        .split(/[._-]/g)
        .filter(Boolean)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(" ");

      if (editingMemberId) {
        applyLocalMemberUpdate(editingMemberId, { ...memberForm, name, email });
      } else {
        setSettingsData((current) => ({
          ...current,
          members: [{ id: `${Date.now()}`, name, role: memberForm.role, status: memberForm.status, email }, ...current.members]
        }));
      }
    }

    resetMemberModal();
  }

  async function createGroup() {
    if (!groupName.trim()) {
      return;
    }

    try {
      const data = editingGroupName
        ? await updateSettingsGroupRequest(editingGroupName, { name: groupName })
        : await createSettingsGroupRequest({ name: groupName });
      setSettingsData(data);
    } catch {
      if (editingGroupName) {
        applyLocalGroupUpdate(editingGroupName, groupName.trim());
      } else {
        setSettingsData((current) => ({
          ...current,
          groups: current.groups.includes(groupName.trim()) ? current.groups : [...current.groups, groupName.trim()]
        }));
      }
    }

    resetGroupModal();
  }

  async function createCannedResponse() {
    if (!responseForm.shortcut.trim() || !responseForm.text.trim()) {
      return;
    }

    try {
      const data = editingResponseId
        ? await updateSettingsCannedResponseRequest(editingResponseId, responseForm)
        : await createSettingsCannedResponseRequest(responseForm);
      setSettingsData(data);
    } catch {
      if (editingResponseId) {
        applyLocalResponseUpdate(editingResponseId, responseForm);
      } else {
        setSettingsData((current) => ({
          ...current,
          cannedResponses: [{ id: `${Date.now()}`, shortcut: responseForm.shortcut.trim(), text: responseForm.text.trim() }, ...current.cannedResponses]
        }));
      }
    }

    resetResponseModal();
  }

  async function saveCustomField() {
    if (!customFieldForm.name.trim()) {
      return;
    }

    const payload = {
      name: customFieldForm.name.trim(),
      entity: customFieldForm.entity,
      type: customFieldForm.type,
      required: customFieldForm.required,
      visibility: customFieldForm.visibility,
      placeholder: customFieldForm.placeholder,
      options: customFieldForm.options.split(",").map((option) => option.trim()).filter(Boolean)
    };

    try {
      const data = editingFieldId
        ? await updateSettingsCustomFieldRequest(editingFieldId, payload)
        : await createSettingsCustomFieldRequest(payload);
      setSettingsData(data);
    } catch {
      if (editingFieldId) {
        applyLocalCustomFieldUpdate(editingFieldId, customFieldForm);
      } else {
        setSettingsData((current) => ({
          ...current,
          customFields: [{ id: `${Date.now()}`, ...payload }, ...current.customFields]
        }));
      }
    }

    resetCustomFieldModal();
  }

  async function savePermission() {
    if (!permissionForm.name.trim() || !permissionForm.category.trim()) {
      return;
    }

    try {
      const data = editingPermissionId
        ? await updateSettingsPermissionRequest(editingPermissionId, permissionForm)
        : await createSettingsPermissionRequest(permissionForm);
      setSettingsData(data);
    } catch {
      if (editingPermissionId) {
        applyLocalPermissionUpdate(editingPermissionId, permissionForm);
      } else {
        setSettingsData((current) => ({
          ...current,
          permissions: [{ id: `${Date.now()}`, ...permissionForm }, ...current.permissions]
        }));
      }
    }

    resetPermissionModal();
  }

  async function saveAutomation() {
    if (!automationForm.name.trim()) {
      return;
    }

    try {
      const data = editingAutomationId
        ? await updateSettingsAutomationRequest(editingAutomationId, automationForm)
        : await createSettingsAutomationRequest(automationForm);
      setSettingsData(data);
    } catch {
      if (editingAutomationId) {
        applyLocalAutomationUpdate(editingAutomationId, automationForm);
      } else {
        setSettingsData((current) => ({
          ...current,
          automations: [{ id: `${Date.now()}`, ...automationForm }, ...current.automations]
        }));
      }
    }

    resetAutomationModal();
  }

  async function saveChannel() {
    if (!channelForm.name.trim()) {
      return;
    }

    try {
      const data = editingChannelId
        ? await updateSettingsChannelRequest(editingChannelId, channelForm)
        : await createSettingsChannelRequest(channelForm);
      setSettingsData(data);
    } catch {
      if (editingChannelId) {
        applyLocalChannelUpdate(editingChannelId, channelForm);
      } else {
        setSettingsData((current) => ({
          ...current,
          channels: [{ id: `${Date.now()}`, ...channelForm }, ...current.channels]
        }));
      }
    }

    resetChannelModal();
  }

  async function saveBot() {
    if (!botForm.name.trim()) {
      return;
    }

    try {
      const data = editingBotId
        ? await updateSettingsBotRequest(editingBotId, botForm)
        : await createSettingsBotRequest(botForm);
      setSettingsData(data);
      if (editingBotId) {
        setSelectedBotId(editingBotId);
      } else {
        setSelectedBotId(data.bots[0]?.id ?? null);
      }
    } catch {
      if (editingBotId) {
        applyLocalBotUpdate(editingBotId, botForm);
        setSelectedBotId(editingBotId);
      } else {
        const nextId = `${Date.now()}`;
        setSettingsData((current) => ({
          ...current,
          bots: [{ id: nextId, ...botForm, updatedAt: "Agora", nodes: [], edges: [] }, ...current.bots]
        }));
        setSelectedBotId(nextId);
      }
    }

    resetBotModal();
  }

  async function saveNode() {
    if (!selectedBotId || !nodeForm.label.trim()) {
      return;
    }

    try {
      const data = editingNodeId
        ? await updateSettingsBotNodeRequest(selectedBotId, editingNodeId, nodeForm)
        : await createSettingsBotNodeRequest(selectedBotId, nodeForm);
      setSettingsData(data);
    } catch {
      if (editingNodeId) {
        applyLocalNodeUpdate(selectedBotId, editingNodeId, nodeForm);
      } else {
        setSettingsData((current) => ({
          ...current,
          bots: current.bots.map((bot) =>
            bot.id === selectedBotId
              ? {
                  ...bot,
                  nodes: [...bot.nodes, { id: `${Date.now()}`, ...nodeForm }]
                }
              : bot
          )
        }));
      }
    }

    resetNodeModal();
  }

  async function saveEdge() {
    if (!selectedBotId || !edgeForm.from || !edgeForm.to || edgeForm.from === edgeForm.to) {
      return;
    }

    try {
      const data = selectedEdgeId
        ? await updateSettingsBotEdgeRequest(selectedBotId, selectedEdgeId, edgeForm)
        : await createSettingsBotEdgeRequest(selectedBotId, edgeForm as { from: string; to: string; condition?: string });
      setSettingsData(data);
      setSelectedEdgeId(null);
      setLinkingNodeId(null);
      setEdgeForm({ from: "", to: "", condition: "Sequencia" });
    } catch {
      if (selectedEdgeId) {
        applyLocalEdgeUpdate(selectedBotId, selectedEdgeId, edgeForm);
      } else {
        setSettingsData((current) => ({
          ...current,
          bots: current.bots.map((bot) =>
            bot.id === selectedBotId
              ? {
                  ...bot,
                  updatedAt: "Agora",
                  edges: [...bot.edges, { id: `${Date.now()}`, from: edgeForm.from, to: edgeForm.to, condition: edgeForm.condition.trim() || "Sequencia" }]
                }
              : bot
          )
        }));
      }
    }
  }

  async function connectNodesDirectly(fromNodeId: string, toNodeId: string) {
    if (!selectedBotId || fromNodeId === toNodeId) {
      return;
    }

    const payload = {
      from: fromNodeId,
      to: toNodeId,
      condition: edgeForm.condition.trim() || "Sequencia"
    };

    try {
      const data = await createSettingsBotEdgeRequest(selectedBotId, payload);
      setSettingsData(data);
    } catch {
      setSettingsData((current) => ({
        ...current,
        bots: current.bots.map((bot) =>
          bot.id === selectedBotId && !bot.edges.some((edge) => edge.from === fromNodeId && edge.to === toNodeId)
            ? {
                ...bot,
                updatedAt: "Agora",
                edges: [...bot.edges, { id: `${Date.now()}`, ...payload }]
              }
            : bot
        )
      }));
    }

    setSelectedEdgeId(null);
    setLinkingNodeId(null);
    setEdgeForm({ from: "", to: "", condition: payload.condition });
  }

  function startEditMember(member: SettingsMember) {
    setEditingMemberId(member.id);
    setMemberForm({
      name: member.name,
      email: member.email,
      role: member.role,
      status: member.status
    });
    setMemberModalOpen(true);
  }

  async function removeMember(memberId: string) {
    try {
      const data = await deleteSettingsMemberRequest(memberId);
      setSettingsData(data);
    } catch {
      applyLocalMemberDelete(memberId);
    }

    if (editingMemberId === memberId) {
      resetMemberModal();
    }
  }

  function startEditGroup(group: string) {
    setEditingGroupName(group);
    setGroupName(group);
    setGroupModalOpen(true);
  }

  async function removeGroup(group: string) {
    try {
      const data = await deleteSettingsGroupRequest(group);
      setSettingsData(data);
    } catch {
      applyLocalGroupDelete(group);
    }

    if (editingGroupName === group) {
      resetGroupModal();
    }
  }

  function startEditResponse(response: SettingsCannedResponse) {
    setEditingResponseId(response.id);
    setResponseForm({
      shortcut: response.shortcut,
      text: response.text
    });
    setResponseModalOpen(true);
  }

  function startEditCustomField(field: SettingsCustomField) {
    setEditingFieldId(field.id);
    setCustomFieldForm({
      name: field.name,
      entity: field.entity,
      type: field.type,
      required: field.required,
      visibility: field.visibility,
      placeholder: field.placeholder,
      options: field.options.join(", ")
    });
    setCustomFieldModalOpen(true);
  }

  async function removeResponse(responseId: string) {
    try {
      const data = await deleteSettingsCannedResponseRequest(responseId);
      setSettingsData(data);
    } catch {
      applyLocalResponseDelete(responseId);
    }

    if (editingResponseId === responseId) {
      resetResponseModal();
    }
  }

  async function removeCustomField(fieldId: string) {
    try {
      const data = await deleteSettingsCustomFieldRequest(fieldId);
      setSettingsData(data);
    } catch {
      applyLocalCustomFieldDelete(fieldId);
    }

    if (editingFieldId === fieldId) {
      resetCustomFieldModal();
    }
  }

  function startEditPermission(permission: SettingsPermission) {
    setEditingPermissionId(permission.id);
    setPermissionForm({
      category: permission.category,
      name: permission.name,
      description: permission.description,
      admin: permission.admin,
      manager: permission.manager,
      agent: permission.agent
    });
    setPermissionModalOpen(true);
  }

  async function togglePermissionRole(permission: SettingsPermission, role: "admin" | "manager" | "agent") {
    const payload = { [role]: !permission[role] };

    try {
      const data = await updateSettingsPermissionRequest(permission.id, payload);
      setSettingsData(data);
    } catch {
      applyLocalPermissionUpdate(permission.id, {
        category: permission.category,
        name: permission.name,
        description: permission.description,
        admin: role === "admin" ? !permission.admin : permission.admin,
        manager: role === "manager" ? !permission.manager : permission.manager,
        agent: role === "agent" ? !permission.agent : permission.agent
      });
    }
  }

  async function removePermission(permissionId: string) {
    try {
      const data = await deleteSettingsPermissionRequest(permissionId);
      setSettingsData(data);
    } catch {
      applyLocalPermissionDelete(permissionId);
    }

    if (editingPermissionId === permissionId) {
      resetPermissionModal();
    }
  }

  function startEditAutomation(automation: SettingsAutomation) {
    replaceSettingsQuery((nextParams) => {
      nextParams.set("panel", "automations");
      nextParams.set("modal", "automation");
      nextParams.set("edit", automation.id);
    });
  }

  async function removeAutomation(automationId: string) {
    try {
      const data = await deleteSettingsAutomationRequest(automationId);
      setSettingsData(data);
    } catch {
      applyLocalAutomationDelete(automationId);
    }

    if (editingAutomationId === automationId) {
      resetAutomationModal();
    }
  }

  function startEditChannel(channel: SettingsIntegrationChannel) {
    replaceSettingsQuery((nextParams) => {
      nextParams.set("panel", "channels");
      nextParams.set("modal", "channel");
      nextParams.set("edit", channel.id);
    });
  }

  async function removeChannel(channelId: string) {
    try {
      const data = await deleteSettingsChannelRequest(channelId);
      setSettingsData(data);
    } catch {
      applyLocalChannelDelete(channelId);
    }

    if (editingChannelId === channelId) {
      resetChannelModal();
    }
  }

  function startEditBot(bot: SettingsBot) {
    replaceSettingsQuery((nextParams) => {
      nextParams.set("panel", "bots");
      nextParams.set("modal", "bot");
      nextParams.set("edit", bot.id);
      nextParams.set("botId", bot.id);
    });
  }

  async function removeBot(botId: string) {
    try {
      const data = await deleteSettingsBotRequest(botId);
      setSettingsData(data);
      setSelectedBotId(data.bots[0]?.id ?? null);
      setSelectedEdgeId(null);
    } catch {
      applyLocalBotDelete(botId);
    }

    if (editingBotId === botId) {
      resetBotModal();
    }
  }

  function startEditNode(node: SettingsBotNode) {
    setEditingNodeId(node.id);
    setNodeForm({ label: node.label, kind: node.kind, content: node.content, x: node.x, y: node.y });
    setNodeModalOpen(true);
  }

  function startLinkFromNode(nodeId: string) {
    setSelectedEdgeId(null);
    setLinkingNodeId(nodeId);
    setEdgeForm({ from: nodeId, to: "", condition: "Sequencia" });
  }

  function completeLinkToNode(nodeId: string) {
    if (!linkingNodeId || linkingNodeId === nodeId) {
      return;
    }

    void connectNodesDirectly(linkingNodeId, nodeId);
  }

  function startEditEdge(edgeId: string) {
    if (!selectedBot) {
      return;
    }

    const edge = selectedBot.edges.find((item) => item.id === edgeId);
    if (!edge) {
      return;
    }

    setSelectedEdgeId(edge.id);
    setLinkingNodeId(null);
    setEdgeForm({ from: edge.from, to: edge.to, condition: edge.condition });
  }

  async function removeNode(nodeId: string) {
    if (!selectedBotId) {
      return;
    }

    try {
      const data = await deleteSettingsBotNodeRequest(selectedBotId, nodeId);
      setSettingsData(data);
    } catch {
      applyLocalNodeDelete(selectedBotId, nodeId);
    }

    if (editingNodeId === nodeId) {
      resetNodeModal();
    }
  }

  async function removeEdge(edgeId: string) {
    if (!selectedBotId) {
      return;
    }

    try {
      const data = await deleteSettingsBotEdgeRequest(selectedBotId, edgeId);
      setSettingsData(data);
    } catch {
      applyLocalEdgeDelete(selectedBotId, edgeId);
    }

    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
      setLinkingNodeId(null);
      setEdgeForm({ from: "", to: "", condition: "Sequencia" });
    }
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            Gestao do workspace e preferencias administrativas
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {settingsData.sections.map((section) => (
              <Badge className="rounded-full px-3 py-1.5" key={section}>{section}</Badge>
            ))}
          </div>
        </Card>
        <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Painel em foco</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{activeSettingsPanel.label}</p>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">{activeSettingsPanel.description}</p>
            {activeSettingsPanel.id === "settings-panel-bots" && selectedBot ? (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Bot atual: <span className="font-medium text-[var(--foreground)]">{selectedBot.name}</span>
                {selectedEdge ? ` • conexao ${selectedEdge.condition}` : " • nenhuma conexao em foco"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full px-3 py-1.5">Contexto ativo</Badge>
            {activeSettingsPanel.id === "settings-panel-bots" && selectedBot ? <Badge className="rounded-full px-3 py-1.5">{selectedBot.nodes.length} nos</Badge> : null}
          </div>
        </Card>
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className={`space-y-5 p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-profile")}`} id="settings-panel-profile">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Perfil do usuario</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Conta pessoal, timezone e tema da operacao.</p>
              </div>
              <Badge>{profileForm.theme}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="E-mail" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} />
              <Input placeholder="Celular" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
              <Input placeholder="Timezone" value={profileForm.timezone} onChange={(event) => setProfileForm((current) => ({ ...current, timezone: event.target.value }))} />
            </div>
            <div className="flex flex-wrap gap-2">
              {["Light", "Dark", "System"].map((theme) => (
                <Button className="rounded-full px-3 py-1.5" key={theme} onClick={() => setProfileForm((current) => ({ ...current, theme }))} variant={profileForm.theme === theme ? "primary" : "secondary"}>
                  {theme}
                </Button>
              ))}
            </div>
            <Textarea value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} />
            <div className="flex justify-end">
              <Button className="rounded-2xl px-4 py-3" onClick={() => void saveProfile()}>Salvar alteracoes</Button>
            </div>
          </Card>
          <div className="space-y-4">
            {settingsData.cards.map((card) => (
              <Card className="p-5" key={card.title}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{card.title}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{card.description}</p>
                  </div>
                  <Badge>{card.badge}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className={`space-y-5 p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-general")}`} id="settings-panel-general">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Configuracoes gerais</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Identidade do workspace, idioma, moeda e operacao.</p>
              </div>
              <Badge>{generalForm.status}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Workspace" value={generalForm.workspaceName} onChange={(event) => setGeneralForm((current) => ({ ...current, workspaceName: event.target.value }))} />
              <Input placeholder="Razao social" value={generalForm.legalName} onChange={(event) => setGeneralForm((current) => ({ ...current, legalName: event.target.value }))} />
              <Input placeholder="Timezone" value={generalForm.timezone} onChange={(event) => setGeneralForm((current) => ({ ...current, timezone: event.target.value }))} />
              <Input placeholder="Moeda" value={generalForm.currency} onChange={(event) => setGeneralForm((current) => ({ ...current, currency: event.target.value }))} />
              <Input placeholder="Idioma" value={generalForm.language} onChange={(event) => setGeneralForm((current) => ({ ...current, language: event.target.value }))} />
              <Input placeholder="Formato de data" value={generalForm.dateFormat} onChange={(event) => setGeneralForm((current) => ({ ...current, dateFormat: event.target.value }))} />
              <Input placeholder="Horario comercial" value={generalForm.businessHours} onChange={(event) => setGeneralForm((current) => ({ ...current, businessHours: event.target.value }))} />
              <Input placeholder="Status operacional" value={generalForm.status} onChange={(event) => setGeneralForm((current) => ({ ...current, status: event.target.value }))} />
            </div>
            <div className="flex justify-end">
              <Button className="rounded-2xl px-4 py-3" onClick={() => void saveGeneral()}>Salvar configuracoes</Button>
            </div>
          </Card>
          <Card className={`p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-custom-fields")}`} id="settings-panel-custom-fields">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Campos personalizados</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Cadastro de campos para contato e negociacao com persistencia real.</p>
              </div>
              <Button className="rounded-2xl px-4 py-2" onClick={openNewCustomFieldModal} variant="secondary">Novo campo</Button>
            </div>
            <div className="space-y-3">
              {settingsData.customFields.map((field) => (
                <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={field.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--foreground)]">{field.name}</p>
                        <Badge>{field.entity}</Badge>
                        <Badge>{field.type}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted-foreground)]">Visibilidade: {field.visibility} • {field.required ? "Obrigatorio" : "Opcional"}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Placeholder: {field.placeholder || "Nao definido"}</p>
                      {field.options.length ? <p className="mt-1 text-xs text-[var(--muted-foreground)]">Opcoes: {field.options.join(", ")}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button className="rounded-2xl px-3 py-2" onClick={() => startEditCustomField(field)} variant="ghost"><Pencil className="size-4" /></Button>
                      <Button className="rounded-2xl px-3 py-2" onClick={() => void removeCustomField(field.id)} variant="ghost"><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className={`p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-members")}`} id="settings-panel-members">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Membros</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Convites, status e papeis da operacao.</p>
              </div>
              <Button className="rounded-2xl px-4 py-2" onClick={openNewMemberModal} variant="secondary">Convidar membro</Button>
            </div>
            <div className="space-y-3">
              {settingsData.members.map((member) => (
                <div className="grid gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--panel-strong)] p-4 md:grid-cols-[1fr_0.8fr_0.8fr_0.6fr]" key={member.id}>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{member.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{member.email}</p>
                  </div>
                  <p className="text-[var(--muted-foreground)]">{member.role}</p>
                  <p className="text-[var(--muted-foreground)]">{member.status}</p>
                  <div className="flex items-center justify-start gap-2 md:justify-end">
                    <Button className="rounded-2xl px-3 py-2" onClick={() => startEditMember(member)} variant="ghost">
                      <Pencil className="size-4" />
                    </Button>
                    <Button className="rounded-2xl px-3 py-2" onClick={() => void removeMember(member.id)} variant="ghost">
                      <Trash2 className="size-4" />
                    </Button>
                    <Badge>{member.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className={`p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-groups")}`} id="settings-panel-groups">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)]">Grupos</p>
              <Button className="rounded-2xl px-4 py-2" onClick={openNewGroupModal} variant="secondary">Novo Grupo</Button>
            </div>
            <div className="flex flex-wrap gap-3">
              {settingsData.groups.map((group) => (
                <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2" key={group}>
                  <Badge className="rounded-full px-3 py-1">{group}</Badge>
                  <Button className="rounded-2xl px-2 py-2" onClick={() => startEditGroup(group)} variant="ghost">
                    <Pencil className="size-4" />
                  </Button>
                  <Button className="rounded-2xl px-2 py-2" onClick={() => void removeGroup(group)} variant="ghost">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className={`mt-6 rounded-[24px] ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-responses")} p-4`}>
              <div className="flex items-center justify-between" id="settings-panel-responses">
                <p className="font-semibold text-[var(--foreground)]">Frases Rapidas</p>
                <Button className="rounded-2xl px-4 py-2" onClick={openNewResponseModal} variant="secondary">
                  <Plus className="size-4" />
                  Nova frase
                </Button>
              </div>
              <div className="mt-3 space-y-3">
                {settingsData.cannedResponses.map((response) => (
                  <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={response.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{response.shortcut}</p>
                      <div className="flex items-center gap-2">
                        <Button className="rounded-2xl px-3 py-2" onClick={() => startEditResponse(response)} variant="ghost">
                          <Pencil className="size-4" />
                        </Button>
                        <Button className="rounded-2xl px-3 py-2" onClick={() => void removeResponse(response.id)} variant="ghost">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{response.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className={`p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-permissions")}`} id="settings-panel-permissions">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Permissoes</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Matriz RBAC inicial por perfil de acesso.</p>
              </div>
              <Button className="rounded-2xl px-4 py-2" onClick={openNewPermissionModal}>Nova permissao</Button>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-[var(--border)]">
              <div className="grid bg-[var(--panel-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)] md:grid-cols-[1.1fr_0.4fr_0.4fr_0.4fr]">
                <span>Permissao</span><span>Admin</span><span>Manager</span><span>Agent</span>
              </div>
              {settingsData.permissions.map((permission) => (
                <div className="grid border-t border-[var(--border)] px-4 py-4 text-sm md:grid-cols-[1.1fr_0.4fr_0.4fr_0.4fr]" key={permission.id}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--foreground)]">{permission.name}</span>
                      <Badge>{permission.category}</Badge>
                    </div>
                    <p className="text-xs leading-5 text-[var(--muted-foreground)]">{permission.description}</p>
                    <div className="flex gap-2 pt-1">
                      <Button className="rounded-2xl px-3 py-2" onClick={() => startEditPermission(permission)} variant="ghost"><Pencil className="size-4" /></Button>
                      <Button className="rounded-2xl px-3 py-2" onClick={() => void removePermission(permission.id)} variant="ghost"><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center"><Button className="rounded-full px-3 py-1.5" onClick={() => void togglePermissionRole(permission, "admin")} variant={permission.admin ? "primary" : "secondary"}>{permission.admin ? "Sim" : "Nao"}</Button></div>
                  <div className="flex items-center"><Button className="rounded-full px-3 py-1.5" onClick={() => void togglePermissionRole(permission, "manager")} variant={permission.manager ? "primary" : "secondary"}>{permission.manager ? "Sim" : "Nao"}</Button></div>
                  <div className="flex items-center"><Button className="rounded-full px-3 py-1.5" onClick={() => void togglePermissionRole(permission, "agent")} variant={permission.agent ? "primary" : "secondary"}>{permission.agent ? "Sim" : "Nao"}</Button></div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card className={`p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-automations")}`} id="settings-panel-automations">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold text-[var(--foreground)]">Automacoes</p>
                <div className="flex items-center gap-2">
                  <Badge>IF / THEN</Badge>
                  <Button className="rounded-2xl px-4 py-2" onClick={openNewAutomationModal} variant="secondary">Nova automacao</Button>
                </div>
              </div>
              <div className="space-y-3">
                {settingsData.automations.map((automation) => (
                  <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={automation.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[var(--foreground)]">{automation.name}</p>
                          <Badge>{automation.status}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Trigger: {automation.trigger}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Condicao: {automation.condition}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Acao: {automation.result}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button className="rounded-2xl px-3 py-2" onClick={() => startEditAutomation(automation)} variant="ghost"><Pencil className="size-4" /></Button>
                        <Button className="rounded-2xl px-3 py-2" onClick={() => void removeAutomation(automation.id)} variant="ghost"><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className={`p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-channels")}`} id="settings-panel-channels">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold text-[var(--foreground)]">Canais</p>
                <div className="flex items-center gap-2">
                  <Badge>Integracoes</Badge>
                  <Button className="rounded-2xl px-4 py-2" onClick={openNewChannelModal} variant="secondary">Novo canal</Button>
                </div>
              </div>
              <div className="space-y-3">
                {settingsData.channels.map((channel) => (
                  <div className="flex items-center justify-between rounded-[24px] bg-[var(--panel-strong)] p-4" key={channel.id}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--foreground)]">{channel.name}</p>
                        <Badge>{channel.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{channel.type} • {channel.credentialLabel}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Sincronizacao: {channel.lastSync}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button className="rounded-2xl px-3 py-2" onClick={() => startEditChannel(channel)} variant="ghost"><Pencil className="size-4" /></Button>
                      <Button className="rounded-2xl px-3 py-2" onClick={() => void removeChannel(channel.id)} variant="ghost"><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
          <Card className={`p-5 ${activeSettingsCardClass(activeSettingsPanel.id === "settings-panel-bots")}`} id="settings-panel-bots">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Bots e fluxos</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Modulo inicial do builder visual de atendimento.</p>
              </div>
              <Button className="rounded-2xl px-4 py-2" onClick={openNewBotModal}>Novo bot</Button>
            </div>
            <div className="space-y-3">
              {settingsData.bots.map((bot) => (
                <button
                  className={`w-full rounded-[24px] border p-4 text-left transition ${selectedBotId === bot.id ? "border-[var(--accent)] bg-[var(--panel-strong)]" : "border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-soft)]"}`}
                  key={bot.id}
                  onClick={() => {
                    setSelectedBotId(bot.id);
                    setSelectedEdgeId(null);
                    setLinkingNodeId(null);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--foreground)]">{bot.name}</p>
                        <Badge>{bot.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Canal de entrada: {bot.entryChannel}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Atualizado em {bot.updatedAt}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button className="rounded-2xl px-3 py-2" onClick={(event) => { event.stopPropagation(); startEditBot(bot); }} variant="ghost"><Pencil className="size-4" /></Button>
                      <Button className="rounded-2xl px-3 py-2" onClick={(event) => { event.stopPropagation(); void removeBot(bot.id); }} variant="ghost"><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Canvas do fluxo</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Arraste nos, use scroll para zoom e edite conexoes do fluxo.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>Zoom {(canvasScale * 100).toFixed(0)}%</Badge>
                <Badge>{selectedBot?.nodes.length ?? 0} nos</Badge>
                <Button className="rounded-2xl px-4 py-2" disabled={!selectedBot} onClick={openNewNodeModal} variant="secondary">Novo no</Button>
              </div>
            </div>
            {selectedBot ? (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                  <div
                    className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(239,246,255,0.92))] p-4"
                    onPointerDown={handleCanvasPointerDown}
                    onWheel={handleCanvasWheel}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(37,99,235,0.12) 1px, transparent 0)", backgroundSize: `${24 * canvasScale}px ${24 * canvasScale}px`, backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px` }} />
                    <div className="relative h-[560px] min-w-[1080px] origin-top-left" style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})` }}>
                  <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
                    {selectedBot.edges.map((edge) => {
                      const fromNode = selectedBot.nodes.find((node) => node.id === edge.from);
                      const toNode = selectedBot.nodes.find((node) => node.id === edge.to);

                      if (!fromNode || !toNode) {
                        return null;
                      }

                      const x1 = fromNode.x + 96;
                      const y1 = fromNode.y + 34;
                      const x2 = toNode.x + 96;
                      const y2 = toNode.y + 34;

                      return (
                        <g key={edge.id} onClick={() => startEditEdge(edge.id)}>
                          <path d={`M ${x1} ${y1} C ${x1 + 80} ${y1}, ${x2 - 80} ${y2}, ${x2} ${y2}`} fill="none" stroke={selectedEdgeId === edge.id ? "rgba(37,99,235,0.85)" : "rgba(37,99,235,0.35)"} strokeWidth={selectedEdgeId === edge.id ? "4" : "3"} style={{ cursor: "pointer" }} />
                          <text fill="rgba(15,23,42,0.62)" fontSize="11" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8}>{edge.condition}</text>
                        </g>
                      );
                    })}
                  </svg>
                  <div className="relative h-[560px] min-w-[1080px]">
                    {selectedBot.nodes.map((node) => (
                      <div className="absolute w-48 rounded-[22px] border border-[var(--border)] bg-white/95 p-4 shadow-soft" key={node.id} onPointerDown={(event) => handleNodePointerDown(event, node.id)} style={{ left: node.x, top: node.y, cursor: draggingNodeId === node.id ? "grabbing" : "grab" }}>
                        <button className={`absolute -left-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-sm transition ${linkingNodeId ? "border-[var(--accent)] text-[var(--accent-strong)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`} onClick={(event) => { event.stopPropagation(); completeLinkToNode(node.id); }} type="button" title="Conectar aqui">
                          <span className="size-2 rounded-full bg-current" />
                        </button>
                        <button className={`absolute -right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-sm transition ${linkingNodeId === node.id ? "border-[var(--accent)] text-[var(--accent-strong)]" : "border-[var(--border)] text-[var(--muted-foreground)]"}`} onClick={(event) => { event.stopPropagation(); startLinkFromNode(node.id); }} type="button" title="Iniciar conexao">
                          <span className="size-2 rounded-full bg-current" />
                        </button>
                        <div className="flex items-center justify-between gap-2">
                          <Badge>{node.kind}</Badge>
                          <div className="flex items-center gap-1">
                            <Button className="rounded-2xl px-2 py-2" onClick={() => startLinkFromNode(node.id)} variant="ghost"><Link2 className="size-4" /></Button>
                            <Button className="rounded-2xl px-2 py-2" onClick={() => startEditNode(node)} variant="ghost"><Pencil className="size-4" /></Button>
                            <Button className="rounded-2xl px-2 py-2" onClick={() => void removeNode(node.id)} variant="ghost"><Trash2 className="size-4" /></Button>
                          </div>
                        </div>
                        <p className="mt-3 font-semibold text-[var(--foreground)]">{node.label}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{node.content || "Sem conteudo configurado."}</p>
                      </div>
                    ))}
                  </div>
                    </div>
                  </div>
                  <div className="space-y-4 rounded-[28px] border border-[var(--border)] bg-[var(--panel-strong)] p-4">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">Conexoes</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Clique no ponto de saida de um no e depois no ponto de entrada do destino.</p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Origem</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedBot.nodes.map((node) => (
                          <Button className="rounded-full px-3 py-1.5" key={`from-${node.id}`} onClick={() => setEdgeForm((current) => ({ ...current, from: node.id }))} variant={edgeForm.from === node.id ? "primary" : "secondary"}>
                            {node.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">Destino</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedBot.nodes.map((node) => (
                          <Button className="rounded-full px-3 py-1.5" key={`to-${node.id}`} onClick={() => setEdgeForm((current) => ({ ...current, to: node.id }))} variant={edgeForm.to === node.id ? "primary" : "secondary"}>
                            {node.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <Input placeholder="Condicao" value={edgeForm.condition} onChange={(event) => setEdgeForm((current) => ({ ...current, condition: event.target.value }))} />
                    <div className="flex gap-2">
                      <Button className="rounded-2xl px-4 py-2" onClick={() => void saveEdge()}>{selectedEdgeId ? "Salvar conexao" : "Criar conexao"}</Button>
                      <Button className="rounded-2xl px-4 py-2" onClick={() => { setSelectedEdgeId(null); setLinkingNodeId(null); setEdgeForm({ from: "", to: "", condition: "Sequencia" }); }} variant="ghost">Limpar</Button>
                    </div>
                    {selectedEdgeId ? <Button className="rounded-2xl px-4 py-2" onClick={() => void removeEdge(selectedEdgeId)} variant="secondary">Excluir conexao</Button> : null}
                    <div className="space-y-2 border-t border-[var(--border)] pt-4">
                      {selectedBot.edges.map((edge) => (
                        <button className={`w-full rounded-[20px] border px-3 py-3 text-left text-sm transition ${selectedEdgeId === edge.id ? "border-[var(--accent)] bg-white" : "border-[var(--border)] bg-white/60"}`} key={edge.id} onClick={() => startEditEdge(edge.id)} type="button">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[var(--foreground)]">{edge.condition}</span>
                            <Badge>{edge.from} → {edge.to}</Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {selectedBot.nodes.map((node) => (
                    <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={node.id}>
                      <div className="flex items-center gap-2">
                        <Workflow className="size-4 text-[var(--accent)]" />
                        <p className="font-semibold text-[var(--foreground)]">{node.label}</p>
                      </div>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">{node.kind} • x {node.x} • y {node.y}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--panel-strong)] text-sm text-[var(--muted-foreground)]">
                Crie ou selecione um bot para editar o fluxo visual.
              </div>
            )}
          </Card>
        </div>
      </div>

      {memberModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Membro</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingMemberId ? "Editar membro" : "Convidar membro"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetMemberModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome" value={memberForm.name} onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Email" value={memberForm.email} onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))} />
              <Input placeholder="Papel" value={memberForm.role} onChange={(event) => setMemberForm((current) => ({ ...current, role: event.target.value }))} />
              <Input placeholder="Status" value={memberForm.status} onChange={(event) => setMemberForm((current) => ({ ...current, status: event.target.value }))} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetMemberModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void inviteMember()}>{editingMemberId ? "Salvar alteracoes" : "Enviar convite"}</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {groupModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-lg p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Grupo</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingGroupName ? "Editar grupo" : "Novo grupo"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetGroupModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <Input placeholder="Nome do grupo" value={groupName} onChange={(event) => setGroupName(event.target.value)} />
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetGroupModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void createGroup()}>{editingGroupName ? "Salvar alteracoes" : "Salvar grupo"}</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {responseModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-2xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Frase rapida</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingResponseId ? "Editar frase rapida" : "Nova frase rapida"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetResponseModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <Input placeholder="Atalho" value={responseForm.shortcut} onChange={(event) => setResponseForm((current) => ({ ...current, shortcut: event.target.value }))} />
            <div className="mt-4">
              <Textarea placeholder="Texto da frase" value={responseForm.text} onChange={(event) => setResponseForm((current) => ({ ...current, text: event.target.value }))} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetResponseModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void createCannedResponse()}>{editingResponseId ? "Salvar alteracoes" : "Salvar frase"}</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {customFieldModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-2xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Campos</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingFieldId ? "Editar campo" : "Novo campo"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetCustomFieldModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome do campo" value={customFieldForm.name} onChange={(event) => setCustomFieldForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Entidade" value={customFieldForm.entity} onChange={(event) => setCustomFieldForm((current) => ({ ...current, entity: event.target.value }))} />
              <Input placeholder="Tipo" value={customFieldForm.type} onChange={(event) => setCustomFieldForm((current) => ({ ...current, type: event.target.value }))} />
              <Input placeholder="Visibilidade" value={customFieldForm.visibility} onChange={(event) => setCustomFieldForm((current) => ({ ...current, visibility: event.target.value }))} />
              <Input placeholder="Placeholder" value={customFieldForm.placeholder} onChange={(event) => setCustomFieldForm((current) => ({ ...current, placeholder: event.target.value }))} />
              <button
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${customFieldForm.required ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border-[var(--border)] bg-[var(--panel-strong)] text-[var(--muted-foreground)]"}`}
                onClick={() => setCustomFieldForm((current) => ({ ...current, required: !current.required }))}
                type="button"
              >
                Campo obrigatorio: {customFieldForm.required ? "Sim" : "Nao"}
              </button>
            </div>
            <div className="mt-4">
              <Textarea placeholder="Opcoes separadas por virgula" value={customFieldForm.options} onChange={(event) => setCustomFieldForm((current) => ({ ...current, options: event.target.value }))} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetCustomFieldModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void saveCustomField()}>{editingFieldId ? "Salvar alteracoes" : "Salvar campo"}</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {permissionModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-2xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">RBAC</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingPermissionId ? "Editar permissao" : "Nova permissao"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetPermissionModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Categoria" value={permissionForm.category} onChange={(event) => setPermissionForm((current) => ({ ...current, category: event.target.value }))} />
              <Input placeholder="Nome" value={permissionForm.name} onChange={(event) => setPermissionForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="mt-4"><Textarea placeholder="Descricao operacional" value={permissionForm.description} onChange={(event) => setPermissionForm((current) => ({ ...current, description: event.target.value }))} /></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["admin", "manager", "agent"] as const).map((role) => (
                <Button className="rounded-full px-3 py-1.5" key={role} onClick={() => setPermissionForm((current) => ({ ...current, [role]: !current[role] }))} variant={permissionForm[role] ? "primary" : "secondary"}>{role}</Button>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetPermissionModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void savePermission()}>Salvar permissao</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {automationModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-2xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Automacao</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingAutomationId ? "Editar automacao" : "Nova automacao"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetAutomationModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome" value={automationForm.name} onChange={(event) => setAutomationForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Trigger" value={automationForm.trigger} onChange={(event) => setAutomationForm((current) => ({ ...current, trigger: event.target.value }))} />
              <Input placeholder="Condicao" value={automationForm.condition} onChange={(event) => setAutomationForm((current) => ({ ...current, condition: event.target.value }))} />
              <Input placeholder="Status" value={automationForm.status} onChange={(event) => setAutomationForm((current) => ({ ...current, status: event.target.value }))} />
            </div>
            <div className="mt-4"><Textarea placeholder="Acao resultante" value={automationForm.result} onChange={(event) => setAutomationForm((current) => ({ ...current, result: event.target.value }))} /></div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetAutomationModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void saveAutomation()}>Salvar automacao</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {channelModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-2xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Canal</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingChannelId ? "Editar canal" : "Novo canal"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetChannelModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome" value={channelForm.name} onChange={(event) => setChannelForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Tipo" value={channelForm.type} onChange={(event) => setChannelForm((current) => ({ ...current, type: event.target.value }))} />
              <Input placeholder="Status" value={channelForm.status} onChange={(event) => setChannelForm((current) => ({ ...current, status: event.target.value }))} />
              <Input placeholder="Ultima sincronizacao" value={channelForm.lastSync} onChange={(event) => setChannelForm((current) => ({ ...current, lastSync: event.target.value }))} />
            </div>
            <div className="mt-4"><Textarea placeholder="Credencial / observacao" value={channelForm.credentialLabel} onChange={(event) => setChannelForm((current) => ({ ...current, credentialLabel: event.target.value }))} /></div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetChannelModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void saveChannel()}>Salvar canal</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {botModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Bot</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingBotId ? "Editar bot" : "Novo bot"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetBotModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <div className="grid gap-4">
              <Input placeholder="Nome" value={botForm.name} onChange={(event) => setBotForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Canal de entrada" value={botForm.entryChannel} onChange={(event) => setBotForm((current) => ({ ...current, entryChannel: event.target.value }))} />
              <Input placeholder="Status" value={botForm.status} onChange={(event) => setBotForm((current) => ({ ...current, status: event.target.value }))} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetBotModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void saveBot()}>Salvar bot</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {nodeModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-2xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">No do fluxo</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingNodeId ? "Editar no" : "Novo no"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetNodeModal} variant="ghost"><X className="size-4" /></Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Titulo" value={nodeForm.label} onChange={(event) => setNodeForm((current) => ({ ...current, label: event.target.value }))} />
              <Input placeholder="Tipo" value={nodeForm.kind} onChange={(event) => setNodeForm((current) => ({ ...current, kind: event.target.value }))} />
              <Input placeholder="Posicao X" type="number" value={String(nodeForm.x)} onChange={(event) => setNodeForm((current) => ({ ...current, x: Number(event.target.value) || 0 }))} />
              <Input placeholder="Posicao Y" type="number" value={String(nodeForm.y)} onChange={(event) => setNodeForm((current) => ({ ...current, y: Number(event.target.value) || 0 }))} />
            </div>
            <div className="mt-4"><Textarea placeholder="Conteudo do no" value={nodeForm.content} onChange={(event) => setNodeForm((current) => ({ ...current, content: event.target.value }))} /></div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetNodeModal} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void saveNode()}>Salvar no</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}