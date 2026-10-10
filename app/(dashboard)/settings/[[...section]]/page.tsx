import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SettingsView,
  type PreferenceSettings,
  type SettingsProfile,
  type ZakatProfile,
} from "@/components/settings/settings-view";
import { getEntitlement, type EffectivePlan } from "@/lib/entitlements";

export const dynamic = "force-dynamic";

const sectionIds = [
  "profil",
  "abonnement",
  "notifications",
  "securite",
  "preferences",
] as const;

type SectionId = (typeof sectionIds)[number];

const defaultPreferences: PreferenceSettings = {
  language: "fr",
  currency: "EUR",
  nisabType: "gold",
  fiscalYearStart: "january",
  bitcoinZakatable: false,
};

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: { section?: string[] };
  searchParams: { tab?: string; unsubscribe?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // "*" rather than a column list: a column added by a migration that is not
  // applied yet must not make the whole query (and every toggle) fail.
  const [{ data: preferences }, { data: profileRow }, { data: zakatRow }, { data: waitlistRow }, { data: newsletterRow }, entitlementResult] = await Promise.all([
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("zakat_profile").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("premium_waitlist").select("id").eq("user_id", user.id).maybeSingle(),
    supabase.from("newsletter_subscribers").select("subscribed").eq("user_id", user.id).maybeSingle(),
    getEntitlement(user.id).catch(() => ({ plan: "free" as EffectivePlan, entitlement: null, subscription: null, limits: { portfolioAssets: 5, watchlistAssets: 3 } })),
  ]);

  const metadata = user.user_metadata ?? {};
  const zakat = metadata.zakat_profile as ZakatProfile | undefined;

  const profile: SettingsProfile = {
    userId: user.id,
    email: user.email ?? "",
    firstName: profileRow?.first_name ?? String(metadata.first_name ?? ""),
    lastName: profileRow?.last_name ?? String(metadata.last_name ?? ""),
    phone: profileRow?.phone ?? String(metadata.phone ?? user.phone ?? ""),
    avatarUrl: profileRow?.avatar_url ?? String(metadata.avatar_url ?? ""),
    createdAt: user.created_at,
    dailySummaryEnabled: preferences?.daily_summary_enabled ?? false,
    newsletterSubscribed: newsletterRow?.subscribed ?? false,
    priceAlertsEnabled: preferences?.price_alerts_enabled ?? false,
    complianceAlertsEnabled: preferences?.compliance_alerts_enabled ?? false,
    halalChangeAlert: preferences?.halal_change_alert ?? preferences?.compliance_alerts_enabled ?? true,
    purificationAlert: preferences?.purification_alert ?? true,
    weeklyComplianceReport: preferences?.weekly_compliance_report ?? true,
    annualZakatReminderEnabled:
      preferences?.annual_zakat_reminder_enabled ?? false,
    zakatReminder: preferences?.zakat_reminder ?? preferences?.annual_zakat_reminder_enabled ?? true,
    zakatPaymentDate: preferences?.zakat_payment_date ?? null,
    preferences: {
      ...defaultPreferences,
      currency: (preferences?.currency ?? (metadata.preferences as Partial<PreferenceSettings> | undefined)?.currency ?? "EUR") as PreferenceSettings["currency"],
      language: preferences?.language === "en" ? "en" : "fr",
      nisabType: (preferences?.nisab_type ?? "gold") as PreferenceSettings["nisabType"],
      fiscalYearStart: (preferences?.fiscal_year_start ?? "january") as PreferenceSettings["fiscalYearStart"],
      bitcoinZakatable: preferences?.bitcoin_zakatable ?? false,
    },
    zakat: zakatRow?.start_date ? { startDate: zakatRow.start_date, includeBitcoin: zakatRow.include_bitcoin, includeIncome: zakatRow.include_income } : zakat?.startDate ? zakat : null,
    waitlisted: Boolean(waitlistRow),
    plan: entitlementResult.plan,
    trialEndsAt: entitlementResult.entitlement?.trial_ends_at ?? null,
    subscriptionEndsAt: entitlementResult.subscription?.current_period_end ?? null,
    subscriptionStatus: entitlementResult.subscription?.status ?? null,
  };

  const requested = searchParams.tab ?? params.section?.[0];
  const initialSection = sectionIds.includes(requested as SectionId)
    ? (requested as SectionId)
    : "profil";

  return (
    <SettingsView
      profile={profile}
      initialSection={initialSection}
      unsubscribeStatus={searchParams.unsubscribe}
    />
  );
}
