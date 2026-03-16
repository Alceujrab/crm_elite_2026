"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, Input, Textarea } from "@clone-zap/ui";

import { createReportsDashboardRequest, deleteReportsDashboardRequest, fetchReportsData, updateReportsDashboardRequest } from "@/lib/api";
import { reportsPageData } from "@/lib/mocks/app-data";
import type { ReportsDashboard, ReportsData } from "@/lib/types";

const reportsPanelMap = {
  dashboards: {
    id: "reports-panel-dashboards",
    label: "Dashboards",
    description: "Colecao ativa de visores com periodo e visibilidade configurados."
  },
  overview: {
    id: "reports-panel-overview",
    label: "Visao geral",
    description: "Leitura macro de volume operacional e distribuicao ao longo do dia."
  },
  productivity: {
    id: "reports-panel-productivity",
    label: "Produtividade",
    description: "Rendimento do time por respostas, SLA e nota operacional."
  },
  assignment: {
    id: "reports-panel-assignment",
    label: "Atribuicao",
    description: "Recorte operacional sobre distribuicao da carga entre agentes."
  },
  interaction: {
    id: "reports-panel-interaction",
    label: "Interacao",
    description: "Comparativo de volume e conversao por canal de atendimento."
  },
  presence: {
    id: "reports-panel-presence",
    label: "Presenca",
    description: "Leitura consolidada da presenca operacional a partir da visao macro."
  },
  evaluation: {
    id: "reports-panel-evaluation",
    label: "Avaliacao",
    description: "Indicadores de qualidade e nota da operacao por agente."
  },
  calls: {
    id: "reports-panel-calls",
    label: "Ligacoes",
    description: "Recorte de performance do canal com foco em interacao e conversao."
  }
} as const;

function activeReportCardClass(isActive: boolean) {
  return isActive
    ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)] bg-[linear-gradient(180deg,rgba(59,130,246,0.08),var(--panel))] shadow-soft"
    : "";
}

