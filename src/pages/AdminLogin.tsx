import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.83 3.4 14.66 2.4 12 2.4 6.78 2.4 2.55 6.6 2.55 12s4.23 9.6 9.45 9.6c5.45 0 9.07-3.83 9.07-9.22 0-.62-.06-1.1-.15-1.58H12z"
    />
  </svg>
);

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState<null | "email" | "google">(null);

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/admin";

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, user, navigate, redirectTo]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) {
      toast.error("Enter email and password", {
        description: "Password must be at least 6 characters.",
      });
      return;
    }
    setSubmitting("email");
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(null);
    if (error) {
      toast.error("Could not sign in", { description: error.message });
      return;
    }
    toast.success("Signed in");
  };

  const handleGoogle = async () => {
    setSubmitting("google");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + redirectTo,
    });
    setSubmitting(null);
    if (result.error) {
      toast.error("Google sign-in failed", {
        description: result.error.message,
      });
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-6 py-12 text-foreground">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <section className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-md flex-col justify-center">
        <div
          className="rounded-3xl border p-6 backdrop-blur-xl md:p-8"
          style={{
            background: "hsl(var(--glass-bg))",
            borderColor: "hsl(var(--glass-border))",
            boxShadow: "var(--shadow-glass)",
          }}
        >
          <div className="mb-8 space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-wider">
              Admin Sign In
            </h1>
            <p className="text-sm text-muted-foreground">
              Restricted area · authorized administrators only.
            </p>
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full font-heading tracking-wider"
              disabled={submitting !== null}
            >
              {submitting === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Sign In
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full justify-center gap-3"
            onClick={handleGoogle}
            disabled={submitting !== null}
          >
            {submitting === "google" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleLogo />
            )}
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Not an admin?{" "}
            <Link to="/" className="text-primary hover:underline">
              Return to site
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
};

export default AdminLogin;
