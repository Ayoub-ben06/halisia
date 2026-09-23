"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deletePosition, sellPosition, updatePosition, type PositionRef } from "@/lib/portfolio-mutations";

export type PositionAction = "edit" | "sell" | "delete";
export type PositionActionTarget = PositionRef & { quantity: number; averagePrice: number; currentPrice: number; unit?: string };

const today = () => new Date().toISOString().slice(0, 10);
function parse(value: string) { return Number(value.replace(/\s/g, "").replace(",", ".")); }
const titles: Record<PositionAction, string> = { edit: "Modifier la position", sell: "Enregistrer une vente", delete: "Supprimer la position" };

export function PositionActionsDialog({ target, action, onClose }: { target: PositionActionTarget | null; action: PositionAction | null; onClose: () => void }) {
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
    setQuantity(action === "sell" ? String(target.quantity) : String(target.quantity));
    setPrice(String(action === "sell" ? target.currentPrice : target.averagePrice));
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
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("La quantité doit être supérieure à 0.");
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("Le prix doit être supérieur à 0.");
        if (action === "edit") await updatePosition(target, qty, unitPrice);
        else {
          if (qty > target.quantity + 1e-9) throw new Error("La quantité vendue dépasse la quantité détenue.");
          if (!date || date > today()) throw new Error("La date de vente ne peut pas être dans le futur.");
          await sellPosition(target, target.quantity, target.averagePrice, qty, unitPrice, date);
        }
      }
      onClose();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "L’opération a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  const open = Boolean(target && action);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !submitting) onClose(); }}>
      <DialogContent className="border-white/[0.05] bg-[#111412] p-6 text-[#ffffff] sm:max-w-[460px]">
        {target && action && <>
          <DialogHeader>
            <DialogTitle>{titles[action]}</DialogTitle>
            <DialogDescription>{target.name} ({target.ticker})</DialogDescription>
          </DialogHeader>
          {action === "delete" ? (
            <p className="mt-4 text-sm leading-6 text-[rgba(255,255,255,0.7)]">Cette position sera retirée de votre portefeuille. Pour conserver une trace de la vente dans l’historique, utilisez plutôt « Enregistrer une vente ».</p>
          ) : (
            <div className="mt-5 grid gap-4">
              <label className="space-y-2 text-xs text-[rgba(255,255,255,0.6)]">
                {action === "sell" ? `Quantité vendue (détenue : ${target.quantity.toLocaleString("fr-FR")}${target.unit ?? ""})` : `Quantité${target.unit ? ` (${target.unit.trim()})` : ""}`}
                <Input type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="h-11 border-[#4d4637] bg-[#1a1c1a] text-white" />
              </label>
              <label className="space-y-2 text-xs text-[rgba(255,255,255,0.6)]">
                {action === "sell" ? "Prix de vente unitaire (€)" : "Prix d’achat moyen (€)"}
                <Input type="number" min="0" step="any" value={price} onChange={(event) => setPrice(event.target.value)} className="h-11 border-[#4d4637] bg-[#1a1c1a] text-white" />
              </label>
              {action === "sell" && (
                <label className="space-y-2 text-xs text-[rgba(255,255,255,0.6)]">
                  Date de vente
                  <Input type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} className="h-11 border-[#4d4637] bg-[#1a1c1a] text-white [color-scheme:dark]" />
                </label>
              )}
            </div>
          )}
          {error && <p className="mt-4 flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p>}
          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Annuler</Button>
            <Button variant={action === "delete" ? "destructive" : "default"} onClick={() => void submit()} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action === "delete" ? "Supprimer" : action === "sell" ? "Enregistrer la vente" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </>}
      </DialogContent>
    </Dialog>
  );
}
