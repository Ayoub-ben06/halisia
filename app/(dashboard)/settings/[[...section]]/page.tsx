import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  SettingsView,
  type PreferenceSettings,
  type SettingsProfile,
  type ZakatProfile,
} from "@/components/settings/settings-view";

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
  madhhab: "aaoifi",
};

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: { section?: string[] };
  searchParams: { unsubscribe?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // "*" rather than a column list: a column added by a migration that is not
  // applied yet must not make the whole query (and every toggle) fail.
  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const metadata = user.user_metadata ?? {};
  const zakat = metadata.zakat_profile as ZakatProfile | undefined;

  const profile: SettingsProfile = {
    userId: user.id,
    email: user.email ?? "",
    firstName: String(metadata.first_name ?? ""),
    lastName: String(metadata.last_name ?? ""),
    phone: String(metadata.phone ?? user.phone ?? ""),
    avatarUrl: String(metadata.avatar_url ?? ""),
    createdAt: user.created_at,
    dailySummaryEnabled: preferences?.daily_summary_enabled ?? false,
    priceAlertsEnabled: preferences?.price_alerts_enabled ?? false,
    complianceAlertsEnabled: preferences?.compliance_alerts_enabled ?? false,
    annualZakatReminderEnabled:
      preferences?.annual_zakat_reminder_enabled ?? false,
    zakatPaymentDate: preferences?.zakat_payment_date ?? null,
    preferences: {
      ...defaultPreferences,
      ...(metadata.preferences as Partial<PreferenceSettings> | undefined),
    },
    zakat: zakat?.startDate ? zakat : null,
  };

  const requested = params.section?.[0];
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
