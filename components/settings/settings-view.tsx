"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Camera,
  CheckCircle2,
  CreditCard,
  Globe,
  Lock,
  LogOut,
  Monitor,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DashboardToast } from "@/components/dashboard/dashboard-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";
import type { AppLanguage } from "@/lib/i18n";

export type PreferenceSettings = {
  language: AppLanguage;
  currency: "EUR" | "USD" | "GBP" | "MAD" | "DZD" | "TND";
  nisabType: "gold" | "silver";
  fiscalYearStart: "january" | "july";
  bitcoinZakatable: boolean;
};

export type ZakatProfile = {
  startDate: string;
  includeBitcoin: boolean;
  includeIncome: boolean;
} | null;

export type SettingsProfile = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  createdAt: string;
  dailySummaryEnabled: boolean;
  priceAlertsEnabled: boolean;
  complianceAlertsEnabled: boolean;
  halalChangeAlert: boolean;
  purificationAlert: boolean;
  weeklyComplianceReport: boolean;
  annualZakatReminderEnabled: boolean;
  zakatReminder: boolean;
  zakatPaymentDate: string | null;
  preferences: PreferenceSettings;
  zakat: ZakatProfile;
  waitlisted: boolean;
};

const sections = [
  { id: "profil", label: "Profil", icon: User },
  { id: "abonnement", label: "Abonnement", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "securite", label: "Sécurité", icon: Lock },
  { id: "preferences", label: "Préférences", icon: Globe },
] as const;

