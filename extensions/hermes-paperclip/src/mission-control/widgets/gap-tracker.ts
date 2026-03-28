import type { CompanyCard } from "../types.ts";

/**
 * Gap tracker widget — shows gap analysis progress (identified → planned → resolved).
 */
export function renderGapTracker(companies: CompanyCard[]): string {
  const totalGaps = companies.reduce((s, c) => s + c.gapsIdentified, 0);
  const totalClosed = companies.reduce((s, c) => s + c.gapsClosed, 0);
  const totalOpen = totalGaps - totalClosed;
  const closureRate = totalGaps > 0 ? Math.round((totalClosed / totalGaps) * 100) : 0;

  const lines: string[] = [
    "## Gap Tracker",
    "",
    `**Total Gaps:** ${totalGaps} | **Closed:** ${totalClosed} | **Open:** ${totalOpen}`,
    `**Closure Rate:** ${closureRate}%`,
    "",
    "### Per Company",
  ];

  for (const company of companies) {
    const open = company.gapsIdentified - company.gapsClosed;
    const status =
      open === 0 && company.gapsIdentified > 0
        ? "All closed"
        : company.gapsIdentified === 0
          ? "No gaps identified"
          : `${open} open`;
    lines.push(
      `- ${company.companyName}: ${status} (${company.gapsClosed}/${company.gapsIdentified})`,
    );
  }

  return lines.join("\n");
}
