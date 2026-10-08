"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Bitcoin,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleMinus,
  CircleX,
  Gem,
  Loader2,
  Scale,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";

export type ZakatWizardValues = {
  startDate: string;
  cash: number;
  goldGrams: number;
  silverGrams: number;
  debts: number;
  includeBitcoin: boolean;
  includeIncome: boolean;
  salary: number;
  otherIncome: number;
};
const initialValues: ZakatWizardValues = {
  startDate: "",
  cash: 0,
  goldGrams: 0,
  silverGrams: 0,
  debts: 0,
  includeBitcoin: true,
  includeIncome: true,
  salary: 0,
  otherIncome: 0,
};

export function ZakatCalculatorWizard({
  open,
  onOpenChange,
  defaultStartDate,
  initialIncludeBitcoin,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStartDate?: string;
  initialIncludeBitcoin: boolean;
  onComplete: (values: ZakatWizardValues) => void;
}) {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<ZakatWizardValues>(initialValues);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  useEffect(() => {
    if (open) {
      setStep(1);
      setError("");
      setFinishing(false);
      setValues({
        ...initialValues,
        startDate: defaultStartDate ?? "",
        includeBitcoin: initialIncludeBitcoin,
      });
    }
  }, [defaultStartDate, initialIncludeBitcoin, open]);
  function update<K extends keyof ZakatWizardValues>(
    key: K,
    value: ZakatWizardValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setError("");
  }
  function next() {
    if (step === 1 && !values.startDate) {
      setError(t("dateRequiredOrImport"));
      return;
    }
    if (step < 4) setStep((current) => current + 1);
  }
  function skip() {
    if (step === 1)
      update(
        "startDate",
        defaultStartDate ?? new Date().toISOString().slice(0, 10),
      );
    if (step === 2)
      setValues((current) => ({
        ...current,
        cash: 0,
        goldGrams: 0,
        silverGrams: 0,
        debts: 0,
      }));
    if (step === 3) update("includeBitcoin", false);
    if (step === 4)
      setValues((current) => ({
        ...current,
        includeIncome: false,
        salary: 0,
        otherIncome: 0,
      }));
    if (step < 4) setStep((current) => current + 1);
    else finish({ ...values, includeIncome: false, salary: 0, otherIncome: 0 });
  }
  function finish(finalValues = values) {
    setFinishing(true);
    window.setTimeout(() => {
      onComplete(finalValues);
      setFinishing(false);
      onOpenChange(false);
    }, 1100);
  }
  const progress = step * 25;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !finishing && onOpenChange(next)}
    >
      <DialogContent className="min-h-screen border-white/[0.05] bg-[#111412] p-0 text-[#ffffff] sm:min-h-0 sm:max-w-[600px] sm:rounded-2xl">
        <DialogTitle className="sr-only">{t("zakatSetup")}</DialogTitle>
        {finishing ? (
          <div className="flex min-h-[560px] flex-col items-center justify-center px-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#c9a84c] text-[#111412] shadow-[0_0_35px_rgba(213,179,79,.25)]">
              <Check className="h-10 w-10" />
            </span>
            <h2 className="mt-10 text-3xl font-bold">{t("zakatReady")}</h2>
            <p className="mt-5 text-[#a9a291]">{t("recalculatingZakat")}</p>
            <Loader2 className="mt-8 h-7 w-7 animate-spin text-[#c9a84c]" />
          </div>
        ) : (
          <div className="flex min-h-screen flex-col p-6 sm:min-h-[600px] sm:p-9">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[rgba(255,255,255,0.6)]">
              <span>
                {t("stepOf")} {step} {t("stepOfTotal").replace("{total}", "4")}
              </span>
              <span className="text-[#c9a84c]">{progress} %</span>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-[#292d29]">
              <div
                className="h-full rounded-full bg-[#c9a84c] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex flex-1 flex-col">
              {step === 1 && (
                <StepOne
                  values={values}
                  update={update}
                  defaultStartDate={defaultStartDate}
                  locale={locale}
                />
              )}
              {step === 2 && <StepTwo values={values} update={update} />}
              {step === 3 && <StepThree values={values} update={update} />}
              {step === 4 && <StepFour values={values} update={update} locale={locale} />}
              {error && (
                <p className="mt-4 text-sm text-halal-nonCompliant">{error}</p>
              )}
              <div className="mt-auto pt-8">
                <Button
                  size="lg"
                  onClick={() => (step === 4 ? finish() : next())}
                  className="h-14 w-full gap-3 text-base font-bold"
                >
                  {step === 4 ? t("finish") : t("continue")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <button
                  type="button"
                  onClick={skip}
                  className="mt-4 w-full py-2 text-sm text-[#a9a291] underline-offset-4 hover:text-[#e6c364] hover:underline"
                >
                  {t("skipStep")}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepOne({
  values,
  update,
  defaultStartDate,
  locale,
}: StepProps & { defaultStartDate?: string; locale: string }) {
  const { t } = useI18n();
  const importedDate = defaultStartDate?.slice(0, 10) ?? "";
  const importedDateLabel = importedDate
    ? new Intl.DateTimeFormat(locale).format(
        new Date(`${importedDate}T12:00:00`),
      )
    : "";
  const usesImportedDate = Boolean(
    importedDate && values.startDate === importedDate,
  );

  return (
    <div className="pt-10 text-center">
      <CalendarDays className="mx-auto h-10 w-10 text-[#c9a84c]" />
      <h2 className="mt-5 text-3xl font-bold">
        {t("zakatWizardStep1Title")}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#a9a291]">
        {t("zakatWizardStep1Subtitle")}
      </p>
      <label className="mt-9 block text-left">
        <span className="text-sm text-[rgba(255,255,255,0.6)]">
          {t("nisabExceededSinceDate")}
        </span>
        <div className="relative mt-2">
          <CalendarDays className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#a9a291]" />
          <Input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={values.startDate}
            onChange={(event) => update("startDate", event.target.value)}
            className="h-12 border-[#344038] bg-[#151b18] pl-12 [color-scheme:dark]"
          />
        </div>
      </label>
      {importedDate && (
        <>
          <button
            type="button"
            aria-pressed={usesImportedDate}
            onClick={() => update("startDate", importedDate)}
            className={`mt-5 inline-flex min-h-10 items-center justify-center rounded-lg border px-4 text-sm transition-colors ${usesImportedDate ? "border-[#8c762e] bg-[#c9a84c]/10 text-[#e6c364]" : "border-transparent text-[#a9a291] hover:border-[#8c762e] hover:text-[#e6c364]"}`}
          >
            {usesImportedDate
              ? t("firstImportUsed").replace("{date}", importedDateLabel)
              : t("useFirstImport").replace("{date}", importedDateLabel)}
          </button>
          {usesImportedDate && (
            <p className="mt-2 text-xs text-[#a9a291]">
              {t("firstImportHawlHint")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
function StepTwo({ values, update }: StepProps) {
  const { t } = useI18n();
  return (
    <div className="pt-9">
      <h2 className="text-3xl font-bold">
        {t("zakatWizardStep2Title")}
      </h2>
      <p className="mt-3 text-sm text-[#a9a291]">
        {t("zakatWizardStep2Subtitle")}
      </p>
      <div className="mt-7 space-y-4">
        <NumberField
          label={t("cashBankAccount")}
          icon={WalletCards}
          value={values.cash}
          onChange={(value) => update("cash", value)}
        />
        <NumberField
          label={t("physicalGoldGrams")}
          icon={Gem}
          value={values.goldGrams}
          onChange={(value) => update("goldGrams", value)}
        />
        <NumberField
          label={t("physicalSilverGrams")}
          icon={Scale}
          value={values.silverGrams}
          onChange={(value) => update("silverGrams", value)}
        />
        <NumberField
          label={t("debtsToDeduct")}
          icon={CircleMinus}
          value={values.debts}
          onChange={(value) => update("debts", value)}
        />
      </div>
    </div>
  );
}
function StepThree({ values, update }: StepProps) {
  const { t } = useI18n();
  return (
    <div className="pt-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#8c762e] bg-[#c9a84c]/10">
        <Bitcoin className="h-7 w-7 text-[#c9a84c]" />
      </span>
      <h2 className="mt-6 text-3xl font-bold">{t("bitcoinPositionTitle")}</h2>
      <p className="mt-3 text-sm text-[#a9a291]">
        {t("bitcoinPositionSubtitle")}
      </p>
      <div className="mt-10 grid grid-cols-2 gap-4">
        <Choice
          active={values.includeBitcoin}
          onClick={() => update("includeBitcoin", true)}
          icon={CheckCircle2}
        >
          {t("includeBitcoinInZakat")}
        </Choice>
        <Choice
          active={!values.includeBitcoin}
          onClick={() => update("includeBitcoin", false)}
          icon={CircleX}
        >
          {t("excludeBitcoinFromZakat")}
        </Choice>
      </div>
    </div>
  );
}
function StepFour({ values, update, locale }: StepProps & { locale: string }) {
  const { t } = useI18n();
  const income = values.includeIncome ? values.salary + values.otherIncome : 0;
  return (
    <div className="pt-10 text-center">
      <Banknote className="mx-auto h-10 w-10 text-[#c9a84c]" />
      <h2 className="mt-5 text-3xl font-bold">
        {t("includeIncomeTitle")}
      </h2>
      <p className="mt-3 text-sm text-[#a9a291]">
        {t("includeIncomeSubtitle")}
      </p>
      <div className="mt-8 flex items-center justify-between rounded-lg border border-[#344038] bg-[#151b18] p-4 text-left">
        <span>{t("includeIncomeInCalculation")}</span>
        <button
          type="button"
          role="switch"
          aria-checked={values.includeIncome}
          onClick={() => update("includeIncome", !values.includeIncome)}
          className={`relative h-6 w-11 rounded-full ${values.includeIncome ? "bg-[#c9a84c]" : "bg-[#3a403b]"}`}
        >
          <span
            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${values.includeIncome ? "left-6" : "left-1"}`}
          />
        </button>
      </div>
      {values.includeIncome && (
        <div className="mt-6 space-y-4 text-left">
          <NumberField
            label={t("annualNetSalary")}
            icon={Banknote}
            value={values.salary}
            onChange={(value) => update("salary", value)}
          />
          <NumberField
            label={t("otherIncomeSources")}
            icon={WalletCards}
            value={values.otherIncome}
            onChange={(value) => update("otherIncome", value)}
          />
        </div>
      )}
      <div className="mt-7 flex items-center justify-between border-t border-[#344038] pt-5">
        <span className="text-[#a9a291]">{t("incomeToInclude")}</span>
        <strong className="text-2xl text-[#c9a84c]">
          {new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "EUR",
          }).format(income)}
        </strong>
      </div>
    </div>
  );
}

type StepProps = {
  values: ZakatWizardValues;
  update: <K extends keyof ZakatWizardValues>(
    key: K,
    value: ZakatWizardValues[K],
  ) => void;
};
function NumberField({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  icon: typeof WalletCards;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-left">
      <span className="text-sm text-[rgba(255,255,255,0.6)]">{label}</span>
      <div className="relative mt-2">
        <Icon className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#a9a291]" />
        <Input
          type="number"
          min="0"
          step="any"
          value={value || ""}
          placeholder="0"
          onChange={(event) =>
            onChange(Math.max(0, Number(event.target.value) || 0))
          }
          className="h-12 border-[#344038] bg-[#151b18] pl-12"
        />
      </div>
    </label>
  );
}
function Choice({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CheckCircle2;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-36 flex-col items-center justify-center gap-4 rounded-lg border p-5 text-base font-semibold transition-colors ${active ? "border-[#c9a84c] bg-[#c9a84c]/10 text-[#e6c364]" : "border-[#344038] bg-[#151b18] text-[rgba(255,255,255,0.6)] hover:border-[#8c762e]"}`}
    >
      <Icon className="h-7 w-7" />
      <span>{children}</span>
    </button>
  );
}
