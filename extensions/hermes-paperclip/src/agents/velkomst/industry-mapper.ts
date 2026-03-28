/**
 * Velkomst — NACE code to industry template mapper.
 *
 * Maps BRREG NACE codes to Portalklar report templates.
 * This determines which KPIs and cost categories to show for each client.
 */

export interface IndustryMapping {
  template: string;
  label: string;
  description: string;
}

/**
 * NACE code prefix → industry template mapping.
 * Only covers templates we've built. Everything else → smb-standard.
 */
const NACE_MAPPINGS: Array<{ prefix: string; mapping: IndustryMapping }> = [
  // Hotels and accommodation
  {
    prefix: "55",
    mapping: {
      template: "hotel",
      label: "Hotell og overnatting",
      description: "Overnattingsvirksomhet",
    },
  },

  // Real estate
  {
    prefix: "68",
    mapping: {
      template: "eiendom",
      label: "Eiendom",
      description: "Omsetning og drift av fast eiendom",
    },
  },
  {
    prefix: "41",
    mapping: {
      template: "eiendom",
      label: "Bygg og anlegg",
      description: "Oppføring av bygninger",
    },
  },

  // Restaurants and food service (can use hotel template)
  {
    prefix: "56",
    mapping: { template: "hotel", label: "Servering", description: "Serveringsvirksomhet" },
  },
];

const DEFAULT_MAPPING: IndustryMapping = {
  template: "smb-standard",
  label: "SMB Standard",
  description: "Standard rapport for små og mellomstore bedrifter",
};

/**
 * Map a NACE code to an industry template.
 */
export function mapNaceToTemplate(naceCode: string): IndustryMapping {
  const code = naceCode.replace(/\./g, "");

  for (const { prefix, mapping } of NACE_MAPPINGS) {
    if (code.startsWith(prefix)) {
      return mapping;
    }
  }

  return DEFAULT_MAPPING;
}

/**
 * Get all available industry templates.
 */
export function getAvailableTemplates(): IndustryMapping[] {
  const seen = new Set<string>();
  const templates: IndustryMapping[] = [];

  for (const { mapping } of NACE_MAPPINGS) {
    if (!seen.has(mapping.template)) {
      seen.add(mapping.template);
      templates.push(mapping);
    }
  }

  templates.push(DEFAULT_MAPPING);
  return templates;
}
