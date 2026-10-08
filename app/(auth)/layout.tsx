import Link from "next/link";
import { AuthI18nShell } from "@/components/providers/auth-i18n-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthI18nShell>
      <main className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-8 block text-center text-2xl font-semibold text-primary">
            Halisia
          </Link>
          {children}
        </div>
      </main>
    </AuthI18nShell>
  );
}
