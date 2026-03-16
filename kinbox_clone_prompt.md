# Prompt para Replicação do Sistema Kinbox

Você é um Engenheiro de Software Full-Stack Sênior. Sua tarefa é desenvolver um clone perfeito do sistema "Kinbox" passo a passo, baseando-se no seguinte blueprint detalhado da aplicação original. O objetivo é replicar o frontend (UI/UX) e estruturar o backend necessário para suportar as seguintes telas, menus, e funcionalidades.

## Instruções Gerais
1. Desenvolva o sistema de forma modular, criando componentes reutilizáveis para a interface (React/Vue/Next.js/Svelte).
2. Utilize uma paleta de cores, tipografia moderna e ícones finos compatíveis com um sistema SaaS de CRM/Atendimento ao Cliente premium.
3. Comece pela estrutura global (layout base) e depois proceda tela a tela, da Caixa de Entrada (Inbox) até as áreas de Configurações Avançadas.
4. Garanta que a responsividade, animações, modais laterais e estados de hover/focus estejam perfeitamente alinhados com uma experiência fluida. Em casos de dúvida sobre a regra de negócio exata, implemente o comportamento padrão de CRMs líderes de mercado.

## Blueprint do Sistema (Base de Requisitos)

### 1. Estrutura Global e Navegação
**Layout Base**:
* A interface utiliza uma **Barra Superior Fixa** (Header Global) e uma **Barra Lateral Esquerda** (Sidebar) que adapta seus itens secundários dependendo do módulo principal selecionado na barra superior.
* **Barra Superior (Global)**:
  * **Atalho de Busca Global**: Um input centralizado "Pesquisar" (Atalho `Ctrl+K`) que abre um modal expansivo para localizar rapidamente contatos, mensagens ou ações no sistema.
  * **Navegação Principal (Ícones de Módulo à Esquerda/Centro)**:
    * **Caixa de Entrada (Inbox)**: Ícone de envelope fechado/aberto.
    * **CRM**: Ícone de cartão de contato/pessoas.
    * **Relatórios**: Ícone de gráfico de barras.
    * **Configurações**: Ícone de engrenagem.
  * **Ações Rápidas (Alinhadas à direita)**:
    * **Notificações**: Ícone de sino com badge vermelho numérico. Ao clicar, abre um painel de popover com os alertas mais recentes.
    * **Calendário**: Ícone de calendário que possibilita gestão rápida de tarefas/agendamentos.
    * **Menções**: Ícone de `@`, exibindo o histórico log da onde o usuário logado foi citado.
    * **Seletor de Workspace**: Dropdown textual exibindo o nome da organização atual conectada e possibilitando a troca rápida de conta.
    * **Perfil do Usuário**: Avatar circular com as iniciais. Menu dropdown com as opções: *Minha conta, Configurações, Central de ajuda, Novidades, Sair*.

---

### 2. Módulo: Caixa de Entrada (Inbox)
**URL de Referência**: `/inbox/all`
**Propósito**: Centralizar a comunicação omnichannel (WhatsApp, Instagram, etc) da equipe de atendimento.

**Estrutura da Tela**:
1. **Sidebar de Filtros (Esquerda)**:
   * Botão primário longo e destacado: `+ Add Filtro`.
   * Menu listando visualizações estruturais com contadores: `Entrada` (Fila Geral), `Meus` (Atribuídos ao agente), `Seguindo` (Tickets monitorados), `Arquivados`.
2. **Lista de Conversas (Sub-sidebar ao lado dos filtros)**:
   * **Cabeçalho**: Título de contexto, ícone de Lápis quadrado modal (para Iniciar Nova Conversa) e menu dropdown (três pontos) para ações em lote.
   * **Busca Local**: Input "Pesquisar" específico desta lista.
   * **Cards de Conversa**: Cada item da lista apresenta Avatar, Nome do contato, Horário relativo da última mensagem (ex: 15min), Snippet textual da última mensagem, Ícone minúsculo informando o Canal de origem, e Indicador visual de mensagem não lida (bolinha azul forte).
3. **Área de Chat (Centro - Espaço Principal)**:
   * **Header do Chat**: Nome do contato em destaque, indicação do canal de origem. Botões de ação alinhados à direita: `Resolver` (✓), `Atribuir` (ícone de perfil/usuário que abre dropdown de membros), `Pasta` (mover/categorizar), Mais opções (...), e botão central `Info` (i) - este atrai/recolhe o painel lateral direito.
   * **Timeline de Mensagens**: Exibição cronológica do chat. Balões do contato alinhados à esquerda, agente à direita. O bloco deve suportar "Notas Internas" visíveis apenas para a equipe (geralmente com balão de fundo amarelo pastel).
   * **Editor de Mensagem (Compositor Inferior)**:
     * Campo `Textarea` auto-expansível com o Placeholder longo: "*Shift + Enter para nova linha. '/' para frase rápida.*"
     * **Toolbar do editor**: Ícone de Microfone (para enviar áudio nativamente), Ícone de Lista pautada (abre menu modal de frases rápidas), Ícone de Raio estilizado (operações embutidas de automação ou macros), Ícone Smiley (seletor de Emojis em modal embutido), Ícone de Clipe (upload de anexos/docs), e botão Flutuante `Enviar` (ícone de avião de papel).
