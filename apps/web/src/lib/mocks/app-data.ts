type ContextualMenuItem = {
  label: string;
  count?: string;
  description?: string;
  active?: boolean;
};

type ContextualMenuKey = "inbox" | "crm" | "reports" | "settings";

export const shellData = {
  notifications: [
    {
      title: "Nova mencao em Suporte VIP",
      description: "Marina pediu sua aprovacao no atendimento de Paula Siqueira."
    },
    {
      title: "SLA critico em 14 minutos",
      description: "3 conversas em Entrada exigem resposta imediata."
    },
    {
      title: "Meta diaria em 84%",
      description: "Time de inside sales acelerou a conversao nesta tarde."
    }
  ],
  contextualMenu: {
    inbox: [
      { label: "+ Add Filtro", description: "Nova visualizacao para a operacao.", active: true },
      { label: "Entrada", count: "124", active: true },
      { label: "Meus", count: "18" },
      { label: "Seguindo", count: "09" },
      { label: "Arquivados", count: "321" }
    ],
    crm: [
      { label: "Negociacoes", description: "Kanban principal do funil.", active: true },
      { label: "Tarefas", count: "27" },
      { label: "Contatos", count: "1.204" },
      { label: "Campanhas", count: "06" },
      { label: "Metas", count: "12" }
    ],
    reports: [
      { label: "Dashboards", active: true },
      { label: "Visao Geral" },
      { label: "Produtividade" },
      { label: "Atribuicao" },
      { label: "Interacao" },
      { label: "Presenca" },
      { label: "Avaliacao" },
      { label: "Ligacoes" }
    ],
    settings: [
      { label: "Perfil", active: true },
      { label: "Geral" },
      { label: "Membros" },
      { label: "Permissoes" },
      { label: "Grupos" },
      { label: "Campos Personalizados" },
      { label: "Frases Rapidas" },
      { label: "Automacoes" },
      { label: "Bots" },
      { label: "Canais" }
    ]
  } satisfies Record<ContextualMenuKey, ContextualMenuItem[]>
} as const;

export const globalSearchItems = [
  {
    section: "Contatos",
    label: "Paula Siqueira",
    description: "Lead com negociacao em proposta e duas tarefas abertas.",
    href: "/crm?section=pipeline&panel=contacts&modal=contact&edit=contact-01",
    keywords: ["paula", "helios", "contato", "deal", "proposta"]
  },
  {
    section: "Acoes",
    label: "Criar novo contato",
    description: "Abrir a operacao comercial para cadastrar um novo contato.",
    href: "/crm?section=pipeline&panel=contacts&modal=contact",
    keywords: ["novo contato", "cadastro", "crm", "contato"]
  },
  {
    section: "Acoes",
    label: "Abrir tarefas do CRM",
    description: "Ir direto para a central operacional de tarefas.",
    href: "/crm?section=tasks",
    keywords: ["tarefas", "agenda", "crm", "pendencias"]
  },
  {
    section: "Mensagens",
    label: "Conversas nao lidas",
    description: "Ir para o subconjunto com tickets pendentes e SLA em risco.",
    href: "/inbox/all",
    keywords: ["inbox", "mensagens", "sla", "conversas"]
  },
  {
    section: "Dashboards",
    label: "Produtividade da Equipe",
    description: "Abrir o dashboard analitico com widgets de atendimento.",
    href: "/reports",
    keywords: ["dashboard", "produtividade", "relatorios", "equipe"]
  }
] as const;

