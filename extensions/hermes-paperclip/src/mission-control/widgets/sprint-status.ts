import type { SprintCard } from "../types.ts";

/**
 * Sprint status widget — shows active sprint execution status.
 */
export function renderSprintStatus(sprints: SprintCard[]): string {
  if (sprints.length === 0) {
    return "## Sprint Status\n\nNo active sprints.";
  }

  const lines: string[] = ["## Sprint Status", ""];

  for (const sprint of sprints) {
    const completionRate =
      sprint.automationsPlanned > 0
        ? Math.round((sprint.automationsCompleted / sprint.automationsPlanned) * 100)
        : 0;

    lines.push(`### Sprint ${sprint.sprintNumber} (${sprint.phase})`);
    lines.push(`- **Status:** ${sprint.status}`);
    lines.push(
      `- **Automations:** ${sprint.automationsCompleted}/${sprint.automationsPlanned} (${completionRate}%)`,
    );

    if (sprint.blockers.length > 0) {
      lines.push("- **Blockers:**");
      for (const blocker of sprint.blockers) {
        lines.push(`  - ${blocker}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
