import { ShieldCheck, Mail, KeyRound } from "lucide-react";
import CTAButton from "@/components/CTAButton";

/**
 * Public-facing "pay your custom estimate" entry point.
 *
 * Custom-amount payments are NOT created from arbitrary client input
 * anymore — they are always tied to a verified estimate in our database
 * (deposit, full or final balance) and are processed via the secure
 * payment link the customer receives by email, or via the customer
 * portal (email + last 4 digits of phone).
 *
 * This section directs customers to the correct, safe entry point
 * instead of asking them to type an amount.
 */
const CustomPaymentSection = () => {
  return (
    <section
      id="pay-estimate"
      className="relative py-24 md:py-32 overflow-hidden scroll-mt-24"
    >
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[400px] bg-primary/10 rounded-full blur-[160px]" />
      </div>

      <div className="container relative z-10 mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-subtle">
              <span className="size-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-medium tracking-[0.25em] text-foreground/70 uppercase">
                Pay Your Custom Estimate
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
              Already have a <span className="text-gradient-primary">quote from us?</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground font-light max-w-xl mx-auto leading-relaxed">
              For your security, custom-amount payments are processed only through
              the secure link in your confirmation email or from your customer portal —
              never by typing an amount on a public page.
            </p>
          </div>

          <div className="glass rounded-3xl p-6 md:p-10 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl glass-subtle p-5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                  From your email
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  Open the secure payment link we sent you (deposit, full, or final
                  balance). It opens at <span className="text-primary">/pay/…</span>
                  with the correct amount pre-filled by us.
                </p>
              </div>
              <div className="rounded-2xl glass-subtle p-5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                  <KeyRound className="h-3.5 w-3.5 text-primary" />
                  From the customer portal
                </div>
                <p className="text-sm text-foreground/85 leading-relaxed">
                  Sign in with your email + the last 4 digits of your phone to see
                  every order and its current payment link.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <CTAButton
                href="/portal"
                variant="primary"
                size="md"
                icon="arrow"
                className="w-full"
              >
                Open Customer Portal
              </CTAButton>
              <CTAButton
                href="/status"
                variant="secondary"
                size="md"
                icon="arrow"
                className="w-full"
              >
                Check Order Status
              </CTAButton>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2 text-center">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Secure checkout by Stripe · Cards, Apple Pay, Google Pay</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CustomPaymentSection;
