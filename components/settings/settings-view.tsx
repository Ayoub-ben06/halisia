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

export type PreferenceSettings = {
  language: "fr" | "en" | "ar";
  currency: "EUR" | "USD" | "GBP";
  madhhab: "aaoifi" | "hanafi" | "shafii";
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
  annualZakatReminderEnabled: boolean;
  zakatPaymentDate: string | null;
  preferences: PreferenceSettings;
  zakat: ZakatProfile;
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
  const router = useRouter();
  const [section, setSection] = useState<SectionId>(initialSection);
  const [toast, setToast] = useState("");
  const [errorToast, setErrorToast] = useState("");

  // Retour du lien « Se désabonner » présent dans l'email quotidien.
  useEffect(() => {
    if (unsubscribeStatus === "ok") setToast("Rapport de clôture désactivé");
    else if (unsubscribeStatus) setErrorToast("Ce lien de désabonnement n’est plus valide");
  }, [unsubscribeStatus]);

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
        <h1 className="text-3xl font-bold">Paramètres</h1>
        <p className="mt-2 text-sm text-[#a9a291]">
          Gérez votre compte, vos préférences et votre profil Zakat.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="Sections des paramètres"
          className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.05] bg-[#1a1c1a] p-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1 lg:p-3"
        >
          {sections.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSection(id);
                  window.history.replaceState(null, "", `/settings/${id}`);
                }}
                aria-current={active ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl border-l-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-l-[#c9a84c] bg-[#c9a84c]/10 text-[#e6c364]"
                    : "border-l-transparent text-[#a9a291] hover:bg-white/5 hover:text-[#ffffff]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
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
          {section === "abonnement" && <SubscriptionSection />}
          {section === "notifications" && (
            <NotificationsSection
              userId={profile.userId}
              initialDailySummaryEnabled={profile.dailySummaryEnabled}
              initialPriceAlertsEnabled={profile.priceAlertsEnabled}
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
      const { error } = await createClient().auth.updateUser({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl,
        },
      });
      if (error) throw error;
      onSuccess("Informations enregistrées");
      router.refresh();
    } catch {
      onError("Impossible d’enregistrer vos informations");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError("Choisissez un fichier image");
      return;
    }
    try {
      setAvatarUrl(await downscaleImage(file));
      onSuccess("Photo prête — enregistrez pour la conserver");
    } catch {
      onError("Impossible de lire cette image");
    }
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="Informations personnelles"
          description="Mettez à jour vos informations de contact et votre identité."
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
              Photo de profil du compte Halisia
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
              Modifier la photo
            </button>
          </div>
        </div>

        <div className="grid gap-5 pt-7 sm:grid-cols-2">
          <Field label="Prénom">
            <FormInput
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Prénom"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Nom">
            <FormInput
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Nom"
              autoComplete="family-name"
            />
          </Field>
          <Field
            label="Email"
            hint="Non modifiable sans vérification sécurisée préalable."
          >
            <FormInput
              value={profile.email}
              disabled
              readOnly
              className="text-[#a9a291]"
            />
          </Field>
          <Field label="Téléphone (optionnel)">
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
            {saving ? "Enregistrement…" : "Sauvegarder les modifications"}
          </Button>
        </div>
      </Panel>

      <ZakatProfileCard zakat={profile.zakat} />

      <section className="rounded-2xl border border-white/[0.05] border-l-2 border-l-halal-nonCompliant bg-[#1a1c1a] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-bold text-halal-nonCompliant">
              <TriangleAlert className="h-4 w-4" />
              Zone de danger
            </p>
            <p className="mt-2 max-w-lg text-sm leading-6 text-[#a9a291]">
              La suppression de votre compte est irréversible. Toutes vos
              données seront effacées.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg border border-halal-nonCompliant/50 px-5 text-sm font-semibold text-halal-nonCompliant transition-colors hover:bg-halal-nonCompliant/10"
          >
            Supprimer mon compte
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
            {zakat
              ? "Votre profil Zakat est configuré"
              : "Votre profil Zakat n’est pas configuré"}
          </span>
          <p className="mt-3 text-lg font-bold">
            Configuration Zakat &amp; Purification
          </p>
          <p className="mt-2 text-sm text-[#a9a291]">
            {zakat ? (
              <>
                Hawl depuis :{" "}
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
                  {zakat.includeBitcoin ? "inclus" : "exclu"}
                </span>{" "}
                • Revenus :{" "}
                <span
                  className={
                    zakat.includeIncome
                      ? "text-halal-compliant"
                      : "text-[#8f8878]"
                  }
                >
                  {zakat.includeIncome ? "inclus" : "exclus"}
                </span>
              </>
            ) : (
              "Renseignez votre Hawl et vos choix de jurisprudence pour affiner le calcul."
            )}
          </p>
        </div>
        <Link
          href="/zakat"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#9a8035] px-5 text-sm font-semibold text-[#e6c364] transition-colors hover:bg-[#c9a84c]/10"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {zakat ? "Modifier mon profil Zakat" : "Configurer mon profil Zakat"}
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
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

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
      onError("La suppression du compte a échoué");
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
          Supprimer mon compte
        </DialogTitle>
        <DialogDescription className="mt-3 text-sm leading-6 text-[#a9a291]">
          Cette action est irréversible. Votre portefeuille, votre watchlist et
          votre historique seront définitivement effacés.
        </DialogDescription>
        <label className="mt-6 block">
          <span className="text-sm text-[rgba(255,255,255,0.6)]">
            Tapez <strong className="text-[#ffffff]">SUPPRIMER</strong> pour
            confirmer
          </span>
          <FormInput
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="SUPPRIMER"
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
            Annuler
          </button>
          <button
            type="button"
            disabled={confirmation !== "SUPPRIMER" || deleting}
            onClick={() => void handleDelete()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-halal-nonCompliant px-5 text-sm font-bold text-[#ffffff] transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {deleting ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------- Abonnement -- */

const planFeatures = [
  "Screening Shariah des actions de 15 marchés",
  "Calcul de la Zakat et purification des dividendes",
  "Watchlist et alertes de conformité",
  "Historique et export du portefeuille",
];

function SubscriptionSection() {
  return (
    <Panel>
      <PanelHeader
        title="Votre formule"
        description="Halisia est gratuit pendant la phase de lancement."
      />
      <div className="rounded-xl border border-[#9a8035]/40 bg-[#c9a84c]/[0.07] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c9a84c]/10 px-3 py-1 text-xs font-semibold text-[#e6c364]">
              <Sparkles className="h-3.5 w-3.5" />
              Formule active
            </span>
            <p className="mt-3 text-2xl font-bold text-[#e6c364]">
              Accès lancement
            </p>
            <p className="mt-1 text-sm text-[#a9a291]">
              Toutes les fonctionnalités incluses • Aucun moyen de paiement enregistré
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
        L’offre Premium ouvrira prochainement. Vous serez prévenu à l’avance et aucune somme ne sera prélevée sans votre accord.{" "}
        <Link href="/tarifs" className="font-semibold text-[#e6c364] hover:underline">Voir les tarifs prévus</Link>
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------- Notifications -- */

const upcomingNotifications = [
  {
    label: "Alertes de conformité",
    description:
      "Recevez un email dès qu’un actif de votre portefeuille change de statut Shariah.",
  },
  {
    label: "Rapport mensuel",
    description:
      "Une synthèse mensuelle de la performance et de la conformité de votre portefeuille.",
  },
  {
    label: "Newsletter Halisia",
    description:
      "Analyses et actualités de la finance islamique, deux fois par mois.",
  },
];

function NotificationsSection({
  userId,
  initialDailySummaryEnabled,
  initialPriceAlertsEnabled,
  initialAnnualZakatReminderEnabled,
  hasZakatProfile,
  onSuccess,
  onError,
}: {
  userId: string;
  initialDailySummaryEnabled: boolean;
  initialPriceAlertsEnabled: boolean;
  initialAnnualZakatReminderEnabled: boolean;
  hasZakatProfile: boolean;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [dailyEnabled, setDailyEnabled] = useState(initialDailySummaryEnabled);
  const [priceEnabled, setPriceEnabled] = useState(initialPriceAlertsEnabled);
  const [zakatEnabled, setZakatEnabled] = useState(
    initialAnnualZakatReminderEnabled,
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
      onSuccess(
        next
          ? "Rapport de clôture activé ✅ — vous recevrez un email à la clôture du marché"
          : "Rapport de clôture désactivé",
      );
    } catch {
      setDailyEnabled(previous);
      onError("Impossible d’enregistrer ce réglage");
    } finally {
      setSaving(null);
    }
  }

  async function togglePreference(
    kind: "price" | "zakat",
    next: boolean,
  ) {
    const isZakat = kind === "zakat";
    if (isZakat && next && !hasZakatProfile) {
      onError("Configurez d’abord votre profil Zakat pour définir la date du Hawl");
      return;
    }

    const previous = isZakat ? zakatEnabled : priceEnabled;
    if (isZakat) setZakatEnabled(next);
    else setPriceEnabled(next);
    setSaving(kind);

    const values = isZakat
      ? { user_id: userId, annual_zakat_reminder_enabled: next }
      : { user_id: userId, price_alerts_enabled: next };

    try {
      const { error } = await createClient()
        .from("user_preferences")
        .upsert(values, { onConflict: "user_id" });
      if (error) throw error;
      onSuccess(
        `${isZakat ? "Rappel Zakat annuel" : "Alertes de prix"} ${
          next ? "activé" : "désactivé"
        }${next ? " ✅" : ""}`,
      );
    } catch {
      if (isZakat) setZakatEnabled(previous);
      else setPriceEnabled(previous);
      onError("Impossible d’enregistrer ce réglage");
    } finally {
      setSaving(null);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Notifications"
        description="Choisissez les informations que Halisia vous envoie par email."
      />
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-5 rounded-xl border border-white/[0.05] border-l-2 border-l-[#c9a84c] bg-[#151b18] p-5">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              Rapport de clôture du portefeuille
              {dailyEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-halal-compliant/10 px-2.5 py-0.5 text-[10px] font-semibold text-halal-compliant">
                  <CheckCircle2 className="h-3 w-3" />
                  Actif
                </span>
              )}
            </p>
            <p className="mt-2 text-sm leading-5 text-[#a9a291]">
              Un email à la clôture du marché : valeur de votre patrimoine,
              performance du jour, score de conformité et Zakat estimée.
            </p>
          </div>
          <Switch
            label="Rapport de clôture du portefeuille"
            checked={dailyEnabled}
            disabled={saving === "daily"}
            onChange={(checked) => void toggleDailySummary(checked)}
          />
        </div>

        <NotificationToggleCard
          label="Alertes de prix"
          description="Soyez notifié lorsqu’un objectif de prix défini dans votre watchlist est atteint. Une alerte déclenchée est ensuite désactivée."
          checked={priceEnabled}
          disabled={saving === "price"}
          onChange={(checked) => void togglePreference("price", checked)}
        />

        <NotificationToggleCard
          label="Rappel Zakat annuel"
          description={
            hasZakatProfile
              ? "Recevez un email 7 jours avant l’échéance annuelle de votre Hawl."
              : "Configurez votre profil Zakat pour définir la date de départ de votre Hawl."
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
                  Bientôt
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
  return (
    <div className="flex items-start justify-between gap-5 rounded-xl border border-white/[0.05] bg-[#151b18] p-5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {label}
          {checked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-halal-compliant/10 px-2.5 py-0.5 text-[10px] font-semibold text-halal-compliant">
              <CheckCircle2 className="h-3 w-3" /> Actif
            </span>
          )}
        </p>
        <p className="mt-2 text-sm leading-5 text-[#a9a291]">{description}</p>
        {href && (
          <Link href={href} className="mt-2 inline-block text-xs font-semibold text-[#e6c364] hover:underline">
            Configurer mon profil Zakat
          </Link>
        )}
      </div>
      <Switch label={label} checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------ Sécurité -- */

function SecuritySection({
  createdAt,
  onSuccess,
  onError,
  onSignOut,
}: {
  createdAt: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onSignOut: () => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (password.length < 8) {
      onError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    if (password !== confirmation) {
      onError("Les deux mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirmation("");
      onSuccess("Mot de passe mis à jour");
    } catch {
      onError("Impossible de modifier le mot de passe");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="Mot de passe"
          description="Utilisez un mot de passe unique d’au moins 8 caractères."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nouveau mot de passe">
            <FormInput
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmer le mot de passe">
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
            {saving ? "Enregistrement…" : "Mettre à jour le mot de passe"}
          </Button>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Session et accès"
          description="Contrôlez l’accès à votre compte Halisia."
        />
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-[#151b18] p-5">
            <span className="flex items-center gap-3 text-sm">
              <Monitor className="h-5 w-5 text-[#c9a84c]" />
              Session active sur cet appareil
              <span className="text-[#a9a291]">
                — compte créé le {formatDate(createdAt)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#344038] px-4 text-sm font-semibold text-[#a9a291] hover:bg-white/5 hover:text-[#ffffff]"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
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
      onError("Impossible d’activer la double authentification pour le moment");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    if (!enrollment) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrollment.id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (error) return onError("Code invalide, réessayez avec le code actuel");
    setFactorId(enrollment.id);
    setEnrollment(null);
    setCode("");
    onSuccess("Double authentification activée");
  }

  async function disable() {
    if (!factorId) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return onError("Impossible de désactiver la double authentification");
    setFactorId(null);
    onSuccess("Double authentification désactivée");
  }

  return (
    <div className="rounded-xl border border-white/[0.05] bg-[#151b18] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="flex items-center gap-3 text-sm">
          <ShieldCheck className={`h-5 w-5 ${factorId ? "text-halal-compliant" : "text-[#a9a291]"}`} />
          Authentification à deux facteurs
          <span className="text-[#a9a291]">— {!loaded ? "…" : factorId ? "activée" : "désactivée"}</span>
        </span>
        {loaded && !enrollment && (
          factorId ? (
            <button type="button" disabled={busy} onClick={() => void disable()} className="inline-flex h-10 items-center justify-center rounded-lg border border-[#344038] px-4 text-sm font-semibold text-[#a9a291] hover:bg-white/5 disabled:opacity-60">
              Désactiver
            </button>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void startEnrollment()} className="h-10 font-bold">
              Activer
            </Button>
          )
        )}
      </div>
      {enrollment && (
        <div className="mt-5 grid gap-5 border-t border-white/[0.05] pt-5 sm:grid-cols-[180px_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns the QR code as an SVG data URL */}
          <img src={enrollment.qrCode} alt="QR code à scanner avec votre application d’authentification" className="h-44 w-44 rounded-lg bg-white p-2" />
          <div className="space-y-3 text-sm text-[#a9a291]">
            <p>Scannez ce QR code avec Google Authenticator, 1Password, Authy ou une application équivalente, puis saisissez le code affiché.</p>
            <p className="break-all text-xs">Clé manuelle : <code className="text-[#e6c364]">{enrollment.secret}</code></p>
            <div className="flex flex-wrap gap-3">
              <FormInput value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={7} className="max-w-[160px]" />
              <Button type="button" disabled={busy || code.replace(/\s/g, "").length !== 6} onClick={() => void confirmEnrollment()} className="h-12 font-bold">Confirmer</Button>
              <button type="button" onClick={() => { setEnrollment(null); setCode(""); }} className="text-sm text-[#a9a291] hover:text-white">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- Préférences -- */

const preferenceFields: {
  key: keyof PreferenceSettings;
  label: string;
  hint: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
}[] = [
  {
    key: "language",
    label: "Langue de l’interface",
    hint: "Seul le français est disponible pour l’instant.",
    disabled: true,
    options: [{ value: "fr", label: "Français" }],
  },
  {
    key: "currency",
    label: "Devise d’affichage",
    hint: "Montants convertis au taux du jour dans le tableau de bord, le portefeuille et la Zakat.",
    options: [
      { value: "EUR", label: "Euro (€)" },
      { value: "USD", label: "Dollar US ($)" },
      { value: "GBP", label: "Livre sterling (£)" },
    ],
  },
  {
    key: "madhhab",
    label: "Nisab de la Zakat",
    hint: "Le screening des actions suit toujours la norme AAOIFI.",
    options: [
      { value: "aaoifi", label: "Or — 85 g (AAOIFI, majorité des écoles)" },
      { value: "hanafi", label: "Argent — 595 g (école hanafite)" },
    ],
  },
];

function PreferencesSection({
  initial,
  onSuccess,
  onError,
}: {
  initial: PreferenceSettings;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await createClient().auth.updateUser({
        data: { preferences: values },
      });
      if (error) throw error;
      onSuccess("Préférences enregistrées");
      router.refresh();
    } catch {
      onError("Impossible d’enregistrer vos préférences");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Préférences"
        description="Adaptez l’affichage et le référentiel de conformité de Halisia."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {preferenceFields.map((field) => (
          <Field key={field.key} label={field.label} hint={field.hint}>
            <select
              value={field.key === "language" ? "fr" : values[field.key]}
              disabled={field.disabled}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
              className="h-12 w-full appearance-none rounded-lg border border-[#344038] bg-[#151b18] px-4 text-sm outline-none focus:border-[#c9a84c] disabled:opacity-60"
            >
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        ))}
      </div>
      <div className="mt-7 flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={saving}
          onClick={() => void handleSave()}
          className="font-bold"
        >
          {saving ? "Enregistrement…" : "Sauvegarder les modifications"}
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
