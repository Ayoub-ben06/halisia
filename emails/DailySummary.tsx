import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { DailySummaryData } from "@/lib/daily-summary";

/* Palette Halisia — valeurs en dur : les clients mail ne lisent ni Tailwind ni variables CSS. */
const colors = {
  surface: "#111412",
  card: "#1a1c1a",
  cardAlt: "#151b18",
  border: "#2a2e2b",
  gold: "#c9a84c",
  goldText: "#e6c364",
  goldSurface: "#221f14",
  textPrimary: "#ffffff",
  textSecondary: "#a9a291",
  textTertiary: "#8f8878",
  compliant: "#10b981",
  debated: "#f59e0b",
  nonCompliant: "#ef4444",
};

const fontFamily =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const euro = (value: number) =>
  `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

const signedEuro = (value: number) =>
  `${value >= 0 ? "+" : "−"}${euro(Math.abs(value))}`;

const signedPercent = (value: number | null) =>
  value === null
    ? "—"
    : `${value >= 0 ? "+" : "−"}${Math.abs(value).toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} %`;

export function dailySummarySubject(date: Date) {
  return `📊 Votre rapport de clôture halal du ${date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} — Halisia`;
}

export type DailySummaryEmailProps = {
  summary: DailySummaryData;
  date: Date;
  settingsUrl: string;
  unsubscribeUrl: string;
};

export default function DailySummary({
  summary,
  date,
  settingsUrl,
  unsubscribeUrl,
}: DailySummaryEmailProps) {
  const dayPositive = summary.dayChange >= 0;
  const totalPositive = summary.totalChange >= 0;
  const formattedDate = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Html lang="fr">
      <Head />
      <Preview>
        {`${euro(summary.totalValue)} • ${signedPercent(summary.dayChangePercent)} aujourd’hui`}
      </Preview>
      <Body
        style={{
          margin: 0,
          padding: "32px 0",
          backgroundColor: colors.surface,
          fontFamily,
        }}
      >
        <Container style={{ width: "100%", maxWidth: "600px", margin: "0 auto", padding: "0 16px" }}>
          {/* ---------------------------------------------------- En-tête -- */}
          <Section style={{ paddingBottom: "24px" }}>
            <Text
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 700,
                color: colors.gold,
                letterSpacing: "-0.02em",
              }}
            >
              Halisia
            </Text>
            <Heading
              as="h1"
              style={{ margin: "20px 0 0", fontSize: "22px", fontWeight: 700, color: colors.textPrimary }}
            >
              Bonsoir {summary.firstName},
            </Heading>
            <Text style={{ margin: "8px 0 0", fontSize: "13px", color: colors.textSecondary }}>
              Rapport de clôture du {formattedDate}
            </Text>
          </Section>

          {/* -------------------------------------------- Résumé patrimoine -- */}
          <Section
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderLeft: `3px solid ${colors.gold}`,
              borderRadius: "16px",
              padding: "28px",
            }}
          >
            <Text style={{ margin: 0, fontSize: "13px", color: colors.textSecondary }}>
              Valeur totale
            </Text>
            <Text
              style={{
                margin: "8px 0 0",
                fontSize: "34px",
                lineHeight: "40px",
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              {euro(summary.totalValue)}
            </Text>

            <Hr style={{ borderColor: colors.border, margin: "22px 0" }} />

            <Row>
              <Column style={{ width: "50%", verticalAlign: "top" }}>
                <Text style={{ margin: 0, fontSize: "12px", color: colors.textSecondary }}>
                  Performance depuis l’achat
                </Text>
                <Text
                  style={{
                    margin: "6px 0 0",
                    fontSize: "17px",
                    fontWeight: 700,
                    color: dayPositive ? colors.compliant : colors.nonCompliant,
                  }}
                >
                  {signedEuro(summary.dayChange)} ({signedPercent(summary.dayChangePercent)})
                </Text>
              </Column>
              <Column style={{ width: "50%", verticalAlign: "top" }}>
                <Text style={{ margin: 0, fontSize: "12px", color: colors.textSecondary }}>
                  Depuis le début
                </Text>
                <Text
                  style={{
                    margin: "6px 0 0",
                    fontSize: "17px",
                    fontWeight: 700,
                    color: totalPositive ? colors.compliant : colors.nonCompliant,
                  }}
                >
                  {signedEuro(summary.totalChange)} ({signedPercent(summary.totalChangePercent)})
                </Text>
              </Column>
            </Row>
          </Section>

          {/* --------------------------------------------------- Vos actifs -- */}
          <Section style={{ paddingTop: "28px" }}>
            <Heading
              as="h2"
              style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 700, color: colors.textPrimary }}
            >
              Vos actifs
            </Heading>

            <Section
              style={{
                backgroundColor: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: "16px",
                padding: "6px 20px",
              }}
            >
              <Row>
                <Column style={{ width: "46%", padding: "12px 0" }}>
                  <Text style={headerCell}>Actif</Text>
                </Column>
                <Column style={{ width: "30%", padding: "12px 0", textAlign: "right" }}>
                  <Text style={{ ...headerCell, textAlign: "right" }}>Valeur</Text>
                </Column>
                <Column style={{ width: "24%", padding: "12px 0", textAlign: "right" }}>
                  <Text style={{ ...headerCell, textAlign: "right" }}>Perf. depuis l’achat</Text>
                </Column>
              </Row>

              {summary.assets.map((asset, index) => (
                <Row
                  key={`${asset.name}-${index}`}
                  style={{ borderTop: `1px solid ${colors.border}` }}
                >
                  <Column style={{ width: "46%", padding: "14px 0", verticalAlign: "top" }}>
                    <Text style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>
                      {asset.name}
                    </Text>
                    <Text style={{ margin: "3px 0 0", fontSize: "11px", color: colors.textTertiary }}>
                      {asset.category}
                    </Text>
                  </Column>
                  <Column style={{ width: "30%", padding: "14px 0", textAlign: "right", verticalAlign: "top" }}>
                    <Text style={{ margin: 0, fontSize: "13px", color: colors.textPrimary, textAlign: "right" }}>
                      {euro(asset.value)}
                    </Text>
                  </Column>
                  <Column style={{ width: "24%", padding: "14px 0", textAlign: "right", verticalAlign: "top" }}>
                    <Text
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        fontWeight: 600,
                        textAlign: "right",
                        color:
                          asset.dayChangePercent === null
                            ? colors.textTertiary
                            : asset.dayChangePercent >= 0
                              ? colors.compliant
                              : colors.nonCompliant,
                      }}
                    >
                      {signedPercent(asset.dayChangePercent)}
                    </Text>
                  </Column>
                </Row>
              ))}

              {summary.assets.length === 0 && (
                <Row style={{ borderTop: `1px solid ${colors.border}` }}>
                  <Column style={{ padding: "24px 0" }}>
                    <Text style={{ margin: 0, fontSize: "13px", color: colors.textTertiary, textAlign: "center" }}>
                      Aucun actif dans votre portefeuille.
                    </Text>
                  </Column>
                </Row>
              )}
            </Section>
          </Section>

          {/* -------------------------------------- Statut halal & Zakat -- */}
          <Section style={{ paddingTop: "28px" }}>
            <Row>
              <Column style={{ width: "50%", paddingRight: "8px", verticalAlign: "top" }}>
                <Section
                  style={{
                    backgroundColor: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "16px",
                    padding: "22px",
                  }}
                >
                  <Text style={{ margin: 0, fontSize: "12px", color: colors.textSecondary }}>
                    Score de conformité
                  </Text>
                  <Text
                    style={{
                      margin: "8px 0 0",
                      fontSize: "26px",
                      fontWeight: 700,
                      color: summary.halalScore >= 80 ? colors.compliant : colors.debated,
                    }}
                  >
                    {Math.round(summary.halalScore)} %{" "}
                    {summary.halalScore >= 80 ? "✅" : "⚠️"}
                  </Text>
                  <Text style={{ margin: "10px 0 0", fontSize: "12px", color: colors.textSecondary }}>
                    {summary.compliantCount} actif
                    {summary.compliantCount > 1 ? "s" : ""} conforme
                    {summary.compliantCount > 1 ? "s" : ""} • {summary.monitorCount} à
                    surveiller
                  </Text>
                </Section>
              </Column>

              <Column style={{ width: "50%", paddingLeft: "8px", verticalAlign: "top" }}>
                <Section
                  style={{
                    backgroundColor: colors.goldSurface,
                    border: `1px solid ${colors.gold}55`,
                    borderRadius: "16px",
                    padding: "22px",
                  }}
                >
                  <Text style={{ margin: 0, fontSize: "12px", color: colors.textSecondary }}>
                    Zakat estimée
                  </Text>
                  <Text style={{ margin: "8px 0 0", fontSize: "26px", fontWeight: 700, color: colors.goldText }}>
                    {euro(summary.zakat)}
                  </Text>
                  <Text style={{ margin: "10px 0 0", fontSize: "12px", color: colors.textSecondary }}>
                    Basé sur votre patrimoine zakatable actuel
                    {summary.zakat === 0 ? " (sous le nisab)" : ""}.
                  </Text>
                </Section>
              </Column>
            </Row>
          </Section>

          {/* ------------------------------------------------------- Pied -- */}
          <Section style={{ paddingTop: "32px", textAlign: "center" }}>
            <Link
              href={settingsUrl}
              style={{
                display: "inline-block",
                backgroundColor: colors.gold,
                color: colors.surface,
                fontSize: "14px",
                fontWeight: 700,
                textDecoration: "none",
                padding: "13px 28px",
                borderRadius: "8px",
              }}
            >
              Gérer mes alertes
            </Link>

            <Text style={{ margin: "20px 0 0", fontSize: "12px" }}>
              <Link href={unsubscribeUrl} style={{ color: colors.textSecondary, textDecoration: "underline" }}>
                Se désabonner de ce résumé
              </Link>
            </Text>

            <Hr style={{ borderColor: colors.border, margin: "28px 0 20px" }} />

            <Text style={{ margin: 0, fontSize: "11px", color: colors.textTertiary }}>
              © {date.getFullYear()} Halisia — Finance islamique francophone
            </Text>
            <Text style={{ margin: "8px 0 0", fontSize: "11px", lineHeight: "16px", color: colors.textTertiary }}>
              Outil d’aide à la décision. Ne constitue pas un conseil en
              investissement.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const headerCell = {
  margin: 0,
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: colors.textSecondary,
};