export const inboxPageData = {
  metrics: [
    { label: "Em aberto", value: "124", helper: "27 com SLA critico" },
    { label: "Atribuidos a mim", value: "18", helper: "5 aguardando retorno" },
    { label: "Tempo medio", value: "6m 14s", helper: "-18% vs ontem" }
  ],
  conversations: [
    {
      id: "1",
      initials: "PS",
      name: "Paula Siqueira",
      time: "15 min",
      snippet: "Preciso confirmar o onboarding e o valor final do plano enterprise.",
      channel: "WhatsApp",
      unread: true,
      status: "Aguardando proposta",
      assignee: "Alana Costa",
      isMine: true,
      isFollowing: true,
      isArchived: false,
      crmContactId: "contact-01",
      crmDealIds: ["deal-01", "deal-09"],
      crmTaskIds: ["task-01", "task-05"],
      messages: [
        {
          id: "m1",
          author: "contact",
          type: "message",
          text: "Oi, Alana. Conseguiu revisar a proposta do plano enterprise?",
          time: "14:02"
        },
        {
          id: "m2",
          author: "agent",
          type: "message",
          text: "Revisei sim. Ajustei a faixa de usuarios e inclui a migracao assistida sem custo.",
          time: "14:05"
        },
        {
          id: "m3",
          author: "agent",
          type: "internal",
          text: "Nota interna: lead validou budget. Priorizar fechamento hoje com aprovacao financeira.",
          time: "14:06"
        },
        {
          id: "m4",
          author: "contact",
          type: "message",
          text: "Perfeito. Se voce enviar a versao final, eu levo para assinatura ainda hoje.",
          time: "14:08"
        }
      ],
      notes: [
        {
          id: "note-01",
          text: "Lead chegou por indicacao e exige go-live em 21 dias.",
          createdAt: "16/03/2026 14:06",
          author: "Alana Costa",
          crmContactId: "contact-01",
          crmDealId: "deal-01",
          crmTaskId: "task-01"
        }
      ],
      detailGroups: [
        {
          title: "Contato",
          meta: "Atualizado ha 4 min",
          items: [
            { label: "Celular", value: "+55 11 99888-7766", crmContactId: "contact-01" },
            { label: "E-mail", value: "paula@heliosgroup.com", crmContactId: "contact-01" },
            { label: "Tags", value: "Enterprise • Decisor • Alta prioridade" }
          ]
        },
        {
          title: "Negociacoes",
          meta: "2 abertas",
          items: [
            { label: "Plano Enterprise", value: "R$ 48.000 / ano", crmDealId: "deal-01" },
            { label: "Upgrade de integracoes", value: "R$ 8.400 / setup", crmDealId: "deal-09" }
          ]
        },
        {
          title: "Tarefas",
          meta: "Hoje",
          items: [
            { label: "Validar proposta Enterprise", value: "Hoje, 16:30", crmTaskId: "task-01" },
            { label: "Enviar contrato Enterprise", value: "Hoje, 17:10", crmTaskId: "task-05" }
          ]
        },
        {
          title: "Notas",
          meta: "Equipe",
          items: [{ label: "Alana Costa • 16/03/2026 14:06", value: "Lead chegou por indicacao e exige go-live em 21 dias.", noteId: "note-01", crmContactId: "contact-01", crmDealId: "deal-01", crmTaskId: "task-01" }]
        }
      ]
    },
    {
      id: "2",
      initials: "RM",
      name: "Ricardo Mota",
      time: "28 min",
      snippet: "Enviei o contrato revisado e aguardo a assinatura digital.",
      channel: "Instagram",
      unread: true,
      status: "Contrato em revisao",
      assignee: "Ricardo Mota",
      isMine: false,
      isFollowing: true,
      isArchived: false,
      crmContactId: "contact-05",
      crmDealIds: ["deal-10"],
      crmTaskIds: ["task-06"],
      messages: [
        {
          id: "rm1",
          author: "contact",
          type: "message",
          text: "Ricardo, revisei a clausula de onboarding e parece tudo certo.",
          time: "13:21"
        },
        {
          id: "rm2",
          author: "agent",
          type: "message",
          text: "Perfeito. Vou ajustar apenas o cronograma da implantacao e reenviar o contrato.",
          time: "13:26"
        }
      ],
      notes: [
        {
          id: "note-02",
          text: "Stakeholder principal pediu vigencia trimestral na proposta.",
          createdAt: "16/03/2026 13:26",
          author: "Ricardo Mota",
          crmContactId: "contact-05",
          crmDealId: "deal-10",
          crmTaskId: "task-06"
        }
      ],
      detailGroups: [
        {
          title: "Contato",
          meta: "Atualizado ha 28 min",
          items: [
            { label: "Celular", value: "+55 21 99777-1188", crmContactId: "contact-05" },
            { label: "E-mail", value: "ricardo@atlasops.com", crmContactId: "contact-05" },
            { label: "Tags", value: "B2B • Revisao juridica" }
          ]
        },
        {
          title: "Negociacoes",
          meta: "1 aberta",
          items: [{ label: "Plano Growth", value: "R$ 19.000 / ano", crmDealId: "deal-10" }]
        },
        {
          title: "Tarefas",
          meta: "Hoje",
          items: [{ label: "Enviar contrato revisado", value: "Hoje, 15:40", crmTaskId: "task-06" }]
        },
        {
          title: "Notas",
          meta: "Equipe",
          items: [{ label: "Ricardo Mota • 16/03/2026 13:26", value: "Stakeholder principal pediu vigencia trimestral na proposta.", noteId: "note-02", crmContactId: "contact-05", crmDealId: "deal-10", crmTaskId: "task-06" }]
        }
      ]
    },
    {
      id: "3",
      initials: "TA",
      name: "Tania Alves",
      time: "1 h",
      snippet: "Pode me mandar a tabela de franquias com o novo reajuste?",
      channel: "Email",
      unread: false,
      status: "Aguardando material",
      assignee: "Gabriel Lima",
      isMine: false,
      isFollowing: false,
      isArchived: false,
      crmContactId: "contact-06",
      crmDealIds: ["deal-11"],
      crmTaskIds: ["task-07"],
      messages: [
        {
          id: "ta1",
          author: "contact",
          type: "message",
          text: "Pode me mandar a tabela de franquias com o novo reajuste?",
          time: "12:48"
        },
        {
          id: "ta2",
          author: "agent",
          type: "message",
          text: "Consigo sim. Ja estou separando a versao atualizada em PDF.",
          time: "12:52"
        }
      ],
      notes: [
        {
          id: "note-03",
          text: "Cliente compara valores com concorrente direto.",
          createdAt: "16/03/2026 12:52",
          author: "Gabriel Lima",
          crmContactId: "contact-06",
          crmDealId: "deal-11",
          crmTaskId: "task-07"
        }
      ],
      detailGroups: [
        {
          title: "Contato",
          meta: "Atualizado ha 1 h",
          items: [
            { label: "Celular", value: "+55 31 99666-2288", crmContactId: "contact-06" },
            { label: "E-mail", value: "tania@portoone.com", crmContactId: "contact-06" },
            { label: "Tags", value: "Franquias • Tabela de preco" }
          ]
        },
        {
          title: "Negociacoes",
          meta: "1 aberta",
          items: [{ label: "Expansao de unidades", value: "R$ 31.000 / trimestre", crmDealId: "deal-11" }]
        },
        {
          title: "Tarefas",
          meta: "Hoje",
          items: [{ label: "Enviar tabela de franquias", value: "Hoje, 16:00", crmTaskId: "task-07" }]
        },
        {
          title: "Notas",
          meta: "Equipe",
          items: [{ label: "Gabriel Lima • 16/03/2026 12:52", value: "Cliente compara valores com concorrente direto.", noteId: "note-03", crmContactId: "contact-06", crmDealId: "deal-11", crmTaskId: "task-07" }]
        }
      ]
    },
    {
      id: "4",
      initials: "GL",
      name: "Gabriel Lima",
      time: "2 h",
      snippet: "A equipe aprovou a integracao, seguimos para teste controlado.",
      channel: "Telegram",
      unread: false,
      status: "Teste controlado",
      assignee: "Tania Alves",
      isMine: false,
      isFollowing: false,
      isArchived: true,
      crmContactId: "contact-07",
      crmDealIds: ["deal-12"],
      crmTaskIds: ["task-08"],
      messages: [
        {
          id: "gl1",
          author: "contact",
          type: "message",
          text: "A equipe aprovou a integracao, seguimos para teste controlado.",
          time: "11:01"
        },
        {
          id: "gl2",
          author: "agent",
          type: "internal",
          text: "Nota interna: ativar squad tecnico se o primeiro lote de testes passar sem erro.",
          time: "11:05"
        }
      ],
      notes: [
        {
          id: "note-04",
          text: "Cliente quer webhook final ainda nesta sprint.",
          createdAt: "16/03/2026 11:05",
          author: "Tania Alves",
          crmContactId: "contact-07",
          crmDealId: "deal-12",
          crmTaskId: "task-08"
        }
      ],
      detailGroups: [
        {
          title: "Contato",
          meta: "Atualizado ha 2 h",
          items: [
            { label: "Celular", value: "+55 41 99555-3311", crmContactId: "contact-07" },
            { label: "E-mail", value: "gabriel@nexamobility.com", crmContactId: "contact-07" },
            { label: "Tags", value: "Integracao • Tecnologia" }
          ]
        },
        {
          title: "Negociacoes",
          meta: "1 aberta",
          items: [{ label: "Setup de integracao", value: "R$ 12.000 / projeto", crmDealId: "deal-12" }]
        },
        {
          title: "Tarefas",
          meta: "Amanha",
          items: [{ label: "Revisar lote de teste", value: "Amanha, 09:30", crmTaskId: "task-08" }]
        },
        {
          title: "Notas",
          meta: "Equipe",
          items: [{ label: "Tania Alves • 16/03/2026 11:05", value: "Cliente quer webhook final ainda nesta sprint.", noteId: "note-04", crmContactId: "contact-07", crmDealId: "deal-12", crmTaskId: "task-08" }]
        }
      ]
    }
  ],
  contactActions: ["Ligar", "Mensagem", "WhatsApp"],
  cannedResponses: ["/boasvindas", "/tabela", "/followup"],
  quickActions: ["Automacao", "Emoji", "Anexo"]
} as const;

