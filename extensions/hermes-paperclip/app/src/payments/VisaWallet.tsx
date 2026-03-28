import { useState } from "react";
import type { PaymentRequest, WalletState } from "./types";
import { MOCK_WALLET_STATE } from "./types";

const T = {
  bg: "#F5F0E8",
  bgCard: "#FFFDF7",
  bgDark: "#1C1917",
  text: "#292524",
  textMuted: "#78716C",
  accent: "#D4A843",
  success: "#86A38B",
  critical: "#DC2626",
  high: "#D97706",
  border: "#E7E1D5",
  cardShadow: "0 2px 8px rgba(0,0,0,0.03)",
  radius: 16,
  radiusSm: 10,
  serif: "'Playfair Display', Georgia, serif",
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "'DM Mono', 'SF Mono', monospace",
};

const budgetColors: Record<string, { bg: string; text: string; label: string }> = {
  ok: { bg: "rgba(134,163,139,0.1)", text: T.success, label: "Budget OK" },
  warning: { bg: "rgba(217,119,6,0.08)", text: T.high, label: "Warning" },
  "soft-stop": { bg: "rgba(220,38,38,0.06)", text: T.critical, label: "Soft Stop" },
  "hard-stop": { bg: "rgba(220,38,38,0.1)", text: T.critical, label: "Blocked" },
};

function formatCents(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toLocaleString("nb-NO", { minimumFractionDigits: 2 })}`;
}

function BudgetBar({ wallet }: { wallet: WalletState }) {
  const pct = Math.min((wallet.spentThisMonthCents / wallet.budgetMonthlyCents) * 100, 100);
  const bc = budgetColors[wallet.budgetStatus];

  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: 20,
        marginBottom: 16,
        boxShadow: T.cardShadow,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: T.textMuted,
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Monthly Budget
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 22, color: T.text, fontWeight: 400 }}>
            {formatCents(wallet.spentThisMonthCents, "NOK")}{" "}
            <span style={{ fontSize: 14, color: T.textMuted }}>
              / {formatCents(wallet.budgetMonthlyCents, "NOK")}
            </span>
          </div>
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: T.sans,
            color: bc.text,
            background: bc.bg,
          }}
        >
          {bc.label}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: pct > 95 ? T.critical : pct > 80 ? T.high : T.success,
            borderRadius: 3,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* Spending limits */}
      <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" as const }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>
          Per txn: {formatCents(wallet.spendingLimits.maxPerTransactionCents, "NOK")}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted }}>
          Approval: &gt;{formatCents(wallet.spendingLimits.requiresApprovalAboveCents, "NOK")}
        </div>
      </div>
    </div>
  );
}

function ConnectionStatus({ status }: { status: string }) {
  const configs: Record<string, { color: string; label: string; icon: string }> = {
    connected: { color: T.success, label: "Visa Connected", icon: "\u25CF" },
    disconnected: { color: T.critical, label: "Disconnected", icon: "\u25CB" },
    sandbox: { color: T.accent, label: "Sandbox Mode", icon: "\u25D2" },
  };
  const c = configs[status] ?? configs.disconnected;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "12px 16px",
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        marginBottom: 16,
        boxShadow: T.cardShadow,
      }}
    >
      <span style={{ color: c.color, fontSize: 12 }}>{c.icon}</span>
      <span style={{ fontFamily: T.sans, fontSize: 13, color: T.text, fontWeight: 500 }}>
        {c.label}
      </span>
      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, marginLeft: "auto" }}>
        Visa Intelligent Commerce
      </span>
    </div>
  );
}

function ApprovalCard({
  request,
  onApprove,
  onReject,
}: {
  request: PaymentRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const agentColor = request.agentName === "Hermes" ? T.accent : "#57534E";

  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${T.border}`,
        borderRadius: T.radiusSm,
        padding: 16,
        boxShadow: T.cardShadow,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontFamily: T.sans, fontSize: 14, fontWeight: 600, color: T.text }}>
            {request.description}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}>
            <span
              style={{
                fontFamily: T.mono,
                fontSize: 10,
                color: agentColor,
                textTransform: "uppercase" as const,
                fontWeight: 500,
              }}
            >
              {request.agentName}
            </span>
            <span style={{ color: T.border }}>&middot;</span>
            <span style={{ fontFamily: T.sans, fontSize: 11, color: T.textMuted }}>
              {request.companyName}
            </span>
          </div>
        </div>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 18,
            color: T.text,
            fontWeight: 400,
            flexShrink: 0,
          }}
        >
          {formatCents(request.amountCents, request.currency)}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => onApprove(request.id)}
          style={{
            flex: 1,
            padding: "10px",
            background: T.bgDark,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            minHeight: 44,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Approve
        </button>
        <button
          onClick={() => onReject(request.id)}
          style={{
            flex: 1,
            padding: "10px",
            background: "transparent",
            color: T.textMuted,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            minHeight: 44,
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: PaymentRequest }) {
  const agentColor = tx.agentName === "Hermes" ? T.accent : "#57534E";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div>
        <div style={{ fontFamily: T.sans, fontSize: 13, color: T.text }}>{tx.description}</div>
        <div style={{ display: "flex", gap: 6, marginTop: 2, alignItems: "center" }}>
          <span
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              color: agentColor,
              textTransform: "uppercase" as const,
            }}
          >
            {tx.agentName}
          </span>
          <span style={{ fontFamily: T.sans, fontSize: 10, color: T.textMuted }}>
            {new Date(tx.createdAt).toLocaleDateString("nb-NO")}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: T.mono, fontSize: 13, color: T.text }}>
          {formatCents(tx.amountCents, tx.currency)}
        </span>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background:
              tx.status === "approved" ? T.success : tx.status === "rejected" ? T.critical : T.high,
          }}
        />
      </div>
    </div>
  );
}

