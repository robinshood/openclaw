/**
 * VELKOMST — Client Onboarding Automation (Priority: 3.6)
 *
 * Automates new client onboarding for the accounting firm.
 * Triggered: manual (when a new client signs engagement letter).
 *
 * Flow:
 *   1. Fetch company data from BRREG
 *   2. Validate through Renvasken
 *   3. Map industry (NACE → template)
 *   4. Generate onboarding checklist
 *   5. Create customer in Tripletex (G4 gate)
 *   6. Persist client profile to Supabase
 *   7. Audit trail
 */

import { upsertClientProfile } from "../../lib/supabase-client.ts";
import { logAction, confidenceFooter } from "../../shared/audit-logger.ts";
import { requestG4Approval, isBlocked } from "../../shared/g4-gate.ts";
import type { ClientProfile } from "../../shared/types.ts";
import { validateRecord } from "../renvasken/index.ts";
import { fetchBrregCompany, type BrregCompany } from "./brreg-fetcher.ts";
import {
  generateChecklist,
  buildClientProfile,
  type OnboardingChecklist,
} from "./checklist-engine.ts";
import { mapNaceToTemplate } from "./industry-mapper.ts";

const AGENT_ID = "paperclip-onboard-01";

export interface VelkomstInput {
  orgNr: string;
  contactName?: string;
  contactEmail?: string;
  pricingModel?: "fixed" | "hourly" | "mixed";
  monthlyFixedPrice?: number;
  hourlyRate?: number;
  tripletexClient?: {
    createCustomer: (body: unknown) => Promise<{ value: Record<string, unknown> }>;
  };
}

export interface VelkomstResult {
  profile: ClientProfile;
  checklist: OnboardingChecklist;
  brregData: BrregCompany;
  tripletexCustomerId?: number;
  persisted: boolean;
  error?: string;
}

/**
 * Onboard a new client.
 */
export async function onboardClient(input: VelkomstInput): Promise<VelkomstResult> {
  await logAction({
    agentId: AGENT_ID,
    action: "onboarding_start",
    targetType: "client",
    targetId: input.orgNr,
    inputData: { orgNr: input.orgNr },
    confidence: "H",
    rationale: `Starting onboarding for org ${input.orgNr}`,
  });

  // Step 1: Fetch from BRREG
  const brregData = await fetchBrregCompany(input.orgNr);
  if (!brregData) {
    throw new Error(`Company not found in BRREG: ${input.orgNr}`);
  }

  // Step 2: Validate BRREG data through Renvasken
  const validation = validateRecord(
    `brreg-${input.orgNr}`,
    brregData as unknown as Record<string, unknown>,
    { source: "brreg", recordType: "brreg" },
  );

  if (validation.status === "dirty") {
    await logAction({
      agentId: AGENT_ID,
      action: "onboarding_blocked",
      targetType: "client",
      targetId: input.orgNr,
      outputData: { issues: validation.issues },
      confidence: "L",
      rationale: `Onboarding blocked — BRREG data failed Renvasken: ${validation.issues.length} issues`,
    });
    throw new Error(
      `BRREG data failed Renvasken: ${validation.issues.map((i) => i.message).join("; ")}`,
    );
  }

  // Step 3: Map industry
  const naceCode = brregData.naeringskode1?.kode ?? "00.000";
  const industryMapping = mapNaceToTemplate(naceCode);

  // Step 4: Generate checklist
  const checklist = generateChecklist(brregData, industryMapping);

  // Step 5: Build client profile
  const profile = buildClientProfile(brregData, industryMapping, checklist);
  if (input.contactName) profile.contactName = input.contactName;
  if (input.contactEmail) profile.contactEmail = input.contactEmail;
  if (input.pricingModel) profile.pricingModel = input.pricingModel;
  if (input.monthlyFixedPrice) profile.monthlyFixedPrice = input.monthlyFixedPrice;
  if (input.hourlyRate) profile.hourlyRate = input.hourlyRate;

  // Step 6: Create customer in Tripletex (if client provided)
  let tripletexCustomerId: number | undefined;
  if (input.tripletexClient) {
    const g4Decision = await requestG4Approval({
      agentId: AGENT_ID,
      action: "create_tripletex_customer",
      targetType: "customer",
      targetId: input.orgNr,
      payload: {
        name: brregData.navn,
        organizationNumber: brregData.organisasjonsnummer,
        email: input.contactEmail,
        postalCode: brregData.forretningsadresse?.postnummer,
        city: brregData.forretningsadresse?.poststed,
      },
      confidence: "H",
      rationale: `Create Tripletex customer: ${brregData.navn} (${input.orgNr})`,
    });

    if (!isBlocked(g4Decision)) {
      try {
        const result = await input.tripletexClient.createCustomer({
          name: brregData.navn,
          organizationNumber: brregData.organisasjonsnummer,
          email: input.contactEmail,
        });
        tripletexCustomerId = result.value.id as number;
        profile.tripletexCustomerId = tripletexCustomerId;
      } catch (err) {
        await logAction({
          agentId: AGENT_ID,
          action: "tripletex_customer_creation_failed",
          targetType: "customer",
          targetId: input.orgNr,
          outputData: { error: err instanceof Error ? err.message : String(err) },
          confidence: "L",
          rationale: `Failed to create Tripletex customer: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  // Step 7: Persist to Supabase
  let persisted = false;
  try {
    await upsertClientProfile(profile);
    persisted = true;
  } catch {
    // Non-fatal
  }

  await logAction({
    agentId: AGENT_ID,
    action: "onboarding_complete",
    targetType: "client",
    targetId: input.orgNr,
    outputData: {
      companyName: brregData.navn,
      template: industryMapping.template,
      checklistProgress: `${checklist.completedCount}/${checklist.totalRequired}`,
      tripletexCustomerId,
      persisted,
    },
    confidence: checklist.confidence,
    rationale: `Onboarding complete: ${brregData.navn} (${industryMapping.label}), ${checklist.completedCount}/${checklist.totalRequired} steps done`,
  });

  return {
    profile,
    checklist,
    brregData,
    tripletexCustomerId,
    persisted,
  };
}

export { fetchBrregCompany } from "./brreg-fetcher.ts";
export { mapNaceToTemplate, getAvailableTemplates } from "./industry-mapper.ts";
export { generateChecklist, buildClientProfile } from "./checklist-engine.ts";
