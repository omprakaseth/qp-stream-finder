import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BackHeader } from "@/components/qp/SiteChrome";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — QP Movie" }, { name: "description", content: "QP Movie staff area." }, { property: "og:title", content: "Admin — QP Movie" }, { property: "og:description", content: "QP Movie staff area." }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

function Admin() {
  const roles = useQuery({ queryKey: ["myroles"], queryFn: async () => (await supabase.from("user_roles").select("role")).data?.map((r) => r.role) ?? [] });
  const ownerExists = useQuery({ queryKey: ["ownerExists"], queryFn: async () => (await supabase.rpc("owner_exists")).data as boolean });
  const claim = async () => { const { data } = await supabase.rpc("claim_first_owner"); toast[data ? "success" : "error"](data ? "You are now the Owner" : "An owner already exists"); roles.refetch(); ownerExists.refetch(); };
  return (
    <div className="min-h-screen"><BackHeader title="Staff area" />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <p className="text-sm text-muted-foreground">Your roles: {roles.data?.length ? roles.data.join(", ") : "none"}</p>
        {ownerExists.data === false && <div className="rounded-2xl border border-warning/40 p-5"><h2 className="font-semibold">Set up the first owner</h2><p className="mt-1 text-sm text-muted-foreground">No owner exists yet. The first signed-in person to claim becomes Owner; this can only happen once.</p><Button className="mt-3" onClick={claim}>Claim owner role</Button></div>}
        <div className="rounded-2xl border border-border p-5 text-sm text-muted-foreground">
          The movie library, upload wizard, rights review and moderation screens are the next build stage. The database, roles and server-side checks are already in place. <Link to="/" className="text-primary">Back to catalogue</Link>
        </div>
      </div>
    </div>
  );
}
