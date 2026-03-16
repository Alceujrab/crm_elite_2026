export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  workspace: string;
  initials: string;
}

export const defaultSessionUser: SessionUser = {
  id: "agent-01",
  name: "Alana Costa",
  email: "alana@kinbox.local",
  role: "Admin",
  workspace: "Elite Veiculos CRM Atendimento",
  initials: "AC"
};
