/**
 * Velkomst — BRREG (Brønnøysundregistrene) data fetcher.
 *
 * Fetches company data from the Norwegian business register (BRREG) API.
 * Free, open API: https://data.brreg.no/enhetsregisteret/api/enheter/{orgNr}
 */

const BRREG_BASE = "https://data.brreg.no/enhetsregisteret/api";

export interface BrregCompany {
  organisasjonsnummer: string;
  navn: string;
  organisasjonsform: { kode: string; beskrivelse: string };
  naeringskode1?: { kode: string; beskrivelse: string };
  antallAnsatte?: number;
  forretningsadresse?: {
    adresse?: string[];
    postnummer?: string;
    poststed?: string;
    kommune?: string;
    land?: string;
  };
  stiftelsesdato?: string;
  konkurs: boolean;
  underAvvikling: boolean;
  registrertIMvaregisteret?: boolean;
}

/**
 * Fetch company data from BRREG by org number.
 * Returns null if not found (404).
 */
export async function fetchBrregCompany(orgNr: string): Promise<BrregCompany | null> {
  const cleaned = orgNr.replace(/\s/g, "");
  if (!/^\d{9}$/.test(cleaned)) {
    throw new Error(`Invalid org number: ${orgNr} (must be 9 digits)`);
  }

  const res = await fetch(`${BRREG_BASE}/enheter/${cleaned}`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`BRREG API error (${res.status}): ${await res.text()}`);
  }

  return (await res.json()) as BrregCompany;
}

/**
 * Fetch sub-entities (underenheter) for an org number.
 * These are branch offices, departments etc.
 */
export async function fetchBrregSubEntities(orgNr: string): Promise<BrregCompany[]> {
  const cleaned = orgNr.replace(/\s/g, "");
  const res = await fetch(`${BRREG_BASE}/underenheter?overordnetEnhet=${cleaned}`);

  if (!res.ok) {
    throw new Error(`BRREG sub-entity fetch failed (${res.status})`);
  }

  const data = (await res.json()) as { _embedded?: { underenheter?: BrregCompany[] } };
  return data._embedded?.underenheter ?? [];
}
