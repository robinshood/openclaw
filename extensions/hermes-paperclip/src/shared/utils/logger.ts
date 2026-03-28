/**
 * Structured logger with correlation IDs for decision traceability.
 * Every decision made by Hermes or Paperclip is logged with a full reasoning chain.
 */

export interface LogEntry {
  timestamp: string;
  level: "DEBUG" | "INFO" | "WARN" | "ERROR";
  correlationId: string;
  agent: "hermes" | "paperclip" | "mission-control";
  message: string;
  data?: Record<string, unknown>;
}

let correlationCounter = 0;

export function generateCorrelationId(agent: string): string {
  return `${agent}-${Date.now()}-${++correlationCounter}`;
}

export function createLogger(agent: LogEntry["agent"]) {
  const correlationId = generateCorrelationId(agent);
  const entries: LogEntry[] = [];

  function log(level: LogEntry["level"], message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      correlationId,
      agent,
      message,
      data,
    };
    entries.push(entry);
    // In production this would write to a structured log sink
    if (level === "ERROR") {
      console.error(JSON.stringify(entry));
    }
  }

  return {
    correlationId,
    entries,
    debug: (msg: string, data?: Record<string, unknown>) => log("DEBUG", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("INFO", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("WARN", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log("ERROR", msg, data),
    getEntries: () => [...entries],
  };
}

export type Logger = ReturnType<typeof createLogger>;
