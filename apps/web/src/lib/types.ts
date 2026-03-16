export interface InboxMetric {
  label: string;
  value: string;
  helper: string;
}

export interface InboxMessage {
  id: string;
  author: "contact" | "agent";
  type: "message" | "internal";
  text: string;
  time: string;
}

export interface InboxCrmLink {
  crmContactId?: string;
  crmDealId?: string;
  crmTaskId?: string;
  noteId?: string;
}

export interface InboxDetailItem extends InboxCrmLink {
  id?: string;
  label: string;
  value: string;
}

export interface InboxNote extends InboxCrmLink {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

export interface InboxDetailGroup {
  title: string;
  meta: string;
  items: InboxDetailItem[];
}

export interface InboxConversation extends InboxCrmLink {
  id: string;
  initials: string;
  name: string;
  time: string;
  snippet: string;
  channel: string;
  unread: boolean;
  status: string;
  assignee: string;
  isMine?: boolean;
  isFollowing?: boolean;
  isArchived?: boolean;
  crmDealIds?: string[];
  crmTaskIds?: string[];
  messages: InboxMessage[];
  notes: InboxNote[];
  detailGroups: InboxDetailGroup[];
}

export interface InboxData {
  metrics: InboxMetric[];
  conversations: InboxConversation[];
  contactActions: string[];
  cannedResponses: string[];
  quickActions: string[];
}

export interface CrmSummaryItem {
  label: string;
  value: string;
  helper: string;
}

export interface CrmDealMovement {
  id: string;
  fromLaneId: string;
  fromLaneTitle: string;
  toLaneId: string;
  toLaneTitle: string;
  movedAt: string;
  movedBy: string;
}

export interface CrmDealActivity {
  id: string;
  type: "created" | "updated" | "moved";
  label: string;
  description: string;
  occurredAt: string;
  actor: string;
}

export interface CrmLaneCard {
  id: string;
  name: string;
  company: string;
  owner: string;
  forecast: string;
  lossReason?: string;
  nextTask?: string;
  weightedValue?: string;
  movementHistory: CrmDealMovement[];
  activityHistory: CrmDealActivity[];
}

export interface CrmLane {
  id: string;
  title: string;
  value: string;
  probability: number;
  count: number;
  cards: CrmLaneCard[];
}

export interface CrmTask {
  id: string;
  title: string;
  contact: string;
  due: string;
  dueAt?: string;
  priority: string;
  status: string;
  assignee: string;
  dealId?: string;
  dealLabel?: string;
}

export interface CrmContact {
  id: string;
  name: string;
  createdAt: string;
  phone: string;
  email: string;
  notes?: string;
  private?: boolean;
}

export interface CrmCampaign {
  id: string;
  name: string;
  channel: string;
  audience: string;
  message: string;
  visibility: string;
  status: string;
  createdAt: string;
}

export interface CrmGoal {
  id: string;
  rep: string;
  current: number;
  target: string;
}

export interface CrmData {
  summary: CrmSummaryItem[];
  lanes: CrmLane[];
  tasks: CrmTask[];
  contacts: CrmContact[];
  campaigns: CrmCampaign[];
  goals: CrmGoal[];
}

export interface ReportsKpi {
  label: string;
  value: string;
  delta: string;
}

export interface ReportsDashboard {
  id: string;
  name: string;
  description: string;
  period: string;
  visibility: string;
  createdAt: string;
}

export interface ReportsTeamPerformance {
  name: string;
  replies: number;
  sla: string;
  score: string;
}

export interface ReportsChannel {
  channel: string;
  volume: string;
  conversion: string;
}

export interface ReportsData {
  sections: string[];
  kpis: ReportsKpi[];
  chartBars: number[];
  dashboards: ReportsDashboard[];
  teamPerformance: ReportsTeamPerformance[];
  channels: ReportsChannel[];
}

export interface SettingsProfile {
  name: string;
  email: string;
  phone: string;
  timezone: string;
  bio: string;
  theme: string;
}

export interface SettingsGeneral {
  workspaceName: string;
  legalName: string;
  timezone: string;
  currency: string;
  language: string;
  dateFormat: string;
  businessHours: string;
  status: string;
}

export interface SettingsCard {
  title: string;
  description: string;
  badge: string;
}

export interface SettingsMember {
  id: string;
  name: string;
  role: string;
  status: string;
  email: string;
}

export interface SettingsPermission {
  id: string;
  category: string;
  name: string;
  description: string;
  admin: boolean;
  manager: boolean;
  agent: boolean;
}

export interface SettingsCannedResponse {
  id: string;
  shortcut: string;
  text: string;
}

export interface SettingsCustomField {
  id: string;
  name: string;
  entity: string;
  type: string;
  required: boolean;
  visibility: string;
  placeholder: string;
  options: string[];
}

export interface SettingsAutomation {
  id: string;
  name: string;
  trigger: string;
  condition: string;
  result: string;
  status: string;
}

export interface SettingsIntegrationChannel {
  id: string;
  name: string;
  type: string;
  status: string;
  credentialLabel: string;
  lastSync: string;
}

export interface SettingsBotNode {
  id: string;
  kind: string;
  label: string;
  content: string;
  x: number;
  y: number;
}

export interface SettingsBotEdge {
  id: string;
  from: string;
  to: string;
  condition: string;
}

export interface SettingsBot {
  id: string;
  name: string;
  status: string;
  entryChannel: string;
  updatedAt: string;
  nodes: SettingsBotNode[];
  edges: SettingsBotEdge[];
}

export interface SettingsData {
  profile: SettingsProfile;
  general: SettingsGeneral;
  sections: string[];
  cards: SettingsCard[];
  members: SettingsMember[];
  permissions: SettingsPermission[];
  groups: string[];
  customFields: SettingsCustomField[];
  cannedResponses: SettingsCannedResponse[];
  automations: SettingsAutomation[];
  channels: SettingsIntegrationChannel[];
  bots: SettingsBot[];
}