import type { CompanyCard } from "../types.ts";

/**
 * Process health widget — shows automation progress across portfolio.
 */
export function renderProcessHealth(companies: CompanyCard[]): string {
  const totalProcesses = companies.reduce((s, c) => s + c.processesTotal, 0);
  const totalMapped = companies.reduce((s, c) => s + c.processesMapped, 0);
  const mappingPercent = totalProcesses > 0 ? Math.round((totalMapped / totalProcesses) * 100) : 0;

  const lines: string[] = [
    "## Process Health",
    "",
    `**Portfolio Total:** ${totalProcesses} processes across ${companies.length} companies`,
    `**Mapped:** ${totalMapped} (${mappingPercent}%)`,
    "",
    "### Per Company",
  ];

  for (const company of companies) {
    const pct =
      company.processesTotal > 0
        ? Math.round((company.processesMapped / company.processesTotal) * 100)
        : 0;
    const bar = renderProgressBar(pct);
    lines.push(
      `- ${company.companyName}: ${bar} ${pct}% (${company.processesMapped}/${company.processesTotal})`,
    );
  }

  return lines.join("\n");
}

function renderProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return `[${"#".repeat(filled)}${"-".repeat(empty)}]`;
}
