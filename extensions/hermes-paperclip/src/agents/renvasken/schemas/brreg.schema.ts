import { z } from "zod";

/** BRREG (Brønnøysundregistrene) API response schema. */
export const BrregEnhetSchema = z.object({
  organisasjonsnummer: z.string().regex(/^\d{9}$/, "Must be 9 digits"),
  navn: z.string().min(1),
  organisasjonsform: z
    .object({
      kode: z.string(),
      beskrivelse: z.string(),
    })
    .optional(),
  registreringsdatoEnhetsregisteret: z.string().optional(),
  registrertIMvaregisteret: z.boolean().optional(),
  naeringskode1: z
    .object({
      kode: z.string(),
      beskrivelse: z.string(),
    })
    .optional(),
  antallAnsatte: z.number().int().nonnegative().optional(),
  forretningsadresse: z
    .object({
      adresse: z.array(z.string()).optional(),
      postnummer: z.string().optional(),
      poststed: z.string().optional(),
      kommunenummer: z.string().optional(),
      kommune: z.string().optional(),
      land: z.string().optional(),
      landkode: z.string().optional(),
    })
    .optional(),
  konkurs: z.boolean().optional(),
  underAvvikling: z.boolean().optional(),
  underTvangsavviklingEllerTvangsopplosning: z.boolean().optional(),
});

export type BrregEnhet = z.infer<typeof BrregEnhetSchema>;