export const crmPageData = {
  summary: [
    { label: "Pipeline total", value: "R$ 842 mil", helper: "38 oportunidades abertas" },
    { label: "Tarefas do dia", value: "27", helper: "9 em atraso" },
    { label: "Contatos ativos", value: "1.204", helper: "84 novos esta semana" },
    { label: "Campanhas rodando", value: "06", helper: "Taxa media 31,8%" }
  ],
  lanes: [
    {
      id: "lane-01",
      title: "Entrada",
      value: "Leads novos e qualificados",
      probability: 25,
      count: 12,
      cards: [
        { id: "deal-01", name: "Helios Group", company: "Paula Siqueira", owner: "AC", forecast: "R$ 48 mil", nextTask: "Enviar proposta final hoje 16:30", weightedValue: "R$ 12 mil", lossReason: "", movementHistory: [], activityHistory: [] },
        { id: "deal-02", name: "Atlas Ops", company: "Bruno Mello", owner: "RM", forecast: "R$ 19 mil", nextTask: "Retornar contrato revisado amanha 09:00", weightedValue: "R$ 4,8 mil", lossReason: "", movementHistory: [], activityHistory: [] },
        { id: "deal-09", name: "Upgrade de integracoes", company: "Paula Siqueira", owner: "AC", forecast: "R$ 8,4 mil", nextTask: "Enviar contrato Enterprise hoje 17:10", weightedValue: "R$ 2,1 mil", lossReason: "", movementHistory: [], activityHistory: [] }
      ]
    },
    {
      id: "lane-02",
      title: "Diagnostico",
      value: "Discovery e requisitos",
      probability: 45,
      count: 8,
      cards: [
        { id: "deal-03", name: "Faro Tech", company: "Marina Alves", owner: "TA", forecast: "R$ 62 mil", nextTask: "Agendar discovery tecnico", weightedValue: "R$ 27,9 mil", lossReason: "", movementHistory: [], activityHistory: [] },
        { id: "deal-04", name: "North Foods", company: "Leo Duarte", owner: "AC", forecast: "R$ 27 mil", nextTask: "Atualizar escopo da proposta", weightedValue: "R$ 12,2 mil", lossReason: "Concorrente com menor prazo", movementHistory: [], activityHistory: [] }
      ]
    },
    {
      id: "lane-03",
      title: "Proposta",
      value: "Negociacoes em composicao",
      probability: 70,
      count: 5,
      cards: [
        { id: "deal-05", name: "Venturo Labs", company: "Bianca Reis", owner: "GL", forecast: "R$ 84 mil", nextTask: "Validar condicoes comerciais", weightedValue: "R$ 58,8 mil", lossReason: "", movementHistory: [], activityHistory: [] },
        { id: "deal-06", name: "Porto One", company: "Tania Alves", owner: "RM", forecast: "R$ 31 mil", nextTask: "Revisar aprovacao interna", weightedValue: "R$ 21,7 mil", lossReason: "", movementHistory: [], activityHistory: [] },
        { id: "deal-10", name: "Plano Growth", company: "Ricardo Mota", owner: "RM", forecast: "R$ 19 mil", nextTask: "Enviar contrato revisado hoje 15:40", weightedValue: "R$ 13,3 mil", lossReason: "", movementHistory: [], activityHistory: [] },
        { id: "deal-11", name: "Expansao de unidades", company: "Tania Alves", owner: "GL", forecast: "R$ 31 mil", nextTask: "Enviar tabela de franquias hoje 16:00", weightedValue: "R$ 21,7 mil", lossReason: "", movementHistory: [], activityHistory: [] }
      ]
    },
    {
      id: "lane-04",
      title: "Fechamento",
      value: "Deals em aprovacao final",
      probability: 90,
      count: 3,
      cards: [
        { id: "deal-07", name: "Nexa Mobility", company: "Rafael Cruz", owner: "AC", forecast: "R$ 115 mil", nextTask: "Aguardar assinatura final", weightedValue: "R$ 103,5 mil", lossReason: "", movementHistory: [], activityHistory: [] },
        { id: "deal-08", name: "Delta Prime", company: "Joana Freitas", owner: "TA", forecast: "R$ 42 mil", nextTask: "Confirmar data do kickoff", weightedValue: "R$ 37,8 mil", lossReason: "", movementHistory: [], activityHistory: [] },
        { id: "deal-12", name: "Setup de integracao", company: "Gabriel Lima", owner: "TA", forecast: "R$ 12 mil", nextTask: "Revisar lote de teste amanha 09:30", weightedValue: "R$ 10,8 mil", lossReason: "", movementHistory: [], activityHistory: [] }
      ]
    }
  ],
  tasks: [
    { id: "task-01", title: "Validar proposta Enterprise", contact: "Paula Siqueira", due: "Hoje 16:30", dueAt: "2026-03-16T16:30", priority: "Alta", status: "Aberta", assignee: "AC", dealId: "deal-01", dealLabel: "Helios Group" },
    { id: "task-02", title: "Retorno discovery", contact: "Bruno Mello", due: "Hoje 17:10", dueAt: "2026-03-16T17:10", priority: "Media", status: "Em andamento", assignee: "RM", dealId: "deal-02", dealLabel: "Atlas Ops" },
    { id: "task-03", title: "Agendar demo executiva", contact: "Bianca Reis", due: "Amanha 09:00", dueAt: "2026-03-17T09:00", priority: "Alta", status: "Aberta", assignee: "GL", dealId: "deal-05", dealLabel: "Venturo Labs" },
    { id: "task-04", title: "Atualizar motivo de perda", contact: "Leo Duarte", due: "Amanha 11:20", dueAt: "2026-03-17T11:20", priority: "Baixa", status: "Concluida", assignee: "AC", dealId: "deal-04", dealLabel: "North Foods" },
    { id: "task-05", title: "Enviar contrato Enterprise", contact: "Paula Siqueira", due: "Hoje 17:10", dueAt: "2026-03-16T17:10", priority: "Alta", status: "Aberta", assignee: "AC", dealId: "deal-09", dealLabel: "Upgrade de integracoes" },
    { id: "task-06", title: "Enviar contrato revisado", contact: "Ricardo Mota", due: "Hoje 15:40", dueAt: "2026-03-16T15:40", priority: "Media", status: "Aberta", assignee: "RM", dealId: "deal-10", dealLabel: "Plano Growth" },
    { id: "task-07", title: "Enviar tabela de franquias", contact: "Tania Alves", due: "Hoje 16:00", dueAt: "2026-03-16T16:00", priority: "Media", status: "Aberta", assignee: "GL", dealId: "deal-11", dealLabel: "Expansao de unidades" },
    { id: "task-08", title: "Revisar lote de teste", contact: "Gabriel Lima", due: "Amanha 09:30", dueAt: "2026-03-17T09:30", priority: "Alta", status: "Aberta", assignee: "TA", dealId: "deal-12", dealLabel: "Setup de integracao" }
  ],
  contacts: [
    { id: "contact-01", name: "Paula Siqueira", createdAt: "12 mar 2026", phone: "+55 11 99888-7766", email: "paula@heliosgroup.com", notes: "Conta enterprise em aprovacao final.", private: false },
    { id: "contact-02", name: "Bruno Mello", createdAt: "11 mar 2026", phone: "+55 21 99777-1188", email: "bruno@atlasops.com", notes: "Lead inbound com interesse em automacoes.", private: false },
    { id: "contact-03", name: "Marina Alves", createdAt: "10 mar 2026", phone: "+55 31 99666-2288", email: "marina@farotech.io", notes: "Negociacao em discovery tecnico.", private: true },
    { id: "contact-04", name: "Leo Duarte", createdAt: "09 mar 2026", phone: "+55 41 99555-3311", email: "leo@northfoods.com", notes: "Contato reativado apos 60 dias.", private: false },
    { id: "contact-05", name: "Ricardo Mota", createdAt: "12 mar 2026", phone: "+55 21 99777-1188", email: "ricardo@atlasops.com", notes: "Contato em revisao contratual.", private: false },
    { id: "contact-06", name: "Tania Alves", createdAt: "11 mar 2026", phone: "+55 31 99666-2288", email: "tania@portoone.com", notes: "Interesse em expansao de unidades.", private: false },
    { id: "contact-07", name: "Gabriel Lima", createdAt: "10 mar 2026", phone: "+55 41 99555-3311", email: "gabriel@nexamobility.com", notes: "Cliente aguardando lote final de integracao.", private: false }
  ],
  campaigns: [
    { id: "campaign-01", name: "Reengajamento Q1", channel: "WhatsApp", audience: "Enterprise + etapa Proposta", message: "Ola {{contato.nome}}, ainda conseguimos manter a condicao especial desta semana.", visibility: "Publico", status: "Ativa", createdAt: "14 mar 2026" },
    { id: "campaign-02", name: "Base inativa 30 dias", channel: "SMS", audience: "Tag Inativo + sem tarefa futura", message: "{{contato.nome}}, voltamos com um plano enxuto para reativacao da operacao.", visibility: "Privado", status: "Pronta", createdAt: "13 mar 2026" },
    { id: "campaign-03", name: "Upgrade integracoes", channel: "WhatsApp", audience: "Clientes Growth com API habilitada", message: "Temos um pacote de integracoes avancadas com implantacao acelerada.", visibility: "Grupos Especificos", status: "Agendada", createdAt: "12 mar 2026" }
  ],
  goals: [
    { id: "goal-01", rep: "Alana Costa", current: 84, target: "R$ 220 mil" },
    { id: "goal-02", rep: "Ricardo Mota", current: 67, target: "R$ 180 mil" },
    { id: "goal-03", rep: "Tania Alves", current: 91, target: "R$ 210 mil" }
  ]
} as const;

