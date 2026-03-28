import { useState } from "react";
import type { Invoice } from "./types";
import { MOCK_INVOICE } from "./types";

const T = {
  bg: "#F5F0E8",
  bgCard: "#FFFDF7",
  bgDark: "#1C1917",
  text: "#292524",
  textMuted: "#78716C",
  accent: "#D4A843",
  success: "#86A38B",
  critical: "#DC2626",
  border: "#E7E1D5",
  cardShadow: "0 2px 8px rgba(0,0,0,0.03)",
  radius: 16,
  radiusSm: 10,
  serif: "'Playfair Display', Georgia, serif",
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  mono: "'DM Mono', 'SF Mono', monospace",
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("nb-NO", { minimumFractionDigits: 2 });
}

export default function InvoiceGenerator() {
  const [invoice, setInvoice] = useState<Invoice>(MOCK_INVOICE);
  const [approved, setApproved] = useState(false);

  const handleApprove = () => {
    setInvoice((inv) => ({
      ...inv,
      status: "approved" as const,
      approvedBy: "Robin Frantzen",
      paidAt: new Date().toISOString(),
    }));
    setApproved(true);
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px" }}>
      {/* Header */}
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
          Invoice
        </h1>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: T.textMuted }}>
          Analysis & integration services
        </p>
      </div>

      {/* Invoice Card */}
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          overflow: "hidden",
          boxShadow: T.cardShadow,
          marginBottom: 24,
        }}
      >
        {/* Invoice header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap" as const,
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 12,
                  color: T.accent,
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                {invoice.id}
              </div>
              <div
                style={{
                  fontFamily: T.serif,
                  fontSize: 20,
                  color: T.text,
                  fontWeight: 400,
                }}
              >
                {invoice.companyName}
              </div>
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 11,
                  color: T.textMuted,
                  marginTop: 2,
                }}
              >
                Org. {invoice.orgNumber}
              </div>
            </div>
            <div style={{ textAlign: "right" as const }}>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: T.sans,
                  color: approved ? T.success : T.accent,
                  background: approved ? "rgba(134,163,139,0.1)" : "rgba(212,168,67,0.1)",
                }}
              >
                {approved ? "Paid" : "Pending"}
              </span>
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: T.textMuted,
                  marginTop: 6,
                }}
              >
                {new Date(invoice.generatedAt).toLocaleDateString("nb-NO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis summary */}
        <div
          style={{
            padding: "14px 20px",
            background: "rgba(212,168,67,0.04)",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: T.accent,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Analysis Summary
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
            }}
          >
            {[
              { label: "Processes Mapped", value: invoice.analysisDetails.processesMapped },
              { label: "Gaps Identified", value: invoice.analysisDetails.gapsIdentified },
              { label: "Sprint Phase", value: invoice.analysisDetails.sprintPhase },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  style={{
                    fontFamily: T.serif,
                    fontSize: 22,
                    color: T.text,
                    fontWeight: 400,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontFamily: T.sans,
                    fontSize: 11,
                    color: T.textMuted,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Line items */}
        <div style={{ padding: "0 20px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse" as const,
              fontFamily: T.sans,
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: `1px solid ${T.border}`,
                  fontFamily: T.sans,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  color: T.textMuted,
                  fontWeight: 600,
                }}
              >
                <th
                  style={{
                    padding: "12px 0",
                    textAlign: "left" as const,
                    fontWeight: 600,
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    padding: "12px 0",
                    textAlign: "center" as const,
                    fontWeight: 600,
                    width: 50,
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    padding: "12px 0",
                    textAlign: "right" as const,
                    fontWeight: 600,
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                  <td style={{ padding: "12px 0 12px", color: T.text }}>{item.description}</td>
                  <td
                    style={{
                      padding: "12px 0",
                      textAlign: "center" as const,
                      color: T.textMuted,
                      fontFamily: T.mono,
                      fontSize: 12,
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      padding: "12px 0",
                      textAlign: "right" as const,
                      color: T.text,
                      fontFamily: T.mono,
                      fontSize: 12,
                    }}
                  >
                    {formatCents(item.totalCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${T.border}` }}>
          {[
            { label: "Subtotal", value: invoice.subtotalCents },
            { label: "MVA (25%)", value: invoice.vatCents },
          ].map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontFamily: T.sans, fontSize: 13, color: T.textMuted }}>
                {row.label}
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 13, color: T.textMuted }}>
                {formatCents(row.value)}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: 10,
              borderTop: `1px solid ${T.border}`,
              marginTop: 6,
            }}
          >
            <span
              style={{
                fontFamily: T.sans,
                fontSize: 15,
                color: T.text,
                fontWeight: 600,
              }}
            >
              Total
            </span>
            <span
              style={{
                fontFamily: T.serif,
                fontSize: 22,
                color: T.text,
                fontWeight: 400,
              }}
            >
              NOK {formatCents(invoice.totalCents)}
            </span>
          </div>
        </div>

        {/* Payment details */}
        <div
          style={{
            padding: "14px 20px",
            background: "rgba(0,0,0,0.02)",
            borderTop: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: T.textMuted,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Payment Details
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textMuted, lineHeight: 1.8 }}>
            <div>Seller: Ett Capital AS (Ett Tech)</div>
            <div>Method: Visa Intelligent Commerce</div>
            <div>Terms: Due upon approval</div>
            {approved && (
              <div style={{ color: T.success, fontWeight: 500 }}>
                Approved by {invoice.approvedBy} &middot;{" "}
                {new Date(invoice.paidAt!).toLocaleString("nb-NO")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!approved ? (
        <div style={{ display: "flex", gap: 10, marginBottom: 40 }}>
          <button
            onClick={handleApprove}
            style={{
              flex: 2,
              padding: "14px",
              background: T.bgDark,
              color: "#fff",
              border: "none",
              borderRadius: T.radiusSm,
              fontFamily: T.sans,
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              minHeight: 48,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Approve & Pay &rarr;
          </button>
          <button
            onClick={() => window.print()}
            className="no-print"
            style={{
              flex: 1,
              padding: "14px",
              background: "transparent",
              color: T.textMuted,
              border: `1px solid ${T.border}`,
              borderRadius: T.radiusSm,
              fontFamily: T.sans,
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              minHeight: 48,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Print
          </button>
        </div>
      ) : (
        <div
          style={{
            textAlign: "center" as const,
            padding: "20px",
            background: "rgba(134,163,139,0.08)",
            borderRadius: T.radius,
            marginBottom: 40,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>&#10003;</div>
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 18,
              color: T.text,
              marginBottom: 4,
            }}
          >
            Payment Approved
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 13, color: T.textMuted }}>
            Receipt stored in Notion audit trail
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          textAlign: "center" as const,
          padding: "16px 0 32px",
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 10,
            color: T.textMuted,
            letterSpacing: "0.1em",
          }}
        >
          POWERED BY VISA INTELLIGENT COMMERCE
        </div>
      </div>
    </div>
  );
}
