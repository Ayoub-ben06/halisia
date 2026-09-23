import "server-only";

import { render } from "@react-email/components";
import DailySummary, { dailySummarySubject } from "@/emails/DailySummary";
import { DAILY_SUMMARY_FROM, getResend, isResendConfigured } from "@/lib/resend";
import { createUnsubscribeToken } from "@/lib/daily-summary-token";
import { appUrl } from "@/lib/app-url";
import type { DailySummaryData } from "@/lib/daily-summary";

export async function sendDailySummary(summary: DailySummaryData, date = new Date()) {
  if (!isResendConfigured) {
    throw new Error("RESEND_API_KEY est requis pour envoyer le rapport de clôture.");
  }

  const baseUrl = appUrl();
  const unsubscribeUrl = `${baseUrl}/api/daily-summary/unsubscribe?token=${createUnsubscribeToken(summary.userId)}`;
  const element = (
    <DailySummary
      summary={summary}
      date={date}
      settingsUrl={`${baseUrl}/settings/notifications`}
      unsubscribeUrl={unsubscribeUrl}
    />
  );

  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);

  const { data, error } = await getResend().emails.send({
    from: DAILY_SUMMARY_FROM,
    to: summary.email,
    subject: dailySummarySubject(date),
    html,
    text,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
  });

  if (error) throw new Error(error.message);
  return data;
}
