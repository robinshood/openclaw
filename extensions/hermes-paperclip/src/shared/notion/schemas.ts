import { NotionPageType } from "./client.ts";

/**
 * Notion property templates for each page type.
 * These define the required properties when creating pages in Notion.
 */

export const COMPANY_PROFILE_PROPERTIES = {
  pageType: NotionPageType.COMPANY_PROFILE,
  requiredFields: [
    "OrgNumber",
    "Name",
    "Sector",
    "Revenue",
    "EmployeeCount",
    "CustomerCount",
    "Risks",
    "DataSource",
    "LastUpdated",
  ],
  optionalFields: ["Board", "Employees", "RevenuePerEmployee", "EfficiencyNotes"],
} as const;

export const INFRASTRUCTURE_MAP_PROPERTIES = {
  pageType: NotionPageType.INFRASTRUCTURE_MAP,
  requiredFields: ["CompanyId", "Systems", "Integrations", "Gaps"],
  optionalFields: ["Architecture", "Costs", "Notes"],
} as const;

export const PROCESS_MAP_PROPERTIES = {
  pageType: NotionPageType.PROCESS_MAP,
  requiredFields: ["CompanyId", "Processes", "TopCandidates", "TotalHoursPerMonth"],
  optionalFields: ["Notes"],
} as const;

export const GAP_ANALYSIS_PROPERTIES = {
  pageType: NotionPageType.GAP_ANALYSIS,
  requiredFields: [
    "CompanyId",
    "TotalProcesses",
    "FullyCovered",
    "PartiallyCovered",
    "Uncovered",
    "Gaps",
  ],
  optionalFields: ["Recommendations"],
} as const;

export const SPRINT_PLAN_PROPERTIES = {
  pageType: NotionPageType.SPRINT_PLAN,
  requiredFields: ["CompanyId", "Sprints", "MaxIterations"],
  optionalFields: ["Notes"],
} as const;

export const SERVICE_REPORT_PROPERTIES = {
  pageType: NotionPageType.SERVICE_REPORT,
  requiredFields: ["Period", "Services", "SlaCompliance", "Costs"],
  optionalFields: ["Incidents", "Notes"],
} as const;

export const ALERT_LOG_PROPERTIES = {
  pageType: NotionPageType.ALERT_LOG,
  requiredFields: ["Severity", "Source", "Message", "Timestamp"],
  optionalFields: ["Acknowledged", "Resolution"],
} as const;

export const ALL_PAGE_SCHEMAS = {
  companyProfile: COMPANY_PROFILE_PROPERTIES,
  infrastructureMap: INFRASTRUCTURE_MAP_PROPERTIES,
  processMap: PROCESS_MAP_PROPERTIES,
  gapAnalysis: GAP_ANALYSIS_PROPERTIES,
  sprintPlan: SPRINT_PLAN_PROPERTIES,
  serviceReport: SERVICE_REPORT_PROPERTIES,
  alertLog: ALERT_LOG_PROPERTIES,
} as const;
