/**
 * Velkomst — Client onboarding tests.
 */
import { describe, expect, it } from "vitest";
import type { BrregCompany } from "../src/agents/velkomst/brreg-fetcher.ts";
import { generateChecklist, buildClientProfile } from "../src/agents/velkomst/checklist-engine.ts";
import {
  mapNaceToTemplate,
  getAvailableTemplates,
} from "../src/agents/velkomst/industry-mapper.ts";
import brregResponse from "./fixtures/mock-brreg-response.json";

const mockBrreg = brregResponse as unknown as BrregCompany;

describe("Velkomst Industry Mapper", () => {
  it("maps hotel NACE code to hotel template", () => {
    const result = mapNaceToTemplate("55.101");
    expect(result.template).toBe("hotel");
  });

  it("maps real estate NACE code to eiendom template", () => {
    const result = mapNaceToTemplate("68.100");
    expect(result.template).toBe("eiendom");
  });

  it("maps IT company to smb-standard", () => {
    const result = mapNaceToTemplate("62.010");
    expect(result.template).toBe("smb-standard");
  });

  it("maps unknown NACE to smb-standard", () => {
    const result = mapNaceToTemplate("99.999");
    expect(result.template).toBe("smb-standard");
  });

  it("lists all available templates", () => {
    const templates = getAvailableTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(3);
    expect(templates.map((t) => t.template)).toContain("hotel");
    expect(templates.map((t) => t.template)).toContain("eiendom");
    expect(templates.map((t) => t.template)).toContain("smb-standard");
  });
});

describe("Velkomst Checklist Engine", () => {
  it("generates a checklist for a healthy company", () => {
    const mapping = mapNaceToTemplate("62.010");
    const checklist = generateChecklist(mockBrreg, mapping);

    expect(checklist.clientOrgNr).toBe("123456789");
    expect(checklist.clientName).toBe("Test Bedrift AS");
    expect(checklist.steps.length).toBeGreaterThan(0);

    // BRREG should be auto-verified
    const brregStep = checklist.steps.find((s) => s.id === "brreg_verified");
    expect(brregStep?.status).toBe("done");

    // Bankruptcy check should pass
    const bankruptcyStep = checklist.steps.find((s) => s.id === "bankruptcy_check");
    expect(bankruptcyStep?.status).toBe("done");
  });

  it("blocks onboarding for bankrupt company", () => {
    const bankruptBrreg = { ...mockBrreg, konkurs: true };
    const mapping = mapNaceToTemplate("62.010");
    const checklist = generateChecklist(bankruptBrreg, mapping);

    const bankruptcyStep = checklist.steps.find((s) => s.id === "bankruptcy_check");
    expect(bankruptcyStep?.status).toBe("blocked");
    expect(bankruptcyStep?.blockedReason).toContain("konkurs");
  });

  it("blocks onboarding for company under liquidation", () => {
    const liquidatingBrreg = { ...mockBrreg, underAvvikling: true };
    const mapping = mapNaceToTemplate("62.010");
    const checklist = generateChecklist(liquidatingBrreg, mapping);

    const step = checklist.steps.find((s) => s.id === "bankruptcy_check");
    expect(step?.status).toBe("blocked");
  });

  it("marks MVA registration as checked when available", () => {
    const mapping = mapNaceToTemplate("62.010");
    const checklist = generateChecklist(mockBrreg, mapping);

    const mvaStep = checklist.steps.find((s) => s.id === "mva_registered");
    expect(mvaStep?.status).toBe("done");
  });

  it("calculates completion correctly", () => {
    const mapping = mapNaceToTemplate("62.010");
    const checklist = generateChecklist(mockBrreg, mapping);

    expect(checklist.totalRequired).toBeGreaterThan(0);
    expect(checklist.completedCount).toBeLessThanOrEqual(checklist.totalRequired);
    expect(checklist.isComplete).toBe(false); // Tripletex + pricing + contact still pending
  });
});

describe("Velkomst Client Profile Builder", () => {
  it("builds a profile from BRREG data", () => {
    const mapping = mapNaceToTemplate("62.010");
    const checklist = generateChecklist(mockBrreg, mapping);
    const profile = buildClientProfile(mockBrreg, mapping, checklist);

    expect(profile.orgNr).toBe("123456789");
    expect(profile.companyName).toBe("Test Bedrift AS");
    expect(profile.naceCode).toBe("62.010");
    expect(profile.industryTemplate).toBe("smb-standard");
    expect(profile.onboardingStatus).toBe("in_progress");
    expect(profile.dataQualityStatus).toBe("pending");
  });
});