4. **Painel de Detalhes do Contato (Direita - Contextual e Retrátil)**:
   * Header do painel focado em ações rápidas de cross-channel: botões `Ligar`, `Mensagem`, `WhatsApp`.
   * Corpo estruturado por Blocos Acordeões expansíveis (Accordions/Tabs):
     * *Contato*: Exibindo campos como Celular, E-mail e grupo de Tags (pílulas coloridas).
     * *Negociações*: Lista os cards de negócios abertos no CRM para esta pessoa.
     * *Tarefas*: Lembretes e cards de ação vinculados.
     * *Notas*: Textarea livre ou lista de observações contínuas arquivadas pela equipe.

---

### 3. Módulo: CRM
**URL de Referência**: `/crm`
**Propósito**: Estruturar pipeline de vendas, organizar base de contatos e executar campanhas de marketing outbound.

**Sub-menus na Sidebar Esquerda**:
1. **Negociações**:
   * O layout principal é um **Kanban View** preenchendo a tela, com colunas representando estágios arrastáveis de venda em um funil.
   * Botão Primário no topo/header: `+ Criar Funil` (Gera redirect ou modal overlay extenso contendo configurações operacionais do pipeline: campos para definir os estágios (colunas), registro de motivos predefinidos de "perda", e imposição lógica de campos customizáveis que serão obrigatórios no momento do fechamento).
2. **Tarefas**:
   * Listagem/tabela visual das pendências agendadas pelos agentes, estruturada por prazo e com contatos vinculados clicáveis.
3. **Contatos**:
   * Tabela de dados (Datatable) para gestão da carteira inteira. Colunas base: *Nome, Criado em, Celular, E-mail*. A tabela deve ter paginação e colunas ordenáveis.
   * **Modal `+ Novo contato`**: Form overlay para inserção com campos de formulário e placeholder: *Upload de Avatar (preview circular), Nome (text), Email (email), Celular (tel), Notas (textarea), e um botão toggle boleano moderno "Contato privado"* (restringindo o acesso).
4. **Campanhas**:
   * Tela de gerenciamento dos disparos ativos massivos, com histórico de alcance.
   * **Fluxo Wizard Modal `+ Nova campanha`**; requer múltiplos passos lógicos e interconectados:
     1. *Início*: Inserção de Nome e seleção em um combobox do Canal de disparo (WhatsApp, SMS, etc).
     2. *Audiência*: Construtor lógico de query builder baseado na seleção flexível de múltiplas tags de contatos e condições de funil.
     3. *Mensagem*: Área do editor master de texto da campanha com suporte completo de placeholders/variáveis em {{ }} (ex. `{{contato.nome}}`) em tempo real.
     4. *Resumo*: Tela de review pré-disparo com dados sumarizados e tela de confirmação (botão Disparar).
5. **Metas**:
   * UI orientada à performance com medidores gauge ou termômetros focados nos KPIs dos vendedores listados no diretório do sistema.

---

### 4. Módulo: Relatórios
**URL de Referência**: `/reports`
**Propósito**: Analytics, monitoramento em tempo real das SLAs da equipe e consolidação estatística do negócio.

**Navegação e Layouts Padrão**:
* Sub-itens cobrem a organização analítica macro: **Dashboards, Visão Geral, Produtividade, Atribuição, Interação, Presença, Avaliação e Ligações**.
* Cada visor é arquitetado por cards de **Widgets**. Eles aglutinam renderização complexa de gráficos (Recharts, ChartJS) — linhas temporais empilhadas, tortas, métricas avulsas em blocos Kpis, além de datatables.
* **Criação de Dashboards**: Requer o desenvolvimento de um modal pop-up que capte *Nome (text), Descrição, Período Default de tempo (radio box ou daterange input), Visibilidade (seletor drop-down listando 'Público', 'Privado', 'Grupos Específicos')*.

---

### 5. Módulo: Configurações (Settings)
**URL de Referência**: `/settings`
**Propósito**: Painel hardcore de configuração de todo o backend behavior, regras, acessos, automações visuais e conexões externas. O menu lateral abriga todas opções do admin master.

