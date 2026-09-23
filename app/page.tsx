import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

const investors = [
  { initials: "MK", colors: "from-[#c9a84c] via-[#4d4837] to-[#171d1d]" },
  { initials: "SA", colors: "from-[#765335] via-[#273237] to-[#111719]" },
  { initials: "LN", colors: "from-[#c19867] via-[#344744] to-[#121819]" },
  { initials: "YM", colors: "from-[#354e75] via-[#1b2c46] to-[#101719]" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#101719] text-white">
      <PublicNavbar />

      <section className="relative isolate min-h-[calc(100vh-81px)] px-6 pb-24 pt-[218px] text-center sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-35"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.065) 0.7px, transparent 0.8px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[330px] bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.035),transparent_68%)]"
        />

        <div className="mx-auto flex max-w-[900px] flex-col items-center">
          <div className="mb-[33px] inline-flex h-[30px] items-center gap-2 rounded-full border border-white/[0.13] bg-white/[0.045] px-4 text-[12px] tracking-[0.035em] text-[#d2c7b4]">
            <span className="h-2 w-2 rounded-full bg-[#baa052]" />
            La référence du patrimoine éthique
          </div>

          <h1 className="max-w-[850px] text-[45px] font-bold leading-[1.07] tracking-[-0.035em] text-[#f7f7f7] sm:text-[58px] lg:text-[68px]">
            Votre patrimoine halal,
            <span className="block text-[#f2ca6e]">enfin centralisé.</span>
          </h1>

          <p className="mt-[29px] max-w-[640px] text-[16px] leading-[1.7] text-[#c9c0af] sm:text-[17px]">
            Suivez, analysez et purifiez vos investissements en toute sérénité.
            Une plateforme conçue pour allier performance financière et
            conformité éthique.
          </p>

          <div className="mt-[40px] flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/register"
              className="group flex h-[60px] w-full max-w-[257px] items-center justify-center gap-3 rounded-full bg-[#d2ad45] text-[14px] font-semibold text-[#4d3b0d] shadow-[0_9px_28px_rgba(201,168,76,0.23)] transition-all hover:-translate-y-0.5 hover:bg-[#dfbd58]"
            >
              Créer un compte gratuit
              <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className="flex h-[52px] w-full max-w-[183px] items-center justify-center rounded-full border border-white/[0.12] text-[13px] font-semibold text-[#f4f4f2] transition-colors hover:border-white/25 hover:bg-white/[0.04]"
            >
              Explorer la démo
            </Link>
          </div>

          <div className="mt-[64px] flex flex-col items-center">
            <div
              className="flex -space-x-2.5"
              aria-label="Communauté d’investisseurs"
            >
              {investors.map((investor) => (
                <div
                  key={investor.initials}
                  className="grid h-[44px] w-[44px] place-items-center rounded-full border-[3px] border-[#101719] bg-[#1a2221] p-[2px] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                >
                  <span
                    className={`grid h-full w-full place-items-center rounded-full bg-gradient-to-br ${investor.colors} text-[9px] font-bold text-white/80`}
                  >
                    {investor.initials}
                  </span>
                </div>
              ))}
              <div className="grid h-[44px] w-[44px] place-items-center rounded-full border-[2px] border-[#0d1213] bg-[#202524] text-[13px] font-medium text-[#e1e0da] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                +2k
              </div>
            </div>

            <div className="mt-[15px] flex flex-wrap items-center justify-center gap-2 text-[12.5px] text-[#c8c0b0]">
              <span
                className="inline-block text-[22px] leading-none tracking-[-2px] text-[#f2ca6e]"
                aria-label="4,9 étoiles sur 5"
              >
                ★★★★★
              </span>
              <span>
                <strong className="font-semibold text-[#f3f2ed]">4.9/5</strong>{" "}
                par plus de 2000 investisseurs
              </span>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-6 bottom-[96px] h-px bg-gradient-to-r from-transparent via-[#796934]/80 to-transparent sm:inset-x-16" />
      </section>
    </main>
  );
}
