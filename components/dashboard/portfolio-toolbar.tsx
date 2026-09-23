"use client";

import { Download, Filter, Plus } from "lucide-react";
import { useState } from "react";
import { AddAssetModal } from "@/components/dashboard/add-asset-modal";

function IconButton({
  icon: Icon,
  ariaLabel,
  onClick,
}: {
  icon: typeof Filter;
  ariaLabel?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1c1a] text-[rgba(255,255,255,0.6)] hover:text-[#ffffff]"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function PortfolioToolbar() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2">
        <IconButton icon={Filter} ariaLabel="Filtrer le portefeuille" />
        <IconButton
          icon={Plus}
          ariaLabel="Ajouter un actif"
          onClick={() => setModalOpen(true)}
        />
        <IconButton icon={Download} ariaLabel="Télécharger le portefeuille" />
      </div>
      <AddAssetModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
