import { describe, it, expect, beforeEach } from "vitest";
import { BrregClient, BrregClientError } from "../src/shared/brreg-client.ts";
import type { BrregHttpTransport, BrregEnhet } from "../src/shared/brreg-client.ts";
import type { EttosConfig } from "../src/shared/config/env.ts";

const MOCK_ENHET: BrregEnhet = {
  organisasjonsnummer: "123456789",
  navn: "Test Regnskap AS",
  organisasjonsform: { kode: "AS", beskrivelse: "Aksjeselskap" },
  naeringskode1: { kode: "69.201", beskrivelse: "Regnskap og bokføring" },
  naeringskode2: { kode: "69.202", beskrivelse: "Revisjon" },
  antallAnsatte: 15,
  forretningsadresse: {
    adresse: ["Storgata 1"],
    postnummer: "0155",
    poststed: "OSLO",
    kommune: "OSLO",
    landkode: "NO",
    land: "Norge",
  },
};

function createMockTransport(enhet: BrregEnhet = MOCK_ENHET): BrregHttpTransport {
  return {
    async get(url) {
      if (url.includes("/enheter/") && !url.includes("?")) {
        const orgNum = url.split("/enheter/")[1];
        if (orgNum === enhet.organisasjonsnummer) {
          return { status: 200, body: JSON.stringify(enhet) };
        }
        return { status: 404, body: "Not found" };
      }
      // Search endpoint
      return {
        status: 200,
        body: JSON.stringify({
          _embedded: { enheter: [enhet] },
          page: { size: 20, totalElements: 1, totalPages: 1, number: 0 },
        }),
      };
    },
  };
}

function createConfig(): EttosConfig {
  return {
    env: "sandbox",
    prodConfirm: false,
    tripletex: { token: "t", companyId: "1", baseUrl: "https://api.tripletex.io/v2" },
    notion: { apiKey: "n", databaseId: "d", mcpUrl: "https://mcp.notion.com/mcp" },
    brreg: { baseUrl: "https://data.brreg.no/enhetsregisteret/api" },
  };
}

describe("BrregClient", () => {
  it("fetches company by org number", async () => {
    const client = new BrregClient({ config: createConfig(), transport: createMockTransport() });
    const enhet = await client.getEnhet("123456789");
    expect(enhet.navn).toBe("Test Regnskap AS");
    expect(enhet.organisasjonsnummer).toBe("123456789");
  });

  it("throws on invalid org number format", async () => {
    const client = new BrregClient({ config: createConfig(), transport: createMockTransport() });
    await expect(client.getEnhet("12345")).rejects.toThrow(BrregClientError);
    await expect(client.getEnhet("12345")).rejects.toThrow("must be 9 digits");
  });

  it("throws 404 when company not found", async () => {
    const client = new BrregClient({ config: createConfig(), transport: createMockTransport() });
    await expect(client.getEnhet("999999999")).rejects.toThrow(BrregClientError);
  });

  it("searches companies by name", async () => {
    const client = new BrregClient({ config: createConfig(), transport: createMockTransport() });
    const result = await client.searchEnheter("Test");
    expect(result._embedded?.enheter).toHaveLength(1);
    expect(result.page.totalElements).toBe(1);
  });

  it("gets primary NACE code", async () => {
    const client = new BrregClient({ config: createConfig(), transport: createMockTransport() });
    const nace = await client.getPrimaryNace("123456789");
    expect(nace).not.toBeNull();
    expect(nace!.kode).toBe("69.201");
  });

  it("gets all NACE codes", async () => {
    const client = new BrregClient({ config: createConfig(), transport: createMockTransport() });
    const codes = await client.getAllNaceCodes("123456789");
    expect(codes).toHaveLength(2);
    expect(codes[0].kode).toBe("69.201");
    expect(codes[1].kode).toBe("69.202");
  });

  it("returns null for company without NACE code", async () => {
    const noNace: BrregEnhet = { ...MOCK_ENHET, naeringskode1: undefined };
    const client = new BrregClient({
      config: createConfig(),
      transport: createMockTransport(noNace),
    });
    const nace = await client.getPrimaryNace("123456789");
    expect(nace).toBeNull();
  });

  // --- Error path tests (§8) ---

  it("rejects org number with letters", async () => {
    const client = new BrregClient({ config: createConfig(), transport: createMockTransport() });
    await expect(client.getEnhet("12345ABCD")).rejects.toThrow("must be 9 digits");
  });

  it("rejects org number with special characters", async () => {
    const client = new BrregClient({ config: createConfig(), transport: createMockTransport() });
    await expect(client.getEnhet("123-456-7")).rejects.toThrow("must be 9 digits");
  });

  it("handles network failure in transport", async () => {
    const failTransport: BrregHttpTransport = {
      async get() {
        throw new Error("ECONNREFUSED");
      },
    };
    const client = new BrregClient({ config: createConfig(), transport: failTransport });
    await expect(client.getEnhet("123456789")).rejects.toThrow("ECONNREFUSED");
  });

  it("handles empty search results", async () => {
    const emptyTransport: BrregHttpTransport = {
      async get() {
        return {
          status: 200,
          body: JSON.stringify({
            page: { size: 20, totalElements: 0, totalPages: 0, number: 0 },
          }),
        };
      },
    };
    const client = new BrregClient({ config: createConfig(), transport: emptyTransport });
    const result = await client.searchEnheter("Nonexistent Company XYZ");
    expect(result._embedded).toBeUndefined();
    expect(result.page.totalElements).toBe(0);
  });

  it("handles HTTP 500 from BRREG", async () => {
    const serverErrorTransport: BrregHttpTransport = {
      async get() {
        return { status: 500, body: "Internal Server Error" };
      },
    };
    const client = new BrregClient({ config: createConfig(), transport: serverErrorTransport });
    await expect(client.getEnhet("123456789")).rejects.toThrow(BrregClientError);
  });
});
