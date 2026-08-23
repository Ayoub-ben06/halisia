"use client";

import { useState } from "react";

export function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <p className={expanded ? "text-sm leading-6 text-muted-foreground" : "line-clamp-3 text-sm leading-6 text-muted-foreground"}>{text}</p>
      <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-2 text-sm font-medium text-[#C9A84C] hover:underline">
        {expanded ? "Voir moins" : "Voir plus"}
      </button>
    </div>
  );
}
