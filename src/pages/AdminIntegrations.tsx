import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Lock, MapPin, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Status = {
  client_id_set: boolean;
  client_id_preview: string | null;
  client_secret_set: boolean;
};

type MapboxCheck = { ok: boolean; status: number; error?: string };
type MapboxStatus = {
  configured: boolean;
  token_prefix: string | null;
  token_kind: "public" | "secret" | "unknown" | null;
  is_public_token?: boolean;
  checks: { geocoding?: MapboxCheck; directions?: MapboxCheck };
  summary: string;
};

const schema = z.object({
  clientId: z.string().trim().min(1, "Client ID is required").max(200, "Too long"),
  clientSecret: z.string().trim().min(1, "Client Secret is required").max(500, "Too long"),
});

const CheckRow = ({ label, check, hint }: { label: string; check?: MapboxCheck; hint?: string }) => (
  <div className="rounded-lg border border-border/60 bg-background/40 px-4 py-3">
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 font-mono text-xs">
        {check?.ok ? (
          <>
            <CheckCircle2 className="size-4 text-primary" />
            <span>OK · {check.status}</span>
          </>
        ) : (
          <>
            <XCircle className="size-4 text-destructive" />
            <span className="text-destructive">{check?.error ?? "unknown"}</span>
          </>
        )}
      </span>
    </div>
    {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const AdminIntegrations = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [mapbox, setMapbox] = useState<MapboxStatus | null>(null);
  const [loadingMapbox, setLoadingMapbox] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        navigate("/admin");
        return;
      }
      const { data: hasAccess } = await supabase.rpc("claim_admin_if_none");
      if (!active) return;
      setIsAdmin(Boolean(hasAccess));
      setChecking(false);
      if (hasAccess) {
        void loadStatus();
        void loadMapbox();
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const loadStatus = async () => {
    setLoadingStatus(true);
    const { data, error } = await supabase.rpc("get_aikido_credentials_status");
    if (error) {
      toast.error("Failed to load status", { description: error.message });
      setStatus(null);
    } else {
      setStatus(data as Status);
    }
    setLoadingStatus(false);
  };

  const loadMapbox = async () => {
    setLoadingMapbox(true);
    const { data, error } = await supabase.functions.invoke("mapbox-token-status");
    if (error) {
      toast.error("Failed to check Mapbox token", { description: error.message });
      setMapbox(null);
    } else {
      setMapbox(data as MapboxStatus);
    }
    setLoadingMapbox(false);
  };

  const handleSave = async () => {
    const parsed = schema.safeParse({ clientId, clientSecret });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("set_aikido_credentials", {
      _client_id: parsed.data.clientId,
      _client_secret: parsed.data.clientSecret,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save credentials", { description: error.message });
      return;
    }
    toast.success("Aikido credentials saved securely");
    setClientId("");
    setClientSecret("");
    void loadStatus();
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="animate-spin text-primary" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <section className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-6 shadow-glow-card">
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-muted-foreground">This account is not assigned as an admin.</p>
          <Link to="/admin" className="mt-4 inline-flex text-primary underline">
            Back to admin
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 border-b border-border pb-6">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to admin
          </Link>
          <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="mr-2 size-3.5" />
            Integrations
          </div>
          <h1 className="font-heading text-4xl font-bold uppercase tracking-tight md:text-5xl">Aikido API</h1>
          <p className="max-w-2xl text-muted-foreground">
            Aikido credentials are stored encrypted in the backend vault. Values are never exposed to the browser and only used by
            backend functions to fetch security findings.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-glow-card">
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider">Current status</h2>
          {loadingStatus ? (
            <div className="mt-4 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="animate-spin" />
              Loading…
            </div>
          ) : status ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
                <dt className="text-muted-foreground">Client ID</dt>
                <dd className="flex items-center gap-2 font-mono">
                  {status.client_id_set ? (
                    <>
                      <CheckCircle2 className="size-4 text-primary" />
                      <span>{status.client_id_preview ?? "configured"}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" />
                      <span className="text-muted-foreground">Not configured</span>
                    </>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
                <dt className="text-muted-foreground">Client Secret</dt>
                <dd className="flex items-center gap-2 font-mono">
                  {status.client_secret_set ? (
                    <>
                      <CheckCircle2 className="size-4 text-primary" />
                      <span>••••••••</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" />
                      <span className="text-muted-foreground">Not configured</span>
                    </>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Unable to load status.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-glow-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-xl font-bold uppercase tracking-wider">
                <MapPin className="mr-2 inline size-5 text-primary" />
                Mapbox token
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Used by address autocomplete, route preview and live tracking maps.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadMapbox()}
              disabled={loadingMapbox}
              className="font-heading tracking-wider"
            >
              {loadingMapbox ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Re-check
            </Button>
          </div>

          {loadingMapbox && !mapbox ? (
            <div className="mt-4 flex items-center gap-3 text-muted-foreground">
              <Loader2 className="animate-spin" />
              Probing Mapbox APIs…
            </div>
          ) : mapbox ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/40 px-4 py-3">
                <dt className="text-muted-foreground">Token</dt>
                <dd className="flex items-center gap-2 font-mono">
                  {mapbox.configured ? (
                    <>
                      <CheckCircle2 className="size-4 text-primary" />
                      <span>{mapbox.token_prefix}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                          mapbox.token_kind === "public"
                            ? "border-primary/40 text-primary"
                            : "border-destructive/40 text-destructive"
                        }`}
                      >
                        {mapbox.token_kind}
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-destructive" />
                      <span className="text-muted-foreground">Not configured</span>
                    </>
                  )}
                </dd>
              </div>

              {mapbox.configured && (
                <>
                  <CheckRow
                    label="Geocoding API"
                    check={mapbox.checks.geocoding}
                    hint="Powers QuoteForm address autocomplete (mapbox-geocode)."
                  />
                  <CheckRow
                    label="Directions API"
                    check={mapbox.checks.directions}
                    hint="Powers route distance & ETA preview (mapbox-route)."
                  />

                  {mapbox.token_kind !== "public" && (
                    <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-xs text-destructive">
                      <div className="flex items-start gap-2">
                        <XCircle className="mt-0.5 size-4 shrink-0" />
                        <div className="space-y-1">
                          <p className="font-heading text-sm uppercase tracking-wider">
                            {mapbox.token_kind === "secret"
                              ? "Secret token detected — replace immediately"
                              : "Unknown token format — replacement required"}
                          </p>
                          <p className="text-destructive/90">
                            {mapbox.token_kind === "secret" ? (
                              <>
                                The configured token starts with <code>sk.</code>. Secret tokens grant
                                write access to your Mapbox account and <strong>must never reach the
                                browser</strong>. Although our edge functions do not forward this value
                                to clients directly, the browser map renderer (<code>mapbox-gl</code>)
                                requires a token in HTML, so any <code>sk.</code> token is at risk of
                                accidental exposure through future code paths.
                              </>
                            ) : (
                              <>
                                The token does not start with <code>pk.</code> or <code>sk.</code>. It
                                may be malformed, revoked, or from a different provider. The browser
                                map renderer requires a valid <strong>public</strong> Mapbox token.
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-md border border-destructive/30 bg-background/40 p-3 text-foreground">
                        <p className="font-semibold uppercase tracking-wider text-destructive">
                          How to replace safely (no client leak)
                        </p>
                        <ol className="list-inside list-decimal space-y-1.5 text-muted-foreground">
                          <li>
                            Open Mapbox → <strong>Account → Tokens</strong> and click{" "}
                            <strong>Create a token</strong>.
                          </li>
                          <li>
                            Name it <code>autobais-web-public</code>. Keep <strong>only</strong> the
                            default public scopes (<code>styles:read</code>,{" "}
                            <code>fonts:read</code>, <code>datasets:read</code>,{" "}
                            <code>vision:read</code>). <strong>Do not</strong> enable any{" "}
                            <code>*:write</code> or <code>downloads:read</code> scopes.
                          </li>
                          <li>
                            Under <strong>URL restrictions</strong>, lock the token to:
                            <code className="ml-1">autobais.app</code>,{" "}
                            <code>www.autobais.app</code>, <code>*.lovable.app</code>.
                          </li>
                          <li>
                            Copy the new token — it must start with <code>pk.</code>.
                          </li>
                          <li>
                            Paste it into the Lovable Cloud secret{" "}
                            <code>MAPBOX_ACCESS_TOKEN</code> (button below). The value is written
                            directly to the encrypted backend vault and is never echoed back to the
                            browser by this UI.
                          </li>
                          <li>
                            Once saved, return here and click <strong>Re-check</strong>. The badge
                            should flip to <code>public</code>.
                          </li>
                          <li>
                            Finally, <strong>revoke</strong> the old <code>sk.</code> token in the
                            Mapbox dashboard so it cannot be misused.
                          </li>
                        </ol>
                      </div>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          window.open("https://account.mapbox.com/access-tokens/", "_blank", "noopener,noreferrer");
                          toast.info(
                            "After creating the pk. token, update MAPBOX_ACCESS_TOKEN via Lovable Cloud secrets, then click Re-check.",
                          );
                        }}
                        className="font-heading tracking-wider"
                      >
                        Open Mapbox tokens
                      </Button>
                    </div>
                  )}

                  <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
                    <p className="font-semibold uppercase tracking-wider text-foreground">URL allowlist (manual)</p>
                    <p className="mt-1">
                      Mapbox does not expose token restrictions over the API. Confirm in the Mapbox
                      dashboard → Tokens → URL restrictions that this token is locked to:
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-0.5 font-mono">
                      <li>autobais.app</li>
                      <li>www.autobais.app</li>
                      <li>*.lovable.app</li>
                    </ul>
                  </div>
                </>
              )}

              <p className="text-xs text-muted-foreground">{mapbox.summary}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Unable to load Mapbox status.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-glow-card">
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider">
            {status?.client_id_set || status?.client_secret_set ? "Update credentials" : "Set credentials"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get these from Aikido → Settings → Integrations → API. Submitted values are written directly to the encrypted vault.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="aikido-client-id">Client ID</Label>
              <Input
                id="aikido-client-id"
                autoComplete="off"
                spellCheck={false}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="aikido_client_id_..."
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="aikido-client-secret">Client Secret</Label>
              <Input
                id="aikido-client-secret"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••"
                maxLength={500}
              />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/40 p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 text-foreground">
                <Lock className="size-3.5 text-primary" />
                <span className="font-semibold uppercase tracking-wider">Stored encrypted</span>
              </div>
              <p>Values are written to the backend vault via an admin-only function. They are never returned to the browser.</p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !clientId || !clientSecret}
              size="lg"
              className="w-full font-heading tracking-wider"
            >
              {saving ? <Loader2 className="animate-spin" /> : <Lock />}
              Save securely
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AdminIntegrations;
