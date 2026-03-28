/**
 * Supabase client for ettOS persistence.
 * Tables: agent_state, audit_trail, client_profiles, time_entries,
 *         report_cache, data_quality_log, data_quality_rules,
 *         agent_memory, data_quality_metrics
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../config/supabase.config.ts";
import type { AuditEntry, ClientProfile, TimeEntry, ValidationResult } from "../shared/types.ts";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const { url, key } = getSupabaseConfig();
    _client = createClient(url, key);
  }
  return _client;
}

/** For testing — inject a mock or test client. */
export function setSupabaseClient(client: SupabaseClient): void {
  _client = client;
}

// --- Agent State ---

export async function getAgentState(agentId: string) {
  const { data, error } = await getSupabaseClient()
    .from("agent_state")
    .select("*")
    .eq("agent_id", agentId)
    .single();
  if (error) throw new Error(`getAgentState: ${error.message}`);
  return data;
}

export async function updateAgentState(agentId: string, updates: Record<string, unknown>) {
  const { error } = await getSupabaseClient()
    .from("agent_state")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("agent_id", agentId);
  if (error) throw new Error(`updateAgentState: ${error.message}`);
}

// --- Audit Trail ---

export async function insertAuditEntry(entry: AuditEntry) {
  const { error } = await getSupabaseClient().from("audit_trail").insert({
    agent_id: entry.agentId,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    input_data: entry.inputData,
    output_data: entry.outputData,
    confidence: entry.confidence,
    rationale: entry.rationale,
    g4_status: entry.g4Status,
    environment: entry.environment,
  });
  if (error) throw new Error(`insertAuditEntry: ${error.message}`);
}

// --- Data Quality Log (Renvasken) ---

export async function insertValidationResult(result: ValidationResult) {
  const { error } = await getSupabaseClient()
    .from("data_quality_log")
    .insert({
      source: result.source,
      source_record_id: result.recordId,
      record_type: result.recordType,
      raw_data: result.rawData,
      cleaned_data: result.cleanedData,
      validation_results: { issues: result.issues },
      confidence_score: result.confidenceScore,
      status: result.status,
      issues_found: result.issues,
      auto_fix_applied: result.autoFixApplied,
      auto_fix_description: result.autoFixDescription,
    });
  if (error) throw new Error(`insertValidationResult: ${error.message}`);
}

export async function getDataQualityRules(layer?: number) {
  let query = getSupabaseClient().from("data_quality_rules").select("*").eq("is_active", true);
  if (layer !== undefined) {
    query = query.eq("layer", layer);
  }
  const { data, error } = await query;
  if (error) throw new Error(`getDataQualityRules: ${error.message}`);
  return data ?? [];
}

export async function insertDataQualityMetrics(metrics: {
  metricDate: string;
  source: string;
  totalRecords: number;
  cleanCount: number;
  suspectCount: number;
  dirtyCount: number;
  topIssues: unknown[];
}) {
  const { error } = await getSupabaseClient().from("data_quality_metrics").insert({
    metric_date: metrics.metricDate,
    source: metrics.source,
    total_records: metrics.totalRecords,
    clean_count: metrics.cleanCount,
    suspect_count: metrics.suspectCount,
    dirty_count: metrics.dirtyCount,
    top_issues: metrics.topIssues,
  });
  if (error) throw new Error(`insertDataQualityMetrics: ${error.message}`);
}

// --- Client Profiles ---

export async function upsertClientProfile(profile: ClientProfile) {
  const { error } = await getSupabaseClient().from("client_profiles").upsert(
    {
      org_nr: profile.orgNr,
      company_name: profile.companyName,
      nace_code: profile.naceCode,
      industry_template: profile.industryTemplate,
      tripletex_customer_id: profile.tripletexCustomerId,
      contact_name: profile.contactName,
      contact_email: profile.contactEmail,
      pricing_model: profile.pricingModel,
      monthly_fixed_price: profile.monthlyFixedPrice,
      hourly_rate: profile.hourlyRate,
      onboarding_status: profile.onboardingStatus,
      assigned_accountant: profile.assignedAccountant,
      brreg_data: profile.brregData,
      data_quality_status: profile.dataQualityStatus,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_nr" },
  );
  if (error) throw new Error(`upsertClientProfile: ${error.message}`);
}

export async function getClientProfile(orgNr: string) {
  const { data, error } = await getSupabaseClient()
    .from("client_profiles")
    .select("*")
    .eq("org_nr", orgNr)
    .single();
  if (error) throw new Error(`getClientProfile: ${error.message}`);
  return data;
}

// --- Time Entries ---

export async function insertTimeEntries(entries: TimeEntry[]) {
  const rows = entries.map((e) => ({
    tripletex_entry_id: e.tripletexEntryId,
    employee_id: e.employeeId,
    employee_name: e.employeeName,
    client_org_nr: e.clientOrgNr,
    project_id: e.projectId,
    date: e.date,
    hours: e.hours,
    hourly_rate: e.hourlyRate,
    billable: e.billable,
    description: e.description,
    data_quality_status: e.dataQualityStatus,
  }));
  const { error } = await getSupabaseClient().from("time_entries").insert(rows);
  if (error) throw new Error(`insertTimeEntries: ${error.message}`);
}

// --- Report Cache ---

export async function cacheReport(report: {
  clientOrgNr: string;
  periodYear: number;
  periodMonth: number;
  reportType: string;
  reportData: unknown;
  confidence: string;
}) {
  const { error } = await getSupabaseClient().from("report_cache").upsert(
    {
      client_org_nr: report.clientOrgNr,
      period_year: report.periodYear,
      period_month: report.periodMonth,
      report_type: report.reportType,
      report_data: report.reportData,
      confidence: report.confidence,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "client_org_nr,period_year,period_month,report_type" },
  );
  if (error) throw new Error(`cacheReport: ${error.message}`);
}