1. **Perfil do Usuário Logado**: Form para gerir conta pessoal (Upload Avatar, Nome, E-mail, Celular, Update Senha) e seletor global para alternar o **Tema** UI entre Claro (Light Mode) / Escuro (Dark Mode).
2. **Geral**: Configs da Entidade/Workspace. Uploaders da Logo da organização, Inserções de Nome Base, Fuso horário (timezone picker), drop da Moeda oficial para renderização de valores do CRM. Toggles administrativos master - por exemplo, para forçar disponibilidade de operação (offline/indisponível para os atendentes).
3. **Membros**: Tabela de agentes do sistema com *Avatar, Nome, Badge do Perfil/Role*, e indicativo visual de status. Exige um botão `+ Convidar membro` gerando um overlay flexível solicitando array de endereços de e-mail e atribuição de papel prévia do usuário antes do invite via e-mail.
4. **Permissões**: Gerenciamento completo e nativo por RBAC (Role-Based Access Control). Listagem dos papéis. O modal "Nova permissão" tem matrizes robustas de checkboxes (toggles lógicos), divididas categoricamente: *Acesso as Conversas Globais; Regras de Conversas específicas limitantes (Permissão para Responder, Resolver, Agendar); Restrições restritivas diretas contra campos sensíveis; Acessibilidade a Negociações e pipeline; Acessibilidade aos Relatórios Master; Conexões de Canais; Gerenciamento do Ambiente como um todo*.
5. **Grupos**: Telas para classificar agentes no roteamento, viabilizando equipes lógicas separadas (Vendas / Suporte / Onboarding). Botões simples `Novo Grupo`.
6. **Campos Personalizados (Custom Fields)**: Tela avançada para a adição de metadados em Contatos e Negociações globalmente no banco de dados. No overlay expansivo para *Adicionar*, requer os inputs básicos *Nome, e Entidade de Destino (Relacionamento CRM vs Contato), além de um seletor visual DropDown "Tipo de dados"* contendo: Texto normal (varchar), Número (int/decimal), Data (timestamp/date picker render), e Seleção de Listas estáticas.
7. **Frases Rápidas (Canned Responses/Macros)**: Área Crud de templates ativados intersecionados por meio de digitação mágica (`/`). O formulário de template master pede o atalho, e o editor texto-rico requer habilitação para variáveis contextualistas nativas (nome agente x nome lead), bem como a renderização e submissão conjunta de arquivos/anexos embedados persistentes (ex: enviar PDF x tabela de preço via "/tabela").
8. **Automações**: Engine construtora de lógica baseada na mecânica de *"IF This THEN That"*. Permite criar "Gatilhos" a partir de selects ("Conversa iniciada", "Status alterado", "Tag adicionada", "Form Submetido"), definir Condicionalidades (AND/OR sobre variáveis de negócios), culminando nas Ações Executadas decorrentes (Enviar Mensagem X, Atribuir Roteamento ao Grupo Y). Tudo interligado num canvas vertical UX fluído. Requistios contam com CRUD completo destas automações ativas/inativas (`+ Nova automação`).
9. **Bot / Fluxos de Conversação (Chatbots Avançados)**:
   * **Dashboard de Bots** com botões cards. Sub-Ação: `+ Novo Bot`.
   * **Editor Visual Avançado (Canvas Builder Node-Based)**: Esta sub-tela é complexa e exige implementação de bibliotecas estilo React Flow / Vue Flow. A interface deve consistir em um canvas drag-and-drop infinito possuindo funcionalidades de zoom-in/out livre. Elementos centrais da UI Builder:
     * Nodes iniciais e finais fixos/ancoráveis ("Início", "Fim de atendimento").
     * Caixas de paleta flutuante/lateral onde cards Node complexos podem ser arrastados à vontade para o canvas: *Cards de Mensagens base*, *Menus interativos (Quick Replies/Buttons)*, *Gatilhos acoplados de Inteligência artificial*, *Blocos emissores de WebHooks e requisições chamando REST API Externa*, e finalizando com "Nós Logico Condicionais de Ramificação Branching" para o desenho exato de caminhos no atendimento dependendo das respostas de Input (Condição A vai P/ Node B; Condição B vai P/ Node C).
10. **Canais**: Hub de integradores contendo um diretório grid de todas as origens possíveis (Omnichannel API integrations). Devemos implementar conectores lógicos/visual states (conectado, desconectado, erro via OAuth flow mock up ou API Key insertion form inputs). Lista de suporte obrigatorio: *WhatsApp, Facebook (Messenger), Telegram API, Integradores de E-mail de Entrada (IMAP), Instagram DM, API Mercado Livre nativa, Envio SMS custom, e construtor gerador de script embed (Widget UI) próprio para inclusão em Sites de Clientes*.


## O Que Entrega
Forneça as peças de infraestrutura/código etapa por etapa. Sempre aguarde a confirmação de que uma fase está correta para começarmos a escrever e depurar a fase seguinte.
Para todas as etapas, garanta arquitetura limpa (Clean Code) e padronização absoluta de pastas seguindo práticas corporativas. 

Podemos iniciar desenvolvendo a **Fase 1** (Instalação global do projeto, seleção explícita da Stack no seu response e construção inicial da Base App Layout UX [Header Sidebar com roteamento fake]). Aceito começar assim?
