import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: React.ReactNode;
}

export const RequireAdmin = ({ children }: Props) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (loading) return;
      if (!user) {
        setChecking(false);
        return;
      }
      setChecking(true);
      // Try bootstrap-or-check; fall back silently if forbidden
      const { data, error } = await supabase.rpc("claim_admin_if_none");
      if (cancelled) return;
      if (error) {
        // Fallback: explicit role lookup
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!roleRow);
      } else {
        setIsAdmin(!!data);
      }
      setChecking(false);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div
          className="max-w-md rounded-3xl border p-8 text-center backdrop-blur-xl"
          style={{
            background: "hsl(var(--glass-bg))",
            borderColor: "hsl(var(--glass-border))",
            boxShadow: "var(--shadow-glass)",
          }}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wider">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have admin permissions.
          </p>
          {user?.email && (
            <div className="mt-4 rounded-xl border px-4 py-3 text-left" style={{ borderColor: 'hsl(var(--glass-border))', background: 'hsl(var(--glass-bg))' }}>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as</p>
              <p className="mt-1 text-sm font-medium text-foreground">{user.email}</p>
              <p className="mt-1 text-xs font-mono text-muted-foreground break-all">ID: {user.id}</p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
              }}
            >
              Sign out
            </Button>
            <Button variant="ghost" asChild>
              <a href="/">Return to site</a>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
};

export default RequireAdmin;
