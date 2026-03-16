import type { CrmTask } from "@/lib/types";

const CRM_TASKS_UPDATED_EVENT = "crm-tasks-updated";

export function emitCrmTasksUpdated(tasks: CrmTask[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<CrmTask[]>(CRM_TASKS_UPDATED_EVENT, { detail: tasks }));
}

export function subscribeCrmTasksUpdated(listener: (tasks: CrmTask[]) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<CrmTask[]>;
    listener(customEvent.detail ?? []);
  };

  window.addEventListener(CRM_TASKS_UPDATED_EVENT, handler);
  return () => window.removeEventListener(CRM_TASKS_UPDATED_EVENT, handler);
}