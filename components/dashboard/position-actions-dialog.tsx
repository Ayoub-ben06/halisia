"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deletePosition,
  sellPosition,
  updatePosition,
  type PositionRef,
} from "@/lib/portfolio-mutations";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TranslationKey } from "@/lib/i18n";

export type PositionAction = "edit" | "sell" | "delete";
export type PositionActionTarget = PositionRef & {
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  unit?: string;
};

const today = () => new Date().toISOString().slice(0, 10);
function parse(value: string) {
  return Number(value.replace(/\s/g, "").replace(",", "."));
}
const titleKeys: Record<PositionAction, TranslationKey> = {
  edit: "editPosition",
  sell: "actionSell",
  delete: "deletePosition",
};

export function PositionActionsDialog({
  target,
  action,
  onClose,
}: {
  target: PositionActionTarget | null;
  action: PositionAction | null;
  onClose: () => void;
}) {
  const { language, t } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const router = useRouter();
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(today());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target || !action) return;
    setError("");
    setDate(today());
    setQuantity(
      action === "sell" ? String(target.quantity) : String(target.quantity),
    );
    setPrice(
      String(action === "sell" ? target.currentPrice : target.averagePrice),
    );
  }, [target, action]);

  async function submit() {
    if (!target || !action) return;
    setSubmitting(true);
    setError("");
    try {
      if (action === "delete") await deletePosition(target);
      else {
        const qty = parse(quantity);
        const unitPrice = parse(price);
        if (!Number.isFinite(qty) || qty <= 0)
          throw new Error(t("quantityPositive"));
        if (!Number.isFinite(unitPrice) || unitPrice <= 0)
          throw new Error(t("pricePositive"));
        if (action === "edit") await updatePosition(target, qty, unitPrice);
        else {
          if (qty > target.quantity + 1e-9)
            throw new Error(t("soldQuantityTooHigh"));
          if (!date || date > today()) throw new Error(t("saleDateFuture"));
          await sellPosition(
            target,
            target.quantity,
            target.averagePrice,
            qty,
            unitPrice,
            date,
          );
        }
      }
      onClose();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  const open = Boolean(target && action);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent className="border-white/[0.05] bg-[#111412] p-6 text-[#ffffff] sm:max-w-[460px]">
        {target && action && (
          <>
            <DialogHeader>
              <DialogTitle>{t(titleKeys[action])}</DialogTitle>
              <DialogDescription>
                {target.name} ({target.ticker})
              </DialogDescription>
            </DialogHeader>
            {action === "delete" ? (
              <p className="mt-4 text-sm leading-6 text-[rgba(255,255,255,0.7)]">
                {t("deletePositionWarning")}
              </p>
            ) : (
              <div className="mt-5 grid gap-4">
                <label className="space-y-2 text-xs text-[rgba(255,255,255,0.6)]">
                  {action === "sell"
                    ? t("soldQuantityHeld")
                        .replace("{qty}", target.quantity.toLocaleString(locale))
                        .replace("{unit}", target.unit ?? "")
                    : `${t("quantity")}${target.unit ? ` (${target.unit.trim()})` : ""}`}
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    className="h-11 border-[#4d4637] bg-[#1a1c1a] text-white"
                  />
                </label>
                <label className="space-y-2 text-xs text-[rgba(255,255,255,0.6)]">
                  {action === "sell"
                    ? t("saleUnitPrice")
                    : t("averagePurchasePrice")}
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="h-11 border-[#4d4637] bg-[#1a1c1a] text-white"
                  />
                </label>
                {action === "sell" && (
                  <label className="space-y-2 text-xs text-[rgba(255,255,255,0.6)]">
                    {t("saleDate")}
                    <Input
                      type="date"
                      max={today()}
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                      className="h-11 border-[#4d4637] bg-[#1a1c1a] text-white [color-scheme:dark]"
                    />
                  </label>
                )}
              </div>
            )}
            {error && (
              <p className="mt-4 flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
                <CircleAlert className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            <DialogFooter className="mt-6">
              <Button variant="ghost" onClick={onClose} disabled={submitting}>
                {t("cancel")}
              </Button>
              <Button
                variant={action === "delete" ? "destructive" : "default"}
                onClick={() => void submit()}
                disabled={submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {action === "delete"
                  ? t("actionDelete")
                  : action === "sell"
                    ? t("recordSaleButton")
                    : t("saveButton")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
