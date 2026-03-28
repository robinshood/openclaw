/**
 * Agent registry — all agents with their metadata and priority scores.
 * Priority = (T×0.4) + (C×0.3) + (F×0.2) + (E×0.1)
 */

export interface AgentConfig {
  id: string;
  name: string;
  parent: "hermes" | "paperclip";
  priorityScore: number;
  environment: "sandbox" | "production";
  trigger: string;
}

export const AGENTS: Record<string, AgentConfig> = {
  renvasken: {
    id: "paperclip-wash-01",
    name: "Renvasken",
    parent: "paperclip",
    priorityScore: 4.8,
    environment: "sandbox",
    trigger: "pre-pipeline",
  },
  bilagsansen: {
    id: "hermes-bilag-01",
    name: "Bilagsansen",
    parent: "hermes",
    priorityScore: 4.1,
    environment: "sandbox",
    trigger: "webhook:bank-statement",
  },
  portalklar: {
    id: "hermes-rapport-01",
    name: "Portalklar",
    parent: "hermes",
    priorityScore: 3.7,
    environment: "sandbox",
    trigger: "cron:5th-business-day",
  },
  velkomst: {
    id: "paperclip-onboard-01",
    name: "Velkomst",
    parent: "paperclip",
    priorityScore: 3.6,
    environment: "sandbox",
    trigger: "manual",
  },
  tidsvokter: {
    id: "paperclip-tid-01",
    name: "Tidsvokter",
    parent: "paperclip",
    priorityScore: 3.5,
    environment: "sandbox",
    trigger: "cron:daily",
  },
};
