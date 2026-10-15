import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDownloadOptions, requestDownloadLink } from "@/lib/media.functions";
import { formatBytes, qualityLabel } from "@/lib/quota";

type Opts = Awaited<ReturnType<typeof getDownloadOptions>>;

export function DownloadSheet({ open, onOpenChange, movieId, title }: { open: boolean; onOpenChange: (o: boolean) => void; movieId: string; title: string }) {
  const mobile = useIsMobile();
  const fetchOpts = useServerFn(getDownloadOptions);
  const getLink = useServerFn(requestDownloadLink);
  const [opts, setOpts] = useState<Opts | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    setErr(null); setOpts(null); setMsg(null);
    fetchOpts({ data: { movieId } })
      .then((o) => { setOpts(o); setSel(o.qualities[0]?.quality ?? null); })
      .catch(() => setErr("Couldn't load download options. Check your connection and retry."));
  };
  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async () => {
    if (!sel) return;
    setBusy(true); setMsg(null);
    try {
      const r = await getLink({ data: { movieId, quality: sel as "720p" } });
      if (!r.ok) { setMsg(r.message + ("resetsAt" in r && r.resetsAt ? ` Resets ${new Date(r.resetsAt).toLocaleString()}.` : "")); return; }
      window.location.assign(r.url); // link expires in minutes; never stored
      setMsg("Your download has started. The link expires in 5 minutes — reopen this sheet to get a fresh one (same movie won't use extra quota today).");
      load();
    } catch (e) {
      setMsg(e instanceof Error && e.message.startsWith("RATE_LIMITED") ? "Too many attempts. Please wait a minute." : "Network error. Please retry.");
    } finally { setBusy(false); }
  };

  const body = (
    <div className="space-y-5">
      {err && (
        <div className="rounded-lg border border-destructive/40 p-4 text-sm">
          {err} <Button variant="outline" size="sm" className="mt-3" onClick={load}><RefreshCw className="h-4 w-4" /> Retry</Button>
        </div>
      )}
      {!opts && !err && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability…</div>}
      {opts && !opts.allowed && (
        <div className="rounded-lg bg-muted p-4 text-sm">
          {opts.reason}
          {!opts.signedIn && opts.reason?.startsWith("Sign in") && <Button asChild size="sm" className="mt-3 block w-fit"><Link to="/auth">Sign in</Link></Button>}
        </div>
      )}
      {opts?.allowed && (
        <>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">Select quality</legend>
            <div className="space-y-2">
              {opts.qualities.map((q) => (
                <label key={q.quality} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-colors ${sel === q.quality ? "border-primary bg-accent" : "border-border hover:bg-secondary"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="q" value={q.quality} checked={sel === q.quality} onChange={() => setSel(q.quality)} className="accent-[var(--primary)]" />
                    <span className="font-semibold">{qualityLabel(q.quality)}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">{formatBytes(q.size_bytes) ?? "Size unknown"}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm text-muted-foreground">
            {opts.alreadyCountedToday ? "This movie is already counted today — switching quality or retrying is free." : `Downloads remaining today: ${opts.remaining} of ${opts.limit}.`}{" "}
            Resets {new Date(opts.resetsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })} IST.
          </p>
          <Button size="lg" className="w-full bg-accent-gradient shadow-glow" disabled={!sel || busy || (opts.remaining <= 0 && !opts.alreadyCountedToday)} onClick={download}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download {sel ? `(${qualityLabel(sel)})` : ""}
          </Button>
        </>
      )}
      {msg && <p role="status" className="text-sm">{msg}</p>}
      <p className="text-xs text-muted-foreground">Downloads are for personal viewing under the licence for this title. Redistribution is not permitted.</p>
    </div>
  );

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="px-0"><SheetTitle>Download movie</SheetTitle><SheetDescription>{title}</SheetDescription></SheetHeader>
          <div className="pb-4">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Download movie</DialogTitle><DialogDescription>{title}</DialogDescription></DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