type SectionId = (typeof sections)[number]["id"];

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function SettingsView({
  profile,
  initialSection = "profil",
  unsubscribeStatus,
}: {
  profile: SettingsProfile;
  initialSection?: SectionId;
  unsubscribeStatus?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [section, setSection] = useState<SectionId>(initialSection);
  const [toast, setToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  useEffect(() => {
    if (unsubscribeStatus === "ok") setToast(t("settingsDailySummaryDisabled"));
    else if (unsubscribeStatus) setErrorToast(t("settingsUnsubscribeInvalid"));
  }, [unsubscribeStatus, t]);

  function showToast(message: string) {
    setErrorToast("");
    setToast(message);
    window.setTimeout(() => setToast(""), 4000);
  }

  function showError(message: string) {
    setToast("");
    setErrorToast(message);
    window.setTimeout(() => setErrorToast(""), 4000);
  }

  return (
    <div className="mx-auto max-w-[1280px] p-4 text-[#ffffff] sm:p-8">
      <header>
        <h1 className="text-3xl font-bold">{t("settings")}</h1>
        <p className="mt-2 text-sm text-[#a9a291]">
          {t("settingsDescription")}
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label={t("settingsSectionsNav")}
          className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1 lg:p-3"
        >
          {sections.map(({ id, icon: Icon }) => {
            const active = section === id;
            const translatedLabel = id === "profil" ? t("profile") : id === "abonnement" ? t("subscription") : id === "notifications" ? t("notifications") : id === "securite" ? t("security") : t("preferences");
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSection(id);
                  router.replace(`/settings?tab=${id}`, { scroll: false });
                }}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl border-l-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-l-[#c9a84c] bg-[#c9a84c]/10 text-[#e6c364]"
                    : "border-l-transparent text-[#a9a291] hover:bg-white/5 hover:text-[#ffffff]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {translatedLabel}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-6">
          {section === "profil" && (
            <ProfileSection
              profile={profile}
              onSuccess={showToast}
              onError={showError}
            />
          )}
          {section === "abonnement" && <SubscriptionSection userId={profile.userId} email={profile.email} initiallyWaitlisted={profile.waitlisted} onSuccess={showToast} onError={showError} />}
          {section === "notifications" && (
            <NotificationsSection
              userId={profile.userId}
              initialDailySummaryEnabled={profile.dailySummaryEnabled}
              initialPriceAlertsEnabled={profile.priceAlertsEnabled}
              initialComplianceAlertsEnabled={profile.complianceAlertsEnabled}
              initialHalalChangeAlert={profile.halalChangeAlert}
              initialPurificationAlert={profile.purificationAlert}
              initialWeeklyComplianceReport={profile.weeklyComplianceReport}
              initialZakatReminder={profile.zakatReminder}
              initialAnnualZakatReminderEnabled={
                profile.annualZakatReminderEnabled
              }
              hasZakatProfile={Boolean(profile.zakat || profile.zakatPaymentDate)}
              onSuccess={showToast}
              onError={showError}
            />
          )}
          {section === "securite" && (
            <SecuritySection
              email={profile.email}
              createdAt={profile.createdAt}
              onSuccess={showToast}
              onError={showError}
              onSignOut={async () => {
                await createClient().auth.signOut();
                router.replace("/login");
                router.refresh();
              }}
            />
          )}
          {section === "preferences" && (
            <PreferencesSection
              initial={profile.preferences}
              onSuccess={showToast}
              onError={showError}
            />
          )}
        </div>
      </div>

      <DashboardToast message={toast} />
      <DashboardToast message={errorToast} variant="error" />
    </div>
  );
}

/* -------------------------------------------------------------- Profil -- */

function ProfileSection({
  profile,
  onSuccess,
  onError,
}: {
  profile: SettingsProfile;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    profile.email.split("@")[0];
  const initials =
    [firstName, lastName]
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || profile.email.charAt(0).toUpperCase();

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("user_profiles").upsert({ id: profile.userId, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null, avatar_url: avatarUrl || null, updated_at: new Date().toISOString() });
      if (error) throw error;
      onSuccess(t("settingsInfoSaved"));
      router.refresh();
    } catch {
      onError(t("settingsInfoSaveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError(t("settingsChooseImageFile"));
      return;
    }
    try {
      const supabase = createClient();
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.userId}/avatar-${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: profileError } = await supabase.from("user_profiles").upsert({ id: profile.userId, avatar_url: data.publicUrl, updated_at: new Date().toISOString() });
      if (profileError) throw profileError;
      setAvatarUrl(data.publicUrl);
      onSuccess(t("settingsPhotoUpdated"));
    } catch {
      onError(t("settingsImageReadFailed"));
    }
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title={t("personalInfo")}
          description={t("personalInfoDescription")}
        />

        <div className="flex flex-wrap items-center gap-5 border-b border-white/[0.05] pb-7">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#c9a84c] text-xl font-bold text-[#111412]">
              {initials}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-lg font-bold">{displayName}</p>
            <p className="mt-1 text-sm text-[#a9a291]">
              {t("profilePhoto")}
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleAvatar(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-[#e6c364] hover:underline"
            >
              <Camera className="h-4 w-4" />
              {t("changePhoto")}
            </button>
          </div>
        </div>

        <div className="grid gap-5 pt-7 sm:grid-cols-2">
          <Field label={t("firstName")}>
            <FormInput
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder={t("firstName")}
              autoComplete="given-name"
            />
          </Field>
          <Field label={t("lastName")}>
            <FormInput
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder={t("lastName")}
              autoComplete="family-name"
            />
          </Field>
          <Field
            label={t("authEmail")}
            hint={t("settingsEmailHint")}
          >
            <FormInput
              value={profile.email}
              disabled
              readOnly
              className="text-[#a9a291]"
            />
          </Field>
          <Field label={t("optionalPhone")}>
            <FormInput
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+33 6 12 34 56 78"
              autoComplete="tel"
            />
          </Field>
        </div>

        <div className="mt-7 flex justify-end">
          <Button
            type="button"
            size="lg"
            disabled={saving}
            onClick={() => void handleSave()}
            className="font-bold"
          >
            {saving ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </Panel>

      <ZakatProfileCard zakat={profile.zakat} />

      <section className="rounded-2xl border border-white/[0.05] border-l-2 border-l-halal-nonCompliant bg-[#1a1c1a] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold text-halal-nonCompliant">
              <TriangleAlert className="h-4 w-4" />
              {t("settingsDangerZone")}
            </p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#a9a291]">
              {t("settingsDeleteAccountWarning")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-halal-nonCompliant/50 px-5 text-sm font-semibold text-halal-nonCompliant transition-colors hover:bg-halal-nonCompliant/10"
          >
            {t("settingsDeleteAccount")}
          </button>
        </div>
      </section>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onError={onError}
      />
    </>
  );
}

function ZakatProfileCard({ zakat }: { zakat: ZakatProfile }) {
  const { t } = useI18n();
  return (
    <section className="rounded-2xl border border-white/[0.05] border-l-2 border-l-[#c9a84c] bg-[#1a1c1a] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              zakat
                ? "bg-halal-compliant/10 text-halal-compliant"
                : "bg-halal-debated/10 text-halal-debated"
            }`}
          >
            {zakat ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <TriangleAlert className="h-3.5 w-3.5" />
            )}
            {zakat ? t("zakatReady") : t("settingsZakatNotConfigured")}
          </span>
          <p className="mt-3 text-lg font-bold">
            {t("settingsZakatConfigTitle")}
          </p>
          <p className="mt-2 text-sm text-[#a9a291]">
            {zakat ? (
              <>
                {t("settingsZakatHawlSince")}{" "}
                <strong className="text-[#ffffff]">
                  {formatDate(zakat.startDate)}
                </strong>{" "}
                • Bitcoin :{" "}
                <span
                  className={
                    zakat.includeBitcoin
                      ? "text-halal-compliant"
                      : "text-[#8f8878]"
                  }
                >
                  {zakat.includeBitcoin ? t("settingsZakatBitcoinIncluded") : t("settingsZakatBitcoinExcluded")}
                </span>{" "}
                • {t("settingsZakatIncome")}{" "}
                <span
                  className={
                    zakat.includeIncome
                      ? "text-halal-compliant"
                      : "text-[#8f8878]"
                  }
                >
                  {zakat.includeIncome ? t("settingsZakatBitcoinIncluded") : t("settingsZakatBitcoinExcluded")}
                </span>
              </>
            ) : (
              t("settingsZakatSetupHint")
            )}
          </p>
        </div>
        <Link
          href="/zakat"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#9a8035] px-5 text-sm font-semibold text-[#e6c364] transition-colors hover:bg-[#c9a84c]/10"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {zakat ? t("settingsEditZakatProfile") : t("settingsConfigureZakatProfile")}
        </Link>
      </div>
    </section>
  );
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmWord = t("settingsDeleteConfirmWord");

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch("/api/account/delete", { method: "POST" });
      if (!response.ok) throw new Error("delete failed");
      await createClient().auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setDeleting(false);
      onOpenChange(false);
      onError(t("settingsDeleteAccountFailed"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (deleting) return;
        setConfirmation("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="border-white/[0.05] bg-[#1a1c1a] p-6 text-[#ffffff] sm:max-w-[460px] sm:rounded-2xl sm:p-8">
        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-halal-nonCompliant">
          <TriangleAlert className="h-5 w-5" />
          {t("settingsDeleteAccountTitle")}
        </DialogTitle>
        <DialogDescription className="mt-3 text-sm leading-6 text-[#a9a291]">
          {t("settingsDeleteAccountDesc")}
        </DialogDescription>
        <label className="mt-6 block">
          <span className="text-sm text-[rgba(255,255,255,0.6)]">
            {t("settingsDeleteConfirmPrompt").replace("{word}", confirmWord)}
          </span>
          <FormInput
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={confirmWord}
            className="mt-2"
          />
        </label>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-[#344038] px-5 text-sm font-semibold text-[#a9a291] hover:bg-white/5"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={confirmation !== confirmWord || deleting}
            onClick={() => void handleDelete()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-halal-nonCompliant px-5 text-sm font-bold text-[#ffffff] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {deleting ? t("settingsDeleting") : t("settingsDeletePermanently")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------- Abonnement -- */

function SubscriptionSection({ userId, email, initiallyWaitlisted, onSuccess, onError }: { userId: string; email: string; initiallyWaitlisted: boolean; onSuccess: (message: string) => void; onError: (message: string) => void }) {
  const { t } = useI18n();
  const planFeatures = [
    t("settingsPlanFeature1"),
    t("settingsPlanFeature2"),
    t("settingsPlanFeature3"),
    t("settingsPlanFeature4"),
  ];
  const [waitlisted, setWaitlisted] = useState(initiallyWaitlisted);
  const [saving, setSaving] = useState(false);
  async function joinWaitlist() {
    setSaving(true);
    try {
      const { error } = await createClient().from("premium_waitlist").upsert({ email, user_id: userId }, { onConflict: "email" });
      if (error) throw error;
      setWaitlisted(true);
      onSuccess(t("settingsWaitlistSuccess"));
    } catch { onError(t("settingsWaitlistFailed")); } finally { setSaving(false); }
  }
  return (
    <Panel>
      <PanelHeader
        title={t("settingsYourPlan")}
        description={t("settingsFreeLaunchDescription")}
      />
      <div className="rounded-xl border border-[#9a8035]/40 bg-[#c9a84c]/[0.07] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c9a84c]/10 px-3 py-1 text-xs font-semibold text-[#e6c364]">
              <Sparkles className="h-3.5 w-3.5" />
              {t("activePlan")}
            </span>
            <p className="mt-3 text-2xl font-bold text-[#e6c364]">
              {t("launchAccess")}
            </p>
            <p className="mt-1 text-sm text-[#a9a291]">
              {t("settingsAllFeaturesIncluded")}
            </p>
          </div>
          <p className="text-right">
            <span className="text-3xl font-bold">0 €</span>
          </p>
        </div>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {planFeatures.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-sm text-[#a9a291]"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-halal-compliant" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-6 text-sm leading-6 text-[#a9a291]">
        {t("settingsPremiumOpeningSoon")}{" "}
        <Link href="/tarifs" className="font-semibold text-[#e6c364] hover:underline">{t("settingsViewPlannedPricing")}</Link>
      </p>
      <div className="mt-7 rounded-xl border border-[#c9a84c]/30 bg-[#151b18] p-5">
        <p className="font-semibold">{t("settingsOfficialPremiumSoon")}</p>
        <p className="mt-1 text-sm text-[#a9a291]">9,99 €/mois ou 79 €/an</p>
        {waitlisted ? <p className="mt-4 text-sm font-semibold text-halal-compliant">✅ {t("settingsOnPriorityList")}</p> : <Button type="button" disabled={saving} onClick={() => void joinWaitlist()} className="mt-4 font-bold">{saving ? t("settingsJoiningWaitlist") : t("settingsJoinPriorityList")}</Button>}
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------- Notifications -- */

function NotificationsSection({
  userId,
  initialDailySummaryEnabled,
  initialPriceAlertsEnabled,
  initialComplianceAlertsEnabled,
  initialHalalChangeAlert,
  initialPurificationAlert,
  initialWeeklyComplianceReport,
  initialZakatReminder,
  initialAnnualZakatReminderEnabled,
  hasZakatProfile,
  onSuccess,
  onError,
}: {
  userId: string;
  initialDailySummaryEnabled: boolean;
  initialPriceAlertsEnabled: boolean;
  initialComplianceAlertsEnabled: boolean;
  initialHalalChangeAlert: boolean;
  initialPurificationAlert: boolean;
  initialWeeklyComplianceReport: boolean;
  initialZakatReminder: boolean;
  initialAnnualZakatReminderEnabled: boolean;
  hasZakatProfile: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const upcomingNotifications = [
    { label: t("settingsMonthlyReport"), description: t("settingsMonthlyReportDesc") },
    { label: t("settingsNewsletter"), description: t("settingsNewsletterDesc") },
  ];
  const [dailyEnabled, setDailyEnabled] = useState(initialDailySummaryEnabled);
  const [priceEnabled, setPriceEnabled] = useState(initialPriceAlertsEnabled);
  const [complianceEnabled, setComplianceEnabled] = useState(initialComplianceAlertsEnabled);
  const [halalEnabled, setHalalEnabled] = useState(initialHalalChangeAlert);
  const [purificationEnabled, setPurificationEnabled] = useState(initialPurificationAlert);
  const [weeklyEnabled, setWeeklyEnabled] = useState(initialWeeklyComplianceReport);
  const [zakatEnabled, setZakatEnabled] = useState(
    initialZakatReminder || initialAnnualZakatReminderEnabled,
  );
  const [saving, setSaving] = useState<string | null>(null);

  async function toggleDailySummary(next: boolean) {
    const previous = dailyEnabled;
    setDailyEnabled(next);
    setSaving("daily");
    try {
      const { error } = await createClient()
        .from("user_preferences")
        .upsert(
          { user_id: userId, daily_summary_enabled: next },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      onSuccess(next ? t("settingsDailySummaryEnabled") : t("settingsDailySummaryDisabled"));
    } catch {
      setDailyEnabled(previous);
      onError(t("settingsSaveSettingFailed"));
    } finally {
      setSaving(null);
    }
  }

  async function togglePreference(
    kind: "price" | "zakat" | "compliance" | "halal" | "purification" | "weekly",
    next: boolean,
  ) {
    if (kind === "zakat" && next && !hasZakatProfile) {
      onError(t("settingsConfigureZakatFirst"));
      return;
    }

    const settings = {
      price: { value: priceEnabled, set: setPriceEnabled, column: "price_alerts_enabled", label: t("settingsPriceAlerts"), suffix: "es" },
      compliance: { value: complianceEnabled, set: setComplianceEnabled, column: "compliance_alerts_enabled", label: t("settingsComplianceAlerts"), suffix: "es" },
      zakat: { value: zakatEnabled, set: setZakatEnabled, column: "annual_zakat_reminder_enabled", label: t("settingsAnnualZakatReminder"), suffix: "" },
      halal: { value: halalEnabled, set: setHalalEnabled, column: "halal_change_alert", label: t("settingsDowngradeAlerts"), suffix: "" },
      purification: { value: purificationEnabled, set: setPurificationEnabled, column: "purification_alert", label: t("settingsPurificationAlerts"), suffix: "" },
      weekly: { value: weeklyEnabled, set: setWeeklyEnabled, column: "weekly_compliance_report", label: t("settingsWeeklyReportShort"), suffix: "" },
    }[kind];
    const previous = settings.value;
    settings.set(next);
    setSaving(kind);

    try {
      const payload = { user_id: userId, [settings.column]: next, updated_at: new Date().toISOString(), ...(kind === "halal" ? { compliance_alerts_enabled: next } : {}), ...(kind === "zakat" ? { zakat_reminder: next } : {}) };
      const { error } = await createClient().from("user_preferences").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      onSuccess(
        (next ? t("settingsToggleEnabled") : t("settingsToggleDisabled"))
          .replace("{label}", settings.label)
          .replace("{suffix}", settings.suffix),
      );
      router.refresh();
    } catch (caught) {
      settings.set(previous);
      const missingColumn = caught instanceof Error && /compliance_alerts_enabled|halal_change_alert|purification_alert|weekly_compliance_report/.test(caught.message);
      onError(missingColumn ? t("settingsMigrationRequired") : t("settingsSaveSettingFailed"));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title={t("notificationsTitle")}
        description={t("notificationsDescription")}
      />
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-5 rounded-xl border border-white/[0.05] border-l-2 border-l-[#c9a84c] bg-[#151b18] p-5">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              {t("settingsPortfolioClosingReport")}
              {dailyEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-halal-compliant/10 px-2.5 py-0.5 text-[10px] font-semibold text-halal-compliant">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("settingsActive")}
                </span>
              )}
            </p>
            <p className="mt-2 text-sm leading-5 text-[#a9a291]">
              {t("settingsPortfolioClosingReportDesc")}
            </p>
          </div>
          <Switch
            label={t("settingsPortfolioClosingReport")}
            checked={dailyEnabled}
            disabled={saving === "daily"}
            onChange={(checked) => void toggleDailySummary(checked)}
          />
        </div>

        <NotificationToggleCard
          label={t("settingsPriceAlerts")}
          description={t("settingsPriceAlertsDesc")}
          checked={priceEnabled}
          disabled={saving === "price"}
          onChange={(checked) => void togglePreference("price", checked)}
        />

        <NotificationToggleCard
          label={t("settingsComplianceAlerts")}
          description={t("settingsComplianceAlertsDesc")}
          checked={halalEnabled}
          disabled={saving === "halal"}
          onChange={(checked) => void togglePreference("halal", checked)}
        />

        <NotificationToggleCard
          label={t("settingsPurificationAlerts")}
          description={t("settingsPurificationAlertsDesc")}
          checked={purificationEnabled}
          disabled={saving === "purification"}
          onChange={(checked) => void togglePreference("purification", checked)}
        />

        <NotificationToggleCard
          label={t("settingsWeeklyComplianceReport")}
          description={t("settingsWeeklyComplianceReportDesc")}
          checked={weeklyEnabled}
          disabled={saving === "weekly"}
          onChange={(checked) => void togglePreference("weekly", checked)}
        />

        <NotificationToggleCard
          label={t("settingsAnnualZakatReminder")}
          description={
            hasZakatProfile
              ? t("settingsAnnualZakatReminderDesc")
              : t("settingsAnnualZakatReminderNoProfile")
          }
          checked={zakatEnabled}
          disabled={saving === "zakat"}
          onChange={(checked) => void togglePreference("zakat", checked)}
          href={!hasZakatProfile ? "/zakat" : undefined}
        />

        {upcomingNotifications.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-5 rounded-xl border border-white/[0.05] bg-[#151b18] p-5 opacity-60"
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-[#a9a291]">
                {item.label}
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8f8878]">
                  {t("settingsComingSoon")}
                </span>
              </p>
              <p className="mt-2 text-sm leading-5 text-[#8f8878]">
                {item.description}
              </p>
            </div>
            <Switch label={item.label} checked={false} disabled onChange={() => {}} />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function NotificationToggleCard({
  label,
  description,
  checked,
  disabled,
  onChange,
  href,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  href?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-start justify-between gap-5 rounded-xl border border-white/[0.05] bg-[#151b18] p-5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {label}
          {checked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-halal-compliant/10 px-2.5 py-0.5 text-[10px] font-semibold text-halal-compliant">
              <CheckCircle2 className="h-3 w-3" /> {t("settingsActive")}
            </span>
          )}
        </p>
        <p className="mt-2 text-sm leading-5 text-[#a9a291]">{description}</p>
        {href && (
          <Link href={href} className="mt-2 inline-block text-xs font-semibold text-[#e6c364] hover:underline">
            {t("settingsConfigureZakatProfile")}
          </Link>
        )}
      </div>
      <Switch label={label} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------ Sécurité -- */

function SecuritySection({
  email,
  createdAt,
  onSuccess,
  onError,
  onSignOut,
}: {
  email: string;
  createdAt: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onSignOut: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!currentPassword) {
      onError(t("settingsEnterCurrentPassword"));
      return;
    }
    if (password.length < 8) {
      onError(t("settingsPasswordMinLength"));
      return;
    }
    if (password !== confirmation) {
      onError(t("settingsPasswordsMismatch"));
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) throw signInError;
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setCurrentPassword("");
      setConfirmation("");
      onSuccess(t("settingsPasswordUpdated"));
    } catch {
      onError(t("settingsPasswordUpdateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title={t("password")}
          description={t("settingsPasswordHint")}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("settingsCurrentPassword")}><FormInput type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" /></Field>
          <Field label={t("settingsNewPassword")}>
            <FormInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          <Field label={t("settingsConfirmPassword")}>
            <FormInput
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
        </div>
        <div className="mt-7 flex justify-end">
          <Button
            type="button"
            size="lg"
            disabled={saving}
            onClick={() => void handleSave()}
            className="font-bold"
          >
            {saving ? t("saving") : t("settingsUpdatePassword")}
          </Button>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title={t("settingsSessionAccess")}
          description={t("securityDescription")}
        />
          <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-[#151b18] p-5">
            <span className="flex items-center gap-3 text-sm">
              <Monitor className="h-5 w-5 text-[#c9a84c]" />
              {t("settingsSessionActive")}
              <span className="text-[#a9a291]">
                {t("settingsAccountCreatedOn").replace("{date}", formatDate(createdAt))}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#344038] px-4 text-sm font-semibold text-[#a9a291] hover:bg-white/5 hover:text-[#ffffff]"
            >
              <LogOut className="h-4 w-4" />
              {t("signOut")}
            </button>
          <button type="button" onClick={async () => { const { error } = await createClient().auth.signOut({ scope: "others" }); if (error) onError(t("settingsSignOutOthersFailed")); else onSuccess(t("settingsSignOutOthersSuccess")); }} className="inline-flex h-10 items-center justify-center rounded-lg border border-[#344038] px-4 text-sm font-semibold text-[#a9a291] hover:bg-white/5">{t("settingsSignOutAllOthers")}</button>
          </div>
          <TwoFactorSetup onSuccess={onSuccess} onError={onError} />
        </div>
      </Panel>
    </>
  );
}

function TwoFactorSetup({
  onSuccess,
  onError,
}: {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t } = useI18n();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<{ id: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void createClient().auth.mfa.listFactors().then(({ data }) => {
      setFactorId(data?.totp.find((factor) => factor.status === "verified")?.id ?? null);
      setLoaded(true);
    });
  }, []);

  async function startEnrollment() {
    setBusy(true);
    try {
      const supabase = createClient();
      // Abandoned enrollments stay as unverified factors and would block a new one.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const factor of existing?.all ?? []) {
        if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Halisia ${new Date().toISOString().slice(0, 10)}` });
      if (error || !data) throw error ?? new Error();
      setEnrollment({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch {
      onError(t("settingsTwoFactorStartFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    if (!enrollment) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrollment.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return onError(t("settingsTwoFactorInvalidCode"));
    setFactorId(enrollment.id);
    setEnrollment(null);
    setCode("");
    onSuccess(t("settingsTwoFactorEnabledSuccess"));
  }

  async function disable() {
    if (!factorId) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return onError(t("settingsTwoFactorDisableFailed"));
    setFactorId(null);
    onSuccess(t("settingsTwoFactorDisabledSuccess"));
  }

  return (
    <div className="rounded-xl border border-white/[0.05] bg-[#151b18] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="flex items-center gap-3 text-sm">
          <ShieldCheck className={`h-5 w-5 ${factorId ? "text-halal-compliant" : "text-[#a9a291]"}`} />
          {t("settingsTwoFactor")}
          <span className="text-[#a9a291]">— {!loaded ? "…" : factorId ? t("settingsTwoFactorEnabled") : t("settingsTwoFactorDisabled")}</span>
        </span>
        {loaded && !enrollment && (
          factorId ? (
            <button type="button" disabled={busy} onClick={() => void disable()} className="inline-flex h-10 items-center justify-center rounded-lg border border-[#344038] px-4 text-sm font-semibold text-[#a9a291] hover:bg-white/5 disabled:opacity-60">
              {t("settingsTwoFactorDisable")}
            </button>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void startEnrollment()} className="h-10 font-bold">
              {t("settingsTwoFactorEnable")}
            </Button>
          )
        )}
      </div>
      {enrollment && (
        <div className="mt-5 grid gap-5 border-t border-white/[0.05] pt-5 sm:grid-cols-[180px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR code as an SVG data URL */}
          <img src={enrollment.qrCode} alt={t("settingsTwoFactorQrAlt")} className="h-44 w-44 rounded-lg bg-white p-2" />
          <div className="space-y-3 text-sm text-[#a9a291]">
            <p>{t("settingsTwoFactorScanHint")}</p>
            <p className="break-all text-xs">{t("settingsTwoFactorManualKey")} <code className="text-[#e6c364]">{enrollment.secret}</code></p>
            <div className="flex flex-wrap gap-3">
              <FormInput value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={7} className="max-w-[160px]" />
              <Button type="button" disabled={busy || code.replace(/\s/g, "").length !== 6} onClick={() => void confirmEnrollment()} className="h-12 font-bold">{t("confirmButton")}</Button>
              <button type="button" onClick={() => { setEnrollment(null); setCode(""); }} className="text-sm text-[#a9a291] hover:text-white">{t("cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- Préférences -- */

function PreferencesSection({
  initial,
  onSuccess,
  onError,
}: {
  initial: PreferenceSettings;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t, setLanguage } = useI18n();
  const [values, setValues] = useState(initial);
  const [bitcoin, setBitcoin] = useState(initial.bitcoinZakatable);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t("sessionExpired"));
      const { error } = await supabase.from("user_preferences").upsert({ user_id: user.id, currency: values.currency, language: values.language, nisab_type: values.nisabType, fiscal_year_start: values.fiscalYearStart, bitcoin_zakatable: bitcoin, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      const { error: metadataError } = await supabase.auth.updateUser({ data: { preferences: { currency: values.currency, madhhab: values.nisabType === "silver" ? "hanafi" : "aaoifi" } } });
      if (metadataError) throw metadataError;
      setLanguage(values.language);
      onSuccess(t("preferencesUpdated"));
    } catch {
      onError(t("settingsSavePreferencesFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title={t("preferences")}
        description={t("settingsPreferencesDescription")}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("displayCurrency")} hint={t("settingsCurrencyHint")}><select value={values.currency} onChange={(event) => setValues((current) => ({ ...current, currency: event.target.value as PreferenceSettings["currency"] }))} className="h-12 w-full rounded-lg border border-[#344038] bg-[#151b18] px-4 text-sm outline-none focus:border-[#c9a84c]"><option value="EUR">EUR — Euro €</option><option value="USD">USD — Dollar $</option><option value="GBP">GBP — Pound £</option><option value="MAD">MAD — Moroccan dirham</option><option value="DZD">DZD — Algerian dinar</option><option value="TND">TND — Tunisian dinar</option></select></Field>
        <Field label={t("language")} hint={t("languageHint")}><select value={values.language} onChange={(event) => setValues((current) => ({ ...current, language: event.target.value as PreferenceSettings["language"] }))} className="h-12 w-full rounded-lg border border-[#344038] bg-[#151b18] px-4 text-sm outline-none focus:border-[#c9a84c]"><option value="fr">Français</option><option value="en">English</option></select></Field>
        <Field label={t("settingsNisabCalculation")} hint={t("settingsNisabHint")}><div className="space-y-3 rounded-lg border border-[#344038] bg-[#151b18] p-3 text-sm"><label className="flex items-center gap-3"><input type="radio" checked={values.nisabType === "gold"} onChange={() => setValues((current) => ({ ...current, nisabType: "gold" }))} />{t("settingsNisabGold")}</label><label className="flex items-center gap-3"><input type="radio" checked={values.nisabType === "silver"} onChange={() => setValues((current) => ({ ...current, nisabType: "silver" }))} />{t("settingsNisabSilver")}</label></div></Field>
        <Field label={t("settingsFiscalYearStart")}><select value={values.fiscalYearStart} onChange={(event) => setValues((current) => ({ ...current, fiscalYearStart: event.target.value as PreferenceSettings["fiscalYearStart"] }))} className="h-12 w-full rounded-lg border border-[#344038] bg-[#151b18] px-4 text-sm outline-none focus:border-[#c9a84c]"><option value="january">{t("settingsJanuary")}</option><option value="july">{t("settingsJuly")}</option></select></Field>
      </div>
      <div className="mt-6 flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#151b18] p-5"><div><p className="font-semibold">{t("settingsIncludeBitcoinZakat")}</p><p className="mt-1 text-sm text-[#a9a291]">{t("settingsBitcoinZakatHint")}</p></div><Switch label={t("settingsIncludeBitcoinZakat")} checked={bitcoin} onChange={setBitcoin} /></div>
      <div className="mt-7 flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={saving}
          onClick={() => void handleSave()}
          className="font-bold"
        >
          {saving ? t("saving") : t("saveChanges")}
        </Button>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------- Briques -- */

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-6 sm:p-8">
      {children}
    </section>
  );
}

function PanelHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-[#a9a291]">{description}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm text-[rgba(255,255,255,0.6)]">{label}</span>
      <span className="mt-2 block">{children}</span>
      {hint && <span className="mt-2 block text-xs text-[#8f8878]">{hint}</span>}
    </label>
  );
}

function FormInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={`h-12 rounded-lg border-[#344038] bg-[#151b18] px-4 focus-visible:ring-0 focus-visible:border-[#c9a84c] ${className ?? ""}`}
      {...props}
    />
  );
}

function Switch({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
        checked ? "bg-[#c9a84c]" : "bg-[#3a403b]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFmt.format(date);
}

async function downscaleImage(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read error"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new window.Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("decode error"));
    element.src = dataUrl;
  });
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas unavailable");
  const side = Math.min(image.width, image.height);
  context.drawImage(
    image,
    (image.width - side) / 2,
    (image.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  return canvas.toDataURL("image/jpeg", 0.8);
}