export const reportsPageData = {
  sections: ["Dashboards", "Visao Geral", "Produtividade", "Atribuicao", "Interacao", "Presenca", "Avaliacao", "Ligacoes"],
  kpis: [
    { label: "Tempo medio de primeira resposta", value: "6m 14s", delta: "-18% hoje" },
    { label: "Tickets resolvidos", value: "184", delta: "+12 tickets" },
    { label: "Conversao do funil", value: "31,2%", delta: "+4,8 pp" },
    { label: "Satisfacao media", value: "4,9/5", delta: "NPS premium" }
  ],
  chartBars: [42, 58, 34, 60, 72, 64, 83, 77, 69, 88, 51, 74],
  dashboards: [
    {
      id: "dashboard-01",
      name: "Operacao executiva",
      period: "Ultimos 7 dias",
      visibility: "Publico",
      description: "KPIs de SLA, conversas pendentes, tendencia de volume e receita conectada.",
      createdAt: "14 mar 2026"
    },
    {
      id: "dashboard-02",
      name: "Produtividade por equipe",
      period: "Mes atual",
      visibility: "Grupos Especificos",
      description: "Visao cruzada de atendimento, inside sales e onboarding com cohort diario.",
      createdAt: "12 mar 2026"
    },
    {
      id: "dashboard-03",
      name: "Qualidade e avaliacao",
      period: "Ultimos 30 dias",
      visibility: "Privado",
      description: "Leitura aprofundada das notas, auditorias internas e calibragem da operacao.",
      createdAt: "10 mar 2026"
    }
  ],
  teamPerformance: [
    { name: "Alana Costa", replies: 82, sla: "4m 52s", score: "5.0" },
    { name: "Ricardo Mota", replies: 71, sla: "6m 10s", score: "4.8" },
    { name: "Tania Alves", replies: 65, sla: "5m 33s", score: "4.9" },
    { name: "Gabriel Lima", replies: 54, sla: "7m 04s", score: "4.7" }
  ],
  channels: [
    { channel: "WhatsApp", volume: "61%", conversion: "34%" },
    { channel: "Instagram", volume: "18%", conversion: "22%" },
    { channel: "E-mail", volume: "12%", conversion: "28%" },
    { channel: "Telegram", volume: "9%", conversion: "19%" }
  ]
} as const;

