"use client";

import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  ticker: string;
  name: string;
  exchange: string;
  type: string;
};

function typeLabel(type: string): string {
  switch (type.toUpperCase()) {
    case "EQUITY":
      return "Action";
    case "ETF":
      return "ETF";
    case "CRYPTOCURRENCY":
      return "Crypto";
    default:
      return type;
  }
}

export function AssetSearch({ variant = "default" }: { variant?: "default" | "v1" }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search-assets?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Recherche indisponible");
        const data = (await response.json()) as SearchResult[];
        setResults(data);
        setOpen(true);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selectAsset = (ticker: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/asset/${encodeURIComponent(ticker)}`);
  };

  return (
    <div ref={containerRef} className="relative mr-auto w-full max-w-xl">
      <Search className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${variant === "v1" ? "text-[#d0c5b2]" : "text-muted-foreground"}`} />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        placeholder="Rechercher un actif, une alerte..."
        className={variant === "v1"
          ? "h-10 w-full rounded-xl border border-[#4d4637]/10 bg-[#1e201e] pl-9 pr-3 text-sm text-[#e2e3df] outline-none placeholder:text-[#d0c5b2]/50 transition-colors focus:border-[#c9a84c]/50"
          : "h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"}
        aria-label="Rechercher un actif"
        aria-expanded={open}
      />

      {open && (
        <div className={variant === "v1"
          ? "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-[#4d4637]/20 bg-[#1e201e] text-[#e2e3df] shadow-lg"
          : "absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"}>
          {loading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Recherche...</p>
          ) : results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((result) => (
                <li key={`${result.ticker}-${result.exchange}`}>
                  <button
                    type="button"
                    onClick={() => selectAsset(result.ticker)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <strong>{result.ticker}</strong>{" "}
                      <span className="text-muted-foreground">{result.name}</span>
                    </span>
                    {result.exchange && (
                      <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">
                        {result.exchange}
                      </span>
                    )}
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {typeLabel(result.type)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground">Aucun actif trouvé.</p>
          )}
        </div>
      )}
    </div>
  );
}
