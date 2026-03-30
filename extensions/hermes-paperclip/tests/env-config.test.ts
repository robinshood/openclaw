import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadEttosConfig, isSandbox, isProduction, EttosEnv } from "../src/shared/config/env.ts";
import { createSandboxGuard, SandboxGuardError } from "../src/shared/config/sandbox-guard.ts";
import type { WriteOperation } from "../src/shared/config/sandbox-guard.ts";

describe("EttosConfig", () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    process.env.ETTOS_ENV = "sandbox";
    process.env.TRIPLETEX_TOKEN = "test-token";
    process.env.TRIPLETEX_COMPANY_ID = "12345";
    process.env.NOTION_API_KEY = "ntn_test";
    process.env.NOTION_DATABASE_ID = "db-123";
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it("loads sandbox config by default", () => {
    const config = loadEttosConfig();
    expect(config.env).toBe("sandbox");
    expect(config.prodConfirm).toBe(false);
    expect(config.tripletex.baseUrl).toContain("api.tripletex.io");
  });

  it("loads production config when ETTOS_ENV=production", () => {
    process.env.ETTOS_ENV = "production";
    process.env.PROD_CONFIRM = "true";
    const config = loadEttosConfig();
    expect(config.env).toBe("production");
    expect(config.prodConfirm).toBe(true);
    expect(config.tripletex.baseUrl).toContain("tripletex.no");
  });

  it("isSandbox returns true in sandbox mode", () => {
    const config = loadEttosConfig();
    expect(isSandbox(config)).toBe(true);
    expect(isProduction(config)).toBe(false);
  });

  it("defaults to sandbox when ETTOS_ENV not set", () => {
    delete process.env.ETTOS_ENV;
    const config = loadEttosConfig();
    expect(config.env).toBe("sandbox");
  });
});

describe("SandboxGuard", () => {
  const testOp: WriteOperation = {
    agent: "bilagsansen",
    target: "tripletex",
    method: "POST",
    endpoint: "/ledger/voucher",
    description: "Create voucher",
  };

  beforeEach(() => {
    process.env.ETTOS_ENV = "sandbox";
    process.env.TRIPLETEX_TOKEN = "test-token";
    process.env.TRIPLETEX_COMPANY_ID = "12345";
    process.env.NOTION_API_KEY = "ntn_test";
    process.env.NOTION_DATABASE_ID = "db-123";
  });

  it("allows writes in sandbox mode", async () => {
    const config = loadEttosConfig();
    const guard = createSandboxGuard(config);
    await expect(guard.check(testOp)).resolves.toBeUndefined();
  });

  it("blocks writes in production without PROD_CONFIRM", async () => {
    process.env.ETTOS_ENV = "production";
    process.env.TRIPLETEX_TOKEN = "prod-token";
    process.env.TRIPLETEX_COMPANY_ID = "12345";
    process.env.NOTION_API_KEY = "ntn_test";
    process.env.NOTION_DATABASE_ID = "db-123";
    const config = loadEttosConfig();
    const guard = createSandboxGuard(config);
    await expect(guard.check(testOp)).rejects.toThrow(SandboxGuardError);
  });

  it("blocks writes in production without human approval callback", async () => {
    process.env.ETTOS_ENV = "production";
    process.env.PROD_CONFIRM = "true";
    process.env.TRIPLETEX_TOKEN = "prod-token";
    process.env.TRIPLETEX_COMPANY_ID = "12345";
    process.env.NOTION_API_KEY = "ntn_test";
    process.env.NOTION_DATABASE_ID = "db-123";
    const config = loadEttosConfig();
    const guard = createSandboxGuard(config);
    await expect(guard.check(testOp)).rejects.toThrow(SandboxGuardError);
  });

  it("allows production writes with PROD_CONFIRM and human approval", async () => {
    process.env.ETTOS_ENV = "production";
    process.env.PROD_CONFIRM = "true";
    process.env.TRIPLETEX_TOKEN = "prod-token";
    process.env.TRIPLETEX_COMPANY_ID = "12345";
    process.env.NOTION_API_KEY = "ntn_test";
    process.env.NOTION_DATABASE_ID = "db-123";
    const config = loadEttosConfig();
    const guard = createSandboxGuard(config, async () => true);
    await expect(guard.check(testOp)).resolves.toBeUndefined();
  });

  it("blocks production writes when human rejects", async () => {
    process.env.ETTOS_ENV = "production";
    process.env.PROD_CONFIRM = "true";
    process.env.TRIPLETEX_TOKEN = "prod-token";
    process.env.TRIPLETEX_COMPANY_ID = "12345";
    process.env.NOTION_API_KEY = "ntn_test";
    process.env.NOTION_DATABASE_ID = "db-123";
    const config = loadEttosConfig();
    const guard = createSandboxGuard(config, async () => false);
    await expect(guard.check(testOp)).rejects.toThrow("rejected by human");
  });
});