export const settingsPageData = {
  profile: {
    name: "Alana Costa",
    email: "alana@kinbox.local",
    phone: "+55 11 99888-7766",
    timezone: "America/Sao_Paulo",
    bio: "Responsavel pela operacao de inside sales e atendimento premium.",
    theme: "System"
  },
  general: {
    workspaceName: "Elite Veiculos CRM Atendimento",
    legalName: "Elite Veiculos Comercio Digital Ltda.",
    timezone: "America/Sao_Paulo",
    currency: "BRL",
    language: "pt-BR",
    dateFormat: "dd/MM/yyyy",
    businessHours: "Seg a Sex, 08:00 as 18:00",
    status: "Operacao ativa"
  },
  sections: ["Perfil", "Geral", "Membros", "Permissoes", "Grupos", "Campos", "Frases Rapidas", "Automacoes", "Bots", "Canais"],
  cards: [
    {
      title: "Workspace e operacao",
      description: "Logo, nome base, timezone, moeda e status operacional global da equipe.",
      badge: "Geral"
    },
    {
      title: "Membros e convites",
      description: "Tabela de agentes, papeis, indicadores de status e fluxo de convite por e-mail.",
      badge: "Membros"
    },
    {
      title: "Permissoes e RBAC",
      description: "Matriz inicial pronta para crescer com regras finas por modulo e acao critica.",
      badge: "RBAC"
    },
    {
      title: "Automacoes e bots",
      description: "Estrutura reservada para gatilhos, fluxos condicionais e construtor node-based.",
      badge: "Roadmap"
    }
  ],
  members: [
    { id: "member-01", name: "Alana Costa", role: "Admin", status: "Ativo", email: "alana@kinbox.local" },
    { id: "member-02", name: "Ricardo Mota", role: "Sales", status: "Ativo", email: "ricardo@kinbox.local" },
    { id: "member-03", name: "Tania Alves", role: "Onboarding", status: "Ausente", email: "tania@kinbox.local" },
    { id: "member-04", name: "Gabriel Lima", role: "Support", status: "Ativo", email: "gabriel@kinbox.local" }
  ],
  permissions: [
    { id: "permission-01", category: "Conversas", name: "Conversas globais", description: "Visualizar e atuar em todas as filas da operacao.", admin: true, manager: true, agent: true },
    { id: "permission-02", category: "Conversas", name: "Resolver e agendar", description: "Permite responder, resolver e agendar retornos.", admin: true, manager: true, agent: true },
    { id: "permission-03", category: "Dados sensiveis", name: "Campos sensiveis", description: "Acesso a campos privados de contatos e negociacoes.", admin: true, manager: true, agent: false },
    { id: "permission-04", category: "Relatorios", name: "Relatorios master", description: "Visao total dos dashboards executivos e consolidacoes.", admin: true, manager: true, agent: false },
    { id: "permission-05", category: "Canais", name: "Gerenciar canais", description: "Autoriza conectar, editar e desconectar integracoes.", admin: true, manager: false, agent: false }
  ],
  groups: ["Vendas", "Suporte", "Onboarding", "CS Premium"],
  customFields: [
    { id: "field-01", name: "Modelo de interesse", entity: "Contato", type: "Selecao", required: true, visibility: "Equipe comercial", placeholder: "Selecione um modelo", options: ["SUV", "Sedan", "Utilitario"] },
    { id: "field-02", name: "Origem do lead", entity: "Negociacao", type: "Selecao", required: true, visibility: "Todos", placeholder: "Canal de entrada", options: ["Meta Ads", "Google", "Indicacao", "Organico"] },
    { id: "field-03", name: "Data da visita", entity: "Negociacao", type: "Data", required: false, visibility: "Equipe comercial", placeholder: "dd/mm/aaaa", options: [] }
  ],
  cannedResponses: [
    { id: "canned-01", shortcut: "/boasvindas", text: "Mensagem inicial de onboarding com variaveis de contato." },
    { id: "canned-02", shortcut: "/tabela", text: "Template com anexo de tabela de preco e CTA para fechar proposta." }
  ],
  automations: [
    { id: "automation-01", name: "Roteamento de novos leads", trigger: "Conversa iniciada", condition: "Canal = WhatsApp e tag = Lead", result: "Atribuir grupo Vendas", status: "Ativa" },
    { id: "automation-02", name: "Escalada VIP", trigger: "Tag adicionada", condition: "Tag = VIP", result: "Mover para fila premium", status: "Ativa" },
    { id: "automation-03", name: "Retorno pos-formulario", trigger: "Formulario submetido", condition: "Origem = site institucional", result: "Enviar mensagem automatica", status: "Rascunho" }
  ],
  channels: [
    { id: "channel-01", name: "WhatsApp", type: "Oficial API", status: "Conectado", credentialLabel: "Token verificado", lastSync: "Ha 2 min" },
    { id: "channel-02", name: "Instagram", type: "Meta Business", status: "Conectado", credentialLabel: "OAuth ativo", lastSync: "Ha 8 min" },
    { id: "channel-03", name: "Telegram", type: "Bot API", status: "Pendente", credentialLabel: "Token aguardando validacao", lastSync: "Nunca" },
    { id: "channel-04", name: "IMAP", type: "E-mail de entrada", status: "Erro", credentialLabel: "Senha de aplicativo invalida", lastSync: "Ha 1 h" }
  ],
  bots: [
    {
      id: "bot-01",
      name: "Boas-vindas vendas",
      status: "Publicado",
      entryChannel: "WhatsApp",
      updatedAt: "Hoje, 14:20",
      nodes: [
        { id: "node-01", kind: "start", label: "Inicio", content: "Entrada principal do fluxo.", x: 40, y: 48 },
        { id: "node-02", kind: "message", label: "Saudacao", content: "Ola, sou a assistente da Elite Veiculos. Como posso ajudar?", x: 280, y: 36 },
        { id: "node-03", kind: "condition", label: "Qualificacao", content: "Cliente quer comprar, vender ou falar com suporte?", x: 540, y: 148 },
        { id: "node-04", kind: "action", label: "Transferir para vendas", content: "Atribui o atendimento ao grupo Vendas.", x: 830, y: 70 },
        { id: "node-05", kind: "end", label: "Fim de atendimento", content: "Fluxo encerrado com encaminhamento concluido.", x: 830, y: 255 }
      ],
      edges: [
        { id: "edge-01", from: "node-01", to: "node-02", condition: "Inicio" },
        { id: "edge-02", from: "node-02", to: "node-03", condition: "Mensagem enviada" },
        { id: "edge-03", from: "node-03", to: "node-04", condition: "Interesse comercial" },
        { id: "edge-04", from: "node-03", to: "node-05", condition: "Sem interesse" }
      ]
    },
    {
      id: "bot-02",
      name: "Triagem pos-venda",
      status: "Rascunho",
      entryChannel: "Instagram",
      updatedAt: "Ontem, 18:10",
      nodes: [
        { id: "node-06", kind: "start", label: "Inicio", content: "Mensagem recebida no pos-venda.", x: 40, y: 72 },
        { id: "node-07", kind: "message", label: "Coleta de placa", content: "Solicitar placa e modelo do veiculo para localizar o cadastro.", x: 320, y: 86 },
        { id: "node-08", kind: "action", label: "Criar tarefa", content: "Abrir tarefa de retorno para a equipe de oficina.", x: 640, y: 160 }
      ],
      edges: [
        { id: "edge-05", from: "node-06", to: "node-07", condition: "Entrada" },
        { id: "edge-06", from: "node-07", to: "node-08", condition: "Dados recebidos" }
      ]
    }
  ]
} as const;