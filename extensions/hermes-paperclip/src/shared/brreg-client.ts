import { z } from "zod";
import type { EttosConfig } from "./config/env.ts";

/**
 * BRREG (Brønnøysundregistrene) API client.
 *
 * Wraps the Enhetsregisteret (Entity Registry) API for:
 * - Company lookup by org number
 * - Company search by name
 * - NACE code retrieval for industry classification
 *
 * Used by Hermes (company profiling) and Velkomst (client onboarding).
 * Read-only API — no sandbox guard needed.
 */

// --- Schemas ---

export const NaceSchema = z.object({
  kode: z.string(),
  beskrivelse: z.string(),
});
export type Nace = z.infer<typeof NaceSchema>;

export const AdresseSchema = z.object({
  adresse: z.array(z.string()).optional(),
  postnummer: z.string().optional(),
  poststed: z.string().optional(),
  kommunenummer: z.string().optional(),
  kommune: z.string().optional(),
  landkode: z.string().optional(),
  land: z.string().optional(),
});
export type Adresse = z.infer<typeof AdresseSchema>;

export const BrregEnhetSchema = z.object({
  organisasjonsnummer: z.string(),
  navn: z.string(),
  organisasjonsform: z.object({
    kode: z.string(),
    beskrivelse: z.string(),
  }),
  registreringsdatoEnhetsregisteret: z.string().optional(),
  registrertIMvaregisteret: z.boolean().optional(),
  naeringskode1: NaceSchema.optional(),
  naeringskode2: NaceSchema.optional(),
  naeringskode3: NaceSchema.optional(),
  antallAnsatte: z.number().optional(),
  forretningsadresse: AdresseSchema.optional(),
  postadresse: AdresseSchema.optional(),
  stiftelsesdato: z.string().optional(),
  institusjonellSektorkode: z
    .object({
      kode: z.string(),
      beskrivelse: z.string(),
    })
    .optional(),
  registrertIForetaksregisteret: z.boolean().optional(),
  registrertIStiftelsesregisteret: z.boolean().optional(),
  konkurs: z.boolean().optional(),
  underAvvikling: z.boolean().optional(),
  underTvangsavviklingEllerTvangsopplosning: z.boolean().optional(),
  hjemmeside: z.string().optional(),
});
export type BrregEnhet = z.infer<typeof BrregEnhetSchema>;

export const BrregSearchResultSchema = z.object({
  _embedded: z
    .object({
      enheter: z.array(BrregEnhetSchema),
    })
    .optional(),
  page: z.object({
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
    number: z.number(),
  }),
});
export type BrregSearchResult = z.infer<typeof BrregSearchResultSchema>;

// --- HTTP transport ---

export interface BrregHttpTransport {
  get(url: string): Promise<{ status: number; body: string }>;
}

export function createBrregFetchTransport(): BrregHttpTransport {
  return {
    async get(url) {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      return { status: res.status, body: await res.text() };
    },
  };
}

// --- Client ---

export class BrregClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "BrregClientError";
  }
}

export interface BrregClientOptions {
  config: EttosConfig;
  transport?: BrregHttpTransport;
}

export class BrregClient {
  private baseUrl: string;
  private transport: BrregHttpTransport;

  constructor(opts: BrregClientOptions) {
    this.baseUrl = opts.config.brreg.baseUrl;
    this.transport = opts.transport ?? createBrregFetchTransport();
  }

  /**
   * Look up a company by its 9-digit organization number.
   */
  async getEnhet(orgNumber: string): Promise<BrregEnhet> {
    if (!/^\d{9}$/.test(orgNumber)) {
      throw new BrregClientError(`Invalid org number: ${orgNumber} (must be 9 digits)`, 400);
    }

    const res = await this.transport.get(`${this.baseUrl}/enheter/${orgNumber}`);
    if (res.status === 404) {
      throw new BrregClientError(`Company not found: ${orgNumber}`, 404);
    }
    if (res.status < 200 || res.status >= 300) {
      throw new BrregClientError(`BRREG API error: ${res.body}`, res.status);
    }

    return BrregEnhetSchema.parse(JSON.parse(res.body));
  }

  /**
   * Search for companies by name.
   */
  async searchEnheter(
    navn: string,
    opts?: { size?: number; page?: number },
  ): Promise<BrregSearchResult> {
    const params = new URLSearchParams({ navn });
    if (opts?.size) params.set("size", String(opts.size));
    if (opts?.page) params.set("page", String(opts.page));

    const res = await this.transport.get(`${this.baseUrl}/enheter?${params}`);
    if (res.status < 200 || res.status >= 300) {
      throw new BrregClientError(`BRREG search error: ${res.body}`, res.status);
    }

    return BrregSearchResultSchema.parse(JSON.parse(res.body));
  }

  /**
   * Get the primary NACE code for a company.
   * Returns null if no NACE code is registered.
   */
  async getPrimaryNace(orgNumber: string): Promise<Nace | null> {
    const enhet = await this.getEnhet(orgNumber);
    return enhet.naeringskode1 ?? null;
  }

  /**
   * Get all NACE codes for a company (primary + secondary).
   */
  async getAllNaceCodes(orgNumber: string): Promise<Nace[]> {
    const enhet = await this.getEnhet(orgNumber);
    const codes: Nace[] = [];
    if (enhet.naeringskode1) codes.push(enhet.naeringskode1);
    if (enhet.naeringskode2) codes.push(enhet.naeringskode2);
    if (enhet.naeringskode3) codes.push(enhet.naeringskode3);
    return codes;
  }
}
