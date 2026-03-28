import { useState } from "react";
import { AgentPanel } from "./components/AgentPanel";
import { AuditTrail } from "./components/AuditTrail";
import { ClientsPanel } from "./components/ClientsPanel";
import { DataQualityPanel } from "./components/DataQualityPanel";
import { Header } from "./components/Header";
import { VoucherQueue } from "./components/VoucherQueue";
import { colors, font, spacing } from "./theme";

type Tab = "overview" | "vouchers" | "clients" | "audit";

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        fontFamily: font.family,
        color: colors.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Header />

      <nav
        style={{
          display: "flex",
          gap: spacing.xs,
          padding: `0 ${spacing.lg}px`,
          marginBottom: spacing.lg,
          overflowX: "auto",
        }}
      >
        {(
          [
            { key: "overview", label: "Oversikt" },
            { key: "vouchers", label: "Bilag" },
            { key: "clients", label: "Klienter" },
            { key: "audit", label: "Audit Trail" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: `${spacing.sm}px ${spacing.md}px`,
              borderRadius: 9999,
              border: "none",
              background: activeTab === key ? colors.accent : "transparent",
              color: activeTab === key ? "#fff" : colors.textSecondary,
              fontSize: font.md,
              fontWeight: font.weight.medium,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <main
        style={{
          padding: `0 ${spacing.lg}px`,
          paddingBottom: spacing.xxl,
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
            <AgentPanel />
            <DataQualityPanel />
          </div>
        )}
        {activeTab === "vouchers" && <VoucherQueue />}
        {activeTab === "clients" && <ClientsPanel />}
        {activeTab === "audit" && <AuditTrail />}
      </main>
    </div>
  );
}
