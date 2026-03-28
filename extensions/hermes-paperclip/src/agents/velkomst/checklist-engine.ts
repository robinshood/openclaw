/**
 * Velkomst — Onboarding checklist engine.
 *
 * Generates and tracks onboarding checklists for new accounting clients.
 * Each step maps to a verifiable action in Tripletex or BRREG.
 */

import type { ClientProfile, Confidence, DataQualityStatus } from "../../shared/types.ts";
import type { BrregCompany } from "./brreg-fetcher.ts";
import type { IndustryMapping } from "./industry-mapper.ts";

export interface ChecklistStep {
  id: string;
  label: string;
  description: string;
  required: boolean;
  status: "pending" | "done" | "skipped" | "blocked";
  verifiedAt?: string;
  blockedReason?: string;
}

export interface OnboardingChecklist {
  clientOrgNr: string;
  clientName: string;
  steps: ChecklistStep[];
  completedCount: number;
  totalRequired: number;
  isComplete: boolean;
  confidence: Confidence;
}

/**
 * Generate an onboarding checklist for a new client.
 */
export function generateChecklist(
  brregData: BrregCompany,
  industryMapping: IndustryMapping,
): OnboardingChecklist {
  const steps: ChecklistStep[] = [
    {
      id: "brreg_verified",
      label: "BRREG-data verifisert",
      description: "Firma bekreftet i Brønnøysundregistrene",
      required: true,
      status: "done", // Already fetched if we're here
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "bankruptcy_check",
      label: "Konkurssjekk",
      description: "Verifiser at firma ikke er under konkurs eller avvikling",
      required: true,
      status: brregData.konkurs || brregData.underAvvikling ? "blocked" : "done",
      blockedReason: brregData.konkurs
        ? "Firma er under konkurs"
        : brregData.underAvvikling
          ? "Firma er under avvikling"
          : undefined,
      verifiedAt:
        !brregData.konkurs && !brregData.underAvvikling ? new Date().toISOString() : undefined,
    },
    {
      id: "tripletex_customer",
      label: "Opprettet i Tripletex",
      description: "Klient opprettet som kunde i Tripletex",
      required: true,
      status: "pending",
    },
    {
      id: "industry_template",
      label: "Bransjemal valgt",
      description: `Bransjemal: ${industryMapping.label} (${industryMapping.template})`,
      required: true,
      status: "done",
      verifiedAt: new Date().toISOString(),
    },
    {
      id: "pricing_model",
      label: "Prismodell konfigurert",
      description: "Fast pris, timepris eller kombinasjon",
      required: true,
      status: "pending",
    },
    {
      id: "contact_info",
      label: "Kontaktinformasjon",
      description: "Kontaktperson og e-post registrert",
      required: true,
      status: "pending",
    },
    {
      id: "mva_registered",
      label: "MVA-registrering sjekket",
      description: "Verifiser MVA-status i BRREG",
      required: true,
      status: brregData.registrertIMvaregisteret !== undefined ? "done" : "pending",
      verifiedAt:
        brregData.registrertIMvaregisteret !== undefined ? new Date().toISOString() : undefined,
    },
    {
      id: "bank_connection",
      label: "Banktilkobling",
      description: "Bankkonto koblet til Tripletex for automatisk import",
      required: false,
      status: "pending",
    },
    {
      id: "opening_balance",
      label: "Inngående balanse",
      description: "Åpningsbalanse ført i Tripletex",
      required: false,
      status: "pending",
    },
    {
      id: "renvasken_baseline",
      label: "Renvasken baseline",
      description: "Datakvalitets-baseline etablert for klient",
      required: true,
      status: "pending",
    },
  ];

  const requiredSteps = steps.filter((s) => s.required);
  const completedRequired = requiredSteps.filter((s) => s.status === "done").length;

  return {
    clientOrgNr: brregData.organisasjonsnummer,
    clientName: brregData.navn,
    steps,
    completedCount: completedRequired,
    totalRequired: requiredSteps.length,
    isComplete: completedRequired === requiredSteps.length,
    confidence:
      completedRequired === requiredSteps.length
        ? "H"
        : completedRequired >= requiredSteps.length * 0.5
          ? "M"
          : "L",
  };
}

/**
 * Build a client profile from BRREG data and checklist.
 */
export function buildClientProfile(
  brregData: BrregCompany,
  industryMapping: IndustryMapping,
  checklist: OnboardingChecklist,
): ClientProfile {
  return {
    orgNr: brregData.organisasjonsnummer,
    companyName: brregData.navn,
    naceCode: brregData.naeringskode1?.kode,
    industryTemplate: industryMapping.template,
    onboardingStatus: checklist.isComplete ? "complete" : "in_progress",
    brregData: brregData as unknown as Record<string, unknown>,
    dataQualityStatus: "pending",
  };
}
