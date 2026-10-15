import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BackHeader } from "@/components/qp/SiteChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — QP Movie" }, { name: "description", content: "Choose a new password." }, { property: "og:title", content: "Set new password — QP Movie" }, { property: "og:description", content: "Choose a new password." }] }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("At least 8 characters");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error("Reset link expired or invalid. Request a new one.");
    toast.success("Password updated"); navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen"><BackHeader />
      <form onSubmit={save} className="mx-auto max-w-sm space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Set a new password</h1>
        <Input type="password" aria-label="New password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11" />
        <Button type="submit" className="w-full bg-accent-gradient">Update password</Button>
      </form>
    </div>
  );
}
