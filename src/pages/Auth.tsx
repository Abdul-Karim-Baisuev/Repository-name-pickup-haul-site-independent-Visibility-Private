import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AppleLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.86-3.08.43-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.43C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.49l2.63-2.54C16.83 3.4 14.66 2.4 12 2.4 6.78 2.4 2.55 6.6 2.55 12s4.23 9.6 9.45 9.6c5.45 0 9.07-3.83 9.07-9.22 0-.62-.06-1.1-.15-1.58H12z" />
  </svg>
);

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState<null | "apple" | "google" | "email">(null);

  // Sign-in fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");

  // Sign-up fields
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [authLoading, user, navigate]);

  const handleOAuth = async (provider: "apple" | "google") => {
    setSubmitting(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(`Couldn't sign in with ${provider === "apple" ? "Apple" : "Google"}.`);
      setSubmitting(null);
      return;
    }
    if (result.redirected) return; // browser will navigate
    navigate("/", { replace: true });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting("email");
    const { error } = await supabase.auth.signInWithPassword({
      email: siEmail.trim(),
      password: siPassword,
    });
    setSubmitting(null);
    if (error) {
      toast.error(error.message || "Invalid email or password.");
      return;
    }
    toast.success("Welcome back!");
    navigate("/", { replace: true });
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting("email");
    const { error } = await supabase.auth.signUp({
      email: suEmail.trim(),
      password: suPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: suName.trim() },
      },
    });
    setSubmitting(null);
    if (error) {
      toast.error(error.message || "Sign-up failed.");
      return;
    }
    toast.success("Check your email to confirm your account.");
  };

  const handleForgot = async () => {
    if (!siEmail.trim()) {
      toast.error("Enter your email first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(siEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent.");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Aurora backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--gradient-aurora)" }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-md items-center justify-center px-6 py-16">
        <div className="w-full">
          <Link to="/" className="mb-8 block text-center">
            <h1 className="font-heading text-3xl tracking-tight">PICKUP HAUL</h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              Hauling & Assembly · Van Nuys, CA
            </p>
          </Link>

          <div
            className="rounded-3xl border p-6 backdrop-blur-xl"
            style={{
              background: "hsl(var(--glass-bg))",
              borderColor: "hsl(var(--glass-border))",
              boxShadow: "var(--shadow-glass)",
            }}
          >
            {/* Social */}
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-3 bg-foreground text-background hover:bg-foreground/90 border-foreground"
                onClick={() => handleOAuth("apple")}
                disabled={submitting !== null}
              >
                {submitting === "apple" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <AppleLogo />
                )}
                Continue with Apple
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-3"
                onClick={() => handleOAuth("google")}
                disabled={submitting !== null}
              >
                {submitting === "google" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <GoogleLogo />
                )}
                Continue with Google
              </Button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleEmailSignIn} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="si-email"
                        type="email"
                        autoComplete="email"
                        required
                        className="pl-9"
                        value={siEmail}
                        onChange={(e) => setSiEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="si-password">Password</Label>
                      <button
                        type="button"
                        onClick={handleForgot}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="si-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        minLength={6}
                        className="pl-9"
                        value={siPassword}
                        onChange={(e) => setSiPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting !== null}>
                    {submitting === "email" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleEmailSignUp} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Full name</Label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="su-name"
                        type="text"
                        autoComplete="name"
                        required
                        className="pl-9"
                        value={suName}
                        onChange={(e) => setSuName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="su-email"
                        type="email"
                        autoComplete="email"
                        required
                        className="pl-9"
                        value={suEmail}
                        onChange={(e) => setSuEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password">Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="su-password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        className="pl-9"
                        value={suPassword}
                        onChange={(e) => setSuPassword(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">At least 6 characters.</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting !== null}>
                    {submitting === "email" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to receive service-related emails.
          </p>
        </div>
      </div>
    </div>
  );
}