function parseSlaToSeconds(value: string) {
  const match = value.match(/(\d+)m\s*(\d+)s/);

  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function initialReportsData(): ReportsData {
  return {
    sections: [...reportsPageData.sections],
    kpis: reportsPageData.kpis.map((item) => ({ ...item })),
    chartBars: [...reportsPageData.chartBars],
    dashboards: reportsPageData.dashboards.map((dashboard) => ({ ...dashboard })),
    teamPerformance: reportsPageData.teamPerformance.map((row) => ({ ...row })),
    channels: reportsPageData.channels.map((channel) => ({ ...channel }))
  };
}

export function ReportsWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const reportsPanelParam = searchParams.get("panel") ?? "dashboards";
  const reportsModalParam = searchParams.get("modal");
  const reportsDashboardIdParam = searchParams.get("dashboardId");
  const [reportsData, setReportsData] = useState<ReportsData>(initialReportsData);
  const [dashboardModalOpen, setDashboardModalOpen] = useState(false);
  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null);
  const [dashboardForm, setDashboardForm] = useState({
    name: "",
    description: "",
    period: "Ultimos 7 dias",
    visibility: "Publico"
  });

  useEffect(() => {
    let active = true;

    fetchReportsData().then((data) => {
      if (active) {
        setReportsData(data);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(searchParamsKey);
    const requestedPanel = query.get("panel") ?? "dashboards";
    const activePanel = reportsPanelMap[requestedPanel as keyof typeof reportsPanelMap] ?? reportsPanelMap.dashboards;

    if (!activePanel) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const element = document.getElementById(activePanel.id);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchParamsKey]);

  const activeReportsPanel = useMemo(
    () => reportsPanelMap[reportsPanelParam as keyof typeof reportsPanelMap] ?? reportsPanelMap.dashboards,
    [reportsPanelParam]
  );

  const totalReplies = useMemo(
    () => reportsData.teamPerformance.reduce((sum, row) => sum + row.replies, 0),
    [reportsData.teamPerformance]
  );

  const assignmentRows = useMemo(
    () => reportsData.teamPerformance
      .map((row) => {
        const share = totalReplies ? Math.round((row.replies / totalReplies) * 100) : 0;
        const loadLabel = share >= 30 ? "Carga alta" : share >= 24 ? "Balanceado" : "Espaco para absorver";

        return {
          ...row,
          share,
          loadLabel
        };
      })
      .sort((left, right) => right.replies - left.replies),
    [reportsData.teamPerformance, totalReplies]
  );

  const presenceRows = useMemo(
    () => reportsData.teamPerformance.map((row) => {
      const slaSeconds = parseSlaToSeconds(row.sla);
      const status = slaSeconds <= 300 ? "Online pleno" : slaSeconds <= 390 ? "Ritmo estavel" : "Apoio necessario";
      const adherence = slaSeconds <= 300 ? "98% aderencia" : slaSeconds <= 390 ? "94% aderencia" : "88% aderencia";

      return {
        ...row,
        status,
        adherence
      };
    }),
    [reportsData.teamPerformance]
  );

  const evaluationRows = useMemo(() => {
    const averageScore = reportsData.teamPerformance.length
      ? reportsData.teamPerformance.reduce((sum, row) => sum + Number(row.score), 0) / reportsData.teamPerformance.length
      : 0;

    return reportsData.teamPerformance
      .map((row) => {
        const scoreValue = Number(row.score);
        const delta = scoreValue >= averageScore ? `+${(scoreValue - averageScore).toFixed(1)}` : (scoreValue - averageScore).toFixed(1);

        return {
          ...row,
          delta,
          scoreValue
        };
      })
      .sort((left, right) => right.scoreValue - left.scoreValue);
  }, [reportsData.teamPerformance]);

  const callRows = useMemo(
    () => reportsData.teamPerformance
      .map((row) => {
        const scheduledCalls = Math.max(6, Math.round(row.replies * 0.18));
        const connectionRate = `${Math.min(92, 42 + Math.round(Number(row.score) * 10))}%`;
        const avgHandleTime = `${Math.max(4, Math.round(parseSlaToSeconds(row.sla) / 75))}m`;

        return {
          ...row,
          scheduledCalls,
          connectionRate,
          avgHandleTime
        };
      })
      .sort((left, right) => right.scheduledCalls - left.scheduledCalls),
    [reportsData.teamPerformance]
  );

  function replaceReportsQuery(mutator: (params: URLSearchParams) => void) {
    const nextParams = new URLSearchParams(searchParamsKey);
    mutator(nextParams);
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (reportsModalParam !== "dashboard") {
      if (dashboardModalOpen || editingDashboardId) {
        setDashboardModalOpen(false);
        setEditingDashboardId(null);
      }
      return;
    }

    const requestedDashboard = reportsDashboardIdParam
      ? reportsData.dashboards.find((dashboard) => dashboard.id === reportsDashboardIdParam)
      : null;

    if (requestedDashboard) {
      if (editingDashboardId !== requestedDashboard.id) {
        setEditingDashboardId(requestedDashboard.id);
        setDashboardForm({
          name: requestedDashboard.name,
          description: requestedDashboard.description,
          period: requestedDashboard.period,
          visibility: requestedDashboard.visibility
        });
      }
    } else if (editingDashboardId !== null || !dashboardModalOpen) {
      setEditingDashboardId(null);
      setDashboardForm({
        name: "",
        description: "",
        period: "Ultimos 7 dias",
        visibility: "Publico"
      });
    }

    if (!dashboardModalOpen) {
      setDashboardModalOpen(true);
    }
  }, [dashboardModalOpen, editingDashboardId, reportsDashboardIdParam, reportsData.dashboards, reportsModalParam]);

  function openNewDashboardModal() {
    replaceReportsQuery((nextParams) => {
      nextParams.set("panel", "dashboards");
      nextParams.set("modal", "dashboard");
      nextParams.delete("dashboardId");
    });
  }

  const dashboardPreview = useMemo(
    () => [
      ["Nome", dashboardForm.name || "Dashboard sem nome"],
      ["Descricao", dashboardForm.description || "Sem descricao adicional."],
      ["Periodo", dashboardForm.period],
      ["Visibilidade", dashboardForm.visibility]
    ],
    [dashboardForm]
  );

  function resetDashboardForm() {
    replaceReportsQuery((nextParams) => {
      nextParams.delete("modal");
      nextParams.delete("dashboardId");
    });
  }

  function applyLocalDashboard(nextDashboard: ReportsDashboard) {
    setReportsData((current) => ({
      ...current,
      dashboards: [nextDashboard, ...current.dashboards]
    }));
  }

  function applyLocalDashboardUpdate(dashboardId: string, payload: typeof dashboardForm) {
    setReportsData((current) => ({
      ...current,
      dashboards: current.dashboards.map((dashboard) =>
        dashboard.id === dashboardId
          ? {
              ...dashboard,
              name: payload.name.trim() || dashboard.name,
              description: payload.description.trim() || dashboard.description,
              period: payload.period.trim() || dashboard.period,
              visibility: payload.visibility.trim() || dashboard.visibility
            }
          : dashboard
      )
    }));
  }

  function applyLocalDashboardDelete(dashboardId: string) {
    setReportsData((current) => ({
      ...current,
      dashboards: current.dashboards.filter((dashboard) => dashboard.id !== dashboardId)
    }));
  }

  async function createDashboard() {
    if (!dashboardForm.name.trim()) {
      return;
    }

    try {
      const data = editingDashboardId
        ? await updateReportsDashboardRequest(editingDashboardId, dashboardForm)
        : await createReportsDashboardRequest(dashboardForm);
      setReportsData(data);
    } catch {
      if (editingDashboardId) {
        applyLocalDashboardUpdate(editingDashboardId, dashboardForm);
      } else {
        applyLocalDashboard({
          id: `${Date.now()}`,
          name: dashboardForm.name.trim(),
          description: dashboardForm.description.trim() || "Sem descricao adicional.",
          period: dashboardForm.period,
          visibility: dashboardForm.visibility,
          createdAt: new Date().toLocaleDateString("pt-BR")
        });
      }
    }

    resetDashboardForm();
  }

  function startEditDashboard(dashboard: ReportsDashboard) {
    replaceReportsQuery((nextParams) => {
      nextParams.set("panel", "dashboards");
      nextParams.set("modal", "dashboard");
      nextParams.set("dashboardId", dashboard.id);
    });
  }

  async function removeDashboard(dashboardId: string) {
    try {
      const data = await deleteReportsDashboardRequest(dashboardId);
      setReportsData(data);
    } catch {
      applyLocalDashboardDelete(dashboardId);
    }

    if (editingDashboardId === dashboardId) {
      resetDashboardForm();
    }
  }

  return (
    <>
      <div className="space-y-5">
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Reports</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Analytics operacional em tempo real
            </h1>
          </div>
          <Button className="rounded-2xl px-4 py-3" onClick={openNewDashboardModal}>
            <Plus className="size-4" />
            Novo dashboard
          </Button>
        </Card>
        <div className="flex flex-wrap gap-2">
          {reportsData.sections.map((section) => (
            <Badge className="rounded-full px-3 py-1.5" key={section}>{section}</Badge>
          ))}
        </div>
        <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Painel em foco</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{activeReportsPanel.label}</p>
            <p className="mt-1 max-w-2xl text-sm text-[var(--muted-foreground)]">{activeReportsPanel.description}</p>
          </div>
          <Badge className="rounded-full px-3 py-1.5">Contexto ativo</Badge>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {reportsData.kpis.map((kpi) => (
            <Card className="p-5" key={kpi.label}>
              <p className="text-sm text-[var(--muted-foreground)]">{kpi.label}</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{kpi.value}</p>
              <Badge className="mt-4">{kpi.delta}</Badge>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Card className={`p-5 ${activeReportCardClass(activeReportsPanel.id === "reports-panel-overview")}`} id="reports-panel-overview">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Volume por faixa horaria</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Estrutura pronta para Recharts ou Chart.js</p>
              </div>
              <Badge>Hoje</Badge>
            </div>
            <div className="grid h-[320px] grid-cols-12 items-end gap-3 rounded-[28px] bg-[var(--panel-strong)] p-5">
              {reportsData.chartBars.map((value, index) => (
                <div className="flex h-full items-end" key={index}>
                  <div className="w-full rounded-t-full bg-[linear-gradient(180deg,var(--accent),rgba(59,130,246,0.24))]" style={{ height: `${value}%` }} />
                </div>
              ))}
            </div>
          </Card>
          <Card className={`p-5 ${activeReportCardClass(activeReportsPanel.id === "reports-panel-dashboards")}`} id="reports-panel-dashboards">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)]">Dashboards ativos</p>
              <Badge>{reportsData.dashboards.length} ativos</Badge>
            </div>
            <div className="space-y-3">
              {reportsData.dashboards.map((dashboard) => (
                <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={dashboard.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">{dashboard.name}</p>
                    <div className="flex items-center gap-2">
                      <Button className="rounded-2xl px-3 py-2" onClick={() => startEditDashboard(dashboard)} variant="ghost">
                        <Pencil className="size-4" />
                      </Button>
                      <Button className="rounded-2xl px-3 py-2" onClick={() => void removeDashboard(dashboard.id)} variant="ghost">
                        <Trash2 className="size-4" />
                      </Button>
                      <Badge>{dashboard.visibility}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{dashboard.period} • {dashboard.createdAt}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{dashboard.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
          <Card className={`p-5 ${activeReportCardClass(activeReportsPanel.id === "reports-panel-assignment")}`} id="reports-panel-assignment">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Atribuicao por agente</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Distribuicao da carga com base no volume atual de respostas.</p>
              </div>
              <Badge>{totalReplies} interacoes</Badge>
            </div>
            <div className="space-y-3">
              {assignmentRows.map((row) => (
                <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={row.name}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{row.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{row.share}% da carga atual</p>
                    </div>
                    <Badge>{row.loadLabel}</Badge>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--background)]">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent-strong),#7dd3fc)]" style={{ width: `${row.share}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{row.replies} respostas alocadas no periodo.</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className={`p-5 ${activeReportCardClass(activeReportsPanel.id === "reports-panel-presence")}`} id="reports-panel-presence">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Presenca operacional</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Leitura de aderencia e ritmo da equipe no turno atual.</p>
              </div>
              <Badge>Turno ativo</Badge>
            </div>
            <div className="space-y-3">
              {presenceRows.map((row) => (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4" key={row.name}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">{row.name}</p>
                    <Badge>{row.status}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted-foreground)]">
                    <span>{row.adherence}</span>
                    <span>SLA medio {row.sla}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
          <Card className={`p-5 ${activeReportCardClass(activeReportsPanel.id === "reports-panel-productivity")}`} id="reports-panel-productivity">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)]">Produtividade por agente</p>
              <Badge>Equipe</Badge>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-[var(--border)]">
              <div className="grid bg-[var(--panel-strong)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)] md:grid-cols-[1fr_0.8fr_0.8fr_0.6fr]">
                <span>Agente</span><span>Respostas</span><span>SLA</span><span>Nota</span>
              </div>
              {reportsData.teamPerformance.map((row) => (
                <div className="grid border-t border-[var(--border)] px-4 py-4 text-sm md:grid-cols-[1fr_0.8fr_0.8fr_0.6fr]" key={row.name}>
                  <span className="font-semibold text-[var(--foreground)]">{row.name}</span>
                  <span className="text-[var(--muted-foreground)]">{row.replies}</span>
                  <span className="text-[var(--muted-foreground)]">{row.sla}</span>
                  <span className="text-[var(--foreground)]">{row.score}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className={`p-5 ${activeReportCardClass(activeReportsPanel.id === "reports-panel-interaction")}`} id="reports-panel-interaction">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold text-[var(--foreground)]">Interacao por canal</p>
              <Badge>Omnichannel</Badge>
            </div>
            <div className="space-y-3">
              {reportsData.channels.map((channel) => (
                <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={channel.channel}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">{channel.channel}</p>
                    <Badge>{channel.volume}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted-foreground)]">
                    <span>Participacao no volume</span>
                    <span>Conversao {channel.conversion}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
          <Card className={`p-5 ${activeReportCardClass(activeReportsPanel.id === "reports-panel-evaluation")}`} id="reports-panel-evaluation">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Avaliacao da equipe</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Ranking de qualidade comparado com a media atual da operacao.</p>
              </div>
              <Badge>Score</Badge>
            </div>
            <div className="space-y-3">
              {evaluationRows.map((row, index) => (
                <div className="flex items-center justify-between rounded-[24px] bg-[var(--panel-strong)] p-4" key={row.name}>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">#{index + 1} {row.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">Delta vs media: {row.delta}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[var(--foreground)]">{row.score}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">qualidade</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className={`p-5 ${activeReportCardClass(activeReportsPanel.id === "reports-panel-calls")}`} id="reports-panel-calls">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-[var(--foreground)]">Ligacoes consultivas</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">Cadencia de callbacks e taxa de conexao por agente.</p>
              </div>
              <Badge>Voz</Badge>
            </div>
            <div className="space-y-3">
              {callRows.map((row) => (
                <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4" key={row.name}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--foreground)]">{row.name}</p>
                    <Badge>{row.scheduledCalls} callbacks</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
                    <span>Taxa de conexao {row.connectionRate}</span>
                    <span>TMA {row.avgHandleTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {dashboardModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#081120]/38 px-4 py-8 backdrop-blur-sm">
          <Card className="glass-ring w-full max-w-3xl p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Dashboard</p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{editingDashboardId ? "Editar dashboard" : "Criar dashboard"}</h2>
              </div>
              <Button className="rounded-2xl px-3 py-2" onClick={resetDashboardForm} variant="ghost">
                <X className="size-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nome" value={dashboardForm.name} onChange={(event) => setDashboardForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder="Periodo default" value={dashboardForm.period} onChange={(event) => setDashboardForm((current) => ({ ...current, period: event.target.value }))} />
            </div>
            <div className="mt-4">
              <Textarea className="min-h-[150px]" placeholder="Descricao" value={dashboardForm.description} onChange={(event) => setDashboardForm((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Publico", "Privado", "Grupos Especificos"].map((option) => (
                <Button
                  className="rounded-full px-3 py-1.5"
                  key={option}
                  onClick={() => setDashboardForm((current) => ({ ...current, visibility: option }))}
                  variant={dashboardForm.visibility === option ? "primary" : "secondary"}
                >
                  {option}
                </Button>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {dashboardPreview.map(([label, value]) => (
                <div className="rounded-[24px] bg-[var(--panel-strong)] p-4" key={label}>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button className="rounded-2xl px-4 py-2" onClick={resetDashboardForm} variant="ghost">Cancelar</Button>
              <Button className="rounded-2xl px-4 py-2" onClick={() => void createDashboard()}>{editingDashboardId ? "Salvar alteracoes" : "Salvar dashboard"}</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}