export default function VisaWallet() {
  const [wallet, setWallet] = useState<WalletState>(MOCK_WALLET_STATE);

  const handleApprove = (id: string) => {
    setWallet((w) => ({
      ...w,
      pendingApprovals: w.pendingApprovals.filter((p) => p.id !== id),
      recentTransactions: [
        {
          ...w.pendingApprovals.find((p) => p.id === id)!,
          status: "approved" as const,
          approvedBy: "Robin Frantzen",
          approvedAt: new Date().toISOString(),
        },
        ...w.recentTransactions,
      ],
    }));
  };

  const handleReject = (id: string) => {
    setWallet((w) => ({
      ...w,
      pendingApprovals: w.pendingApprovals.filter((p) => p.id !== id),
    }));
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px" }}>
      <div
        style={{
          paddingTop: "env(safe-area-inset-top, 20px)",
          paddingBottom: 20,
          borderBottom: `1px solid ${T.border}`,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 24, color: T.accent, fontWeight: 300 }}>&#10022;</span>
          <span
            style={{
              fontFamily: T.sans,
              fontSize: 12,
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
              color: T.textMuted,
              fontWeight: 500,
            }}
          >
            ettOS
          </span>
        </div>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 28,
            fontWeight: 400,
            color: T.text,
            margin: "8px 0 4px",
          }}
        >
          Agent Wallet
        </h1>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textMuted }}>
          Visa Intelligent Commerce &middot; Human-in-the-loop payments
        </p>
      </div>

      <ConnectionStatus status={wallet.connectionStatus} />
      <BudgetBar wallet={wallet} />

      {/* Pending Approvals */}
      {wallet.pendingApprovals.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontFamily: T.serif,
              fontSize: 18,
              fontWeight: 400,
              color: T.text,
              marginBottom: 12,
            }}
          >
            Pending Approvals
            <span
              style={{
                marginLeft: 8,
                padding: "2px 8px",
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: T.sans,
                background: "rgba(220,38,38,0.08)",
                color: T.critical,
              }}
            >
              {wallet.pendingApprovals.length}
            </span>
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            {wallet.pendingApprovals.map((req) => (
              <ApprovalCard
                key={req.id}
                request={req}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: T.serif,
            fontSize: 18,
            fontWeight: 400,
            color: T.text,
            marginBottom: 12,
          }}
        >
          Recent Transactions
        </h2>
        <div
          style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
            padding: "4px 16px",
            boxShadow: T.cardShadow,
          }}
        >
          {wallet.recentTransactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
          {wallet.recentTransactions.length === 0 && (
            <div
              style={{
                padding: "20px 0",
                textAlign: "center" as const,
                fontFamily: T.sans,
                fontSize: 13,
                color: T.textMuted,
              }}
            >
              No transactions yet
            </div>
          )}
        </div>
      </div>

      {/* Visa badge */}
      <div
        style={{
          textAlign: "center" as const,
          padding: "16px 0 32px",
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{ fontFamily: T.mono, fontSize: 10, color: T.textMuted, letterSpacing: "0.1em" }}
        >
          POWERED BY VISA INTELLIGENT COMMERCE
        </div>
        <div style={{ fontFamily: T.sans, fontSize: 11, color: T.textMuted, marginTop: 4 }}>
          Trusted Agent Protocol &middot; FIDO Passkey Authentication
        </div>
      </div>
    </div>
  );
}
