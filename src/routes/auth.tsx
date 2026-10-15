import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { BackHeader } from "@/components/qp/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => z.object({ next: z.string().max(200).optional() }).parse(s),
  head: () => ({ meta: [{ title: "Sign in — QP Movie" }, { name: "description", content: "Sign in or create a QP Movie account." }, { property: "og:title", content: "Sign in — QP Movie" }, { property: "og:description", content: "Sign in or create a QP Movie account." }] }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = z.string().trim().email().max(255).safeParse(email);
    if (!em.success) return toast.error("Enter a valid email");
    if (mode !== "reset" && password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true); setInfo(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data, password });
        if (error) throw error;
        navigate({ to: safeNext(next) as "/" });
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email: em.data, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setInfo("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setInfo("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("Google sign-in failed");
    else if (!r.redirected) navigate({ to: safeNext(next) as "/" });
  };

  return (
    <div className="min-h-screen">
      <BackHeader />
      <div className="mx-auto max-w-sm px-4 py-10">
        <h1 className="text-2xl font-semibold">{mode === "in" ? "Welcome back" : mode === "up" ? "Create account" : "Reset password"}</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label htmlFor="em">Email</Label><Input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-11" /></div>
          {mode !== "reset" && <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-11" /></div>}
          <Button type="submit" size="lg" disabled={busy} className="w-full bg-accent-gradient">{mode === "in" ? "Sign in" : mode === "up" ? "Sign up" : "Send reset link"}</Button>
        </form>
        {info && <p role="status" className="mt-4 text-sm text-success">{info}</p>}
        {mode !== "reset" && <Button variant="outline" size="lg" className="mt-3 w-full" onClick={google}>Continue with Google</Button>}
        <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
          {mode !== "in" && <button onClick={() => setMode("in")} className="text-left hover:text-foreground">Have an account? Sign in</button>}
          {mode !== "up" && <button onClick={() => setMode("up")} className="text-left hover:text-foreground">New here? Create an account</button>}
          {mode !== "reset" && <button onClick={() => setMode("reset")} className="text-left hover:text-foreground">Forgot password?</button>}
        </div>
      </div>
    </div>
  );
}
