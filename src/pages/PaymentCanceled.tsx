import { useEffect } from "react";
import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import CTAButton from "@/components/CTAButton";

const PaymentCanceled = () => {
  useEffect(() => {
    document.title = "Payment Canceled · PICKUP HAUL";
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-24 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none mix-blend-screen">
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[400px] bg-destructive/10 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full glass rounded-3xl p-10 text-center space-y-6">
        <div className="inline-flex size-16 rounded-2xl bg-muted/40 items-center justify-center mx-auto">
          <XCircle className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Payment Canceled</h1>
        <p className="text-muted-foreground leading-relaxed">
          No charge was made. You can return to the site and try again, or call us if you
          need help with your booking.
        </p>
        <div className="pt-2 space-y-3">
          <CTAButton href="/#packages" variant="primary" size="md" className="w-full">
            Back to packages
          </CTAButton>
          <Link
            to="/"
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
};

export default PaymentCanceled;
