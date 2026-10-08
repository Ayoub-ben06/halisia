import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WelcomePage() {
  const { data: { session } } = await createClient().auth.getSession();
  if (session) redirect("/dashboard");
  redirect("/register");
}
