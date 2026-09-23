import { AuthForm } from "@/components/auth-form";

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  return <AuthForm mode="login" next={searchParams.next} initialError={searchParams.error} />;
}
