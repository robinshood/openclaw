import { useState } from "react";
import MissionControl from "./modules/MissionControl";
import InvoiceGenerator from "./payments/InvoiceGenerator";
import VisaWallet from "./payments/VisaWallet";

const T = {
  bg: "#F5F0E8",
  bgDark: "#1C1917",
  text: "#292524",
  textMuted: "#78716C",
  accent: "#D4A843",
  border: "#E7E1D5",
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
};

type Tab = "control" | "wallet" | "invoice";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "control", label: "Control", icon: "\u25C8" },
  { id: "wallet", label: "Wallet", icon: "\u25A1" },
  { id: "invoice", label: "Invoice", icon: "\u25C9" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("control");

  return (
    <div style={{ background: T.bg, minHeight: "100vh" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      {/* Page content */}
      <div style={{ paddingBottom: 80 }}>
        {activeTab === "control" && <MissionControl />}
        {activeTab === "wallet" && <VisaWallet />}
        {activeTab === "invoice" && <InvoiceGenerator />}
      </div>

      {/* iOS-style bottom tab bar */}
      <nav
        className="no-print"
        style={{
          position: "fixed" as const,
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255,253,247,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${T.border}`,
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            maxWidth: 480,
            margin: "0 auto",
            padding: "6px 0 2px",
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  gap: 2,
                  padding: "6px 20px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  minHeight: 44,
                  minWidth: 64,
                  WebkitTapHighlightColor: "transparent",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    color: isActive ? T.accent : T.textMuted,
                    transition: "color 0.15s ease",
                    lineHeight: 1,
                  }}
                >
                  {tab.icon}
                </span>
                <span
                  style={{
                    fontFamily: T.sans,
                    fontSize: 10,
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? T.accent : T.textMuted,
                    letterSpacing: "0.02em",
                    transition: "color 0.15s ease",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
