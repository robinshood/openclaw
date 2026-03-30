import { describe, it, expect } from "vitest";
import {
  parseIdentityBlock,
  parseInstructionBlock,
  parseModesPolicyBlock,
  parseNorthStarBlock,
  parseProtocolBlock,
} from "../src/bridge/docset-parser.ts";
import type { AgentDocset } from "../src/bridge/docset-parser.ts";
import type { ModesPolicy } from "../src/bridge/docset-parser.ts";
import {
  mapFlowToRuntime,
  mapModesPolicy,
  isTransitionAllowed,
  RuntimeMode,
} from "../src/bridge/mode-mapper.ts";
import { passesQaGate } from "../src/bridge/sync-back.ts";

describe("DocsetParser", () => {
  describe("parseIdentityBlock", () => {
    it("parses Notion page properties into identity", () => {
      const page = {
        id: "page-123",
        properties: {
          "Agent ID": { rich_text: [{ plain_text: "bilagsansen-v1" }] },
          Name: { title: [{ plain_text: "Bilagsansen" }] },
          Version: { rich_text: [{ plain_text: "1.0.0" }] },
          Package: { select: { name: "Standard" } },
          Status: { select: { name: "Validated" } },
        },
        last_edited_time: "2024-01-15T10:00:00Z",
      };

      const identity = parseIdentityBlock(page);
      expect(identity.agentId).toBe("bilagsansen-v1");
      expect(identity.name).toBe("Bilagsansen");
      expect(identity.version).toBe("1.0.0");
      expect(identity.package).toBe("standard");
      expect(identity.status).toBe("validated");
    });

    it("falls back to page id when no Agent ID property", () => {
      const page = {
        id: "fallback-id",
        properties: {
          Name: { title: [{ plain_text: "Test" }] },
          Version: { rich_text: [{ plain_text: "0.1.0" }] },
          Package: { select: { name: "Standard" } },
          Status: { select: { name: "Draft" } },
        },
      };

      const identity = parseIdentityBlock(page);
      expect(identity.agentId).toBe("fallback-id");
    });
  });

  describe("parseInstructionBlock", () => {
    it("parses markdown content into instruction block", () => {
      const content = `# Role
Voucher classification agent

# Objective
Classify credit card transactions and assign account codes

# Constraints
- Must check MVA rules
- Must validate against konteringsregler

# Success Criteria
- ≥90% classification accuracy
- Process 50 transactions in <2 minutes`;

      const instructions = parseInstructionBlock(content);
      expect(instructions.role).toContain("Voucher classification");
      expect(instructions.constraints).toHaveLength(2);
      expect(instructions.successCriteria).toHaveLength(2);
    });
  });

  describe("parseModesPolicyBlock", () => {
    it("parses modes policy from content", () => {
      const content = `# Default Mode
orchestrate

# Allowed Modes
orchestrate, build, verify

# Transitions
orchestrate → build: when docset validated
build → verify: when tests written`;

      const policy = parseModesPolicyBlock(content);
      expect(policy.defaultMode).toBe("orchestrate");
      expect(policy.allowedModes).toHaveLength(3);
      expect(policy.transitionRules).toHaveLength(2);
    });
  });

  describe("parseNorthStarBlock", () => {
    it("parses north star with metrics", () => {
      const content = `# Mission
Automate voucher classification to 90%+ accuracy

# Metrics
- Classification accuracy: ≥90% (current: 0%)
- Processing time: <2s per voucher
- Error rate: <5%`;

      const northStar = parseNorthStarBlock(content);
      expect(northStar.mission).toContain("90%");
      expect(northStar.metrics).toHaveLength(3);
      expect(northStar.metrics[0].current).toBe("0%");
    });
  });

  describe("parseProtocolBlock", () => {
    it("parses protocol from content", () => {
      const content = `# Input Format
JSON (Tripletex voucher format)

# Output Format
JSON (classified voucher with account codes)

# Error Handling
retry with exponential backoff`;

      const protocol = parseProtocolBlock(content);
      expect(protocol.inputFormat).toContain("JSON");
      expect(protocol.outputFormat).toContain("JSON");
      expect(protocol.errorHandling).toContain("retry");
    });
  });

  describe("passesQaGate", () => {
    const makeDocset = (status: string): AgentDocset =>
      ({
        identity: { status },
      }) as unknown as AgentDocset;

    it("allows validated agents", () => {
      expect(passesQaGate(makeDocset("validated"))).toBe(true);
    });

    it("allows sandbox agents", () => {
      expect(passesQaGate(makeDocset("sandbox"))).toBe(true);
    });

    it("blocks draft agents", () => {
      expect(passesQaGate(makeDocset("draft"))).toBe(false);
    });

    it("blocks archived agents", () => {
      expect(passesQaGate(makeDocset("archived"))).toBe(false);
    });
  });
});

describe("ModeMapper", () => {
  it("maps orchestrate to dispatch mode", () => {
    const config = mapFlowToRuntime("orchestrate");
    expect(config.mode).toBe(RuntimeMode.DISPATCH);
    expect(config.canWrite).toBe(false);
  });

  it("maps build to execute mode with write access", () => {
    const config = mapFlowToRuntime("build");
    expect(config.mode).toBe(RuntimeMode.EXECUTE);
    expect(config.canWrite).toBe(true);
    expect(config.requiresApiAccess).toBe(true);
  });

  it("maps verify to validate mode (read-only)", () => {
    const config = mapFlowToRuntime("verify");
    expect(config.mode).toBe(RuntimeMode.VALIDATE);
    expect(config.canWrite).toBe(false);
  });

  it("maps maintain to monitor mode", () => {
    const config = mapFlowToRuntime("maintain");
    expect(config.mode).toBe(RuntimeMode.MONITOR);
    expect(config.heartbeatIntervalSeconds).toBe(300);
  });

  it("maps full modes policy", () => {
    const policy: ModesPolicy = {
      defaultMode: "orchestrate",
      allowedModes: ["orchestrate", "build", "verify"],
      transitionRules: [{ from: "orchestrate", to: "build", condition: "docset ready" }],
    };
    const result = mapModesPolicy(policy);
    expect(result.defaultMode.mode).toBe("dispatch");
    expect(result.allowedModes).toHaveLength(3);
  });

  it("checks transition rules", () => {
    const policy: ModesPolicy = {
      defaultMode: "orchestrate",
      allowedModes: ["orchestrate", "build", "verify"],
      transitionRules: [{ from: "orchestrate", to: "build", condition: "docset validated" }],
    };

    const allowed = isTransitionAllowed(policy, "orchestrate", "build");
    expect(allowed.allowed).toBe(true);
    expect(allowed.condition).toBe("docset validated");

    // Transition between allowed modes without explicit rule
    const implicit = isTransitionAllowed(policy, "build", "verify");
    expect(implicit.allowed).toBe(true);
  });
});
